
import logging
from datetime import timedelta
from django.db.models import Sum, Count, Avg, F, Q, Window
from django.db.models.functions import Coalesce, RowNumber
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import Campaign, Contribution
from core.api.stats_serializers import (
    PlatformStatsSerializer,
    TrendingCampaignSerializer,
    CampaignLeaderboardSerializer,
    DonorLeaderboardSerializer,
    CreatorStatsSerializer,
)
from core.utils.formatting import wei_to_eth

logger = logging.getLogger(__name__)


class PlatformStatsView(APIView):
    
    def get(self, request):
                                   
        campaign_stats = Campaign.objects.aggregate(
            total_campaigns=Count('address'),
            active_campaigns=Count('address', filter=Q(status='ACTIVE')),
            successful_campaigns=Count('address', filter=Q(status='SUCCESS')),
            failed_campaigns=Count('address', filter=Q(status='FAILED')),
            withdrawn_campaigns=Count('address', filter=Q(status='WITHDRAWN')),
            total_raised_wei=Coalesce(Sum('total_raised_wei'), 0),
            total_goal_wei=Coalesce(Sum('goal_wei'), 0),
        )
        
                            
        contribution_stats = Contribution.objects.aggregate(
            total_contributions=Count('id'),
            unique_donors=Count('donor_address', distinct=True),
        )
        
                                 
        total_campaigns = campaign_stats['total_campaigns'] or 0
        successful_campaigns = campaign_stats['successful_campaigns'] or 0
        
                                                                             
        completed_campaigns = successful_campaigns + (campaign_stats['failed_campaigns'] or 0)
        success_rate = (
            (successful_campaigns / completed_campaigns * 100)
            if completed_campaigns > 0
            else 0.0
        )
        
        stats = {
            'total_campaigns': total_campaigns,
            'active_campaigns': campaign_stats['active_campaigns'] or 0,
            'successful_campaigns': successful_campaigns,
            'failed_campaigns': campaign_stats['failed_campaigns'] or 0,
            'withdrawn_campaigns': campaign_stats['withdrawn_campaigns'] or 0,
            'total_raised_wei': campaign_stats['total_raised_wei'],
            'total_raised_eth': wei_to_eth(campaign_stats['total_raised_wei']),
            'total_goal_wei': campaign_stats['total_goal_wei'],
            'total_goal_eth': wei_to_eth(campaign_stats['total_goal_wei']),
            'total_contributions': contribution_stats['total_contributions'] or 0,
            'unique_donors': contribution_stats['unique_donors'] or 0,
            'success_rate': round(success_rate, 2),
        }
        
        serializer = PlatformStatsSerializer(stats)
        return Response(serializer.data)


