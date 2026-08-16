"""User settings endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from user_settings import merge_user_settings, validate_settings_patch

router = APIRouter()


class SettingsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    autoplay_videos: bool = True
    show_prices: bool = True
    default_tier: str = "all_star"
    default_theme: str | None = None
    email_offer_accepted: bool = True
    email_new_offer: bool = True
    email_animation_ready: bool = True
    email_trade_request: bool = True
    email_weekly_summary: bool = False
    public_collection: bool = True
    show_in_leaderboard: bool = True


class SettingsUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    autoplay_videos: bool | None = None
    show_prices: bool | None = None
    default_tier: str | None = None
    default_theme: str | None = Field(default=None)
    email_offer_accepted: bool | None = None
    email_new_offer: bool | None = None
    email_animation_ready: bool | None = None
    email_trade_request: bool | None = None
    email_weekly_summary: bool | None = None
    public_collection: bool | None = None
    show_in_leaderboard: bool | None = None


def _settings_for_user(user: User) -> dict:
    raw = user.settings if isinstance(user.settings, dict) else {}
    return merge_user_settings(raw)


@router.get("", response_model=SettingsResponse)
def get_settings(user: User = Depends(get_current_user)):
    return SettingsResponse(**_settings_for_user(user))


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return SettingsResponse(**_settings_for_user(user))
    try:
        cleaned = validate_settings_patch(patch)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    current = _settings_for_user(user)
    current.update(cleaned)
    user.settings = current
    db.commit()
    db.refresh(user)
    return SettingsResponse(**current)
