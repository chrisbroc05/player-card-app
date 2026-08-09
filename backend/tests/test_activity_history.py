"""Tests for unified activity history ordering and card sources."""

from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from activity_history import gather_user_activity_items, list_user_activity_history  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from models import Card, User, utcnow  # noqa: E402


class ActivityHistoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.user = User(
            email="activity@example.com",
            display_name="Activity User",
            hashed_password="x",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self) -> None:
        self.db.close()

    def _add_card(
        self,
        *,
        card_id: str,
        style: str = "studio",
        is_animated: bool = False,
        animation_status: str | None = None,
        animation_completed_at: datetime | None = None,
        is_highlight: bool = False,
        highlight_status: str | None = None,
        highlight_uploaded_at: datetime | None = None,
        created_at: datetime | None = None,
        status: str = "active",
    ) -> Card:
        row = Card(
            card_id=card_id,
            player_name="Test Player",
            team_name="Team",
            position="SS",
            jersey_number="7",
            grad_year="2030",
            tier="rookie",
            theme="none",
            rarity="base",
            edition_number=1,
            print_run=1,
            image_url="https://example.com/card.png",
            shareable_slug=card_id.lower(),
            owner_id=self.user.id,
            creator_user_id=self.user.id,
            status=status,
            style=style,
            is_animated=is_animated,
            animation_status=animation_status,
            animation_completed_at=animation_completed_at,
            is_highlight=is_highlight,
            highlight_status=highlight_status,
            highlight_uploaded_at=highlight_uploaded_at,
            created_at=created_at or utcnow(),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def test_studio_animated_cards_are_included_without_upgrade_style(self) -> None:
        now = datetime.now(timezone.utc)
        self._add_card(
            card_id="FL-2026-000101",
            style="studio-preview",
            is_animated=True,
            animation_status="completed",
            animation_completed_at=now,
        )

        items = gather_user_activity_items(self.db, self.user.id)
        animated = [i for i in items if i["activity_type"] == "animated_upgrade"]
        self.assertEqual(len(animated), 1)
        self.assertEqual(animated[0]["card"]["card_id"], "FL-2026-000101")

    def test_newest_completed_activity_is_first_with_limit(self) -> None:
        now = datetime.now(timezone.utc)
        self._add_card(
            card_id="FL-2026-000102",
            is_highlight=True,
            highlight_status="completed",
            highlight_uploaded_at=now - timedelta(days=2),
        )
        self._add_card(
            card_id="FL-2026-000103",
            style="studio-preview",
            is_animated=True,
            animation_status="completed",
            animation_completed_at=now - timedelta(hours=1),
        )
        self._add_card(
            card_id="FL-2026-000104",
            created_at=now - timedelta(days=5),
        )

        page, total = list_user_activity_history(self.db, self.user, limit=5, offset=0)
        self.assertEqual(total, 3)
        self.assertEqual(page[0]["activity_type"], "animated_upgrade")
        self.assertEqual(page[0]["card"]["card_id"], "FL-2026-000103")
        self.assertEqual(page[1]["activity_type"], "highlight_upgrade")
        self.assertEqual(page[2]["activity_type"], "card_created")

    def test_legacy_creator_fallback_includes_owner_cards(self) -> None:
        now = datetime.now(timezone.utc)
        row = Card(
            card_id="FL-2026-000105",
            player_name="Legacy Player",
            team_name="Team",
            position="P",
            jersey_number="12",
            grad_year="2030",
            tier="rookie",
            theme="none",
            rarity="base",
            edition_number=1,
            print_run=1,
            image_url="https://example.com/legacy.png",
            shareable_slug="fl-2026-000105",
            owner_id=self.user.id,
            creator_user_id=None,
            status="active",
            style="legacy",
            is_animated=True,
            animation_status="completed",
            animation_completed_at=now,
            created_at=now - timedelta(days=1),
        )
        self.db.add(row)
        self.db.commit()

        items = gather_user_activity_items(self.db, self.user.id)
        animated = [i for i in items if i["activity_type"] == "animated_upgrade"]
        self.assertEqual(len(animated), 1)
        self.assertEqual(animated[0]["card"]["card_id"], "FL-2026-000105")


if __name__ == "__main__":
    unittest.main()
