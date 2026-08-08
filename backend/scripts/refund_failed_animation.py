#!/usr/bin/env python3
"""One-time or manual refund for a failed card animation."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from dotenv import load_dotenv

load_dotenv(REPO_ROOT / ".env")

from credit_service import animation_charge_to_refund, refund_animation_credits
from database import SessionLocal
from models import Card


def main(card_id: str) -> int:
    db = SessionLocal()
    try:
        card = db.query(Card).filter(Card.card_id == card_id).first()
        if card is None:
            print(f"Card not found: {card_id}")
            return 1
        if not card.owner_id:
            print(f"Card {card_id} has no owner_id")
            return 1

        owed = animation_charge_to_refund(db, card.owner_id, card_id)
        print(f"Outstanding animation charge for {card_id}: ${owed}")

        refunded = refund_animation_credits(db, card.owner_id, card_id)
        if refunded <= 0:
            print("No refund applied (already refunded or no animation charge on record).")
            db.rollback()
            return 0

        db.commit()
        print(f"Refunded ${refunded} to user {card.owner_id} for {card_id}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "FL-2026-000049"
    raise SystemExit(main(target))
