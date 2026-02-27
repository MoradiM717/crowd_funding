
import logging
import re

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.utils import timezone

from core.models import Profile
from core.services.auth import (
    generate_nonce,
    get_signing_message,
    authenticate_with_signature,
    get_or_create_profile,
    refresh_nonce,
    AuthenticationError,
    InvalidSignatureError,
    NonceExpiredError,
    InvalidAddressError,
)

logger = logging.getLogger(__name__)

                                   
ETH_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')


def validate_ethereum_address(address: str) -> bool:
    return bool(ETH_ADDRESS_PATTERN.match(address))


class NonceView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, wallet_address: str):
        if not validate_ethereum_address(wallet_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        wallet_address = wallet_address.lower()
        
        try:
                                   
            profile, created = get_or_create_profile(wallet_address)
            
                                                         
            if not created:
                refresh_nonce(profile)
            
                                               
            message = get_signing_message(wallet_address, profile.nonce)
            
                                  
            from core.services.auth import NONCE_EXPIRATION_MINUTES
            expires_in_seconds = NONCE_EXPIRATION_MINUTES * 60
            
            return Response({
                'wallet_address': profile.wallet_address,
                'nonce': profile.nonce,
                'message': message,
                'expires_in_seconds': expires_in_seconds,
            })
            
        except InvalidAddressError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error generating nonce: {e}")
            return Response(
                {'error': 'Failed to generate nonce'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyView(APIView):
    
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        wallet_address = request.data.get('wallet_address')
        signature = request.data.get('signature')
        message = request.data.get('message')
        
                                  
        if not wallet_address:
            return Response(
                {'error': 'wallet_address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not signature:
            return Response(
                {'error': 'signature is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not message:
            return Response(
                {'error': 'message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
                                 
        if not validate_ethereum_address(wallet_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
                          
            profile, tokens = authenticate_with_signature(
                wallet_address=wallet_address,
                signature=signature,
                message=message
            )
            
                            
            from core.api.serializers import ProfilePublicSerializer
            profile_data = ProfilePublicSerializer(profile).data
            
            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'profile': profile_data,
            })
            
        except NonceExpiredError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except InvalidSignatureError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except InvalidAddressError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except AuthenticationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogoutView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
                                 
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({
                'message': 'Successfully logged out'
            })
            
        except TokenError as e:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error during logout: {e}")
            return Response(
                {'error': 'Logout failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TokenRefreshView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            token = RefreshToken(refresh_token)
            
            return Response({
                'access': str(token.access_token),
            })
            
        except TokenError as e:
            return Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return Response(
                {'error': 'Token refresh failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MeView(APIView):
    
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
                                                                         
        if hasattr(request.user, 'profile'):
            from core.api.serializers import ProfilePublicSerializer
            return Response(ProfilePublicSerializer(request.user.profile).data)
        
                                                          
        wallet_address = None
        
        if hasattr(request.user, 'wallet_address'):
            wallet_address = request.user.wallet_address
        elif hasattr(request, 'auth') and request.auth:
            wallet_address = request.auth.get('wallet_address')
        
        if not wallet_address:
                                                     
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                try:
                    from rest_framework_simplejwt.tokens import AccessToken
                    token = AccessToken(auth_header.split(' ')[1])
                    wallet_address = token.get('wallet_address')
                except Exception:
                    pass
        
        if not wallet_address:
            return Response(
                {'error': 'Could not determine wallet address from token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            profile = Profile.objects.get(wallet_address=wallet_address.lower())
            
            from core.api.serializers import ProfilePublicSerializer
            return Response(ProfilePublicSerializer(profile).data)
            
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
