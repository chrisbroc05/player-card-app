#!/usr/bin/env python3
"""
One-time migration: copy local media files from APP_DATA_DIR to Cloudflare R2.

Idempotent — skips URLs that already point at R2 (https://pub-... or R2_PUBLIC_URL).

Usage (from repo root):
  cd backend/app && python ../scripts/migrate_to_r2.py
"""

from __future__ import annotations

import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from database import SessionLocal  # noqa: E402
from models import Card  # noqa: E402
from utils.storage import (  # noqa: E402
    content_type_for_filename,
    is_r2_configured,
    is_r2_public_url,
    local_path_from_media_url,
    upload_file_to_r2,
)

FIELD_SPECS = (
    ("image_url", "cards"),
    ("animated_video_url", "animations"),
    ("highlight_video_url", "highlights"),
    ("highlight_thumbnail_url", "highlights/thumbnails"),
)


def _r2_key_for_url(url: str, prefix: str) -> str | None:
    local = local_path_from_media_url(url)
    if local is None:
        return None
    return f"{prefix}/{local.name}"


def migrate() -> int:
    if not is_r2_configured():
        print("R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.")
        return 1

    db = SessionLocal()
    ok = 0
    failed = 0
    skipped = 0

    try:
        cards = db.query(Card).all()
        for card in cards:
            for field_name, prefix in FIELD_SPECS:
                current = (getattr(card, field_name, None) or "").strip()
                if not current:
                    continue
                if is_r2_public_url(current):
                    skipped += 1
                    continue

                local_path = local_path_from_media_url(current)
                if local_path is None or not local_path.is_file():
                    print(f"SKIP missing file card={card.card_id} field={field_name} url={current}")
                    skipped += 1
                    continue

                r2_key = _r2_key_for_url(current, prefix)
                if not r2_key:
                    print(f"FAIL could not derive R2 key card={card.card_id} field={field_name}")
                    failed += 1
                    continue

                try:
                    file_bytes = local_path.read_bytes()
                    content_type = content_type_for_filename(local_path.name)
                    new_url = upload_file_to_r2(file_bytes, r2_key, content_type)
                    if not new_url:
                        print(f"FAIL upload returned no URL card={card.card_id} field={field_name}")
                        failed += 1
                        continue
                    setattr(card, field_name, new_url)
                    db.commit()
                    print(f"OK card={card.card_id} field={field_name} -> {new_url}")
                    ok += 1
                except Exception as exc:
                    db.rollback()
                    print(f"FAIL card={card.card_id} field={field_name}: {exc}")
                    failed += 1
    finally:
        db.close()

    print(f"Migrated {ok} files successfully, {failed} failed ({skipped} skipped)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(migrate())
