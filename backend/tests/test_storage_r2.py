"""Tests for R2 URL/key resolution used during card generation."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

os.environ.setdefault("R2_PUBLIC_URL", "https://pub-cb37d7e679bb4b33ac276ef1c3cfeb96.r2.dev")

from utils.storage import (  # noqa: E402
    fetch_bytes_from_storage_url,
    r2_key_from_public_url,
    resolve_source_image_path,
    storage_key_from_url,
)


class StorageR2KeyTests(unittest.TestCase):
    def test_r2_key_from_configured_public_url(self) -> None:
        url = "https://pub-cb37d7e679bb4b33ac276ef1c3cfeb96.r2.dev/uploads/abc123.jpg"
        self.assertEqual(r2_key_from_public_url(url), "uploads/abc123.jpg")

    def test_r2_key_from_alternate_pub_host(self) -> None:
        url = "https://pub-otherbucket.r2.dev/uploads/face/temp_xyz.png"
        self.assertEqual(r2_key_from_public_url(url), "uploads/face/temp_xyz.png")

    def test_storage_key_from_relative_upload_path(self) -> None:
        self.assertEqual(storage_key_from_url("/uploads/abc123.jpg"), "uploads/abc123.jpg")

    def test_storage_key_from_face_relative_path(self) -> None:
        self.assertEqual(
            storage_key_from_url("/uploads/face/temp_abc.png"),
            "uploads/face/temp_abc.png",
        )


class ResolveSourceImagePathTests(unittest.TestCase):
    @patch("utils.storage.fetch_r2_object_bytes")
    def test_https_url_uses_r2_api_before_http(self, mock_fetch: MagicMock) -> None:
        mock_fetch.return_value = b"fake-image-bytes"
        url = "https://pub-cb37d7e679bb4b33ac276ef1c3cfeb96.r2.dev/uploads/dead404.jpg"

        with patch("utils.storage.is_r2_configured", return_value=True):
            path, is_temp = resolve_source_image_path(url, Path("/tmp/uploads"))

        self.assertTrue(is_temp)
        self.assertTrue(path.exists())
        self.assertEqual(path.read_bytes(), b"fake-image-bytes")
        mock_fetch.assert_called_once_with("uploads/dead404.jpg")
        path.unlink(missing_ok=True)

    @patch("utils.storage.fetch_r2_object_bytes")
    def test_relative_upload_path_falls_back_to_r2(self, mock_fetch: MagicMock) -> None:
        mock_fetch.return_value = b"relative-fetch"
        upload_dir = Path("/tmp/empty-uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)

        with patch("utils.storage.is_r2_configured", return_value=True):
            path, is_temp = resolve_source_image_path("/uploads/missing-local.jpg", upload_dir)

        self.assertTrue(is_temp)
        mock_fetch.assert_called_once_with("uploads/missing-local.jpg")
        path.unlink(missing_ok=True)


class FetchBytesFromStorageUrlTests(unittest.TestCase):
    @patch("utils.storage.fetch_r2_object_bytes")
    def test_prefers_r2_api_for_public_url(self, mock_fetch: MagicMock) -> None:
        mock_fetch.return_value = b"from-r2"
        url = "https://pub-cb37d7e679bb4b33ac276ef1c3cfeb96.r2.dev/uploads/x.jpg"

        with patch("utils.storage.is_r2_configured", return_value=True):
            data = fetch_bytes_from_storage_url(url)

        self.assertEqual(data, b"from-r2")
        mock_fetch.assert_called_once_with("uploads/x.jpg")


if __name__ == "__main__":
    unittest.main()
