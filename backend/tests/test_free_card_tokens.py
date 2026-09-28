"""Tests for beta signup free card creation tokens."""

from __future__ import annotations

import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["BETA_INVITE_CODE"] = "PROSPECTLEGENDS2026"
os.environ["BETA_FREE_CARD_TOKENS"] = "5"

from beta_config import invite_code_grants_free_tokens  # noqa: E402
from card_pricing import normalize_order_tier  # noqa: E402
from credit_service import TX_FREE_BETA_CARD, get_ledger  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from free_card_token_service import (  # noqa: E402
    card_creation_charge_with_free_token,
    consume_free_card_token_after_success,
    grant_signup_free_card_tokens,
)
from models import CardCreationCheckout, User  # noqa: E402


class FreeCardTokenTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()

    def test_invite_code_grants_free_tokens(self) -> None:
        self.assertTrue(invite_code_grants_free_tokens("PROSPECTLEGENDS2026"))
        self.assertTrue(invite_code_grants_free_tokens("prospectlegends2026"))
        self.assertFalse(invite_code_grants_free_tokens("WRONGCODE"))

    def test_grant_signup_free_card_tokens(self) -> None:
        user = User(email="beta@example.com", display_name="Beta User", hashed_password="x")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        granted = grant_signup_free_card_tokens(self.db, user)
        self.db.commit()
        self.db.refresh(user)

        self.assertEqual(granted, 5)
        self.assertEqual(user.free_card_tokens, 5)
        self.assertEqual(user.free_card_tokens_granted, 5)

    def test_charge_with_free_token_covers_base_only(self) -> None:
        static_quote = card_creation_charge_with_free_token(
            normalize_order_tier("rookie"),
            card_type="static",
            animated=False,
            free_tokens_available=3,
        )
        self.assertTrue(static_quote["free_token_applied"])
        self.assertEqual(static_quote["charge_total"], 0.0)

        animated_quote = card_creation_charge_with_free_token(
            normalize_order_tier("rookie"),
            card_type="static",
            animated=True,
            free_tokens_available=3,
        )
        self.assertEqual(animated_quote["charge_total"], 10.0)

        highlight_quote = card_creation_charge_with_free_token(
            normalize_order_tier("rookie"),
            card_type="highlight",
            animated=False,
            free_tokens_available=3,
        )
        self.assertEqual(highlight_quote["charge_total"], 5.0)

    def test_consume_token_after_success_logs_ledger(self) -> None:
        user = User(
            email="consume@example.com",
            display_name="Consume User",
            hashed_password="x",
            free_card_tokens=2,
            free_card_tokens_granted=5,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        checkout = CardCreationCheckout(
            user_id=user.id,
            order_id=1,
            order_snapshot={"tier": "rookie"},
            tier="rookie",
            card_type="static",
            animated=False,
            copy_quantity=1,
            amount_dollars=Decimal("0.00"),
            paid_with_free_token=True,
            stripe_session_id="free_token_test_1",
            status="awaiting_selection",
        )
        self.db.add(checkout)
        self.db.commit()
        self.db.refresh(checkout)

        remaining = consume_free_card_token_after_success(
            self.db,
            user_id=user.id,
            checkout=checkout,
        )
        self.db.commit()
        self.db.refresh(user)

        self.assertEqual(remaining, 1)
        self.assertEqual(user.free_card_tokens, 1)
        self.assertTrue(checkout.free_token_consumed)

        rows = get_ledger(self.db, user.id, limit=10)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["transaction_type"], TX_FREE_BETA_CARD)
        self.assertIn("1 token used (1 remaining)", rows[0]["note"])


if __name__ == "__main__":
    unittest.main()
