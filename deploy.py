#!/usr/bin/env python3
"""
Trigger Render deployments for backend and frontend services.

Usage:
  python deploy.py

Required environment variables:
  RENDER_API_KEY
  RENDER_BACKEND_SERVICE_ID
  RENDER_FRONTEND_SERVICE_ID

Optional:
  RENDER_API_BASE (defaults to https://api.render.com/v1)
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def _required_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


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
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body) if body else {}


def main() -> int:
    try:
        api_key = _required_env("RENDER_API_KEY")
        backend_service_id = _required_env("RENDER_BACKEND_SERVICE_ID")
        frontend_service_id = _required_env("RENDER_FRONTEND_SERVICE_ID")
        api_base = (os.environ.get("RENDER_API_BASE") or "https://api.render.com/v1").strip()

        print("Triggering backend deploy...")
        backend_result = trigger_deploy(api_base, api_key, backend_service_id)
        print(f"Backend deploy started: {backend_result.get('id', 'unknown')}")

        print("Triggering frontend deploy...")
        frontend_result = trigger_deploy(api_base, api_key, frontend_service_id)
        print(f"Frontend deploy started: {frontend_result.get('id', 'unknown')}")

        print("Done. Check Render dashboard for live deploy progress.")
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
