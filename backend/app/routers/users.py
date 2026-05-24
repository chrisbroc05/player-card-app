"""User search for gifting credits."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User

router = APIRouter()


@router.get("/search")
def search_users(
    q: str = Query(..., min_length=3, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    term = (q or "").strip()
    if len(term) < 3:
        return []

    pattern = f"%{term}%"
    rows = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            or_(User.email.ilike(pattern), User.display_name.ilike(pattern)),
        )
        .order_by(User.display_name.asc())
        .limit(20)
        .all()
    )
    return [{"id": u.id, "display_name": u.display_name} for u in rows]
