"""Unified user activity history from trades, marketplace, and animations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from card_pricing import order_tier_from_card_tier, tier_generation_price
from card_repo import (
    animation_fields_for_card,
    cards_created_by_user_filter,
    highlight_fields_for_card,
)
from credit_service import (
    TX_ANIMATION,
    TX_CARD_PURCHASE,
    TX_GENERATION,
    TX_HIGHLIGHT,
)
from marketplace_repo import float_from_decimal
from marketplace_trade_repo import OFFER_TYPE_CASH
from models import Card, CreditLedger, MarketplaceOffer, TradeOffer, User

logger = logging.getLogger(__name__)

ACTIVITY_TYPES = frozenset(
    {
        "trade_sent",
        "trade_received",
        "marketplace_sold",
        "marketplace_bought",
        "animated_upgrade",
        "highlight_upgrade",
        "card_created",
        "preview_generated",
    }
)


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _completed_ts(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _grad_year_int(card: Card) -> int:
    try:
        return int(card.grad_year or 0)
    except (TypeError, ValueError):
        return 0


def _card_snapshot(card: Card) -> dict:
    """Full media-capable card payload so highlight/animated thumbnails can render."""
    row = {
        "card_id": card.card_id or "",
        "player_name": card.player_name or "",
        "team_name": card.team_name or "",
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": _grad_year_int(card),
        "tier": card.tier or "rookie",
        "theme": card.theme or "none",
        "rarity": card.rarity or "",
        "edition_number": int(card.edition_number or 1),
        "print_run": int(card.print_run or 1),
        "image_url": card.image_url or "",
    }
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
    return row


def _counterparty(display_name: str | None, user_id: int | None = None) -> dict | None:
    name = (display_name or "").strip()
    if not name:
        return None
    return {"display_name": name, "user_id": user_id}


CARD_CREATION_TX_TYPES = (TX_CARD_PURCHASE, TX_GENERATION)
UPGRADE_TX_TYPES = {
    "animated_upgrade": (TX_ANIMATION,),
    "highlight_upgrade": (TX_HIGHLIGHT,),
}


def _ledger_charge_amounts(
    db: Session,
    user_id: int,
    transaction_types: tuple[str, ...],
) -> dict[str, float]:
    """Sum negative ledger debits keyed by reference_id (positive dollar amounts)."""
    rows = (
        db.query(CreditLedger)
        .filter(
            CreditLedger.user_id == user_id,
            CreditLedger.transaction_type.in_(transaction_types),
            CreditLedger.amount < 0,
        )
        .all()
    )
    totals: dict[str, float] = {}
    for row in rows:
        ref = (row.reference_id or "").strip()
        if not ref:
            continue
        totals[ref] = totals.get(ref, 0.0) + abs(float(row.amount))
    return totals


def _preview_session_indexes(db: Session, user_id: int) -> dict[str, int]:
    """Map card_id -> 0-based creation order within its preview session."""
    rows = (
        db.query(Card)
        .filter(
            Card.owner_id == user_id,
            Card.preview_session_id.isnot(None),
        )
        .order_by(Card.created_at.asc(), Card.id.asc())
        .all()
    )
    by_session: dict[str, list[str]] = {}
    for card in rows:
        session_id = (card.preview_session_id or "").strip()
        if not session_id:
            continue
        by_session.setdefault(session_id, []).append(card.card_id or "")

    indexes: dict[str, int] = {}
    for card_ids in by_session.values():
        for index, card_id in enumerate(card_ids):
            if card_id:
                indexes[card_id] = index
    return indexes


def _session_card_ids(db: Session, user_id: int, session_id: str) -> list[str]:
    rows = (
        db.query(Card.card_id)
        .filter(
            Card.owner_id == user_id,
            Card.preview_session_id == session_id,
        )
        .all()
    )
    return [str(row[0]).strip() for row in rows if row and row[0]]


def _session_paid_preview_count(
    *,
    session_id: str,
    preview_indexes: dict[str, int],
    session_card_ids: list[str],
) -> int:
    if not session_id:
        return 0
    return sum(1 for cid in session_card_ids if preview_indexes.get(cid, 0) > 0)


def _card_creation_charge(
    card: Card,
    *,
    ledger_by_ref: dict[str, float],
    preview_indexes: dict[str, int],
    db: Session,
    user_id: int,
) -> tuple[float, int]:
    """
    Total charge for a finalized card: copy/ledger debits plus paid previews in the session.
    Returns (amount, additional_preview_count).
    """
    card_ref = (card.card_id or "").strip()
    base = ledger_by_ref.get(card_ref, 0.0) if card_ref else 0.0

    session_id = (card.preview_session_id or "").strip()
    additional = 0
    preview_cost = 0.0
    if session_id:
        session_ids = _session_card_ids(db, user_id, session_id)
        additional = _session_paid_preview_count(
            session_id=session_id,
            preview_indexes=preview_indexes,
            session_card_ids=session_ids,
        )
        if additional > 0:
            order_tier = order_tier_from_card_tier(card.tier)
            preview_cost = round(additional * tier_generation_price(order_tier), 2)

    total = round(base + preview_cost, 2)
    return total, additional


def _upgrade_charge(
    card: Card,
    *,
    activity_type: str,
    ledger_by_ref: dict[str, float],
) -> float:
    tx_types = UPGRADE_TX_TYPES.get(activity_type, ())
    if not tx_types:
        return 0.0
    card_ref = (card.card_id or "").strip()
    if card_ref and card_ref in ledger_by_ref:
        return ledger_by_ref[card_ref]
    return 0.0


def _tier_label_from_preview_note(note: str | None) -> str:
    n = (note or "").lower()
    if "legends" in n:
        return "Legends"
    if "allstar" in n or "all-star" in n or "all_star" in n:
        return "All-Star"
    return "Rookie"


def _tier_key_from_preview_note(note: str | None) -> str:
    n = (note or "").lower()
    if "legends" in n:
        return "legends"
    if "allstar" in n or "all-star" in n or "all_star" in n:
        return "allstar"
    return "rookie"


def _placeholder_card_for_preview(*, tier: str, player_name: str = "Preview") -> dict:
    return {
        "card_id": "",
        "player_name": player_name,
        "team_name": "",
        "position": "",
        "jersey_number": "",
        "grad_year": 0,
        "tier": tier or "rookie",
        "theme": "none",
        "rarity": "standard",
        "edition_number": 1,
        "print_run": 1,
        "image_url": "",
    }


def _find_preview_card_for_ledger(
    db: Session,
    user_id: int,
    *,
    created_at: datetime | None,
    tier_key: str,
) -> Card | None:
    """Best-effort match a preview card row to a ledger debit."""
    from sqlalchemy import and_, or_

    q = (
        db.query(Card)
        .filter(
            or_(
                Card.creator_user_id == user_id,
                and_(Card.creator_user_id.is_(None), Card.owner_id == user_id),
            ),
            Card.status == "preview",
            Card.tier == tier_key,
        )
        .order_by(Card.created_at.desc())
    )
    if created_at is not None:
        q = q.filter(Card.created_at <= created_at)
    return q.first()


def _gather_paid_preview_items(db: Session, user_id: int) -> list[dict]:
    """Ledger-backed paid preview charges (additional previews only)."""
    rows = (
        db.query(CreditLedger)
        .filter(
            CreditLedger.user_id == user_id,
            CreditLedger.transaction_type == TX_GENERATION,
            CreditLedger.amount < 0,
        )
        .order_by(CreditLedger.created_at.desc())
        .all()
    )
    items: list[dict] = []
    for row in rows:
        note = (row.note or "").strip()
        if "preview" not in note.lower():
            continue
        amount = abs(float(row.amount))
        if amount <= 0:
            continue
        tier_key = _tier_key_from_preview_note(note)
        tier_label = _tier_label_from_preview_note(note)
        card_row = _find_preview_card_for_ledger(
            db,
            user_id,
            created_at=row.created_at,
            tier_key=tier_key,
        )
        card_snapshot = _card_snapshot(card_row) if card_row else _placeholder_card_for_preview(tier=tier_key)
        when = row.created_at
        items.append(
            {
                "id": f"preview_generated-{row.id}",
                "activity_type": "preview_generated",
                "created_at": _iso(when),
                "completed_at": _iso(when),
                "card": card_snapshot,
                "counterparty": None,
                "amount": amount,
                "status": "completed",
                "preview_label": f"{tier_label} Preview",
                "_sort_ts": _completed_ts(when),
            }
        )
    return items


def _gather_paid_preview_card_items(
    db: Session,
    user_id: int,
    preview_indexes: dict[str, int],
) -> list[dict]:
    """Fallback paid preview rows from preview-status cards (when ledger keyed by order id)."""
    from sqlalchemy import and_, or_

    rows = (
        db.query(Card)
        .filter(
            or_(
                Card.creator_user_id == user_id,
                and_(Card.creator_user_id.is_(None), Card.owner_id == user_id),
            ),
            Card.preview_session_id.isnot(None),
            Card.is_animated.is_(False),
            Card.is_highlight.is_(False),
        )
        .all()
    )
    items: list[dict] = []
    for card in rows:
        card_ref = (card.card_id or "").strip()
        if preview_indexes.get(card_ref, 0) <= 0:
            continue
        amount = tier_generation_price(card.tier)
        if amount <= 0:
            continue
        tier_label = _tier_label_from_preview_note(f"Card preview - {card.tier} tier")
        when = card.created_at
        items.append(
            {
                "id": f"preview_generated-card-{card.id}",
                "activity_type": "preview_generated",
                "created_at": _iso(when),
                "completed_at": _iso(when),
                "card": _card_snapshot(card),
                "counterparty": None,
                "amount": amount,
                "status": "completed",
                "preview_label": f"{tier_label} Preview",
                "_sort_ts": _completed_ts(when),
            }
        )
    return items


def _build_item(
    *,
    item_id: str,
    activity_type: str,
    completed_at: datetime | None,
    created_at: datetime | None,
    card: Card,
    counterparty: dict | None,
    amount: float | None,
    royalty_amount: float | None = None,
    additional_preview_count: int | None = None,
) -> dict:
    when = completed_at or created_at
    row = {
        "id": item_id,
        "activity_type": activity_type,
        "created_at": _iso(created_at or when),
        "completed_at": _iso(when),
        "card": _card_snapshot(card),
        "counterparty": counterparty,
        "amount": amount,
        "status": "completed",
        "_sort_ts": _completed_ts(when),
    }
    if royalty_amount is not None:
        row["royalty_amount"] = royalty_amount
    if additional_preview_count is not None and additional_preview_count > 0:
        row["additional_preview_count"] = additional_preview_count
    return row


def gather_user_activity_items(db: Session, user_id: int) -> list[dict]:
    """Collect all completed activity rows for a user (unsorted)."""
    items: list[dict] = []
    card_creation_ledger = _ledger_charge_amounts(db, user_id, CARD_CREATION_TX_TYPES)
    upgrade_ledger = _ledger_charge_amounts(
        db,
        user_id,
        UPGRADE_TX_TYPES["animated_upgrade"] + UPGRADE_TX_TYPES["highlight_upgrade"],
    )
    preview_indexes = _preview_session_indexes(db, user_id)

    trade_rows = (
        db.query(TradeOffer)
        .options(
            joinedload(TradeOffer.card),
            joinedload(TradeOffer.sender),
            joinedload(TradeOffer.recipient),
        )
        .filter(
            TradeOffer.status == "accepted",
            (TradeOffer.sender_id == user_id) | (TradeOffer.recipient_id == user_id),
        )
        .all()
    )
    for offer in trade_rows:
        card = offer.card
        if card is None:
            continue
        if (card.status or "active") == "deleted":
            continue
        when = offer.updated_at or offer.created_at
        if offer.sender_id == user_id:
            items.append(
                _build_item(
                    item_id=f"trade_sent-{offer.id}",
                    activity_type="trade_sent",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.recipient.display_name if offer.recipient else None,
                        offer.recipient_id,
                    ),
                    amount=None,
                )
            )
        if offer.recipient_id == user_id:
            items.append(
                _build_item(
                    item_id=f"trade_received-{offer.id}",
                    activity_type="trade_received",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.sender.display_name if offer.sender else None,
                        offer.sender_id,
                    ),
                    amount=None,
                )
            )

    marketplace_rows = (
        db.query(MarketplaceOffer)
        .options(
            joinedload(MarketplaceOffer.card),
            joinedload(MarketplaceOffer.buyer),
            joinedload(MarketplaceOffer.seller),
        )
        .filter(
            MarketplaceOffer.status == "accepted",
            (MarketplaceOffer.buyer_id == user_id) | (MarketplaceOffer.seller_id == user_id),
        )
        .all()
    )
    for offer in marketplace_rows:
        card = offer.card
        if card is None:
            continue
        if (card.status or "active") == "deleted":
            continue
        when = offer.updated_at or offer.created_at
        is_cash = (offer.offer_type or OFFER_TYPE_CASH).strip().lower() == OFFER_TYPE_CASH
        amount = float_from_decimal(offer.offer_amount) if is_cash else None

        if offer.buyer_id == user_id:
            items.append(
                _build_item(
                    item_id=f"marketplace_bought-{offer.id}",
                    activity_type="marketplace_bought",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.seller.display_name if offer.seller else None,
                        offer.seller_id,
                    ),
                    amount=amount,
                )
            )
        if offer.seller_id == user_id:
            royalty_amount = None
            if is_cash and amount is not None:
                royalty_amount = float_from_decimal(offer.royalty_amount)
            items.append(
                _build_item(
                    item_id=f"marketplace_sold-{offer.id}",
                    activity_type="marketplace_sold",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.buyer.display_name if offer.buyer else None,
                        offer.buyer_id,
                    ),
                    amount=amount,
                    royalty_amount=royalty_amount,
                )
            )

    animated_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_animated.is_(True),
            Card.animation_status == "completed",
        )
        .all()
    )
    for card in animated_rows:
        when = card.animation_completed_at or card.created_at
        items.append(
            _build_item(
                item_id=f"animated_upgrade-{card.id}",
                activity_type="animated_upgrade",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=_upgrade_charge(
                    card,
                    activity_type="animated_upgrade",
                    ledger_by_ref=upgrade_ledger,
                ),
            )
        )

    highlight_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_highlight.is_(True),
            Card.highlight_status == "completed",
        )
        .all()
    )
    for card in highlight_rows:
        when = card.highlight_uploaded_at or card.created_at
        items.append(
            _build_item(
                item_id=f"highlight_upgrade-{card.id}",
                activity_type="highlight_upgrade",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=_upgrade_charge(
                    card,
                    activity_type="highlight_upgrade",
                    ledger_by_ref=upgrade_ledger,
                ),
            )
        )

    standard_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_animated.is_(False),
            Card.is_highlight.is_(False),
        )
        .all()
    )
    for card in standard_rows:
        when = card.created_at
        amount, additional_previews = _card_creation_charge(
            card,
            ledger_by_ref=card_creation_ledger,
            preview_indexes=preview_indexes,
            db=db,
            user_id=user_id,
        )
        items.append(
            _build_item(
                item_id=f"card_created-{card.id}",
                activity_type="card_created",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=amount,
                additional_preview_count=additional_previews,
            )
        )

    return items


def list_user_activity_history(
    db: Session,
    user: User,
    *,
    limit: int = 50,
    offset: int = 0,
    activity_type: str | None = None,
) -> tuple[list[dict], int]:
    """Return paginated activity items newest first."""
    items = gather_user_activity_items(db, user.id)

    if activity_type:
        normalized = activity_type.strip().lower()
        if normalized in ACTIVITY_TYPES:
            items = [i for i in items if i["activity_type"] == normalized]
        elif normalized == "trades":
            items = [i for i in items if i["activity_type"] in ("trade_sent", "trade_received")]

    items.sort(key=lambda row: row["_sort_ts"], reverse=True)
    total = len(items)
    page = items[offset : offset + limit]

    for row in page:
        row.pop("_sort_ts", None)

    logger.info(
        "activity_history user_id=%s email=%s total=%s limit=%s offset=%s type_filter=%s returned=%s",
        user.id,
        user.email,
        total,
        limit,
        offset,
        activity_type,
        len(page),
    )

    return page, total
