"""Stripe Connect onboarding and dashboard links."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from payments_config import require_payments_enabled
from stripe_connect import create_dashboard_link, create_onboarding_link, ensure_connect_account

router = APIRouter()


@router.get("/test")
def connect_router_test():
    """Temporary reachability check — confirms router is mounted at /connect/test."""
    return {"status": "connect router reachable"}


class ConnectAccountResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stripe_account_id: str


class ConnectUrlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str


@router.post("/create-account", response_model=ConnectAccountResponse)
def connect_create_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    try:
        account_id = ensure_connect_account(db, user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return ConnectAccountResponse(stripe_account_id=account_id)


@router.post("/onboarding-link", response_model=ConnectUrlResponse)
def connect_onboarding_link(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    try:
        url = create_onboarding_link(db, user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return ConnectUrlResponse(url=url)


@router.post("/dashboard-link", response_model=ConnectUrlResponse)
def connect_dashboard_link(
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    if not user.stripe_onboarding_complete:
        raise HTTPException(status_code=400, detail="Complete Stripe onboarding first")
    try:
        url = create_dashboard_link(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return ConnectUrlResponse(url=url)
