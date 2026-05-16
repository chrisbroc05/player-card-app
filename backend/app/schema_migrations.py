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
