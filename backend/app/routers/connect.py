"""Stripe Connect onboarding and dashboard links."""

from __future__ import annotations

import traceback

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from payments_config import require_payments_enabled
from stripe_connect import (
    create_dashboard_link,
    create_onboarding_link,
    ensure_connect_account,
    sync_connect_account_status,
)

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


class ConnectStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stripe_account_status: str | None = None
    stripe_onboarding_complete: bool = False
    stripe_payouts_enabled: bool = False
    charges_enabled: bool = False


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
    try:
        require_payments_enabled()
        url = create_onboarding_link(db, user)
        return ConnectUrlResponse(url=url)
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        print("CONNECT ONBOARDING ERROR:", str(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/refresh-status", response_model=ConnectStatusResponse)
def connect_refresh_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Fetch current Stripe Connect account status and update the user record."""
    require_payments_enabled()
    if not user.stripe_account_id:
        raise HTTPException(status_code=400, detail="No Stripe Connect account")
    status = sync_connect_account_status(db, user)
    return ConnectStatusResponse(**status)


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
