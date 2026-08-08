"""Tests for animation credit refund helpers."""

from __future__ import annotations

import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from database import Base, SessionLocal, engine  # noqa: E402
from models import CreditLedger, User, utcnow  # noqa: E402
from credit_service import (  # noqa: E402
    TX_ANIMATION,
    TX_REFUND,
    animation_charge_to_refund,
    deduct_credits,
    refund_animation_credits,
)


class AnimationRefundTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.user = User(
            email="refund-test@example.com",
            display_name="Refund Test",
            hashed_password="x",
            credit_balance=Decimal("100.00"),
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self) -> None:
        self.db.close()

    def test_animation_charge_to_refund_returns_outstanding_amount(self) -> None:
        card_id = "FL-2026-000049"
        deduct_credits(
            user_id=self.user.id,
            amount=Decimal("10.00"),
            transaction_type=TX_ANIMATION,
            reference_id=card_id,
            note="Animation charge",
            db=self.db,
        )
        self.db.commit()

        owed = animation_charge_to_refund(self.db, self.user.id, card_id)
        self.assertEqual(owed, Decimal("10.00"))

    def test_refund_animation_credits_is_idempotent(self) -> None:
        card_id = "FL-2026-000049"
        deduct_credits(
            user_id=self.user.id,
            amount=Decimal("10.00"),
            transaction_type=TX_ANIMATION,
            reference_id=card_id,
            note="Animation charge",
            db=self.db,
        )
        self.db.commit()

        first = refund_animation_credits(self.db, self.user.id, card_id)
        self.db.commit()
        second = refund_animation_credits(self.db, self.user.id, card_id)
        self.db.commit()

        self.assertEqual(first, Decimal("10.00"))
        self.assertEqual(second, Decimal("0.00"))

        rows = (
            self.db.query(CreditLedger)
            .filter(
                CreditLedger.user_id == self.user.id,
                CreditLedger.reference_id == card_id,
            )
            .all()
        )
        refund_rows = [r for r in rows if r.transaction_type == TX_REFUND]
        self.assertEqual(len(refund_rows), 1)
        self.assertEqual(refund_rows[0].amount, Decimal("10.00"))
        self.assertIn("Animation failed", refund_rows[0].note or "")

        self.db.refresh(self.user)
        self.assertEqual(self.user.credit_balance, Decimal("100.00"))


if __name__ == "__main__":
    unittest.main()
