"""Cloudflare R2 (S3-compatible) media storage with local disk fallback."""

from __future__ import annotations

import logging
import mimetypes
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "prospect-legends-media")
R2_PUBLIC_URL = (os.environ.get("R2_PUBLIC_URL") or "").rstrip("/")

CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
}


def content_type_for_filename(filename: str, fallback: str = "application/octet-stream") -> str:
    ext = Path(filename).suffix.lower()
    if ext in CONTENT_TYPES:
        return CONTENT_TYPES[ext]
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or fallback


def is_r2_configured() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY)


def is_r2_public_url(url: str | None) -> bool:
    s = (url or "").strip()
    if not s.startswith("https://"):
        return False
    if R2_PUBLIC_URL and s.startswith(f"{R2_PUBLIC_URL}/"):
        return True
    return s.startswith("https://pub-")


def get_r2_client():
    if not is_r2_configured():
        return None
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def get_r2_url(filename: str) -> str:
    key = filename.lstrip("/")
    return f"{R2_PUBLIC_URL}/{key}"


def upload_file_to_r2(file_bytes: bytes, filename: str, content_type: str) -> str | None:
    client = get_r2_client()
    if not client:
        return None
    key = filename.lstrip("/")
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        CacheControl="public, max-age=31536000",
    )
    return get_r2_url(key)


def delete_file_from_r2(filename: str) -> None:
    client = get_r2_client()
    if not client:
        return
    client.delete_object(Bucket=R2_BUCKET_NAME, Key=filename.lstrip("/"))


def save_bytes_to_storage(
    file_bytes: bytes,
    *,
    r2_key: str,
    content_type: str,
    local_dir: Path,
    local_url_prefix: str,
) -> str:
    """
    Upload to R2 when configured; otherwise write under local_dir and return a relative URL.
    """
    key = r2_key.lstrip("/")
    if is_r2_configured():
        url = upload_file_to_r2(file_bytes, key, content_type)
        if url:
            return url
        logger.warning("R2 upload failed for %s; falling back to local disk", key)
    else:
        logger.warning("R2 not configured; saving %s to local disk", key)

    local_dir.mkdir(parents=True, exist_ok=True)
    filename = Path(key).name
    dest = local_dir / filename
    dest.write_bytes(file_bytes)
    prefix = local_url_prefix.rstrip("/")
    return f"{prefix}/{filename}"


def app_data_root() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    return Path(base).expanduser().resolve()


def local_path_from_media_url(url: str | None) -> Path | None:
    """Map a stored relative media URL to a path under APP_DATA_DIR."""
    s = (url or "").strip()
    if not s or s.startswith("http://") or s.startswith("https://"):
        return None
    path = urlparse(s).path if "://" in s else s
    if not path.startswith("/"):
        path = f"/{path}"
    root = app_data_root()
    mappings = (
        ("/media/cards/", root / "cards"),
        ("/uploads/", root / "uploads"),
        ("/animations/", root / "animations"),
        ("/highlights/thumbnails/", root / "highlights" / "thumbnails"),
        ("/highlights/", root / "highlights"),
    )
    for prefix, directory in mappings:
        if path.startswith(prefix):
            rel = path.removeprefix(prefix).lstrip("/")
            if not rel or ".." in rel.split("/"):
                return None
            candidate = (directory / rel).resolve()
            if str(candidate).startswith(str(directory.resolve())) and candidate.is_file():
                return candidate
    return None


def resolve_source_image_path(image_url: str, upload_dir: Path) -> tuple[Path, bool]:
    """
    Resolve image_url to a local filesystem path for OpenAI/Pillow generation.
    Returns (path, is_temp) — delete path when is_temp is True after use.
    """
    s = (image_url or "").strip()
    if not s:
        raise ValueError("image_url is required")

    if s.startswith("http://") or s.startswith("https://"):
        suffix = Path(urlparse(s).path).suffix or ".jpg"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp_path = Path(tmp.name)
        try:
            with httpx.Client(timeout=60.0, follow_redirects=True) as client:
                resp = client.get(s)
                resp.raise_for_status()
                tmp.write(resp.content)
            tmp.close()
            return tmp_path, True
        except Exception:
            tmp.close()
            tmp_path.unlink(missing_ok=True)
            raise

    image_path_value = urlparse(s).path if "://" in s else s
    if not image_path_value.startswith("/uploads/"):
        local = local_path_from_media_url(image_path_value)
        if local is not None:
            return local, False
        raise ValueError("image_url must point to /uploads/ or a reachable http(s) URL")

    rel = image_path_value.removeprefix("/uploads/").lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise ValueError("Invalid upload path")
    source_path = (upload_dir / rel).resolve()
    if not str(source_path).startswith(str(upload_dir.resolve())):
        raise ValueError("Invalid upload path")
    if not source_path.exists() or not source_path.is_file():
        raise ValueError("Source image not found")
    return source_path, False
