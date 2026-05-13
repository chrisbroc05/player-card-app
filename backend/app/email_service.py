"""Resend-powered transactional emails for Future Legends (trading flow)."""

from __future__ import annotations

import html as html_module
import logging
import os
from typing import Any

import resend

logger = logging.getLogger(__name__)

_api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
if _api_key:
    resend.api_key = _api_key


def frontend_url() -> str:
    return (os.environ.get("FRONTEND_URL") or "http://localhost:5173").rstrip("/")


def _from_email() -> str:
    raw = (os.environ.get("FROM_EMAIL") or "onboarding@resend.dev").strip()
    if "<" in raw:
        return raw
    return f"Future Legends <{raw}>"


def _public_api_base() -> str:
    """Base URL for absolute card image links (host that serves /media/cards)."""
    return (
        os.environ.get("PUBLIC_API_BASE_URL")
        or os.environ.get("API_PUBLIC_URL")
        or "https://player-card-backend.onrender.com"
    ).rstrip("/")


def _absolute_image_url(image_url: str | None) -> str | None:
    if not image_url:
        return None
    s = str(image_url).strip()
    if s.startswith("http://") or s.startswith("https://"):
        return s
    base = _public_api_base()
    if not base:
        return None
    path = s if s.startswith("/") else f"/{s}"
    return f"{base}{path}"


def _tier_label(tier: str) -> str:
    t = (tier or "").lower()
    if t == "legends":
        return "Legends"
    if t == "allstar":
        return "All-Star"
    return "Rookie"


def _tier_color(tier: str) -> str:
    t = (tier or "").lower()
    if t == "legends":
        return "#ffd700"
    if t == "allstar":
        return "#00aaff"
    return "#ff8c00"


def _rarity_label(rarity: str) -> str:
    r = (rarity or "").lower()
    if r == "legendary":
        return "Legendary"
    if r == "rare":
        return "Rare"
    return "Common"


