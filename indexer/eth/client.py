
import time
from typing import Any, List, Optional

from web3 import Web3
from web3.types import BlockIdentifier, LogReceipt

from config import Config
from log import get_logger

logger = get_logger(__name__)


class EthereumClient:

    def __init__(self, config: Config):
        self.config = config
        self.web3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
                           
        if not self.web3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC: {config.rpc_url}")
        
        logger.info(f"Connected to Ethereum RPC: {config.rpc_url}")

    def get_latest_block(self) -> int:
        latest = self.web3.eth.block_number
        confirmed = max(0, latest - self.config.confirmations)
        return confirmed

    def get_block_hash(self, block_number: int) -> str:
        try:
            block = self.web3.eth.get_block(block_number)
            return block["hash"].hex()
        except Exception as e:
            raise ValueError(f"Failed to get block hash for block {block_number}: {e}") from e

    def get_logs(
        self,
        address: Optional[str],
        from_block: int,
        to_block: int,
        topics: Optional[List[Optional[str]]] = None,
    ) -> List[LogReceipt]:
        max_retries = 3
        retry_delay = 1

        for attempt in range(max_retries):
            try:
                filter_params: dict[str, Any] = {
                    "fromBlock": from_block,
                    "toBlock": to_block,
                }
                
                if address:
                    filter_params["address"] = Web3.to_checksum_address(address)
                
                if topics:
                                                                      
                                                                                     
                    filter_params["topics"] = topics

                logs = self.web3.eth.get_logs(filter_params)
                return logs

            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(
                        f"RPC error (attempt {attempt + 1}/{max_retries}): {e}. Retrying..."
                    )
                    time.sleep(retry_delay * (attempt + 1))
                else:
                    logger.error(f"Failed to get logs after {max_retries} attempts: {e}")
                    raise

        return []                           

    def get_block(self, block_number: int) -> dict[str, Any]:
        return dict(self.web3.eth.get_block(block_number))

