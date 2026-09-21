"""Profile stat sheet API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import User
from stats_service import VALID_PERIODS, compute_stats_summary

router = APIRouter()


class MonthlyStatPointOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    month: str
    earnings: float
    spending: float
    cards_created: int


class TopSaleOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_name: str
    sale_price: float


class StatsSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cards_created: int
    cards_sold: int
    total_earned: float
    total_spent: float
    best_sale: float
    collection_count: int
    monthly_data: list[MonthlyStatPointOut]
    top_sales: list[TopSaleOut]


@router.get("/summary", response_model=StatsSummaryResponse)
def get_stats_summary(
    period: str = Query("this_month"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    key = (period or "this_month").strip().lower()
    if key not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period. Use one of: {', '.join(sorted(VALID_PERIODS))}",
        )
    summary = compute_stats_summary(db, user.id, key)
    return StatsSummaryResponse(
        cards_created=summary.cards_created,
        cards_sold=summary.cards_sold,
        total_earned=summary.total_earned,
        total_spent=summary.total_spent,
        best_sale=summary.best_sale,
        collection_count=summary.collection_count,
        monthly_data=[
            MonthlyStatPointOut(
                month=point.month,
                earnings=point.earnings,
                spending=point.spending,
                cards_created=point.cards_created,
            )
            for point in summary.monthly_data
        ],
        top_sales=[
            TopSaleOut(player_name=sale.player_name, sale_price=sale.sale_price)
            for sale in summary.top_sales
        ],
    )