def _email_wrapper(inner: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f0f;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border:1px solid #333333;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 24px 8px 24px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffd700;letter-spacing:0.08em;">FUTURE LEGENDS</p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:0.2em;">Digital Collectibles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px 24px;color:#ffffff;font-size:15px;line-height:1.55;">
              {inner}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #333333;text-align:center;font-size:12px;color:#999999;">
              Future Legends Digital Collectibles
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _gold_button(href: str, label: str) -> str:
    esc_href = html_module.escape(href, quote=True)
    esc_label = html_module.escape(label)
    return f"""<p style="margin:28px 0 8px 0;text-align:center;">
  <a href="{esc_href}" style="display:inline-block;padding:14px 32px;background-color:#ffd700;color:#000000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:15px;">{esc_label}</a>
</p>"""


def _card_box(
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
) -> str:
    name = html_module.escape(card_player_name)
    tier = html_module.escape(_tier_label(card_tier))
    rarity = html_module.escape(_rarity_label(card_rarity))
    tc = _tier_color(card_tier)
    img_block = ""
    abs_url = _absolute_image_url(card_image_url)
    if abs_url:
        u = html_module.escape(abs_url, quote=True)
        img_block = f"""
        <p style="margin:0 0 12px 0;text-align:center;">
          <img src="{u}" alt="" width="220" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #333333;display:inline-block;" />
        </p>"""
    return f"""
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f0f;border:1px solid #333333;border-radius:10px;margin:20px 0;">
      <tr><td style="padding:20px;">
        {img_block}
        <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;">{name}</p>
        <p style="margin:10px 0 0 0;font-size:14px;">
          <span style="color:{tc};font-weight:bold;">{tier}</span>
          <span style="color:#999999;"> &middot; </span>
          <span style="color:#cccccc;">{rarity}</span>
        </p>
      </td></tr>
    </table>"""


def _send_resend_html(to: str, subject: str, html: str, trade_id: int | None, kind: str) -> None:
    key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if not key:
        logger.warning("RESEND_API_KEY unset; skipping %s email to %s", kind, to)
        return
    resend.api_key = key
    params: dict[str, Any] = {
        "from": _from_email(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    resend.Emails.send(params)


def send_trade_offer_email(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    trade_message: str | None,
    trades_url: str,
    trade_id: int,
) -> None:
    try:
        sn = html_module.escape(sender_name)
        msg_html = ""
        if trade_message and str(trade_message).strip():
            msg = html_module.escape(str(trade_message).strip())
            msg_html = f"""
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f0f;border:1px solid #333333;border-radius:10px;margin:20px 0;">
          <tr><td style="padding:16px;">
            <p style="margin:0;font-size:13px;color:#999999;">{sn} says:</p>
            <p style="margin:8px 0 0 0;font-size:15px;color:#ffffff;">{msg}</p>
          </td></tr>
        </table>"""
        inner = f"""
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#ffffff;">You've received a card!</h1>
      <p style="margin:0;color:#999999;font-size:15px;">{sn} has sent you a <span style="color:{_tier_color(card_tier)};font-weight:bold;">{html_module.escape(_tier_label(card_tier))}</span> Future Legends card.</p>
      {_card_box(card_player_name, card_tier, card_rarity, card_image_url)}
      {msg_html}
      {_gold_button(trades_url, "View & Accept Card")}
      <p style="margin:24px 0 0 0;font-size:13px;color:#999999;text-align:center;">This card will remain pending until you accept or decline.</p>
    """
        html = _email_wrapper(inner)
        subject = f"⚡ {sender_name} sent you a Future Legends card!"
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_offer")
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_accepted_email(
    sender_email: str,
    sender_name: str,
    recipient_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    collection_url: str,
    trade_id: int,
) -> None:
    try:
        rn = html_module.escape(recipient_name)
        inner = f"""
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#ffffff;">Your trade was accepted!</h1>
      <p style="margin:0;color:#999999;font-size:15px;">{rn} has accepted your <span style="color:{_tier_color(card_tier)};font-weight:bold;">{html_module.escape(_tier_label(card_tier))}</span> {html_module.escape(card_player_name)} card.</p>
      {_card_box(card_player_name, card_tier, card_rarity, card_image_url)}
      {_gold_button(collection_url, "View My Collection")}
      <p style="margin:24px 0 0 0;font-size:13px;color:#999999;text-align:center;">The card has been transferred to {rn}&#39;s collection.</p>
    """
        html = _email_wrapper(inner)
        subject = f"✅ {recipient_name} accepted your Future Legends card!"
        _send_resend_html(sender_email, subject, html, trade_id, "trade_accepted")
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_declined_email(
    sender_email: str,
    sender_name: str,
    recipient_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    collection_url: str,
    trade_id: int,
) -> None:
    try:
        rn = html_module.escape(recipient_name)
        inner = f"""
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#ffffff;">Trade declined</h1>
      <p style="margin:0;color:#999999;font-size:15px;">{rn} declined your <span style="color:{_tier_color(card_tier)};font-weight:bold;">{html_module.escape(_tier_label(card_tier))}</span> {html_module.escape(card_player_name)} card.</p>
      {_card_box(card_player_name, card_tier, card_rarity, card_image_url)}
      {_gold_button(collection_url, "View My Collection")}
      <p style="margin:24px 0 0 0;font-size:13px;color:#999999;text-align:center;">Don&#39;t worry — the card is back in your collection.</p>
    """
        html = _email_wrapper(inner)
        subject = f"❌ {recipient_name} declined your trade offer"
        _send_resend_html(sender_email, subject, html, trade_id, "trade_declined")
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_cancelled_email(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    trade_id: int,
) -> None:
    try:
        sn = html_module.escape(sender_name)
        inner = f"""
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#ffffff;">Trade offer cancelled</h1>
      <p style="margin:0;color:#999999;font-size:15px;">{sn} cancelled their offer to send you the <span style="color:{_tier_color(card_tier)};font-weight:bold;">{html_module.escape(_tier_label(card_tier))}</span> {html_module.escape(card_player_name)} card.</p>
      {_card_box(card_player_name, card_tier, card_rarity, card_image_url)}
      <p style="margin:24px 0 0 0;font-size:13px;color:#999999;text-align:center;">No action needed — this trade has been cancelled.</p>
    """
        html = _email_wrapper(inner)
        subject = f"🚫 {sender_name} cancelled their trade offer"
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_cancelled")
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)
