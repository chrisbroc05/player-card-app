"""Tests for pending preview discard flow."""

from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from database import Base, SessionLocal, engine  # noqa: E402
from models import Card, User, utcnow  # noqa: E402
from card_repo import (  # noqa: E402
    discard_pending_session,
    get_latest_pending_session,
)


class PendingDiscardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    def setUp(self) -> None:
        self.db = SessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.user = User(
            email="test@example.com",
            display_name="Test User",
            hashed_password="x",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self) -> None:
        self.db.close()

    def _add_preview(self, *, card_id: str, session_id: str | None) -> Card:
        row = Card(
            card_id=card_id,
            player_name="Test Player",
            team_name="Team",
            position="SS",
            jersey_number="1",
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
            status="preview",
            preview_session_id=session_id,
            created_at=utcnow(),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def test_discard_by_card_ids_removes_from_pending(self) -> None:
        session_id = "session-abc-123"
        card = self._add_preview(card_id="FL-2026-000099", session_id=session_id)

        count = discard_pending_session(
            self.db,
            owner_id=self.user.id,
            preview_session_id=session_id,
            card_ids=[card.card_id],
        )
        self.assertEqual(count, 1)

        pending = get_latest_pending_session(self.db, self.user.id)
        self.assertIsNone(pending)

        self.db.refresh(card)
        self.assertEqual(card.status, "discarded")

    def test_discard_by_session_id_when_card_ids_empty(self) -> None:
        session_id = "session-legacy-456"
        self._add_preview(card_id="FL-2026-000100", session_id=session_id)

        count = discard_pending_session(
            self.db,
            owner_id=self.user.id,
            preview_session_id=session_id,
            card_ids=None,
        )
        self.assertEqual(count, 1)
        self.assertIsNone(get_latest_pending_session(self.db, self.user.id))


if __name__ == "__main__":
    unittest.main()
