
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import Session, sessionmaker

from config import Config

                                    
_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def init_db(config: Config) -> None:
    global _engine, _SessionLocal

    if _engine is not None:
        return                       

    _engine = create_engine(
        config.db_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,                                   
        echo=False,                                 
    )

    _SessionLocal = sessionmaker(
        bind=_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _engine


@contextmanager
def get_session() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

