"""User activity history routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from activity_history import ACTIVITY_TYPES, list_user_activity_history
from auth import get_current_user
from database import get_db
from models import User
from sqlalchemy.orm import Session

router = APIRouter()


class ActivityCardOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    tier: str
    theme: str
    image_url: str


class ActivityCounterpartyOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str
    user_id: int | None = None


class ActivityItemOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    activity_type: str
    created_at: str
    completed_at: str
    card: ActivityCardOut
    counterparty: ActivityCounterpartyOut | None = None
    amount: float | None = None
    royalty_amount: float | None = None
    status: str = "completed"


class ActivityHistoryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ActivityItemOut]
    total: int
    limit: int
    offset: int


@router.get("/history", response_model=ActivityHistoryResponse)
def get_activity_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    activity_type: str | None = Query(default=None, alias="type"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Unified completed activity for the authenticated user, newest first."""
    if activity_type:
        normalized = activity_type.strip().lower()
        allowed = ACTIVITY_TYPES | {"trades"}
        if normalized not in allowed:
            activity_type = None

    rows, total = list_user_activity_history(
        db,
        user,
        limit=limit,
        offset=offset,
        activity_type=activity_type,
    )

    items = [ActivityItemOut(**row) for row in rows]
    return ActivityHistoryResponse(items=items, total=total, limit=limit, offset=offset)
