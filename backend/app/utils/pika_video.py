"""Pika API Club image-to-video client with model fallback chain."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any
from uuid import uuid4

import httpx

from email_service import _absolute_image_url

logger = logging.getLogger(__name__)

# Per Pika docs: https://dev.pika.art/llms.txt
DEFAULT_PIKA_API_BASE = "https://api.dev.pika.art"

PIKA_VIDEO_DURATION = int(os.environ.get("PIKA_VIDEO_DURATION", "5"))
PIKA_VIDEO_RESOLUTION = (os.environ.get("PIKA_VIDEO_RESOLUTION") or "720p").strip()

MODEL_OPERATIONS: dict[str, str] = {
    "kling-3.0": "kling/kling-3.0/image-to-video",
    "pika-2.5": "pika/pika-2.5/image-to-video",
    "minimax-h3": "minimax/h3/image-to-video",
}

DEFAULT_MODEL_FALLBACK_CHAIN = ["kling-3.0", "pika-2.5", "minimax-h3"]

POLL_INTERVAL_SECONDS = int(os.environ.get("PIKA_POLL_INTERVAL_SECONDS", "5"))
POLL_TIMEOUT_SECONDS = int(os.environ.get("PIKA_POLL_TIMEOUT_SECONDS", "300"))


def _api_key() -> str:
    return (os.environ.get("PIKA_API_KEY") or "").strip()


def pika_api_base_url() -> str:
    """Normalize PIKA_API_BASE_URL — docs use https://api.dev.pika.art (no /v1 suffix)."""
    raw = (os.environ.get("PIKA_API_BASE_URL") or DEFAULT_PIKA_API_BASE).strip().rstrip("/")
    if raw.endswith("/v1"):
        raw = raw[:-3]
    return raw


def is_pika_configured() -> bool:
    return bool(_api_key())


def model_fallback_chain() -> list[str]:
    custom = (os.environ.get("PIKA_MODEL_FALLBACK_CHAIN") or "").strip()
    if custom:
        ids = [part.strip() for part in custom.split(",") if part.strip()]
        return [mid for mid in ids if mid in MODEL_OPERATIONS]

    primary = (os.environ.get("PIKA_DEFAULT_MODEL") or "").strip()
    chain: list[str] = []
    if primary and primary in MODEL_OPERATIONS:
        chain.append(primary)
    for model_id in DEFAULT_MODEL_FALLBACK_CHAIN:
        if model_id not in chain:
            chain.append(model_id)
    return chain


