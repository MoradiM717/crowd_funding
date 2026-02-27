
import logging
import re
from typing import List

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q

from core.models import Profile
from core.api.serializers import (
    ProfileSerializer,
    ProfilePublicSerializer,
    ProfileUpdateSerializer,
)

logger = logging.getLogger(__name__)

                                   
ETH_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')


def validate_ethereum_address(address: str) -> bool:
    return bool(ETH_ADDRESS_PATTERN.match(address))


def get_wallet_from_request(request) -> str | None:
                                                                     
    if hasattr(request, 'user') and hasattr(request.user, 'wallet_address'):
        return request.user.wallet_address
    
                                                       
    if hasattr(request, 'auth') and request.auth:
        if hasattr(request.auth, 'get'):
            wallet_address = request.auth.get('wallet_address')
            if wallet_address:
                return wallet_address
    
                                          
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(auth_header.split(' ')[1])
            return token.get('wallet_address')
        except Exception:
            pass
    
    return None


class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    
    queryset = Profile.objects.all()
    serializer_class = ProfilePublicSerializer
    permission_classes = [AllowAny]
    lookup_field = 'wallet_address'
    search_fields = ['display_name', 'wallet_address']
    ordering_fields = ['created_at', 'display_name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        qs = Profile.objects.all()
        
                                             
        addresses_param = self.request.query_params.get('addresses')
        if addresses_param:
            addresses = [
                addr.strip().lower()
                for addr in addresses_param.split(',')
                if validate_ethereum_address(addr.strip())
            ]
            if addresses:
                qs = qs.filter(wallet_address__in=addresses)
        
                                
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(display_name__icontains=search) |
                Q(wallet_address__icontains=search)
            )
        
        return qs
    
    def retrieve(self, request, wallet_address=None):
        
        if not validate_ethereum_address(wallet_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile = Profile.objects.get(wallet_address=wallet_address.lower())
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Profile.DoesNotExist:
            return Response(
                {
                    'error': 'Profile not found',
                    'wallet_address': wallet_address.lower(),
                    'has_profile': False,
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='batch')
    def batch(self, request):
        addresses_param = request.query_params.get('addresses', '')
        
        if not addresses_param:
            return Response(
                {'error': 'addresses parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
                                      
        addresses = [
            addr.strip().lower()
            for addr in addresses_param.split(',')
            if validate_ethereum_address(addr.strip())
        ]
        
        if not addresses:
            return Response(
                {'error': 'No valid addresses provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
                          
        max_batch = 100
        if len(addresses) > max_batch:
            addresses = addresses[:max_batch]
        
                        
        profiles = Profile.objects.filter(wallet_address__in=addresses)
        
                                   
        result = {}
        profiles_by_address = {p.wallet_address: p for p in profiles}
        
        for addr in addresses:
            if addr in profiles_by_address:
                result[addr] = ProfilePublicSerializer(profiles_by_address[addr]).data
            else:
                result[addr] = None
        
        return Response({
            'profiles': result,
            'found': len([v for v in result.values() if v is not None]),
            'total': len(addresses),
        })


class ProfileConnectView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        wallet_address = request.data.get('wallet_address', '').strip()
        
        if not wallet_address:
            return Response(
                {'error': 'wallet_address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not validate_ethereum_address(wallet_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
                                
        wallet_address = wallet_address.lower()
        
                               
        profile, created = Profile.objects.get_or_create(
            wallet_address=wallet_address,
            defaults={
                'display_name': None,                                 
            }
        )
        
        logger.info(
            f"Profile {'created' if created else 'fetched'} for {wallet_address}"
        )
        
        serializer = ProfilePublicSerializer(profile)
        return Response({
            'profile': serializer.data,
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ProfileMeView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get_profile(self, request) -> Profile | None:
        wallet_address = get_wallet_from_request(request)
        
        if not wallet_address:
            return None
        
        try:
            return Profile.objects.get(wallet_address=wallet_address.lower())
        except Profile.DoesNotExist:
            return None
    
    def get(self, request):
        profile = self.get_profile(request)
        
        if not profile:
            return Response(
                {'error': 'Profile not found. Please authenticate first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    
    def put(self, request):
        profile = self.get_profile(request)
        
        if not profile:
            return Response(
                {'error': 'Profile not found. Please authenticate first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProfileUpdateSerializer(profile, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(ProfileSerializer(profile).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        profile = self.get_profile(request)
        
        if not profile:
            return Response(
                {'error': 'Profile not found. Please authenticate first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(ProfileSerializer(profile).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
