"""Marketplace withdrawal balance and withdrawable enforcement."""

from __future__ import annotations

import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from credit_service import TX_CARD_SALE, TX_TOP_UP, TX_WITHDRAWAL  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from marketplace_service import (  # noqa: E402
    InsufficientMarketplaceBalanceError,
    add_marketplace_balance,
    compute_marketplace_withdrawable,
    deduct_marketplace_balance,
    initiate_marketplace_withdrawal,
)
from models import User  # noqa: E402


class MarketplaceWithdrawalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.user = User(
            email="seller@example.com",
            display_name="Seller",
            hashed_password="x",
            stripe_account_id="acct_test",
            stripe_payouts_enabled=True,
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self) -> None:
        self.db.close()

    def test_withdrawable_caps_loaded_funds_without_sale_earnings(self) -> None:
        add_marketplace_balance(
            self.db,
            self.user.id,
            Decimal("20.00"),
            TX_CARD_SALE,
            note="QA grant",
        )
        self.db.commit()
        self.assertEqual(compute_marketplace_withdrawable(self.db, self.user.id), Decimal("20.00"))

        add_marketplace_balance(
            self.db,
            self.user.id,
            Decimal("10.00"),
            TX_TOP_UP,
            note="loaded spending",
        )
        self.db.commit()
        # $30 pool but only $20 from sales is withdrawable
        self.assertEqual(compute_marketplace_withdrawable(self.db, self.user.id), Decimal("20.00"))

    def test_withdrawable_decreases_after_ledger_withdrawal(self) -> None:
        add_marketplace_balance(self.db, self.user.id, Decimal("10.00"), TX_CARD_SALE)
        self.db.commit()
        self.assertEqual(compute_marketplace_withdrawable(self.db, self.user.id), Decimal("10.00"))

        deduct_marketplace_balance(self.db, self.user.id, Decimal("5.00"), TX_WITHDRAWAL)
        self.db.commit()
        self.assertEqual(compute_marketplace_withdrawable(self.db, self.user.id), Decimal("5.00"))

    @patch("marketplace_service.stripe.Payout.create")
    @patch("marketplace_service._connect_available_cents")
    @patch("marketplace_service._sync_connect_balance_for_withdrawal")
    @patch("marketplace_service.sync_connect_account_status")
    def test_initiate_rejects_amount_above_withdrawable_under_lock(
        self,
        _mock_sync_connect: MagicMock,
        _mock_sync_balance: MagicMock,
        mock_available: MagicMock,
        mock_payout: MagicMock,
    ) -> None:
        add_marketplace_balance(self.db, self.user.id, Decimal("10.00"), TX_CARD_SALE)
        deduct_marketplace_balance(self.db, self.user.id, Decimal("5.00"), TX_WITHDRAWAL)
        self.db.commit()

        mock_available.return_value = 500

        with self.assertRaises(InsufficientMarketplaceBalanceError):
            initiate_marketplace_withdrawal(self.db, self.user, Decimal("6.00"))

        mock_payout.assert_not_called()
        _mock_sync_balance.assert_not_called()

    @patch("marketplace_service.stripe.Payout.create")
    @patch("marketplace_service._connect_available_cents")
    @patch("marketplace_service._sync_connect_balance_for_withdrawal")
    @patch("marketplace_service.sync_connect_account_status")
    def test_initiate_allows_second_five_dollar_withdrawal(
        self,
        _mock_sync_connect: MagicMock,
        _mock_sync_balance: MagicMock,
        mock_available: MagicMock,
        mock_payout: MagicMock,
    ) -> None:
        add_marketplace_balance(self.db, self.user.id, Decimal("10.00"), TX_CARD_SALE)
        self.db.commit()

        mock_available.return_value = 500
        mock_payout.return_value = MagicMock(id="po_first")

        row1, payout1 = initiate_marketplace_withdrawal(self.db, self.user, Decimal("5.00"))
        self.db.commit()
        self.assertEqual(payout1, "po_first")
        self.assertEqual(row1.balance_after, Decimal("5.00"))

        mock_payout.return_value = MagicMock(id="po_second")
        row2, payout2 = initiate_marketplace_withdrawal(self.db, self.user, Decimal("5.00"))
        self.db.commit()
        self.assertEqual(payout2, "po_second")
        self.assertEqual(row2.balance_after, Decimal("0.00"))
        self.assertEqual(mock_payout.call_count, 2)


if __name__ == "__main__":
    unittest.main()
