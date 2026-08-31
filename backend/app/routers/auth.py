"""User-facing auth-related routes (JWT session)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import logging
import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from card_repo import animation_fields_for_card, highlight_fields_for_card
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from credit_service import (
    TX_ANIMATION,
    TX_CARD_SALE,
    TX_GENERATION,
    TX_HIGHLIGHT,
    TX_WITHDRAWAL,
)
from database import get_db
from email_service import frontend_url, send_google_signin_email, send_password_reset_email
from models import Card, CreditLedger, MarketplaceOffer, User
from parent_email_utils import normalize_optional_parent_email
from profile_stats import compute_profile_kpis, compute_rarity_collection_stats
from utils.rarity import get_template_name, rarity_display_name
from webauthn_helpers import (
    auth_user_payload,
    consume_login_challenge,
    resolve_webauthn_origin,
    store_login_challenge,
)
from webauthn import generate_authentication_options, generate_registration_options
from webauthn import verify_authentication_response, verify_registration_response
from webauthn.helpers.bytes_to_base64url import bytes_to_base64url
from webauthn.helpers.base64url_to_bytes import base64url_to_bytes
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)
from webauthn.helpers.options_to_json import options_to_json
from marketplace_repo import float_from_decimal
from stripe_connect import sync_connect_account_status
from beta_config import get_beta_invite_code
from google_oauth import (
    build_google_flow,
    consume_oauth_state,
    create_google_user,
    google_error_redirect,
    google_invite_redirect,
    google_oauth_configured,
    google_success_redirect,
    pop_pending_google_signup,
    store_oauth_state,
    store_pending_google_signup,
    validate_beta_invite_code,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class UpdateProfileBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    parent_email: str | None = Field(default=None, max_length=320)
    display_name: str | None = Field(default=None, min_length=1, max_length=200)


class ChangePasswordBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class DeleteAccountBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    confirmation: str = Field(..., min_length=1)


class ForgotPasswordBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: EmailStr


class ResetPasswordBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    token: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=8, max_length=128)


class WebAuthnLoginOptionsBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    credential_id: str | None = Field(default=None, max_length=512)


class GoogleCompleteBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    pending: str = Field(..., min_length=1, max_length=256)
    invite_code: str | None = Field(default=None, max_length=200)


FORGOT_PASSWORD_MESSAGE = "If an account exists with that email, a reset link has been sent."


def _reset_token_is_valid(user: User | None) -> bool:
    if user is None or not user.reset_token or not user.reset_token_expires:
        return False
    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires >= datetime.now(timezone.utc)


class ProfileFinancialsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_spent_on_cards: float = 0.0
    total_earned_from_sales: float = 0.0
    total_withdrawn: float = 0.0
    current_balance: float = 0.0
    total_animated_cards_cost: float = 0.0
    total_highlight_cards_cost: float = 0.0


class ProfileCardOut(BaseModel):
    """Full card payload for profile highlight sections (video-capable thumbnails)."""

    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    team_name: str = ""
    position: str = ""
    jersey_number: str = ""
    grad_year: int = 0
    tier: str
    theme: str
    rarity: str = ""
    rarity_display_name: str = "Base"
    rarity_template: int = 1
    template_name: str = "Classic"
    edition_number: int = 1
    print_run: int = 1
    image_url: str

    is_animated: bool = False
    animated_video_url: str | None = None
    animation_status: str | None = None
    animation_motion: str | None = None
    action_category: str | None = None
    throwing_hand: str | None = None
    batting_side: str | None = None
    player_photo_url: str | None = None
    face_photo_url: str | None = None
    photo_notes: str | None = None
    animation_scenario_id: str | None = None
    animation_model_used: str | None = None

    is_highlight: bool = False
    highlight_video_url: str | None = None
    highlight_thumbnail_url: str | None = None
    highlight_status: str | None = None
    highlight_uploaded_at: str | None = None
    highlight_trim_start: float | None = None
    highlight_trim_end: float | None = None


class RarestCardOut(ProfileCardOut):
    pass


class MarketplaceHighlightOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offer_amount: float
    buyer_display_name: str | None = None
    accepted_at: str | None = None
    card: ProfileCardOut


class MarketplaceStatsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_spent: float
    total_earned: float
    highest_purchase: MarketplaceHighlightOut | None = None
    highest_sale: MarketplaceHighlightOut | None = None
    total_offers_made: int
    active_listings: int


class RarityCountsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    foil: int = 0
    refractor: int = 0
    gold_auto: int = 0
    one_of_one: int = 0
    black_label: int = 0


class ProfileRarityStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rarest_pull: str | None = None
    rarest_card: ProfileCardOut | None = None
    rarity_counts: RarityCountsOut
    total_rare_cards: int = 0


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str
    email: str
    parent_email: str | None = Field(default=None)
    credit_balance: float = 0.0
    stripe_account_status: str | None = Field(default=None)
    stripe_onboarding_complete: bool = False
    stripe_payouts_enabled: bool = False
    member_since: str
    total_cards_owned: int
    total_cards_ever_created: int
    cards_traded_away: int
    cards_received_via_trade: int
    animated_cards_owned: int = 0
    highlight_cards_owned: int = 0
    total_print_run_copies: int
    favorite_tier: str | None = Field(default=None)
    rarest_card: RarestCardOut | None = None
    marketplace_activity_count: int = 0
    marketplace_stats: MarketplaceStatsOut


def _member_since_label(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.strftime("%B %Y")


def _grad_year_int(card: Card) -> int:
    try:
        return int(card.grad_year or 0)
    except (TypeError, ValueError):
        return 0


def _profile_card_out(card: Card) -> ProfileCardOut:
    row = {
        "card_id": card.card_id or "",
        "player_name": card.player_name or "",
        "team_name": card.team_name or "",
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": _grad_year_int(card),
        "tier": card.tier or "rookie",
        "theme": card.theme or "none",
        "rarity": card.rarity or "",
        "rarity_display_name": rarity_display_name(card.rarity),
        "rarity_template": int(getattr(card, "rarity_template", None) or 1),
        "template_name": get_template_name(card.tier, int(getattr(card, "rarity_template", None) or 1)),
        "edition_number": int(card.edition_number or 1),
        "print_run": int(card.print_run or 1),
        "image_url": card.image_url or "",
    }
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
    return ProfileCardOut(**row)


def _iso_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _highlight_from_offer(db: Session, offer: MarketplaceOffer | None) -> MarketplaceHighlightOut | None:
    if offer is None:
        return None
    card_row = offer.card
    if card_row is None:
        card_row = db.query(Card).filter(Card.card_id == offer.card_id).first()
    if card_row is None:
        return None
    buyer_name = None
    if offer.buyer is not None:
        buyer_name = (offer.buyer.display_name or "").strip() or None
    when = offer.updated_at or offer.created_at
    return MarketplaceHighlightOut(
        offer_amount=float_from_decimal(offer.offer_amount),
        buyer_display_name=buyer_name,
        accepted_at=_iso_dt(when),
        card=_profile_card_out(card_row),
    )


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Aggregate stats for the authenticated user (own cards / trades only)."""
    if user.stripe_account_id:
        sync_connect_account_status(db, user)

    kpis = compute_profile_kpis(db, user)

    rarest_out: RarestCardOut | None = None
    if kpis.rarest_card is not None:
        rarest_out = RarestCardOut(**_profile_card_out(kpis.rarest_card).model_dump())

    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    marketplace_stats = MarketplaceStatsOut(
        total_spent=kpis.total_spent,
        total_earned=kpis.total_earned,
        highest_purchase=_highlight_from_offer(db, kpis.top_purchase),
        highest_sale=_highlight_from_offer(db, kpis.top_sale),
        total_offers_made=kpis.total_offers_made,
        active_listings=kpis.active_listings,
    )

    return UserProfileResponse(
        display_name=user.display_name,
        email=user.email,
        parent_email=user.parent_email,
        credit_balance=float_from_decimal(user.credit_balance),
        stripe_account_status=user.stripe_account_status,
        stripe_onboarding_complete=bool(user.stripe_onboarding_complete),
        stripe_payouts_enabled=bool(user.stripe_payouts_enabled),
        member_since=_member_since_label(created),
        total_cards_owned=kpis.total_cards_owned,
        total_cards_ever_created=kpis.total_cards_ever_created,
        cards_traded_away=kpis.cards_traded_away,
        cards_received_via_trade=kpis.cards_received_via_trade,
        animated_cards_owned=kpis.animated_cards_owned,
        highlight_cards_owned=kpis.highlight_cards_owned,
        total_print_run_copies=kpis.total_print_run_copies,
        favorite_tier=kpis.favorite_tier,
        rarest_card=rarest_out,
        marketplace_activity_count=kpis.marketplace_activity_count,
        marketplace_stats=marketplace_stats,
    )


