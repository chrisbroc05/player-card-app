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
