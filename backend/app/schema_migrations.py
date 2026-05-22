"""Idempotent ALTER TABLE for existing DBs. Call after Base.metadata.create_all."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_schema_migrations_after_models(engine: Engine) -> None:
    """Add trading columns to cards if missing (trade_offers table comes from create_all)."""
    insp = inspect(engine)
    if "cards" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("cards")}
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "status" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS status VARCHAR(32) "
                        "NOT NULL DEFAULT 'active'"
                    )
                )
            else:
                conn.execute(
                    text("ALTER TABLE cards ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active'")
                )
        if "trade_offered_to" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS trade_offered_to INTEGER "
                        "REFERENCES users(id)"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN trade_offered_to INTEGER"))
        if "creator_user_id" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS creator_user_id INTEGER "
                        "REFERENCES users(id)"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN creator_user_id INTEGER"))
            conn.execute(text("UPDATE cards SET creator_user_id = owner_id WHERE creator_user_id IS NULL"))
        if "listed_on_marketplace" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS listed_on_marketplace BOOLEAN "
                        "NOT NULL DEFAULT FALSE"
                    )
                )
            else:
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN listed_on_marketplace BOOLEAN "
                        "NOT NULL DEFAULT 0"
                    )
                )
        if "asking_price" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text("ALTER TABLE cards ADD COLUMN IF NOT EXISTS asking_price NUMERIC(10, 2)")
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN asking_price NUMERIC(10, 2)"))
        if "listed_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS listed_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN listed_at DATETIME"))
        if "listing_expires_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS listing_expires_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN listing_expires_at DATETIME"))
        if "is_animated" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_animated BOOLEAN "
                        "NOT NULL DEFAULT FALSE"
                    )
                )
            else:
                conn.execute(
                    text("ALTER TABLE cards ADD COLUMN is_animated BOOLEAN NOT NULL DEFAULT 0")
                )
        if "animated_video_url" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS animated_video_url VARCHAR(512)"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN animated_video_url VARCHAR(512)"))
        if "animation_status" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS animation_status VARCHAR(32)"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN animation_status VARCHAR(32)"))
        if "animation_motion" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS animation_motion VARCHAR(64)"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN animation_motion VARCHAR(64)"))
        if "animation_requested_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS animation_requested_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN animation_requested_at DATETIME"))
        if "animation_completed_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS animation_completed_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN animation_completed_at DATETIME"))
        if "is_priority_listing" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_priority_listing BOOLEAN "
                        "NOT NULL DEFAULT FALSE"
                    )
                )
            else:
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN is_priority_listing BOOLEAN NOT NULL DEFAULT 0"
                    )
                )
        if "priority_listed_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority_listed_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN priority_listed_at DATETIME"))
        if "priority_expires_at" not in cols:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority_expires_at "
                        "TIMESTAMP WITH TIME ZONE"
                    )
                )
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN priority_expires_at DATETIME"))

        if "marketplace_offers" in insp.get_table_names():
            mcols = {c["name"] for c in insp.get_columns("marketplace_offers")}
            if "offer_type" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS offer_type "
                            "VARCHAR(32) NOT NULL DEFAULT 'cash'"
                        )
                    )
                else:
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN offer_type VARCHAR(32) "
                            "NOT NULL DEFAULT 'cash'"
                        )
                    )

        tables = set(insp.get_table_names())
        if "marketplace_trade_cards" not in tables:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS marketplace_trade_cards (
                            id SERIAL PRIMARY KEY,
                            offer_id INTEGER NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
                            card_id INTEGER NOT NULL REFERENCES cards(id),
                            side VARCHAR(32) NOT NULL
                        )
                        """
                    )
                )
            else:
                conn.execute(
                    text(
                        """
                        CREATE TABLE marketplace_trade_cards (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            offer_id INTEGER NOT NULL REFERENCES marketplace_offers(id),
                            card_id INTEGER NOT NULL REFERENCES cards(id),
                            side VARCHAR(32) NOT NULL
                        )
                        """
                    )
                )

        if "marketplace_offers" in insp.get_table_names():
            mcols = {c["name"] for c in insp.get_columns("marketplace_offers")}
            if "seller_id" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS seller_id INTEGER "
                            "REFERENCES users(id)"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE marketplace_offers ADD COLUMN seller_id INTEGER"))
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "UPDATE marketplace_offers mo SET seller_id = c.owner_id "
                            "FROM cards c WHERE mo.card_id = c.card_id AND mo.seller_id IS NULL"
                        )
                    )
                else:
                    conn.execute(
                        text(
                            "UPDATE marketplace_offers SET seller_id = "
                            "(SELECT owner_id FROM cards WHERE cards.card_id = marketplace_offers.card_id) "
                            "WHERE seller_id IS NULL"
                        )
                    )
            if "expires_at" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS expires_at "
                            "TIMESTAMP WITH TIME ZONE"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE marketplace_offers ADD COLUMN expires_at DATETIME"))
            if "counter_amount" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS counter_amount NUMERIC(10, 2)"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE marketplace_offers ADD COLUMN counter_amount NUMERIC(10, 2)"))
            if "counter_at" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS counter_at "
                            "TIMESTAMP WITH TIME ZONE"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE marketplace_offers ADD COLUMN counter_at DATETIME"))
            if "counter_status" not in mcols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE marketplace_offers ADD COLUMN IF NOT EXISTS counter_status VARCHAR(32)"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE marketplace_offers ADD COLUMN counter_status VARCHAR(32)"))

            if dialect == "postgresql":
                conn.execute(
                    text(
                        "UPDATE marketplace_offers SET expires_at = created_at + interval '14 days' "
                        "WHERE status = 'pending' AND expires_at IS NULL"
                    )
                )
            elif dialect == "sqlite":
                conn.execute(
                    text(
                        "UPDATE marketplace_offers SET expires_at = datetime(created_at, '+14 days') "
                        "WHERE status = 'pending' AND expires_at IS NULL"
                    )
                )

        if "users" in insp.get_table_names():
            ucols = {c["name"] for c in insp.get_columns("users")}
            if "parent_email" not in ucols:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_email VARCHAR(320)"
                        )
                    )
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN parent_email VARCHAR(320)"))
