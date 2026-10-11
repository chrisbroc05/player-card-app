#!/usr/bin/env python3
"""Grant marketplace sale earnings (ledger + balance) for manual QA."""

from __future__ import annotations

import os
import sys
from decimal import Decimal
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

from credit_service import TX_CARD_SALE  # noqa: E402
from database import SessionLocal  # noqa: E402
from marketplace_service import add_marketplace_balance  # noqa: E402
from models import User  # noqa: E402


def main(email: str, amount_dollars: str) -> int:
    db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not db_url or db_url.startswith("sqlite"):
        print("Set DATABASE_URL to production Postgres in .env before running.", file=sys.stderr)
        return 1

    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    if amt <= Decimal("0"):
        print("Amount must be positive.", file=sys.stderr)
        return 1

    normalized = email.strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == normalized).first()
        if user is None:
            print(f"No user found for {normalized}", file=sys.stderr)
            return 1

        row = add_marketplace_balance(
            db,
            user.id,
            amt,
            TX_CARD_SALE,
            reference_id="manual_qa_grant",
            note="Manual QA — test marketplace sale earning",
        )
        db.commit()
        db.refresh(user)
        print(
            f"Granted ${amt} card_sale to user id={user.id} email={user.email}; "
            f"marketplace_balance={user.marketplace_balance}; ledger balance_after={row.balance_after}"
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <email> <amount_dollars>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