class TrendingCampaignsView(APIView):
    
    PERIOD_MAP = {
        '24h': timedelta(hours=24),
        '7d': timedelta(days=7),
        '30d': timedelta(days=30),
    }
    
    def get(self, request):
        period = request.query_params.get('period', '7d')
        limit = min(int(request.query_params.get('limit', 10)), 50)
        trending_type = request.query_params.get('type', 'recent_donations')
        
                         
        if period not in self.PERIOD_MAP:
            return Response(
                {'error': f'Invalid period. Choose from: {list(self.PERIOD_MAP.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_threshold = timezone.now() - self.PERIOD_MAP[period]
        
        if trending_type == 'close_to_goal':
                                                                               
            campaigns = Campaign.objects.filter(
                status='ACTIVE'
            ).annotate(
                progress=F('total_raised_wei') * 100 / F('goal_wei')
            ).filter(
                progress__lt=100,                   
                progress__gte=50,                       
            ).order_by('-progress')[:limit]
            
                                                  
            for campaign in campaigns:
                campaign.recent_contributions_count = 0
                campaign.recent_raised_wei = 0
            
        else:
                                                                   
                                                                               
            campaigns = Campaign.objects.filter(
                status='ACTIVE'
            ).annotate(
                recent_contributions_count=Count(
                    'contributions',
                    filter=Q(contributions__updated_at__gte=time_threshold)
                ),
                recent_raised_wei=Coalesce(
                    Sum(
                        'contributions__contributed_wei',
                        filter=Q(contributions__updated_at__gte=time_threshold)
                    ),
                    0
                )
            ).filter(
                recent_contributions_count__gt=0
            ).order_by('-recent_contributions_count', '-recent_raised_wei')[:limit]
        
        serializer = TrendingCampaignSerializer(campaigns, many=True)
        return Response({
            'period': period,
            'type': trending_type,
            'count': len(serializer.data),
            'results': serializer.data
        })


class CampaignLeaderboardView(APIView):
    
    def get(self, request):
        limit = min(int(request.query_params.get('limit', 10)), 100)
        offset = int(request.query_params.get('offset', 0))
        status_filter = request.query_params.get('status')
        
                        
        campaigns = Campaign.objects.all()
        
        if status_filter:
            campaigns = campaigns.filter(status__iexact=status_filter)
        
                                          
        campaigns = campaigns.annotate(
            contributions_count=Count('contributions'),
        ).order_by('-total_raised_wei')
        
                          
        campaigns = campaigns[offset:offset + limit]
        
                                                    
        results = []
        for idx, campaign in enumerate(campaigns, start=offset + 1):
            campaign.rank = idx
            results.append(campaign)
        
        serializer = CampaignLeaderboardSerializer(results, many=True)
        return Response({
            'count': Campaign.objects.count(),
            'offset': offset,
            'limit': limit,
            'results': serializer.data
        })


class DonorLeaderboardView(APIView):
    
    def get(self, request):
        limit = min(int(request.query_params.get('limit', 10)), 100)
        offset = int(request.query_params.get('offset', 0))
        
                                          
        donors = Contribution.objects.values('donor_address').annotate(
            total_contributed_wei=Coalesce(Sum('contributed_wei'), 0),
            total_refunded_wei=Coalesce(Sum('refunded_wei'), 0),
            net_contributed_wei=Coalesce(Sum('contributed_wei'), 0) - Coalesce(Sum('refunded_wei'), 0),
            campaigns_supported=Count('campaign_address', distinct=True),
        ).filter(
            net_contributed_wei__gt=0                                               
        ).order_by('-net_contributed_wei')
        
        total_count = donors.count()
        donors = list(donors[offset:offset + limit])
        
                  
        for idx, donor in enumerate(donors, start=offset + 1):
            donor['rank'] = idx
        
        serializer = DonorLeaderboardSerializer(donors, many=True)
        return Response({
            'count': total_count,
            'offset': offset,
            'limit': limit,
            'results': serializer.data
        })


class CreatorStatsView(APIView):
    
    def get(self, request, creator_address):
                                 
        import re
        if not re.match(r'^0x[a-fA-F0-9]{40}$', creator_address):
            return Response(
                {'error': 'Invalid Ethereum address format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
                                       
        campaigns = Campaign.objects.filter(
            creator_address__iexact=creator_address
        )
        
        if not campaigns.exists():
            return Response(
                {'error': 'No campaigns found for this creator'},
                status=status.HTTP_404_NOT_FOUND
            )
        
                         
        stats = campaigns.aggregate(
            total_campaigns=Count('address'),
            active_campaigns=Count('address', filter=Q(status='ACTIVE')),
            successful_campaigns=Count('address', filter=Q(status='SUCCESS')),
            failed_campaigns=Count('address', filter=Q(status='FAILED')),
            total_raised_wei=Coalesce(Sum('total_raised_wei'), 0),
            total_goal_wei=Coalesce(Sum('goal_wei'), 0),
            total_withdrawn_wei=Coalesce(
                Sum('withdrawn_amount_wei', filter=Q(withdrawn=True)),
                0
            ),
        )
        
                                   
        total_campaigns = stats['total_campaigns'] or 0
        successful_campaigns = stats['successful_campaigns'] or 0
        completed_campaigns = successful_campaigns + (stats['failed_campaigns'] or 0)
        
        success_rate = (
            (successful_campaigns / completed_campaigns * 100)
            if completed_campaigns > 0
            else 0.0
        )
        
                                               
        total_goal = stats['total_goal_wei'] or 0
        total_raised = stats['total_raised_wei'] or 0
        average_progress = (
            (total_raised / total_goal * 100)
            if total_goal > 0
            else 0.0
        )
        
        result = {
            'creator_address': creator_address,
            'total_campaigns': total_campaigns,
            'active_campaigns': stats['active_campaigns'] or 0,
            'successful_campaigns': successful_campaigns,
            'failed_campaigns': stats['failed_campaigns'] or 0,
            'total_raised_wei': stats['total_raised_wei'],
            'total_goal_wei': stats['total_goal_wei'],
            'total_withdrawn_wei': stats['total_withdrawn_wei'],
            'success_rate': round(success_rate, 2),
            'average_progress_percent': round(average_progress, 2),
        }
        
        serializer = CreatorStatsSerializer(result)
        return Response(serializer.data)