@router.post("/update-profile")
def update_profile(
    body: UpdateProfileBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.display_name is not None:
        name = body.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        user.display_name = name
    if body.parent_email is not None:
        try:
            user.parent_email = normalize_optional_parent_email(body.parent_email)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid parent email address")
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "display_name": user.display_name,
        "parent_email": user.parent_email,
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="New password must differ from current password")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"success": True}


@router.delete("/account")
def delete_account(
    body: DeleteAccountBody = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.confirmation.strip() != "DELETE":
        raise HTTPException(status_code=400, detail='Type "DELETE" to confirm account deletion')

    active_listings = (
        db.query(Card)
        .filter(
            Card.owner_id == user.id,
            Card.listed_on_marketplace.is_(True),
        )
        .count()
    )
    if active_listings > 0:
        raise HTTPException(
            status_code=400,
            detail="Remove all marketplace listings before deleting your account",
        )

    db.query(CreditLedger).filter(CreditLedger.user_id == user.id).delete(synchronize_session=False)
    db.query(Card).filter(Card.owner_id == user.id).delete(synchronize_session=False)
    db.query(Card).filter(Card.creator_user_id == user.id).update(
        {Card.creator_user_id: None},
        synchronize_session=False,
    )
    db.delete(user)
    db.commit()
    return {"success": True}


def _sum_abs_ledger(db: Session, user_id: int, transaction_type: str) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(func.abs(CreditLedger.amount)), 0))
        .filter(
            CreditLedger.user_id == user_id,
            CreditLedger.transaction_type == transaction_type,
        )
        .scalar()
    )
    return Decimal(str(total or 0))


