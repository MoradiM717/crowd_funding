
import logging
import re
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch
from core.models import Chain, SyncState, Campaign, Contribution, Event, CampaignMetadata
from core.api.serializers import (
    ChainSerializer,
    SyncStateSerializer,
    CampaignSerializer,
    CampaignDetailSerializer,
    CampaignDetailWithMetadataSerializer,
    CampaignWithMetadataSerializer,
    ContributionSerializer,
    ContributionWithCampaignSerializer,
    EventSerializer,
    CampaignMetadataSerializer,
)
from core.api.filters import CampaignFilter, EventFilter
from core.services.metadata_resolver import (
    MetadataResolver,
    CampaignNotFoundError,
    MetadataFetchError,
)

logger = logging.getLogger(__name__)


ETH_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')


def validate_ethereum_address(address: str) -> bool:
    return bool(ETH_ADDRESS_PATTERN.match(address))


class ChainViewSet(viewsets.ReadOnlyModelViewSet):
    
    queryset = Chain.objects.all()
    serializer_class = ChainSerializer
    lookup_field = 'chain_id'


class SyncStateView(APIView):
    
    def get(self, request, chain_id):
        sync_state = get_object_or_404(SyncState, chain_id=chain_id)
        serializer = SyncStateSerializer(sync_state)
        return Response(serializer.data)


class CampaignViewSet(viewsets.ReadOnlyModelViewSet):
    
    queryset = Campaign.objects.all().select_related()
    serializer_class = CampaignSerializer
    filterset_class = CampaignFilter
    search_fields = ['address', 'creator_address', 'factory_address', 'cid']
    ordering_fields = ['created_at', 'deadline_ts', 'goal_wei', 'total_raised_wei']
    ordering = ['-created_at']
    lookup_field = 'address'
    
    def get_serializer_class(self):
        include_metadata = self.request.query_params.get('include_metadata', '').lower() == 'true'
        
        if self.action == 'retrieve':
            if include_metadata:
                return CampaignDetailWithMetadataSerializer
            return CampaignDetailSerializer
        
        if self.action == 'list' and include_metadata:
            return CampaignWithMetadataSerializer
        
        return CampaignSerializer
    
    def get_queryset(self):
        qs = Campaign.objects.all().select_related()
        
                                        
        include_metadata = self.request.query_params.get('include_metadata', '').lower() == 'true'
        if include_metadata:
            qs = qs.prefetch_related('metadata')
        
        return qs
    
    @action(detail=True, methods=['get'])
    def contributions(self, request, address=None):
        campaign = self.get_object()
        contributions = Contribution.objects.filter(
            campaign_address=campaign
        ).select_related('campaign_address')
        
                    
        page = self.paginate_queryset(contributions)
        if page is not None:
            serializer = ContributionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ContributionSerializer(contributions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def events(self, request, address=None):
        campaign = self.get_object()
        events = Event.objects.filter(
            address=campaign
        ).select_related('chain_id', 'address')
        
                   
        event_name = request.query_params.get('event_name')
        if event_name:
            events = events.filter(event_name__iexact=event_name)
        
        removed = request.query_params.get('removed')
        if removed is not None:
            events = events.filter(removed=removed.lower() == 'true')
        
                  
        events = events.order_by('-block_number', '-id')
        
                    
        page = self.paginate_queryset(events)
        if page is not None:
            serializer = EventSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='metadata')
    def metadata(self, request, address=None):
        campaign = self.get_object()
        
        if not campaign.cid:
            return Response(
                {
                    'detail': 'Campaign has no IPFS CID.',
                    'has_cid': False,
                    'cid': None,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            resolver = MetadataResolver()
                                                                       
            metadata = resolver.resolve(campaign.address)
            
            if metadata:
                serializer = CampaignMetadataSerializer(metadata)
                return Response(serializer.data)
            
            return Response(
                {
                    'detail': 'Could not resolve metadata.',
                    'has_cid': True,
                    'cid': campaign.cid,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except MetadataFetchError as e:
            logger.warning(f"Failed to fetch metadata for {address}: {e}")
                                                              
            try:
                cached = CampaignMetadata.objects.get(campaign=campaign)
                serializer = CampaignMetadataSerializer(cached)
                return Response({
                    **serializer.data,
                    '_warning': 'Returning stale cache - IPFS fetch failed'
                })
            except CampaignMetadata.DoesNotExist:
                return Response(
                    {
                        'detail': f'Failed to fetch metadata from IPFS: {str(e)}',
                        'has_cid': True,
                        'cid': campaign.cid,
                    },
                    status=status.HTTP_502_BAD_GATEWAY
                )
    
    @action(detail=True, methods=['post'], url_path='metadata/refresh')
    def metadata_refresh(self, request, address=None):
        campaign = self.get_object()
        
        if not campaign.cid:
            return Response(
                {'detail': 'Campaign has no IPFS CID.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            resolver = MetadataResolver()
            metadata = resolver.refresh(campaign.address)
            
            if metadata:
                serializer = CampaignMetadataSerializer(metadata)
                return Response(serializer.data)
            
            return Response(
                {'detail': 'Failed to fetch metadata from IPFS.'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except MetadataFetchError as e:
            logger.error(f"Failed to refresh metadata for {address}: {e}")
            return Response(
                {'detail': f'Failed to fetch metadata: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )


class CreatorCampaignsView(APIView):
    
    def get(self, request, creator_address):
                                 
        if not validate_ethereum_address(creator_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campaigns = Campaign.objects.filter(
            creator_address__iexact=creator_address
        ).select_related()
        
                                           
        filterset = CampaignFilter(request.query_params, queryset=campaigns)
        campaigns = filterset.qs
        
                  
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering:
            campaigns = campaigns.order_by(ordering)
        
                    
        page_size = 50
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        serializer = CampaignSerializer(campaigns[start:end], many=True)
        
        return Response({
            'count': campaigns.count(),
            'next': f"?page={page + 1}" if end < campaigns.count() else None,
            'previous': f"?page={page - 1}" if page > 1 else None,
            'results': serializer.data
        })


class DonorContributionsView(APIView):
    
    def get(self, request, donor_address):
                                 
        if not validate_ethereum_address(donor_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        contributions = Contribution.objects.filter(
            donor_address__iexact=donor_address
        ).select_related('campaign_address')
        
                  
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering:
            contributions = contributions.order_by(ordering)
        
                    
        page_size = 50
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        serializer = ContributionWithCampaignSerializer(contributions[start:end], many=True)
        
        return Response({
            'count': contributions.count(),
            'next': f"?page={page + 1}" if end < contributions.count() else None,
            'previous': f"?page={page - 1}" if page > 1 else None,
            'results': serializer.data
        })


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    
    queryset = Event.objects.all().select_related('chain_id', 'address')
    serializer_class = EventSerializer
    filterset_class = EventFilter
    search_fields = ['tx_hash', 'address__address', 'event_name']
    ordering_fields = ['block_number', 'id', 'created_at']
    ordering = ['-block_number', '-id']

