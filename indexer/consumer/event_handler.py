
import json
from typing import Any, Dict, Optional

from sqlalchemy.exc import IntegrityError, OperationalError

from config import Config
from db.session import get_session
from log import get_logger
from messaging.schema import EventMessage, RollbackMessage, ReconciliationMessage, parse_message
from consumer.state_updater import ConsumerStateUpdater
from consumer.rollback_handler import RollbackHandler
from consumer.reconciliation_handler import ReconciliationHandler

logger = get_logger(__name__)


class TransientError(Exception):
    pass


class EventHandler:

    def __init__(self, config: Config):
        self.config = config
        self.max_retries = config.max_retries
        self.state_updater = ConsumerStateUpdater(config.chain_id)
        self.rollback_handler = RollbackHandler(config.chain_id)
        self.reconciliation_handler = ReconciliationHandler(config.chain_id)
        
               
        self._events_processed = 0
        self._events_failed = 0

    def handle_message(
        self,
        body: bytes,
        properties: Any,
    ) -> bool:
        try:
                           
            data = json.loads(body)
            message_type = data.get("message_type")

            logger.debug(f"Processing message: type={message_type}")

            if message_type == "event":
                return self._handle_event_message(data)
            elif message_type == "rollback":
                return self._handle_rollback_message(data)
            elif message_type == "reconciliation":
                return self._handle_reconciliation_message(data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                return False

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message JSON: {e}")
            return False
        except IntegrityError:
                                                                     
            logger.debug("Event already exists (duplicate)")
            raise
        except OperationalError as e:
                                              
            logger.warning(f"Database error (transient): {e}")
            raise TransientError(str(e))
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            self._events_failed += 1
            return False

    def _handle_event_message(self, data: Dict[str, Any]) -> bool:
        event_type = data.get("event_type")
        chain_id = data.get("chain_id")
        block_number = data.get("block_number")
        block_hash = data.get("block_hash", "")
        tx_hash = data.get("tx_hash")
        log_index = data.get("log_index")
        address = data.get("address", "")
        event_data = data.get("event_data", {})

                                                                                
        if event_type == "CampaignCreated":
            campaign_address = event_data.get("campaign", "")
            if campaign_address:
                address = str(campaign_address).lower()
                logger.debug(f"CampaignCreated: using campaign address {address} instead of factory")

        logger.debug(
            f"Processing event: {event_type} at block {block_number}, "
            f"tx={tx_hash}, log_index={log_index}"
        )

        with get_session() as session:
                                                                               
                                                                             
            if event_type == "CampaignCreated":
                self.state_updater.apply_campaign_created(session, event_data)
                session.flush()                                              

                                                         
            event_inserted = self.state_updater.insert_event(
                session=session,
                tx_hash=tx_hash,
                log_index=log_index,
                block_number=block_number,
                block_hash=block_hash,
                address=address,
                event_name=event_type,
                event_data=event_data,
            )

            if not event_inserted:
                                                         
                logger.debug(f"Event already exists, skipping: {tx_hash}:{log_index}")
                return True

                                                                                     
            if event_type != "CampaignCreated":
                self.state_updater.apply_event(
                    session=session,
                    event_type=event_type,
                    event_data=event_data,
                )

                                
            session.commit()

        self._events_processed += 1
        logger.info(f"Processed {event_type} event: tx={tx_hash}, log_index={log_index}")
        return True

    def _handle_rollback_message(self, data: Dict[str, Any]) -> bool:
        chain_id = data.get("chain_id")
        from_block = data.get("from_block")
        to_block = data.get("to_block")
        reason = data.get("reason", "unknown")

        logger.info(f"Processing rollback: blocks {from_block}-{to_block}, reason={reason}")

        with get_session() as session:
            self.rollback_handler.handle_rollback(
                session=session,
                from_block=from_block,
                to_block=to_block,
                reason=reason,
            )
            session.commit()

        logger.info(f"Rollback complete: blocks {from_block}-{to_block}")
        return True

    def _handle_reconciliation_message(self, data: Dict[str, Any]) -> bool:
        chain_id = data.get("chain_id")
        reconciliation_type = data.get("reconciliation_type", "mark_expired_campaigns")

        logger.info(f"Processing reconciliation: {reconciliation_type}")

        with get_session() as session:
            self.reconciliation_handler.handle_reconciliation(
                session=session,
                reconciliation_type=reconciliation_type,
            )
            session.commit()

        logger.info(f"Reconciliation complete: {reconciliation_type}")
        return True

    @property
    def events_processed(self) -> int:
        return self._events_processed

    @property
    def events_failed(self) -> int:
        return self._events_failed


def get_retry_count(properties: Any) -> int:
    if properties and properties.headers:
        return properties.headers.get("x-retry-count", 0)
    return 0


def increment_retry_count(properties: Any) -> Dict[str, Any]:
    headers = {}
    if properties and properties.headers:
        headers = dict(properties.headers)
    
    headers["x-retry-count"] = headers.get("x-retry-count", 0) + 1
    return headers
