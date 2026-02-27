
import logging
from typing import Any, Optional
from django.conf import settings
import httpx

logger = logging.getLogger(__name__)


class IPFSGatewayError(Exception):
    pass


class IPFSFetchError(IPFSGatewayError):
    pass


class IPFSTimeoutError(IPFSGatewayError):
    pass


class IPFSGatewayClient:
    
    def __init__(
        self,
        gateway_url: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.gateway_url = gateway_url or getattr(
            settings, 'IPFS_GATEWAY_URL', 'https://ipfs.io/ipfs/'
        )
        self.timeout = timeout or getattr(settings, 'IPFS_FETCH_TIMEOUT', 30)
        
                                        
        if not self.gateway_url.endswith('/'):
            self.gateway_url += '/'
    
    def _build_url(self, cid: str) -> str:
                             
        if cid.startswith('ipfs://'):
            cid = cid[7:]
        return f"{self.gateway_url}{cid}"
    
    def get_gateway_url(self, cid: str) -> str:
        if cid.startswith('ipfs://'):
            cid = cid[7:]
        return f"{self.gateway_url}{cid}"
    
    async def fetch_json(self, cid: str) -> dict[str, Any]:
        url = self._build_url(cid)
        logger.debug(f"Fetching IPFS content from: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException as e:
            logger.error(f"Timeout fetching IPFS content: {cid}")
            raise IPFSTimeoutError(f"Timeout fetching CID: {cid}") from e
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching IPFS content: {e.response.status_code}")
            raise IPFSFetchError(
                f"HTTP {e.response.status_code} fetching CID: {cid}"
            ) from e
        except Exception as e:
            logger.error(f"Error fetching IPFS content: {e}")
            raise IPFSFetchError(f"Failed to fetch CID: {cid}") from e
    
    def fetch_json_sync(self, cid: str) -> dict[str, Any]:
        url = self._build_url(cid)
        logger.debug(f"Fetching IPFS content (sync) from: {url}")
        
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException as e:
            logger.error(f"Timeout fetching IPFS content: {cid}")
            raise IPFSTimeoutError(f"Timeout fetching CID: {cid}") from e
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching IPFS content: {e.response.status_code}")
            raise IPFSFetchError(
                f"HTTP {e.response.status_code} fetching CID: {cid}"
            ) from e
        except Exception as e:
            logger.error(f"Error fetching IPFS content: {e}")
            raise IPFSFetchError(f"Failed to fetch CID: {cid}") from e
    
    async def fetch_raw(self, cid: str) -> bytes:
        url = self._build_url(cid)
        logger.debug(f"Fetching raw IPFS content from: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.content
        except httpx.TimeoutException as e:
            logger.error(f"Timeout fetching IPFS content: {cid}")
            raise IPFSTimeoutError(f"Timeout fetching CID: {cid}") from e
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching IPFS content: {e.response.status_code}")
            raise IPFSFetchError(
                f"HTTP {e.response.status_code} fetching CID: {cid}"
            ) from e
        except Exception as e:
            logger.error(f"Error fetching IPFS content: {e}")
            raise IPFSFetchError(f"Failed to fetch CID: {cid}") from e
