
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from db.models import Campaign
from log import get_logger

logger = get_logger(__name__)


class ReconciliationHandler:

    def __init__(self, chain_id: int):
        self.chain_id = chain_id

    def handle_reconciliation(
        self,
        session: Session,
        reconciliation_type: str,
    ) -> None:
        logger.info(f"Handling reconciliation: {reconciliation_type}")

        if reconciliation_type == "mark_expired_campaigns":
            self._mark_expired_campaigns(session)
        else:
            logger.warning(f"Unknown reconciliation type: {reconciliation_type}")

    def _mark_expired_campaigns(self, session: Session) -> None:
        now = datetime.now(timezone.utc)
        now_timestamp = int(now.timestamp())

                                
        expired_campaigns = (
            session.query(Campaign)
            .filter(
                Campaign.status == "ACTIVE",
                Campaign.deadline_ts < now_timestamp,
                Campaign.withdrawn == False,
            )
            .all()
        )

        marked_count = 0
        for campaign in expired_campaigns:
                                       
            if campaign.total_raised_wei < campaign.goal_wei:
                campaign.status = "FAILED"
                marked_count += 1
                logger.info(
                    f"Marked campaign {campaign.address} as FAILED "
                    f"(raised {campaign.total_raised_wei} < goal {campaign.goal_wei})"
                )

        if marked_count > 0:
            logger.info(f"Marked {marked_count} expired campaigns as FAILED")
        else:
            logger.debug("No expired campaigns to mark as FAILED")
