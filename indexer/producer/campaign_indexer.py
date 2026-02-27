
from typing import List, Set

from web3.types import LogReceipt

from config import Config
from db.models import Campaign
from db.session import get_session
from eth.client import EthereumClient
from eth.decoder import decode_campaign_event
from eth.topics import get_all_campaign_topics
from log import get_logger
from producer.publisher import EventPublisher

logger = get_logger(__name__)


class ProducerCampaignIndexer:

    def __init__(
        self,
        config: Config,
        eth_client: EthereumClient,
        publisher: EventPublisher,
    ):
        self.config = config
        self.eth_client = eth_client
        self.publisher = publisher

    def get_known_campaign_addresses(self) -> Set[str]:
        with get_session() as session:
            campaigns = session.query(Campaign).all()
            addresses = {c.address.lower() for c in campaigns}
            logger.debug(f"Found {len(addresses)} known campaigns in database")
            return addresses

    def index_block_range(
        self,
        from_block: int,
        to_block: int,
        campaign_addresses: Set[str] = None,
    ) -> int:
        if campaign_addresses is None:
            campaign_addresses = self.get_known_campaign_addresses()

        if not campaign_addresses:
            logger.debug("No known campaigns to index")
            return 0

        logger.info(
            f"Fetching Campaign events from block {from_block} to {to_block} "
            f"for {len(campaign_addresses)} campaigns"
        )

                                       
        topics = get_all_campaign_topics()

                                      
        all_logs: List[LogReceipt] = []
        batch_size = 50
        campaign_list = list(campaign_addresses)

        for i in range(0, len(campaign_list), batch_size):
            batch = campaign_list[i : i + batch_size]
            for address in batch:
                try:
                                                               
                    for topic in topics:
                        logs = self.eth_client.get_logs(
                            address=address,
                            from_block=from_block,
                            to_block=to_block,
                            topics=[topic],
                        )
                        all_logs.extend(logs)
                except Exception as e:
                    logger.warning(f"Error fetching logs for campaign {address}: {e}")

        if not all_logs:
            logger.debug(f"No Campaign events found in blocks {from_block}-{to_block}")
            return 0

        logger.info(f"Found {len(all_logs)} Campaign events in blocks {from_block}-{to_block}")

                                    
        events_published = 0
        for log in all_logs:
            try:
                              
                decoded = decode_campaign_event(log)
                if not decoded:
                    logger.warning(
                        f"Failed to decode Campaign event: {log['transactionHash'].hex()}"
                    )
                    continue

                                              
                block = self.eth_client.get_block(log["blockNumber"])
                block_hash = block["hash"].hex() if hasattr(block["hash"], "hex") else block["hash"]
                timestamp = block.get("timestamp", 0)

                                     
                success = self.publisher.publish_event(
                    event_type=decoded["event_name"],
                    chain_id=self.config.chain_id,
                    block_number=decoded["block_number"],
                    block_hash=block_hash,
                    tx_hash=decoded["tx_hash"],
                    log_index=decoded["log_index"],
                    address=decoded["address"],
                    timestamp=timestamp,
                    event_data=decoded["args"],
                )

                if success:
                    events_published += 1
                    logger.debug(
                        f"Published {decoded['event_name']}: campaign={decoded['address']}"
                    )

            except Exception as e:
                logger.error(f"Error processing Campaign event: {e}", exc_info=True)

        logger.info(f"Published {events_published} Campaign events from blocks {from_block}-{to_block}")
        return events_published
