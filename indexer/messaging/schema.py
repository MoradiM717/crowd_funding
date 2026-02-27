
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class MessageType(str, Enum):
    EVENT = "event"
    ROLLBACK = "rollback"
    RECONCILIATION = "reconciliation"


class EventType(str, Enum):
    CAMPAIGN_CREATED = "CampaignCreated"
    DONATION_RECEIVED = "DonationReceived"
    WITHDRAWN = "Withdrawn"
    REFUNDED = "Refunded"


class BaseMessage(BaseModel):
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class EventMessage(BaseMessage):
    message_type: Literal["event"] = "event"
    event_type: Literal["CampaignCreated", "DonationReceived", "Withdrawn", "Refunded"]
    chain_id: int
    block_number: int
    block_hash: str
    tx_hash: str
    log_index: int
    address: str
    timestamp: int
    event_data: Dict[str, Any]

    @field_validator("address", "tx_hash", "block_hash")
    @classmethod
    def lowercase_hex(cls, v: str) -> str:
        return v.lower() if v else v

    def to_routing_key(self) -> str:
        event_routing_map = {
            "CampaignCreated": "event.campaign_created",
            "DonationReceived": "event.donation_received",
            "Withdrawn": "event.withdrawn",
            "Refunded": "event.refunded",
        }
        return event_routing_map.get(self.event_type, "event.unknown")


class RollbackMessage(BaseMessage):
    message_type: Literal["rollback"] = "rollback"
    chain_id: int
    from_block: int
    to_block: int
    reason: str = "reorg_detected"


class ReconciliationMessage(BaseMessage):
    message_type: Literal["reconciliation"] = "reconciliation"
    chain_id: int
    reconciliation_type: str = "mark_expired_campaigns"


def parse_message(data: Dict[str, Any]) -> BaseMessage:
    message_type = data.get("message_type")
    
    if message_type == "event":
        return EventMessage(**data)
    elif message_type == "rollback":
        return RollbackMessage(**data)
    elif message_type == "reconciliation":
        return ReconciliationMessage(**data)
    else:
        raise ValueError(f"Unknown message type: {message_type}")