def _sum_positive_ledger(db: Session, user_id: int, transaction_type: str) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(
            CreditLedger.user_id == user_id,
            CreditLedger.transaction_type == transaction_type,
            CreditLedger.amount > 0,
        )
        .scalar()
    )
    return Decimal(str(total or 0))


@router.get("/profile/rarity-stats", response_model=ProfileRarityStatsResponse)
def get_profile_rarity_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rarity breakdown and rarest pull for the authenticated user's collection."""
    stats = compute_rarity_collection_stats(db, user.id)
    rarest_out: ProfileCardOut | None = None
    if stats.rarest_card is not None:
        rarest_out = _profile_card_out(stats.rarest_card)
    return ProfileRarityStatsResponse(
        rarest_pull=stats.rarest_pull,
        rarest_card=rarest_out,
        rarity_counts=RarityCountsOut(**stats.rarity_counts),
        total_rare_cards=stats.total_rare_cards,
    )


@router.get("/profile/financials", response_model=ProfileFinancialsResponse)
def get_profile_financials(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return ProfileFinancialsResponse(
        total_spent_on_cards=float_from_decimal(_sum_abs_ledger(db, user.id, TX_GENERATION)),
        total_earned_from_sales=float_from_decimal(_sum_positive_ledger(db, user.id, TX_CARD_SALE)),
        total_withdrawn=float_from_decimal(_sum_abs_ledger(db, user.id, TX_WITHDRAWAL)),
        current_balance=float_from_decimal(user.credit_balance),
        total_animated_cards_cost=float_from_decimal(_sum_abs_ledger(db, user.id, TX_ANIMATION)),
        total_highlight_cards_cost=float_from_decimal(_sum_abs_ledger(db, user.id, TX_HIGHLIGHT)),
    )


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody, db: Session = Depends(get_db)):
    email = str(body.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        if user.google_id and not user.hashed_password:
            send_google_signin_email(user.email, user.display_name)
        else:
            token = secrets.token_urlsafe(32)
            user.reset_token = token
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
            db.commit()
            reset_url = f"{frontend_url()}/reset-password?token={token}"
            send_password_reset_email(user.email, user.display_name, reset_url)
    return {"message": FORGOT_PASSWORD_MESSAGE}


@router.get("/verify-reset-token")
def verify_reset_token(token: str = Query(..., min_length=1, max_length=200), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == token.strip()).first()
    if not _reset_token_is_valid(user):
        raise HTTPException(status_code=400, detail="Reset link has expired or is invalid.")
    return {"valid": True}


@router.post("/reset-password")
def reset_password(body: ResetPasswordBody, db: Session = Depends(get_db)):
    token = body.token.strip()
    user = db.query(User).filter(User.reset_token == token).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Reset link has expired or is invalid.")
    expires = user.reset_token_expires
    if expires is None:
        raise HTTPException(status_code=400, detail="Reset link has expired")
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired")
    user.hashed_password = hash_password(body.password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"success": True, "message": "Password reset successfully."}


@router.post("/webauthn/register-options")
def webauthn_register_options(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expected_origin, rp_id = resolve_webauthn_origin(request.headers.get("origin"))
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name="Prospect Legends",
        user_id=str(current_user.id).encode("utf-8"),
        user_name=current_user.email,
        user_display_name=current_user.display_name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        ),
    )
    current_user.webauthn_challenge = bytes_to_base64url(options.challenge)
    db.commit()
    return json.loads(options_to_json(options))


