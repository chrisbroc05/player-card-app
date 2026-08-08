#!/usr/bin/env python3
"""One-time or manual refund for a failed card animation."""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_DIR = Path(__file__).resolve().parents[1] / "app"


def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
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


_load_dotenv()
sys.path.insert(0, str(APP_DIR))

from credit_service import animation_charge_to_refund, refund_animation_credits
from database import SessionLocal
from models import Card


def main(card_id: str) -> int:
    db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not db_url or db_url.startswith("sqlite"):
        print(
            "DATABASE_URL must point to production PostgreSQL. "
            "Set it in .env or pass it in the environment."
        )
        return 1

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
