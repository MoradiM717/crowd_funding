
from decimal import Decimal
from datetime import datetime
from typing import Optional


WEI_TO_ETH = Decimal('1000000000000000000')


def wei_to_eth(wei: int) -> Decimal:
    if wei is None:
        return Decimal('0')
    return Decimal(wei) / WEI_TO_ETH


def timestamp_to_datetime(ts: int) -> Optional[datetime]:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=None)


def format_address(address: str) -> str:
    if address is None:
        return None
    return address.lower() if address else None

