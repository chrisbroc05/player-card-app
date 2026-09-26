"""Card creation Stripe checkout and webhook fulfillment."""

from __future__ import annotations

import logging
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from card_pricing import card_creation_quote, normalize_card_type, normalize_order_tier
from card_repo import card_to_dict, get_card_by_card_id
from models import CardCreationCheckout, User, utcnow
from payments_config import require_payments_enabled
from preview_styles import CARD_CREATION_REPICK_PRICE
from stripe_checkout import create_card_creation_checkout_session, create_card_creation_repick_session

logger = logging.getLogger(__name__)

COPY_QTY_MIN = 1
COPY_QTY_MAX = 100


def _validate_copy_quantity(qty: int) -> int:
    q = int(qty)
    if q < COPY_QTY_MIN or q > COPY_QTY_MAX:
        raise ValueError(f"Copy quantity must be between {COPY_QTY_MIN} and {COPY_QTY_MAX}.")
    return q


def _preview_list(row: CardCreationCheckout) -> list[dict]:
    previews = row.preview_urls if isinstance(row.preview_urls, list) else []
    return [p for p in previews if isinstance(p, dict)]


def begin_card_creation_checkout(
    db: Session,
    *,
    user: User,
    order_id: int,
    order_snapshot: dict,
    copy_quantity: int,
    card_type: str = "static",
    animated: bool = False,
    highlight_staging: dict | None = None,
) -> dict:
    """Persist checkout state and return Stripe Checkout URL."""
    require_payments_enabled()
    qty = _validate_copy_quantity(copy_quantity)
    tier = normalize_order_tier(order_snapshot.get("tier"))
    ct = normalize_card_type(card_type)
    if ct == "highlight":
        animated = False
    elif ct == "animated":
        animated = True
    quote = card_creation_quote(tier, card_type=ct, animated=animated)
    amount = Decimal(str(quote["total"])).quantize(Decimal("0.01"))

    snapshot = dict(order_snapshot)
    if ct == "highlight":
        snapshot["card_type"] = "highlight"
    else:
        snapshot["card_type"] = "standard"
    snapshot["checkout_card_type"] = ct
    snapshot["checkout_animated"] = bool(animated or ct == "animated")
    if highlight_staging:
        snapshot["highlight_staging"] = highlight_staging

    checkout = CardCreationCheckout(
        user_id=user.id,
        order_id=order_id,
        order_snapshot=snapshot,
        tier=tier,
        card_type=ct,
        animated=bool(animated),
        copy_quantity=qty,
        amount_dollars=amount,
        status="pending",
    )
    db.add(checkout)
    db.flush()

    try:
        stripe_result = create_card_creation_checkout_session(
            purchaser_user_id=user.id,
            amount_dollars=amount,
            tier=tier,
            card_type=ct,
            copy_quantity=qty,
            checkout_id=checkout.id,
            order_id=order_id,
            animated=bool(animated),
        )
    except (ValueError, RuntimeError) as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    checkout.stripe_session_id = stripe_result["session_id"]
    db.commit()
    db.refresh(checkout)
    return {
        "checkout_id": checkout.id,
        "checkout_url": stripe_result["checkout_url"],
        "session_id": stripe_result["session_id"],
        "amount_dollars": float(amount),
        "tier": tier,
        "card_type": ct,
        "animated": bool(animated),
        "copy_quantity": qty,
        "quote": quote,
    }


def _card_creation_result_fields(db: Session, card_id: str | None) -> dict:
    """Rarity + display fields for the generated card (for checkout status polling)."""
    cid = (card_id or "").strip()
    if not cid:
        return {}
    orm = get_card_by_card_id(db, cid)
    if orm is None:
        return {}
    data = card_to_dict(orm, db)
    return {
        "result_card_id": data.get("card_id") or cid,
        "image_url": data.get("image_url") or "",
        "player_name": data.get("player_name") or "",
        "team_name": data.get("team_name") or "",
        "tier": data.get("tier") or "rookie",
        "rarity": data.get("rarity") or "standard",
        "rarity_template": int(data.get("rarity_template") or 1),
        "rarity_display_name": data.get("rarity_display_name") or "Base",
        "template_name": data.get("template_name") or "Classic",
        "edition_number": int(data.get("edition_number") or 1),
        "print_run": int(data.get("print_run") or 1),
        "special_theme": data.get("special_theme"),
        "is_highlight": bool(data.get("is_highlight")),
        "highlight_video_url": data.get("highlight_video_url"),
        "highlight_status": data.get("highlight_status"),
        "animated_video_url": data.get("animated_video_url"),
    }


