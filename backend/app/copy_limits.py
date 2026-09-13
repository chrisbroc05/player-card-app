"""Copy quantity limits from environment variables."""

from __future__ import annotations

import os

from fastapi import HTTPException
from sqlalchemy.orm import Session

from marketplace_repo import copy_family_query


def _parse_int(raw: str | None, default: int) -> int:
    try:
        return max(1, int((raw or "").strip() or default))
    except ValueError:
        return default


def max_copies_per_order() -> int:
    return _parse_int(os.environ.get("MAX_COPIES_PER_ORDER"), 100)


def max_copies_per_user_per_card() -> int:
    return _parse_int(os.environ.get("MAX_COPIES_PER_USER_PER_CARD"), 200)


def max_copies_listed_at_once() -> int:
    return _parse_int(os.environ.get("MAX_COPIES_LISTED_AT_ONCE"), 50)


def count_existing_copy_family(db: Session, owner_id: int, anchor) -> int:
    return copy_family_query(db, owner_id, anchor).count()


def validate_copy_order_quantity(
    db: Session,
    *,
    owner_id: int,
    anchor,
    target_quantity: int,
) -> None:
    """
    Validate expanding print run to target_quantity.
    target_quantity is total copies after the order (not delta).
    """
    if not isinstance(target_quantity, int):
        raise HTTPException(status_code=400, detail="Quantity must be a whole number.")

    if target_quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    per_order = max_copies_per_order()
    per_user = max_copies_per_user_per_card()
    existing = count_existing_copy_family(db, owner_id, anchor)
    adding = max(0, target_quantity - existing)

    if existing <= 1 and target_quantity > per_order:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Maximum {per_order} copies per order. "
                "For larger quantities please contact support."
            ),
        )

    if adding > per_order:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Maximum {per_order} copies per order. "
                "For larger quantities please contact support."
            ),
        )

    if target_quantity > per_user:
        available = max(0, per_user - existing)
        raise HTTPException(
            status_code=400,
            detail=(
                f"You already own {existing} copies of this card. "
                f"You can add up to {available} more (maximum {per_user} total copies of the same card)."
            ),
        )


def validate_bulk_list_quantity(quantity: int) -> None:
    cap = max_copies_listed_at_once()
    if quantity > cap:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {cap} copies can be listed at once.",
        )
