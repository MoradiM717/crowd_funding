
import time

from config import Config
from db.models import Campaign
from db.session import get_session
from log import get_logger

logger = get_logger(__name__)


class Reconciler:

    def __init__(self, config: Config):
        self.config = config
        self.last_reconciliation = 0
        self.reconciliation_interval = 60                        

    def should_reconcile(self) -> bool:
        now = time.time()
        if now - self.last_reconciliation >= self.reconciliation_interval:
            self.last_reconciliation = now
            return True
        return False

    def reconcile(self) -> int:
        logger.debug("Running campaign reconciliation")

        now_ts = int(time.time())
        updated_count = 0

        with get_session() as session:
                                                                 
            campaigns = (
                session.query(Campaign)
                .filter(
                    Campaign.status == "ACTIVE",
                    Campaign.deadline_ts < now_ts,
                    Campaign.total_raised_wei < Campaign.goal_wei,
                    Campaign.withdrawn == False,
                )
                .all()
            )

            for campaign in campaigns:
                campaign.status = "FAILED"
                updated_count += 1
                logger.info(
                    f"Marked campaign {campaign.address} as FAILED: "
                    f"deadline passed, goal not met"
                )

        if updated_count > 0:
            logger.info(f"Reconciliation: updated {updated_count} campaigns to FAILED")

        return updated_count