def get_card_creation_checkout_status(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> dict:
    sid = (session_id or "").strip()
    if not sid:
        raise HTTPException(status_code=400, detail="session_id is required")
    row = (
        db.query(CardCreationCheckout)
        .filter(
            CardCreationCheckout.stripe_session_id == sid,
            CardCreationCheckout.user_id == user_id,
        )
        .first()
    )
    if row is None:
        return {"status": "not_found"}
    previews = _preview_list(row)
    payload = {
        "status": row.status,
        "checkout_id": row.id,
        "order_id": row.order_id,
        "copy_quantity": row.copy_quantity,
        "tier": row.tier,
        "card_type": row.card_type,
        "animated": row.animated,
        "amount_dollars": float(row.amount_dollars),
        "result_card_id": row.result_card_id,
        "chosen_preview_index": row.chosen_preview_index,
        "repick_purchased": bool(row.repick_purchased),
        "previews": previews,
        "preview_count": len(previews),
        "error_message": row.error_message,
    }
    if row.result_card_id and row.status == "completed":
        payload.update(_card_creation_result_fields(db, row.result_card_id))
    elif previews and row.status == "awaiting_selection":
        anchor = previews[0]
        payload.setdefault("rarity", anchor.get("rarity") or "standard")
        payload.setdefault("rarity_template", anchor.get("rarity_template") or 1)
        payload.setdefault("rarity_display_name", anchor.get("rarity_display_name") or "Base")
        payload.setdefault("player_name", anchor.get("player_name") or "")
        payload.setdefault("team_name", anchor.get("team_name") or "")
    return payload


def fulfill_card_creation_from_webhook(db: Session, session: dict) -> None:
    """Idempotent fulfillment after checkout.session.completed for fund_type=card_creation."""
    metadata = session.get("metadata") or {}
    session_id = (session.get("id") or "").strip()
    checkout_id = int(metadata.get("checkout_id") or 0)
    user_id = int(metadata.get("user_id") or 0)
    tier = normalize_order_tier(metadata.get("tier"))
    card_type = normalize_card_type(metadata.get("card_type"))
    animated_raw = (metadata.get("animated") or "false").strip().lower()
    animated = card_type == "animated" or animated_raw in ("true", "1", "yes")

    row = None
    if checkout_id:
        row = db.query(CardCreationCheckout).filter(CardCreationCheckout.id == checkout_id).first()
    if row is None and session_id:
        row = (
            db.query(CardCreationCheckout)
            .filter(CardCreationCheckout.stripe_session_id == session_id)
            .first()
        )
    if row is None:
        raise ValueError(f"Card creation checkout not found for session {session_id}")

    if row.status in ("completed", "awaiting_selection"):
        logger.info("Card creation checkout %s already fulfilled (%s)", row.id, row.status)
        return
    if row.preview_urls and len(_preview_list(row)) >= 1:
        row.status = "awaiting_selection"
        logger.info("Card creation checkout %s previews already present", row.id)
        return

    if row.user_id != user_id:
        raise ValueError("Checkout user mismatch")

    row.stripe_session_id = session_id or row.stripe_session_id
    row.status = "processing"
    row.updated_at = utcnow()
    db.flush()

    try:
        from main import generate_paid_card_previews

        previews = generate_paid_card_previews(
            db,
            user_id=user_id,
            order_snapshot=row.order_snapshot,
            tier=tier or row.tier,
            card_type=card_type or row.card_type,
            animated=animated or row.animated,
        )
        row.preview_urls = previews
        row.status = "awaiting_selection"
        row.error_message = None
        logger.info(
            "Card creation previews ready checkout=%s user=%s previews=%s",
            row.id,
            user_id,
            len(previews),
        )
    except Exception as exc:
        logger.exception("Card creation fulfillment failed for checkout %s", row.id)
        row.status = "failed"
        row.error_message = str(exc)[:500]
        raise
    finally:
        row.updated_at = utcnow()


def fulfill_card_creation_repick_from_webhook(db: Session, session: dict) -> None:
    metadata = session.get("metadata") or {}
    session_id = (session.get("id") or "").strip()
    parent_session_id = (metadata.get("parent_session_id") or "").strip()
    user_id = int(metadata.get("user_id") or 0)
    checkout_id = int(metadata.get("checkout_id") or 0)

    row = None
    if checkout_id:
        row = db.query(CardCreationCheckout).filter(CardCreationCheckout.id == checkout_id).first()
    if row is None and parent_session_id:
        row = (
            db.query(CardCreationCheckout)
            .filter(
                CardCreationCheckout.stripe_session_id == parent_session_id,
                CardCreationCheckout.user_id == user_id,
            )
            .first()
        )
    if row is None:
        raise ValueError(f"Repick parent checkout not found for session {parent_session_id}")

    if row.repick_purchased:
        logger.info("Repick already purchased for checkout %s", row.id)
        return

    row.repick_purchased = True
    row.status = "processing"
    row.updated_at = utcnow()
    db.flush()

    try:
        from main import generate_paid_repick_preview

        existing = _preview_list(row)
        extra = generate_paid_repick_preview(
            db,
            user_id=user_id,
            order_snapshot=row.order_snapshot,
            existing_previews=existing,
            tier=row.tier,
            card_type=row.card_type,
            animated=row.animated,
        )
        row.preview_urls = [*existing, extra]
        row.status = "awaiting_selection"
        row.error_message = None
        record_repick_revenue(db, session_id=session_id, user_id=user_id)
    except Exception as exc:
        row.repick_purchased = False
        row.status = "awaiting_selection"
        row.error_message = str(exc)[:500]
        raise
    finally:
        row.updated_at = utcnow()


def record_repick_revenue(db: Session, *, session_id: str, user_id: int) -> None:
    from marketplace_service import record_platform_revenue

    amt = Decimal(str(CARD_CREATION_REPICK_PRICE)).quantize(Decimal("0.01"))
    record_platform_revenue(
        db,
        amount=amt,
        source="card_creation_repick",
        reference_id=session_id,
        note=f"Card creation repick — user {user_id}",
    )


def select_card_creation_preview(
    db: Session,
    *,
    user_id: int,
    session_id: str,
    preview_index: int,
) -> dict:
    sid = (session_id or "").strip()
    row = (
        db.query(CardCreationCheckout)
        .filter(
            CardCreationCheckout.stripe_session_id == sid,
            CardCreationCheckout.user_id == user_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    if row.status not in ("awaiting_selection", "processing"):
        raise HTTPException(status_code=400, detail="Checkout is not awaiting preview selection")

    previews = _preview_list(row)
    chosen = next((p for p in previews if int(p.get("index", -1)) == int(preview_index)), None)
    if chosen is None:
        raise HTTPException(status_code=400, detail="Invalid preview selection")

    preview_card_id = (chosen.get("card_id") or "").strip()
    if not preview_card_id:
        raise HTTPException(status_code=400, detail="Selected preview is missing")

    generated_card_ids = [str(p.get("card_id") or "") for p in previews if p.get("card_id")]
    row.status = "processing"
    row.chosen_preview_index = int(preview_index)
    row.updated_at = utcnow()
    db.flush()

    try:
        from main import finalize_paid_card_selection

        result_card_id = finalize_paid_card_selection(
            db,
            user_id=user_id,
            order_snapshot=row.order_snapshot,
            preview_index=int(preview_index),
            copy_quantity=row.copy_quantity,
            stripe_session_id=sid,
            amount_dollars=row.amount_dollars,
            tier=row.tier,
            card_type=row.card_type,
            animated=row.animated,
            preview_card_id=preview_card_id,
            generated_card_ids=generated_card_ids,
            final_image_url=chosen.get("image_url") or "",
        )
        row.result_card_id = result_card_id
        row.status = "completed"
        row.error_message = None
    except Exception as exc:
        row.status = "awaiting_selection"
        row.chosen_preview_index = None
        row.error_message = str(exc)[:500]
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        row.updated_at = utcnow()
        db.commit()

    result = get_card_creation_checkout_status(db, user_id=user_id, session_id=sid)
    return result


def begin_card_creation_repick_checkout(
    db: Session,
    *,
    user: User,
    session_id: str,
) -> dict:
    require_payments_enabled()
    sid = (session_id or "").strip()
    row = (
        db.query(CardCreationCheckout)
        .filter(
            CardCreationCheckout.stripe_session_id == sid,
            CardCreationCheckout.user_id == user.id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    if row.status != "awaiting_selection":
        raise HTTPException(status_code=400, detail="Previews are not ready for repick")
    if row.repick_purchased:
        raise HTTPException(status_code=400, detail="Additional preview already purchased")

    amount = Decimal(str(CARD_CREATION_REPICK_PRICE)).quantize(Decimal("0.01"))
    try:
        stripe_result = create_card_creation_repick_session(
            purchaser_user_id=user.id,
            amount_dollars=amount,
            parent_session_id=sid,
            checkout_id=row.id,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "checkout_url": stripe_result["checkout_url"],
        "session_id": stripe_result["session_id"],
        "amount_dollars": float(amount),
        "parent_session_id": sid,
    }
