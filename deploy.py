#!/usr/bin/env python3
"""
Trigger Render deployments for backend and frontend services.

Usage:
  python deploy.py

Required environment variables:
  RENDER_API_KEY

Service IDs are preconfigured with project defaults, but can be overridden:
  RENDER_BACKEND_SERVICE_ID
  RENDER_FRONTEND_SERVICE_ID

Optional:
  RENDER_API_BASE (defaults to https://api.render.com/v1)
  RENDER_DEPLOY_TIMEOUT_SECONDS (defaults to 1200)
  RENDER_POLL_INTERVAL_SECONDS (defaults to 10)
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BACKEND_SERVICE_ID = "srv-d7mi1l8g4nts73am8ka0"
DEFAULT_FRONTEND_SERVICE_ID = "srv-d7mi6i1kh4rs73an84bg"


def _required_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _load_dotenv(path: Path) -> None:
    """Small .env loader to avoid extra dependencies for this script."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def trigger_deploy(api_base: str, api_key: str, service_id: str) -> dict:
    url = f"{api_base}/services/{service_id}/deploys"
    payload = json.dumps({"clearCache": "clear"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", None)
        if isinstance(reason, ssl.SSLCertVerificationError):
            insecure_ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=30, context=insecure_ctx) as resp:
                body = resp.read().decode("utf-8")
        else:
            raise
    return json.loads(body) if body else {}


def get_deploy(api_base: str, api_key: str, service_id: str, deploy_id: str) -> dict:
    url = f"{api_base}/services/{service_id}/deploys/{deploy_id}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", None)
        if isinstance(reason, ssl.SSLCertVerificationError):
            insecure_ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=30, context=insecure_ctx) as resp:
                body = resp.read().decode("utf-8")
        else:
            raise
    return json.loads(body) if body else {}


def wait_for_deploy_success(
    api_base: str,
    api_key: str,
    service_id: str,
    deploy_id: str,
    *,
    timeout_seconds: int,
    poll_interval_seconds: int,
) -> bool:
    success_statuses = {"live", "deployed", "deploy_live", "succeeded"}
    failure_statuses = {"build_failed", "failed", "canceled", "cancelled", "error"}

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        data = get_deploy(api_base, api_key, service_id, deploy_id)
        status = str(data.get("status", "")).lower()
        print(f"Deploy {deploy_id} status: {status or 'unknown'}")
        if status in success_statuses:
            return True
        if status in failure_statuses:
            return False
        time.sleep(max(1, poll_interval_seconds))
    return False


def main() -> int:
    try:
        _load_dotenv(Path(__file__).resolve().parent / ".env")
        api_key = _required_env("RENDER_API_KEY")
        backend_service_id = (
            os.environ.get("RENDER_BACKEND_SERVICE_ID", DEFAULT_BACKEND_SERVICE_ID).strip()
        )
        frontend_service_id = (
            os.environ.get("RENDER_FRONTEND_SERVICE_ID", DEFAULT_FRONTEND_SERVICE_ID).strip()
        )
        api_base = (os.environ.get("RENDER_API_BASE") or "https://api.render.com/v1").strip()
        timeout_seconds = int(os.environ.get("RENDER_DEPLOY_TIMEOUT_SECONDS") or "1200")
        poll_interval_seconds = int(os.environ.get("RENDER_POLL_INTERVAL_SECONDS") or "10")

        print("Triggering backend deploy...")
        backend_result = trigger_deploy(api_base, api_key, backend_service_id)
        backend_deploy_id = str(backend_result.get("id") or "")
        if not backend_deploy_id:
            raise RuntimeError("Backend deploy id missing from Render response")
        print(f"Backend deploy started: {backend_deploy_id}")

        print("Waiting for backend deploy to finish...")
        backend_ok = wait_for_deploy_success(
            api_base,
            api_key,
            backend_service_id,
            backend_deploy_id,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=poll_interval_seconds,
        )
        if not backend_ok:
            raise RuntimeError("Backend deploy did not reach a successful state; aborting frontend deploy.")
        print("Backend deploy is live. Triggering frontend deploy...")

        frontend_result = trigger_deploy(api_base, api_key, frontend_service_id)
        print(f"Frontend deploy started: {frontend_result.get('id', 'unknown')}")

        print("Done. Frontend deploy is running; check Render dashboard for completion.")
        return 0
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        print(f"Render API HTTP error: {exc.code} {exc.reason}")
        if detail:
            print(detail)
        return 1
    except Exception as exc:  # noqa: BLE001 - simple CLI script
        print(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
