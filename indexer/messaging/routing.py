
from enum import Enum
from typing import Dict, List, Tuple


EXCHANGE_NAME = "blockchain_events"
EXCHANGE_TYPE = "topic"

                      
DLX_EXCHANGE_NAME = "blockchain_events.dlx"
DLX_QUEUE_NAME = "dlq.events"


class RoutingKey(str, Enum):
                        
    CAMPAIGN_CREATED = "event.campaign_created"
    DONATION_RECEIVED = "event.donation_received"
    WITHDRAWN = "event.withdrawn"
    REFUNDED = "event.refunded"
    
                          
    ROLLBACK = "control.rollback"
    RECONCILIATION = "control.reconciliation"


class QueueName(str, Enum):
    CAMPAIGN_CREATED = "queue.campaign_created"
    DONATION_RECEIVED = "queue.donation_received"
    WITHDRAWAL_REFUND = "queue.withdrawal_refund"
    CONTROL = "queue.control"


QUEUE_BINDINGS: Dict[str, List[str]] = {
    QueueName.CAMPAIGN_CREATED.value: [RoutingKey.CAMPAIGN_CREATED.value],
    QueueName.DONATION_RECEIVED.value: [RoutingKey.DONATION_RECEIVED.value],
    QueueName.WITHDRAWAL_REFUND.value: [
        RoutingKey.WITHDRAWN.value,
        RoutingKey.REFUNDED.value,
    ],
    QueueName.CONTROL.value: [
        RoutingKey.ROLLBACK.value,
        RoutingKey.RECONCILIATION.value,
    ],
}

                                               
ALL_EVENT_QUEUES = [
    QueueName.CAMPAIGN_CREATED.value,
    QueueName.DONATION_RECEIVED.value,
    QueueName.WITHDRAWAL_REFUND.value,
    QueueName.CONTROL.value,
]

                  
QUEUE_MESSAGE_TTL = 604800000                          
QUEUE_MAX_LENGTH = 100000


def get_routing_key_for_event(event_type: str) -> str:
    routing_map = {
        "CampaignCreated": RoutingKey.CAMPAIGN_CREATED.value,
        "DonationReceived": RoutingKey.DONATION_RECEIVED.value,
        "Withdrawn": RoutingKey.WITHDRAWN.value,
        "Refunded": RoutingKey.REFUNDED.value,
    }
    return routing_map.get(event_type, "event.unknown")


def get_queue_arguments() -> Dict:
    return {
        "x-message-ttl": QUEUE_MESSAGE_TTL,
        "x-max-length": QUEUE_MAX_LENGTH,
        "x-dead-letter-exchange": DLX_EXCHANGE_NAME,
        "x-dead-letter-routing-key": "dlq",
    }
