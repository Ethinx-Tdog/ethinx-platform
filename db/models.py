from __future__ import annotations

import os
import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    create_engine,
    String,
    Integer,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Mapped, mapped_column, relationship

# ---- DB bootstrap (SQLite) ----

DB_PATH = os.getenv("ETHINX_DB_PATH", os.path.join(os.getcwd(), "data", "runs.db"))
DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---- Core tables (minimal, compatible) ----
# If you already have a richer Run table elsewhere, keep this file as-is only if it matches your current system.
# This Run model is intentionally conservative.

class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    mode: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    platform: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    niche: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    run_seed: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    request_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ---- API keys ----

class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Human label (optional)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Store ONLY hash + per-key salt, never plaintext
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # sha256 hex
    salt: Mapped[str] = mapped_column(String(32), nullable=False)              # hex

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optional metadata
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    requests: Mapped[list["APIKeyRequest"]] = relationship(
        "APIKeyRequest",
        back_populates="api_key",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class APIKeyRequest(Base):
    """
    Persistent rate-limit ledger.
    Rate check = count rows in last hour for given api_key_id.
    """
    __tablename__ = "api_key_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    endpoint: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    method: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)

    api_key: Mapped["APIKey"] = relationship("APIKey", back_populates="requests")


Index("ix_api_key_requests_key_time", APIKeyRequest.api_key_id, APIKeyRequest.created_at)


# ---- helpers ----

def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_api_key(plaintext: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    return _sha256_hex(salt + plaintext.encode("utf-8"))


def generate_api_key(prefix: str = "ethx") -> str:
    # URL-safe, high entropy
    token = secrets.token_urlsafe(32)
    return f"{prefix}_{token}"


def create_api_key_record(session, name: Optional[str] = None) -> tuple[APIKey, str]:
    plaintext = generate_api_key()
    salt_hex = secrets.token_hex(16)
    key_hash = hash_api_key(plaintext, salt_hex)

    rec = APIKey(
        name=name,
        key_hash=key_hash,
        salt=salt_hex,
        revoked=False,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec, plaintext


def init_db() -> None:
    # Creates tables if missing; safe for SQLite
    Base.metadata.create_all(bind=engine)
