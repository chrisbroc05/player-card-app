"""Stats summary separates cash sales from card trades."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from database import Base, SessionLocal, engine  # noqa: E402
from marketplace_trade_repo import OFFER_TYPE_CARD_TRADE, OFFER_TYPE_CASH  # noqa: E402
from models import Card, MarketplaceOffer, User, utcnow  # noqa: E402
from stats_service import compute_stats_summary  # noqa: E402


class StatsMarketplaceTradeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.seller = User(email="seller@example.com", display_name="Seller", hashed_password="x")
        self.buyer = User(email="buyer@example.com", display_name="Buyer", hashed_password="x")
        self.db.add_all([self.seller, self.buyer])
        self.db.commit()
        self.db.refresh(self.seller)
        self.db.refresh(self.buyer)
        card = Card(
            card_id="FL-2026-000301",
            player_name="Listed Player",
            team_name="Team",
            position="SS",
            jersey_number="1",
            grad_year="2030",
            tier="rookie",
            theme="none",
            rarity="base",
            edition_number=1,
            print_run=1,
            image_url="https://example.com/a.png",
            shareable_slug="fl-2026-000301",
            owner_id=self.seller.id,
            creator_user_id=self.seller.id,
            status="active",
        )
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        self.card = card

    def tearDown(self) -> None:
        self.db.close()

    def test_cards_sold_excludes_card_trades(self) -> None:
        now = utcnow()
        self.db.add(
            MarketplaceOffer(
                card_id=self.card.card_id,
                seller_id=self.seller.id,
                buyer_id=self.buyer.id,
                offer_amount=0,
                royalty_amount=0,
                status="accepted",
                offer_type=OFFER_TYPE_CARD_TRADE,
                created_at=now,
                updated_at=now,
            )
        )
        self.db.add(
            MarketplaceOffer(
                card_id=self.card.card_id,
                seller_id=self.seller.id,
                buyer_id=self.buyer.id,
                offer_amount=25.0,
                royalty_amount=2.5,
                status="accepted",
                offer_type=OFFER_TYPE_CASH,
                created_at=now,
                updated_at=now,
            )
        )
        self.db.commit()

        summary = compute_stats_summary(self.db, self.seller.id, "all_time")
        self.assertEqual(summary.cards_sold, 1)
        self.assertEqual(summary.cards_traded, 1)


if __name__ == "__main__":
    unittest.main()
