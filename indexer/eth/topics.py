
from web3 import Web3

from eth.abi_loader import get_campaign_abi, get_factory_abi

                    
_TOPIC_CACHE: dict[str, str] = {}


def _compute_topic(event_signature: str) -> str:
    hash_bytes = Web3.keccak(text=event_signature)
                                                            
    hex_str = hash_bytes.hex()
    if not hex_str.startswith('0x'):
        hex_str = '0x' + hex_str
    return hex_str


def get_campaign_created_topic() -> str:
    if "CampaignCreated" not in _TOPIC_CACHE:
                                                                                                                                                 
        signature = "CampaignCreated(address,address,address,uint256,uint256,string)"
        _TOPIC_CACHE["CampaignCreated"] = _compute_topic(signature)
    return _TOPIC_CACHE["CampaignCreated"]


def get_donation_received_topic() -> str:
    if "DonationReceived" not in _TOPIC_CACHE:
                                                                                                                                      
        signature = "DonationReceived(address,address,uint256,uint256,uint256)"
        _TOPIC_CACHE["DonationReceived"] = _compute_topic(signature)
    return _TOPIC_CACHE["DonationReceived"]


def get_withdrawn_topic() -> str:
    if "Withdrawn" not in _TOPIC_CACHE:
                                                                                                         
        signature = "Withdrawn(address,address,uint256,uint256)"
        _TOPIC_CACHE["Withdrawn"] = _compute_topic(signature)
    return _TOPIC_CACHE["Withdrawn"]


def get_refunded_topic() -> str:
    if "Refunded" not in _TOPIC_CACHE:
                                                                                                      
        signature = "Refunded(address,address,uint256,uint256)"
        _TOPIC_CACHE["Refunded"] = _compute_topic(signature)
    return _TOPIC_CACHE["Refunded"]


def get_all_campaign_topics() -> list[str]:
    return [
        get_donation_received_topic(),
        get_withdrawn_topic(),
        get_refunded_topic(),
    ]

