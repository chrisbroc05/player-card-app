"""SQLAlchemy engine and session for PostgreSQL (DATABASE_URL)."""

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

_raw_url = (os.environ.get("DATABASE_URL") or "").strip()
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql://", 1)
# Force psycopg2 driver (psycopg2-binary in requirements.txt). Avoid psycopg3, which
# SQLAlchemy may select for postgresql+psycopg:// or bare postgresql:// on some versions.
if _raw_url.startswith("postgresql+psycopg://"):
    _raw_url = _raw_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
elif _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Local dev fallback when DATABASE_URL is unset
SQLALCHEMY_DATABASE_URL = _raw_url or "sqlite:///./future_legends.db"

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
