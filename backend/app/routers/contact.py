"""Contact form — support messages via Resend."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from auth import get_optional_current_user
from email_service import send_contact_support_email, support_inbox_email
from models import User

router = APIRouter()

CONTACT_SUBJECTS = frozenset(
    {
        "card_question",
        "payment_credits",
        "technical",
        "animation_highlight",
        "account",
        "partnership",
        "other",
    }
)

SUBJECT_LABELS = {
    "card_question": "Question about my card",
    "payment_credits": "Payment or credits issue",
    "technical": "Technical problem",
    "animation_highlight": "Animation or highlight issue",
    "account": "Account issue",
    "partnership": "Partnership or business inquiry",
    "other": "Other",
}


class ContactBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=64)
    message: str = Field(..., min_length=1, max_length=1000)


@router.post("")
def submit_contact(
    body: ContactBody,
    user: User | None = Depends(get_optional_current_user),
):
    subject_key = body.subject.strip().lower()
    if subject_key not in CONTACT_SUBJECTS:
        raise HTTPException(status_code=400, detail="Invalid subject")

    support_to = support_inbox_email()
    if not support_to:
        raise HTTPException(status_code=503, detail="Support email is not configured")

    submitted_at = datetime.now(timezone.utc).isoformat()
    subject_label = SUBJECT_LABELS.get(subject_key, body.subject)

    try:
        send_contact_support_email(
            support_to=support_to,
            name=body.name.strip(),
            email=body.email.strip().lower(),
            subject_key=subject_key,
            subject_label=subject_label,
            message=body.message.strip(),
            user_id=user.id if user else None,
            submitted_at=submitted_at,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"success": True, "email": body.email.strip().lower()}
