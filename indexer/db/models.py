
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Chain(Base):

    __tablename__ = "chains"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    chain_id = Column(BigInteger, nullable=False, unique=True)
    rpc_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SyncState(Base):

    __tablename__ = "sync_state"

    chain_id = Column(BigInteger, ForeignKey("chains.chain_id"), primary_key=True)
    last_block = Column(BigInteger, nullable=False, default=0)
    last_block_hash = Column(String(66), nullable=True)                     
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    chain = relationship("Chain", backref="sync_states")


class Campaign(Base):

    __tablename__ = "campaigns"

    address = Column(String(42), primary_key=True)                                  
    factory_address = Column(String(42), nullable=False)
    creator_address = Column(String(42), nullable=False)
    goal_wei = Column(BigInteger, nullable=False)
    deadline_ts = Column(BigInteger, nullable=False)                  
    cid = Column(String(255), nullable=True)            
    status = Column(String(50), nullable=False, default="ACTIVE")                                      
    total_raised_wei = Column(BigInteger, nullable=False, default=0)
    withdrawn = Column(Boolean, nullable=False, default=False)
    withdrawn_amount_wei = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

                   
    contributions = relationship("Contribution", back_populates="campaign", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="campaign")


class Contribution(Base):

    __tablename__ = "contributions"
    __table_args__ = (
        UniqueConstraint("campaign_address", "donor_address", name="uq_contributions_campaign_donor"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_address = Column(String(42), ForeignKey("campaigns.address"), nullable=False)
    donor_address = Column(String(42), nullable=False)
    contributed_wei = Column(BigInteger, nullable=False, default=0)
    refunded_wei = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

                   
    campaign = relationship("Campaign", back_populates="contributions")


class Event(Base):

    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("chain_id", "tx_hash", "log_index", name="uq_events_chain_tx_log"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    chain_id = Column(BigInteger, ForeignKey("chains.chain_id"), nullable=False)
    tx_hash = Column(String(66), nullable=False)                     
    log_index = Column(Integer, nullable=False)
    block_number = Column(BigInteger, nullable=False)
    block_hash = Column(String(66), nullable=False)                     
    address = Column(String(42), ForeignKey("campaigns.address"), nullable=True)                               
    event_name = Column(String(100), nullable=False)                                           
    event_data = Column(Text, nullable=True)                                     
    removed = Column(Boolean, nullable=False, default=False)                                      
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

                   
    chain = relationship("Chain", backref="events")
    campaign = relationship("Campaign", back_populates="events")

