
import logging
from datetime import timedelta
from typing import Any, Optional
from django.conf import settings
from django.utils import timezone
from core.models import Campaign, CampaignMetadata
from core.services.ipfs import IPFSGatewayClient, IPFSGatewayError

logger = logging.getLogger(__name__)


class MetadataResolverError(Exception):
    pass


class CampaignNotFoundError(MetadataResolverError):
    pass


class MetadataFetchError(MetadataResolverError):
    pass


class MetadataResolver:
    
                                     
    DEFAULT_CACHE_DURATION_HOURS = 24
    
    def __init__(
        self,
        ipfs_client: Optional[IPFSGatewayClient] = None,
        cache_duration_hours: Optional[int] = None
    ):
        self.ipfs_client = ipfs_client or IPFSGatewayClient()
        self.cache_duration = timedelta(hours=cache_duration_hours or getattr(
            settings, 'METADATA_CACHE_DURATION_HOURS', self.DEFAULT_CACHE_DURATION_HOURS
        ))
    
    def _is_cache_valid(self, metadata: CampaignMetadata) -> bool:
        if not metadata.ipfs_fetched_at:
            return False
        
        expiry_time = metadata.ipfs_fetched_at + self.cache_duration
        return timezone.now() < expiry_time
    
    def _parse_metadata(self, raw_json: dict[str, Any]) -> dict[str, Any]:
                                                                     
        return {
            'name': raw_json.get('name') or raw_json.get('title'),
            'description': raw_json.get('description'),
            'short_description': (
                raw_json.get('short_description') or
                raw_json.get('shortDescription') or
                raw_json.get('summary')
            ),
            'image_cid': (
                raw_json.get('image') or
                raw_json.get('image_cid') or
                raw_json.get('imageCid')
            ),
            'banner_cid': (
                raw_json.get('banner') or
                raw_json.get('banner_cid') or
                raw_json.get('bannerCid') or
                raw_json.get('cover')
            ),
            'category': raw_json.get('category'),
            'tags': raw_json.get('tags', []),
            'location': raw_json.get('location'),
            'creator_name': (
                raw_json.get('creator_name') or
                raw_json.get('creatorName') or
                raw_json.get('author')
            ),
            'creator_avatar_cid': (
                raw_json.get('creator_avatar') or
                raw_json.get('creatorAvatar') or
                raw_json.get('avatar')
            ),
            'website_url': (
                raw_json.get('website') or
                raw_json.get('website_url') or
                raw_json.get('url')
            ),
            'twitter_handle': (
                raw_json.get('twitter') or
                raw_json.get('twitter_handle') or
                raw_json.get('twitterHandle')
            ),
            'discord_url': (
                raw_json.get('discord') or
                raw_json.get('discord_url') or
                raw_json.get('discordUrl')
            ),
        }
    
    def _get_campaign(self, campaign_address: str) -> Campaign:
        try:
            return Campaign.objects.get(address__iexact=campaign_address)
        except Campaign.DoesNotExist:
            raise CampaignNotFoundError(f"Campaign not found: {campaign_address}")
    
    def resolve(self, campaign_address: str, force_refresh: bool = False) -> Optional[CampaignMetadata]:
        campaign = self._get_campaign(campaign_address)
        
                                     
        if not campaign.cid:
            logger.debug(f"Campaign {campaign_address} has no CID")
            return None
        
                                      
        try:
            metadata = CampaignMetadata.objects.get(campaign=campaign)
            
                                                            
            if not force_refresh and self._is_cache_valid(metadata):
                logger.debug(f"Returning cached metadata for {campaign_address}")
                return metadata
            
                                       
            logger.info(f"Refreshing metadata for {campaign_address}")
            return self._fetch_and_update(campaign, metadata)
            
        except CampaignMetadata.DoesNotExist:
                                 
            logger.info(f"Creating new metadata for {campaign_address}")
            return self._fetch_and_create(campaign)
    
    def refresh(self, campaign_address: str) -> Optional[CampaignMetadata]:
        return self.resolve(campaign_address, force_refresh=True)
    
    def _fetch_and_create(self, campaign: Campaign) -> CampaignMetadata:
        try:
            raw_json = self.ipfs_client.fetch_json_sync(campaign.cid)
        except IPFSGatewayError as e:
            raise MetadataFetchError(f"Failed to fetch metadata: {e}") from e
        
        parsed = self._parse_metadata(raw_json)
        
        metadata = CampaignMetadata.objects.create(
            campaign=campaign,
            cid=campaign.cid,
            raw_json=raw_json,
            ipfs_fetched_at=timezone.now(),
            **parsed
        )
        
        logger.info(f"Created metadata for campaign {campaign.address}")
        return metadata
    
    def _fetch_and_update(
        self,
        campaign: Campaign,
        metadata: CampaignMetadata
    ) -> CampaignMetadata:
        try:
            raw_json = self.ipfs_client.fetch_json_sync(campaign.cid)
        except IPFSGatewayError as e:
            raise MetadataFetchError(f"Failed to fetch metadata: {e}") from e
        
        parsed = self._parse_metadata(raw_json)
        
                           
        metadata.cid = campaign.cid
        metadata.raw_json = raw_json
        metadata.ipfs_fetched_at = timezone.now()
        
        for field, value in parsed.items():
            setattr(metadata, field, value)
        
        metadata.save()
        
        logger.info(f"Updated metadata for campaign {campaign.address}")
        return metadata
    
    def get_cached(self, campaign_address: str) -> Optional[CampaignMetadata]:
        try:
            return CampaignMetadata.objects.select_related('campaign').get(
                campaign__address__iexact=campaign_address
            )
        except CampaignMetadata.DoesNotExist:
            return None
    
    def bulk_resolve(
        self,
        campaign_addresses: list[str],
        skip_errors: bool = True
    ) -> dict[str, Optional[CampaignMetadata]]:
        results = {}
        
        for address in campaign_addresses:
            try:
                results[address] = self.resolve(address)
            except MetadataResolverError as e:
                logger.warning(f"Error resolving metadata for {address}: {e}")
                if skip_errors:
                    results[address] = None
                else:
                    raise
        
        return results