def _pika_headers(*, idempotency_key: str | None = None) -> dict[str, str]:
    headers = {
        "X-API-Key": _api_key(),
        "Content-Type": "application/json",
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def _map_resolution_for_model(model_id: str, resolution: str) -> str:
    res = (resolution or PIKA_VIDEO_RESOLUTION).strip()
    if model_id == "minimax-h3":
        if res.lower() in ("720p", "768p", "768P".lower()):
            return "768P"
        return "2K"
    if model_id == "pika-2.5" and res.lower() == "4k":
        return "1080p"
    if model_id == "kling-3.0" and res.lower() not in ("720p", "1080p", "4k"):
        return "720p"
    return res


def _build_submit_payload(
    model_id: str,
    image_url: str,
    prompt: str,
    duration: int,
    resolution: str,
) -> dict[str, Any]:
    mapped_resolution = _map_resolution_for_model(model_id, resolution)
    prompt_text = (prompt or "").strip()

    if model_id == "kling-3.0":
        body: dict[str, Any] = {
            "image_url": image_url,
            "duration": duration,
            "resolution": mapped_resolution,
            "audio": "off",
        }
        if prompt_text:
            body["prompt"] = prompt_text
        return body

    if model_id == "pika-2.5":
        duration_s = 10 if duration >= 10 else 5
        body = {
            "image": image_url,
            "duration_s": duration_s,
            "resolution": mapped_resolution,
        }
        if prompt_text:
            body["prompt"] = prompt_text
        return body

    if model_id == "minimax-h3":
        if not prompt_text:
            prompt_text = "Natural athletic motion from the starting pose. Static locked-off camera."
        return {
            "first_frame_image": image_url,
            "prompt": prompt_text,
            "duration": duration,
            "resolution": mapped_resolution,
        }

    raise ValueError(f"Unknown Pika model id: {model_id}")


def _extract_video_url_from_job(data: dict[str, Any]) -> str | None:
    output = data.get("output")
    if isinstance(output, dict):
        video = output.get("video")
        if isinstance(video, dict):
            url = (video.get("url") or "").strip()
            if url:
                return url
    return None


def _job_failure_message(data: dict[str, Any]) -> str:
    err = data.get("error")
    if isinstance(err, dict):
        code = err.get("code") or "failed"
        message = err.get("message") or "Unknown error"
        return f"{code}: {message}"
    return (data.get("message") or "Generation failed").strip()


async def _fetch_content_url(client: httpx.AsyncClient, request_id: str) -> str:
    base = pika_api_base_url()
    resp = await client.get(
        f"{base}/v1/media/jobs/{request_id}/content",
        headers=_pika_headers(),
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Pika content error {resp.status_code}: {resp.text[:1000]}")
    payload = resp.json()
    url = (payload.get("url") or "").strip()
    if not url:
        raise RuntimeError(f"No content URL in Pika response: {payload}")
    return url


async def _poll_for_completion(
    client: httpx.AsyncClient,
    request_id: str,
    *,
    timeout: int = POLL_TIMEOUT_SECONDS,
    interval: int = POLL_INTERVAL_SECONDS,
) -> str:
    base = pika_api_base_url()
    start = time.monotonic()

    while time.monotonic() - start < timeout:
        resp = await client.get(
            f"{base}/v1/media/jobs/{request_id}",
            headers=_pika_headers(),
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Pika poll error {resp.status_code}: {resp.text[:1000]}")

        data = resp.json()
        status = str(data.get("status") or "").lower()
        logger.info("Pika task %s status: %s", request_id, status)

        if status == "completed":
            video_url = _extract_video_url_from_job(data)
            if not video_url:
                video_url = await _fetch_content_url(client, request_id)
            logger.info("Video ready: %s", video_url)
            return video_url

        if status == "failed":
            raise RuntimeError(_job_failure_message(data))

        await asyncio.sleep(interval)

    raise TimeoutError(f"Timeout after {timeout}s waiting for Pika job {request_id}")


async def _generate_with_model(
    client: httpx.AsyncClient,
    model_id: str,
    image_url: str,
    prompt: str,
    duration: int,
    resolution: str,
) -> dict[str, str]:
    operation_path = MODEL_OPERATIONS.get(model_id)
    if not operation_path:
        raise ValueError(f"No Pika operation configured for model {model_id}")

    payload = _build_submit_payload(model_id, image_url, prompt, duration, resolution)
    submit_url = f"{pika_api_base_url()}/v1/media/{operation_path}"

    logger.info(
        """
=== PIKA API REQUEST ===
Model: %s
Operation: %s
Image: %s
Prompt (%d chars): %s
Duration: %ss
Resolution: %s
Payload keys: %s
========================
""",
        model_id,
        operation_path,
        image_url,
        len(prompt or ""),
        prompt,
        duration,
        payload.get("resolution") or resolution,
        sorted(payload.keys()),
    )

    idempotency_key = uuid4().hex
    resp = await client.post(
        submit_url,
        headers=_pika_headers(idempotency_key=idempotency_key),
        json=payload,
    )

    if resp.status_code >= 400:
        raise RuntimeError(f"Pika API error {resp.status_code}: {resp.text[:2000]}")

    data = resp.json()
    request_id = str(data.get("id") or "").strip()
    status = str(data.get("status") or "").lower()

    if not request_id:
        raise RuntimeError(f"No job id in Pika response: {data}")

    if status == "failed":
        raise RuntimeError(_job_failure_message(data))

    logger.info("Task created: %s (status=%s)", request_id, status or "queued")
    video_url = await _poll_for_completion(client, request_id)
    return {"video_url": video_url, "task_id": request_id}


async def generate_video_with_fallback(
    image_url: str,
    prompt: str,
    duration: int | None = None,
    resolution: str | None = None,
) -> dict[str, str]:
    """
    Generate a video using Pika API Club with automatic model fallback.

    Returns: {"video_url", "model_used", "task_id"}
    Raises: Exception if all models fail or Pika is not configured.
    """
    if not is_pika_configured():
        raise RuntimeError("PIKA_API_KEY is not configured")

    absolute_image = _absolute_image_url(image_url)
    if not absolute_image:
        raise RuntimeError("Image URL is not reachable")

    dur = duration if duration is not None else PIKA_VIDEO_DURATION
    res = resolution or PIKA_VIDEO_RESOLUTION
    chain = model_fallback_chain()
    if not chain:
        raise RuntimeError("No Pika models configured in fallback chain")

    last_error: Exception | None = None

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
        for model_id in chain:
            try:
                logger.info("Attempting generation with %s", model_id)
                result = await _generate_with_model(
                    client,
                    model_id,
                    absolute_image,
                    prompt,
                    dur,
                    res,
                )
                logger.info("Generation successful with %s", model_id)
                return {
                    **result,
                    "model_used": model_id,
                }
            except Exception as exc:
                logger.warning(
                    "Model %s failed: %s. Trying next model...",
                    model_id,
                    exc,
                )
                last_error = exc
                continue

    raise RuntimeError(f"All Pika models failed. Last error: {last_error}")


async def fetch_pika_catalog_status() -> dict[str, Any]:
    """Check public catalog connectivity and list configured fallback models."""
    base = pika_api_base_url()
    configured = is_pika_configured()
    models = model_fallback_chain()
    catalog_ok = False
    catalog_error: str | None = None

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
            resp = await client.get(f"{base}/catalog/apis")
            catalog_ok = resp.status_code == 200
            if not catalog_ok:
                catalog_error = f"HTTP {resp.status_code}"
    except Exception as exc:
        catalog_error = str(exc)

    auth_ok: bool | None = None
    if configured:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
                resp = await client.get(
                    f"{base}/v1/media/jobs/media_probe_invalid",
                    headers=_pika_headers(),
                )
                # 404 means auth worked but job missing — expected for probe id.
                auth_ok = resp.status_code in (401, 403, 404)
                if resp.status_code == 401:
                    auth_ok = False
        except Exception:
            auth_ok = False

    return {
        "configured": configured,
        "api_base_url": base,
        "models_available": models,
        "catalog_reachable": catalog_ok,
        "catalog_error": catalog_error,
        "auth_ok": auth_ok,
    }