@router.post("/webauthn/register-verify")
def webauthn_register_verify(
    request: Request,
    credential: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.webauthn_challenge:
        raise HTTPException(status_code=400, detail="Registration challenge expired. Please try again.")
    expected_origin, rp_id = resolve_webauthn_origin(request.headers.get("origin"))
    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(current_user.webauthn_challenge),
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    current_user.webauthn_credential_id = bytes_to_base64url(verification.credential_id)
    current_user.webauthn_public_key = verification.credential_public_key.hex()
    current_user.webauthn_sign_count = verification.sign_count
    current_user.webauthn_challenge = None
    db.commit()
    return {"success": True, "credential_id": current_user.webauthn_credential_id}


@router.post("/webauthn/login-options")
def webauthn_login_options(
    request: Request,
    body: WebAuthnLoginOptionsBody | None = Body(default=None),
    db: Session = Depends(get_db),
):
    _, rp_id = resolve_webauthn_origin(request.headers.get("origin"))
    allow_credentials = None
    credential_id = (body.credential_id if body else None) or None
    if credential_id:
        allow_credentials = [
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(credential_id.strip()))
        ]
    options = generate_authentication_options(
        rp_id=rp_id,
        user_verification=UserVerificationRequirement.REQUIRED,
        allow_credentials=allow_credentials,
    )
    store_login_challenge(bytes_to_base64url(options.challenge))
    return json.loads(options_to_json(options))


@router.post("/webauthn/login-verify")
def webauthn_login_verify(
    request: Request,
    credential: dict = Body(...),
    db: Session = Depends(get_db),
):
    credential_id = str(credential.get("id") or "").strip()
    if not credential_id:
        raise HTTPException(status_code=400, detail="Credential not found")

    user = db.query(User).filter(User.webauthn_credential_id == credential_id).first()
    if user is None or not user.webauthn_public_key:
        raise HTTPException(status_code=400, detail="Credential not found")

    expected_origin, rp_id = resolve_webauthn_origin(request.headers.get("origin"))

    try:
        client_data_b64 = credential.get("response", {}).get("clientDataJSON")
        if not client_data_b64:
            raise HTTPException(status_code=400, detail="Invalid credential payload")
        client_data = json.loads(base64url_to_bytes(client_data_b64).decode("utf-8"))
        challenge_b64 = client_data.get("challenge")
        if not challenge_b64 or not consume_login_challenge(challenge_b64):
            raise HTTPException(status_code=400, detail="Authentication challenge expired. Please try again.")

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_b64),
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
            credential_public_key=bytes.fromhex(user.webauthn_public_key),
            credential_current_sign_count=user.webauthn_sign_count or 0,
            require_user_verification=True,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user.webauthn_sign_count = verification.new_sign_count
    db.commit()

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": auth_user_payload(user),
    }


@router.get("/google")
def google_login():
    if not google_oauth_configured():
        raise HTTPException(status_code=503, detail="Google sign in is not configured")
    flow = build_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
    )
    store_oauth_state(state)
    return RedirectResponse(authorization_url)


@router.get("/google/callback")
def google_callback(
    code: str,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    if not consume_oauth_state(state):
        return google_error_redirect()
    try:
        flow = build_google_flow()
        flow.fetch_token(code=code)
        client_id = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()
        id_info = id_token.verify_oauth2_token(
            flow.credentials.id_token,
            google_requests.Request(),
            client_id,
        )
        google_email = (id_info.get("email") or "").strip().lower()
        google_name = id_info.get("name")
        google_id = id_info.get("sub")
        if not google_email or not google_id:
            raise HTTPException(status_code=400, detail="Could not get email from Google")

        user = db.query(User).filter(User.email == google_email).first()
        if user:
            if not user.google_id:
                user.google_id = google_id
                db.commit()
            token = create_access_token({"sub": user.email})
            return google_success_redirect(token=token, user=user, is_new=False)

        if get_beta_invite_code() is not None:
            pending_token = secrets.token_urlsafe(32)
            store_pending_google_signup(
                pending_token,
                {
                    "email": google_email,
                    "name": google_name or "",
                    "google_id": google_id,
                },
            )
            return google_invite_redirect(
                pending_token=pending_token,
                email=google_email,
                name=google_name or "",
            )

        user = create_google_user(
            db,
            email=google_email,
            google_name=google_name,
            google_id=google_id,
        )
        token = create_access_token({"sub": user.email})
        return google_success_redirect(token=token, user=user, is_new=True)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Google OAuth error: %s", exc)
        return google_error_redirect()


@router.post("/google/complete")
def google_complete(body: GoogleCompleteBody, db: Session = Depends(get_db)):
    pending = pop_pending_google_signup(body.pending.strip())
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="Signup session expired. Please try Google sign in again.",
        )
    if not validate_beta_invite_code(body.invite_code):
        raise HTTPException(status_code=400, detail="Invalid invite code")

    email = pending["email"]
    google_id = pending["google_id"]
    google_name = pending.get("name")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="Account already exists. Please sign in with Google.",
        )

    user = create_google_user(
        db,
        email=email,
        google_name=google_name,
        google_id=google_id,
    )
    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": auth_user_payload(user),
        "is_new": True,
    }
