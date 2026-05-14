"""SQLAlchemy ORM models."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    cards: Mapped[list["Card"]] = relationship(
        "Card",
        back_populates="owner",
        foreign_keys="Card.owner_id",
    )


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    player_name: Mapped[str] = mapped_column(String(200), default="")
    team_name: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[str] = mapped_column(String(80), default="")
    jersey_number: Mapped[str] = mapped_column(String(20), default="")
    grad_year: Mapped[str] = mapped_column(String(16), default="")
    tier: Mapped[str] = mapped_column(String(40), nullable=False)
    theme: Mapped[str] = mapped_column(String(120), default="none")
    rarity: Mapped[str] = mapped_column(String(40), nullable=False)
    edition_number: Mapped[int] = mapped_column(Integer, default=1)
    print_run: Mapped[int] = mapped_column(Integer, default=1)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    shareable_slug: Mapped[str] = mapped_column(String(48), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    creator_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    player_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    style: Mapped[str] = mapped_column(String(200), default="")
    special_theme: Mapped[str | None] = mapped_column(String(120), nullable=True)
    owner_name: Mapped[str] = mapped_column(String(200), default="unassigned")
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    trade_offered_to: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    owner: Mapped["User | None"] = relationship(
        "User",
        back_populates="cards",
        foreign_keys=[owner_id],
    )
    trade_offers: Mapped[list["TradeOffer"]] = relationship(
        "TradeOffer",
        back_populates="card",
    )


class TradeOffer(Base):
    __tablename__ = "trade_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    card: Mapped["Card"] = relationship("Card", back_populates="trade_offers")
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])
