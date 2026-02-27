
import json
from typing import Dict, Any

from sqlalchemy.orm import Session

from db.models import Campaign, Contribution, Event
from db.session import get_session
from log import get_logger
from consumer.state_updater import ConsumerStateUpdater

logger = get_logger(__name__)


class RollbackHandler:

    def __init__(self, chain_id: int):
        self.chain_id = chain_id
        self.state_updater = ConsumerStateUpdater(chain_id)

    def handle_rollback(
        self,
        session: Session,
        from_block: int,
        to_block: int,
        reason: str,
    ) -> None:
        logger.warning(f"Handling rollback: blocks {from_block} to {to_block}, reason: {reason}")

                                         
        affected_events = (
            session.query(Event)
            .filter(
                Event.chain_id == self.chain_id,
                Event.block_number >= from_block,
                Event.block_number <= to_block,
                Event.removed == False,
            )
            .all()
        )

        for event in affected_events:
            event.removed = True
            logger.debug(f"Marked event as removed: {event.tx_hash}:{event.log_index}")

        logger.info(f"Marked {len(affected_events)} events as removed")

                       
        self._rebuild_state(session, from_block, to_block)

    def _rebuild_state(self, session: Session, from_block: int, to_block: int) -> None:
        logger.info(f"Rebuilding state for blocks {from_block} to {to_block}")

                                                                             
        events = (
            session.query(Event)
            .filter(
                Event.chain_id == self.chain_id,
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

                                
        for event in events:
            try:
                                  
                event_data = json.loads(event.event_data) if event.event_data else {}

                                                                     
                if "args" in event_data:
                    args = event_data["args"]
                else:
                    args = event_data

                                    
                self.state_updater.apply_event(
                    session=session,
                    event_type=event.event_name,
                    event_data=args,
                )

            except Exception as e:
                logger.error(f"Error replaying event {event.tx_hash}:{event.log_index}: {e}")

        logger.info("State rebuild complete")
