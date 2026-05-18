"""Runway ML image-to-video API client."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

import httpx

from email_service import _absolute_image_url

logger = logging.getLogger(__name__)

RUNWAY_API_BASE = (os.environ.get("RUNWAY_API_BASE") or "https://api.dev.runwayml.com/v1").rstrip("/")
RUNWAY_API_VERSION = (os.environ.get("RUNWAY_API_VERSION") or "2024-11-06").strip()
RUNWAY_IMAGE_TO_VIDEO_MODEL = (os.environ.get("RUNWAY_IMAGE_TO_VIDEO_MODEL") or "gen4.5").strip()
POLL_INTERVAL_SECONDS = 5
MAX_POLL_ATTEMPTS = 24


def _api_key() -> str:
    return (os.environ.get("RUNWAY_API_KEY") or os.environ.get("RUNWAYML_API_SECRET") or "").strip()


def _animations_dir() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    return Path(base).expanduser().resolve() / "animations"


def _runway_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_API_VERSION,
    }


async def _start_image_to_video(client: httpx.AsyncClient, image_url: str, prompt: str) -> str:
    payload = {
        "model": RUNWAY_IMAGE_TO_VIDEO_MODEL,
        "promptImage": image_url,
        "promptText": prompt,
        "ratio": "768:1024",
        "duration": 3,
    }
    url = f"{RUNWAY_API_BASE}/image_to_video"
    logger.info("Runway POST %s model=%s", url, RUNWAY_IMAGE_TO_VIDEO_MODEL)
    resp = await client.post(url, json=payload, headers=_runway_headers())
    logger.info("Runway create task response status=%s", resp.status_code)
    if resp.status_code >= 400:
        logger.error("Runway create task failed: %s", resp.text[:2000])
        resp.raise_for_status()
    data = resp.json()
    task_id = str(data.get("id") or data.get("taskId") or "")
    if not task_id:
        raise RuntimeError("Runway response missing task id")
    logger.info("Runway task created id=%s", task_id)
    return task_id


async def _poll_task(client: httpx.AsyncClient, task_id: str) -> dict:
    url = f"{RUNWAY_API_BASE}/tasks/{task_id}"
    for attempt in range(1, MAX_POLL_ATTEMPTS + 1):
        resp = await client.get(url, headers=_runway_headers())
        if resp.status_code >= 400:
            logger.error("Runway poll failed status=%s body=%s", resp.status_code, resp.text[:1000])
            resp.raise_for_status()
        data = resp.json()
        status = str(data.get("status") or "").upper()
        logger.info("Runway task %s poll %s/%s status=%s", task_id, attempt, MAX_POLL_ATTEMPTS, status)
        if status in ("SUCCEEDED", "SUCCEED", "SUCCEEDED".upper()):
            return data
        if status in ("FAILED", "CANCELED", "CANCELLED", "ERROR"):
            failure = data.get("failure") or data.get("failureCode") or data.get("error")
            raise RuntimeError(f"Runway task {status}: {failure}")
        if status in ("RUNNING", "PENDING", "THROTTLED", ""):
            if attempt < MAX_POLL_ATTEMPTS:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
            continue
        if attempt < MAX_POLL_ATTEMPTS:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    raise TimeoutError(f"Runway task {task_id} did not complete within {MAX_POLL_ATTEMPTS * POLL_INTERVAL_SECONDS}s")


def _extract_output_url(task_data: dict) -> str:
    output = task_data.get("output")
    if isinstance(output, list) and output:
        return str(output[0])
    if isinstance(output, str) and output:
        return output
    raise RuntimeError("Runway task succeeded but output URL is missing")


async def _download_video(client: httpx.AsyncClient, video_url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading Runway video to %s", dest)
    async with client.stream("GET", video_url, follow_redirects=True) as resp:
        resp.raise_for_status()
        with dest.open("wb") as f:
            async for chunk in resp.aiter_bytes():
                f.write(chunk)
    logger.info("Saved animation video (%s bytes)", dest.stat().st_size if dest.is_file() else 0)


async def _generate_animation_once(
    card_image_url: str,
    motion_prompt: str,
    card_id: str,
) -> dict:
    api_key = _api_key()
    if not api_key:
        return {"success": False, "video_url": None, "error": "RUNWAY_API_KEY is not configured"}

    absolute_image = _absolute_image_url(card_image_url)
    if not absolute_image:
        return {"success": False, "video_url": None, "error": "Card image URL is not reachable"}

    safe_id = card_id.replace("/", "_")
    dest = _animations_dir() / f"{safe_id}.mp4"
    public_path = f"/animations/{safe_id}.mp4"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
            task_id = await _start_image_to_video(client, absolute_image, motion_prompt)
            task_data = await _poll_task(client, task_id)
            output_url = _extract_output_url(task_data)
            await _download_video(client, output_url, dest)
        return {"success": True, "video_url": public_path, "error": None}
    except Exception as exc:
        logger.exception("Runway animation failed for card %s: %s", card_id, exc)
        return {"success": False, "video_url": None, "error": str(exc)}


async def generate_animation(
    card_image_url: str,
    motion_prompt: str,
    card_id: str,
) -> dict:
    """
    Send image + prompt to Runway, poll until complete, save video to disk.
    Retries once on failure (2 attempts total).
    """
    last_error: str | None = None
    for attempt in (1, 2):
        if attempt > 1:
            logger.info("Retrying Runway animation for card %s (attempt %s)", card_id, attempt)
        result = await _generate_animation_once(card_image_url, motion_prompt, card_id)
        if result.get("success"):
            return result
        last_error = result.get("error") or "Generation failed"
    return {"success": False, "video_url": None, "error": last_error or "Generation failed"}
