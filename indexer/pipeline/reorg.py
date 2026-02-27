
from typing import List

from config import Config
from db.models import Campaign, Contribution, Event, SyncState
from db.session import get_session
from eth.client import EthereumClient
from eth.decoder import decode_campaign_event, decode_factory_event
from log import get_logger
from services.state_updater import apply_event_state_update

logger = get_logger(__name__)


class ReorgHandler:

    def __init__(self, config: Config, eth_client: EthereumClient):
        self.config = config
        self.eth_client = eth_client
        self.rollback_blocks = config.reorg_rollback_blocks

    def check_reorg(self, block_number: int) -> bool:
        with get_session() as session:
            sync_state = (
                session.query(SyncState)
                .filter(SyncState.chain_id == self.config.chain_id)
                .first()
            )

            if not sync_state or sync_state.last_block < block_number:
                                                             
                return False

            if sync_state.last_block == block_number:
                                  
                stored_hash = sync_state.last_block_hash
                if stored_hash:
                    current_hash = self.eth_client.get_block_hash(block_number)
                    if stored_hash.lower() != current_hash.lower():
                        logger.warning(
                            f"Reorg detected at block {block_number}: "
                            f"stored={stored_hash}, current={current_hash}"
                        )
                        return True

        return False

    def handle_reorg(self, from_block: int, to_block: int) -> None:
        logger.warning(f"Handling reorg: rolling back blocks {from_block} to {to_block}")

        with get_session() as session:
                                             
            affected_events = (
                session.query(Event)
                .filter(
                    Event.chain_id == self.config.chain_id,
                    Event.block_number >= from_block,
                    Event.block_number <= to_block,
                    Event.removed == False,
                )
                .all()
            )

            for event in affected_events:
                event.removed = True
                logger.debug(f"Marked event as removed: {event.tx_hash}:{event.log_index}")

                               
            sync_state = (
                session.query(SyncState)
                .filter(SyncState.chain_id == self.config.chain_id)
                .first()
            )
            if sync_state:
                sync_state.last_block = from_block - 1
                if from_block > 0:
                    sync_state.last_block_hash = self.eth_client.get_block_hash(from_block - 1)
                else:
                    sync_state.last_block_hash = None

            session.commit()

        logger.info(f"Rolled back {len(affected_events)} events from blocks {from_block}-{to_block}")

                                           
        self._rebuild_state(from_block, to_block)

    def _rebuild_state(self, from_block: int, to_block: int) -> None:
        logger.info(f"Rebuilding state for blocks {from_block} to {to_block}")

                                                                             
        with get_session() as session:
            events = (
                session.query(Event)
                .filter(
                    Event.chain_id == self.config.chain_id,
                    Event.block_number >= from_block,
                    Event.block_number <= to_block,
                    Event.removed == False,
                )
                .order_by(Event.block_number, Event.log_index)
                .all()
            )

        if not events:
            logger.info("No events to replay")
            return

        logger.info(f"Replaying {len(events)} events")

                                                 
        with get_session() as session:
                                             
            affected_campaigns = {e.address.lower() for e in events if e.address}

                                                         
            for campaign_address in affected_campaigns:
                campaign = (
                    session.query(Campaign)
                    .filter(Campaign.address == campaign_address)
                    .first()
                )
                if campaign:
                                                                                  
                    campaign.total_raised_wei = 0
                    campaign.withdrawn = False
                    campaign.withdrawn_amount_wei = None
                    if campaign.status not in ["WITHDRAWN"]:
                        campaign.status = "ACTIVE"

                                                        
            contributions = (
                session.query(Contribution)
                .filter(Contribution.campaign_address.in_(affected_campaigns))
                .all()
            )
            for contribution in contributions:
                contribution.contributed_wei = 0
                contribution.refunded_wei = 0

            session.commit()

                                
        for event in events:
            try:
                                  
                import json
                event_data = json.loads(event.event_data)

                                    
                with get_session() as session:
                    apply_event_state_update(
                        session=session,
                        chain_id=self.config.chain_id,
                        event_name=event.event_name,
                        event_data=event_data,
                        block_number=event.block_number,
                        block_hash=event.block_hash,
                        tx_hash=event.tx_hash,
                        log_index=event.log_index,
                    )

            except Exception as e:
                logger.error(f"Error replaying event {event.tx_hash}:{event.log_index}: {e}")

        logger.info("State rebuild complete")

