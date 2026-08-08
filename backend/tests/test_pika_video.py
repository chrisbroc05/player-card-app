"""Tests for Pika video payload builders and configuration."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

import types

sys.modules.setdefault(
    "email_service",
    types.SimpleNamespace(_absolute_image_url=lambda url: url),
)

from utils import pika_video


class PikaVideoTests(unittest.TestCase):
    def test_build_kling_payload(self):
        payload = pika_video._build_submit_payload(
            "kling-3.0",
            "https://example.com/photo.jpg",
            "Athlete throws",
            5,
            "720p",
        )
        self.assertEqual(payload["image_url"], "https://example.com/photo.jpg")
        self.assertEqual(payload["duration"], 5)
        self.assertEqual(payload["resolution"], "720p")
        self.assertEqual(payload["audio"], "off")
        self.assertEqual(payload["prompt"], "Athlete throws")

    def test_build_pika_payload(self):
        payload = pika_video._build_submit_payload(
            "pika-2.5",
            "https://example.com/photo.jpg",
            "Athlete throws",
            5,
            "720p",
        )
        self.assertEqual(payload["image"], "https://example.com/photo.jpg")
        self.assertEqual(payload["duration_s"], 5)
        self.assertEqual(payload["resolution"], "720p")

    def test_build_minimax_payload_requires_prompt(self):
        payload = pika_video._build_submit_payload(
            "minimax-h3",
            "https://example.com/photo.jpg",
            "",
            5,
            "720p",
        )
        self.assertEqual(payload["first_frame_image"], "https://example.com/photo.jpg")
        self.assertEqual(payload["resolution"], "768P")
        self.assertTrue(payload["prompt"])

    def test_api_base_normalizes_v1_suffix(self):
        original = os.environ.get("PIKA_API_BASE_URL")
        os.environ["PIKA_API_BASE_URL"] = "https://api.pika.art/v1"
        try:
            self.assertEqual(
                pika_video.pika_api_base_url(),
                "https://api.pika.art",
            )
        finally:
            if original is None:
                os.environ.pop("PIKA_API_BASE_URL", None)
            else:
                os.environ["PIKA_API_BASE_URL"] = original

    def test_default_fallback_chain(self):
        chain = pika_video.model_fallback_chain()
        self.assertEqual(chain[0], "kling-3.0")
        self.assertIn("pika-2.5", chain)
        self.assertIn("minimax-h3", chain)


if __name__ == "__main__":
    unittest.main()
