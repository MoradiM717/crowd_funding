
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenVerifyView,
)
from core.api.views import (
    ChainViewSet,
    SyncStateView,
    CampaignViewSet,
    CreatorCampaignsView,
    DonorContributionsView,
    EventViewSet
)
from core.api.stats_views import (
    PlatformStatsView,
    TrendingCampaignsView,
    CampaignLeaderboardView,
    DonorLeaderboardView,
    CreatorStatsView,
)
from core.api.auth_views import (
    NonceView,
    VerifyView,
    LogoutView,
    TokenRefreshView,
    MeView,
)
from core.api.profile_views import (
    ProfileViewSet,
    ProfileMeView,
    ProfileConnectView,
)

router = DefaultRouter()
router.register(r'chains', ChainViewSet, basename='chain')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'events', EventViewSet, basename='event')
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
                                                                                               
    path('profiles/me/', ProfileMeView.as_view(), name='profile-me'),
    path('profiles/connect/', ProfileConnectView.as_view(), name='profile-connect'),
    
                                   
    path('auth/nonce/<str:wallet_address>/', NonceView.as_view(), name='auth-nonce'),
    path('auth/verify/', VerifyView.as_view(), name='auth-verify'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token-verify'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    
                                                       
    path('auth/token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    
                                                                   
    path('', include(router.urls)),
    
                      
    path('chains/<int:chain_id>/sync-state/', SyncStateView.as_view(), name='chain-sync-state'),
    path('creators/<str:creator_address>/campaigns/', CreatorCampaignsView.as_view(), name='creator-campaigns'),
    path('donors/<str:donor_address>/contributions/', DonorContributionsView.as_view(), name='donor-contributions'),
    
                          
    path('stats/platform/', PlatformStatsView.as_view(), name='platform-stats'),
    path('stats/trending/', TrendingCampaignsView.as_view(), name='trending-campaigns'),
    path('stats/leaderboard/campaigns/', CampaignLeaderboardView.as_view(), name='campaign-leaderboard'),
    path('stats/leaderboard/donors/', DonorLeaderboardView.as_view(), name='donor-leaderboard'),
    path('stats/creator/<str:creator_address>/', CreatorStatsView.as_view(), name='creator-stats'),
]
