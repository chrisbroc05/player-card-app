#!/usr/bin/env python3
"""One-off cleanup for failed highlight cards (delete card + refund highlight charge)."""

from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "app"))

from database import SessionLocal  # noqa: E402
from models import Card, MarketplaceOffer, TradeOffer  # noqa: E402
from card_repo import get_card_by_card_id  # noqa: E402
from credit_service import TX_REFUND, add_credits, highlight_charge_to_refund  # noqa: E402
from marketplace_repo import cancel_pending_marketplace_offers_for_card  # noqa: E402


def _is_failed_highlight_card(card: Card) -> bool:
    video_url = (card.highlight_video_url or "").strip()
    status = (card.highlight_status or "").strip().lower()
    image_url = (card.image_url or "").strip().lower()
    if status == "failed":
        return True
    if card.is_highlight and not video_url:
        return True
    if "highlight-placeholder" in image_url and not video_url:
        return True
    return False


def _delete_card(db, card: Card) -> str:
    deleted_id = card.card_id
    cancel_pending_marketplace_offers_for_card(db, card.card_id)
    db.query(MarketplaceOffer).filter(MarketplaceOffer.card_id == card.card_id).delete(
        synchronize_session=False
    )
    db.query(TradeOffer).filter(TradeOffer.card_id == card.id).delete(synchronize_session=False)
    db.delete(card)
    return deleted_id


def _load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def cleanup_card(card_id: str) -> None:
    db = SessionLocal()
    try:
        card = get_card_by_card_id(db, card_id)
        if card is None:
            print(f"Card not found: {card_id}")
            return
        if not _is_failed_highlight_card(card):
            print(f"Card {card_id} is not a failed highlight upload; skipping.")
            return
        owner_id = card.owner_id
        refund_amount = highlight_charge_to_refund(db, owner_id, card.card_id)
        deleted_id = _delete_card(db, card)
        if refund_amount > Decimal("0.00"):
            add_credits(
                user_id=owner_id,
                amount=refund_amount,
                transaction_type=TX_REFUND,
                reference_id=deleted_id,
                note=f"Refund for failed highlight upload ({deleted_id})",
                db=db,
            )
        db.commit()
        print(f"Deleted {deleted_id}; refunded ${refund_amount:.2f} to user_id={owner_id}")
    finally:
        db.close()


def main() -> int:
    _load_dotenv()
    targets = sys.argv[1:] or ["FL-2026-000035"]
    for card_id in targets:
        cleanup_card(card_id.strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
