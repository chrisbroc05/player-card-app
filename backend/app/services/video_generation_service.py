"""Unified card animation video generation: Pika API Club primary, Runway ML fallback."""

from __future__ import annotations

import logging
import os
from pathlib import Path

import httpx

from services.runway_service import generate_animation as generate_runway_animation
from utils.pika_video import generate_video_with_fallback, is_pika_configured
from utils.storage import app_data_root, save_bytes_to_storage

logger = logging.getLogger(__name__)


def _animations_dir() -> Path:
    return app_data_root() / "animations"


def _runway_configured() -> bool:
    return bool(
        (os.environ.get("RUNWAY_API_KEY") or os.environ.get("RUNWAYML_API_SECRET") or "").strip()
    )


async def _download_video_bytes(video_url: str) -> bytes:
    logger.info("Downloading generated video from %s", video_url)
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
        async with client.stream("GET", video_url, follow_redirects=True) as resp:
            resp.raise_for_status()
            chunks: list[bytes] = []
            async for chunk in resp.aiter_bytes():
                chunks.append(chunk)
    data = b"".join(chunks)
    logger.info("Downloaded animation video (%s bytes)", len(data))
    return data


async def _save_animation_video(video_bytes: bytes, card_id: str) -> str:
    safe_id = card_id.replace("/", "_")
    filename = f"{safe_id}.mp4"
    return save_bytes_to_storage(
        video_bytes,
        r2_key=f"animations/{filename}",
        content_type="video/mp4",
        local_dir=_animations_dir(),
        local_url_prefix="/animations",
    )


async def generate_animation(
    card_image_url: str,
    motion_prompt: str,
    card_id: str,
) -> dict:
    """
    Generate an animated card video.

    Tries Pika API Club model fallback chain first; falls back to Runway when configured.
    Returns: {success, video_url, error, model_used, provider}
    """
    if is_pika_configured():
        try:
            pika_result = await generate_video_with_fallback(
                image_url=card_image_url,
                prompt=motion_prompt,
            )
            video_bytes = await _download_video_bytes(pika_result["video_url"])
            public_url = await _save_animation_video(video_bytes, card_id)
            model_used = pika_result.get("model_used") or "pika"
            logger.info(
                "Animation complete for %s using Pika model %s",
                card_id,
                model_used,
            )
            return {
                "success": True,
                "video_url": public_url,
                "error": None,
                "model_used": model_used,
                "provider": "pika",
            }
        except Exception as pika_error:
            logger.warning(
                "All Pika models failed for card %s: %s",
                card_id,
                pika_error,
            )
            if not _runway_configured():
                return {
                    "success": False,
                    "video_url": None,
                    "error": str(pika_error),
                    "model_used": None,
                    "provider": None,
                }
            logger.warning("Falling back to Runway for card %s", card_id)

    if _runway_configured():
        runway_result = await generate_runway_animation(card_image_url, motion_prompt, card_id)
        if runway_result.get("success"):
            return {
                **runway_result,
                "model_used": (os.environ.get("RUNWAY_IMAGE_TO_VIDEO_MODEL") or "gen4.5").strip(),
                "provider": "runway",
            }
        return {
            **runway_result,
            "model_used": None,
            "provider": "runway",
        }

    return {
        "success": False,
        "video_url": None,
        "error": "Video generation not configured (set PIKA_API_KEY or RUNWAY_API_KEY)",
        "model_used": None,
        "provider": None,
    }
