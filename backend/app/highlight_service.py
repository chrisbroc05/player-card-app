"""Highlight clip processing — trim via ffmpeg or store metadata for playback."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path

from highlight_video_utils import MAX_HIGHLIGHT_CLIP_SECONDS, video_duration_seconds

logger = logging.getLogger(__name__)

MAX_HIGHLIGHT_UPLOAD_SECONDS = 600.0  # 10 minutes
MAX_HIGHLIGHT_UPLOAD_BYTES = 100 * 1024 * 1024


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def validate_upload_duration(path: Path) -> float:
    duration = video_duration_seconds(path)
    if duration is None:
        raise ValueError("Could not read video duration. Try MP4 format.")
    if duration > MAX_HIGHLIGHT_UPLOAD_SECONDS + 0.5:
        raise ValueError(
            "Please upload a shorter video. Maximum upload is 10 minutes — "
            "then trim to your best 10 seconds."
        )
    return duration


def validate_trim_range(*, trim_start: float, trim_end: float, source_duration: float) -> None:
    start = max(0.0, float(trim_start))
    end = float(trim_end)
    if end <= start:
        raise ValueError("Trim end must be after trim start.")
    span = end - start
    if span > MAX_HIGHLIGHT_CLIP_SECONDS + 0.25:
        raise ValueError(f"Selected clip must be {int(MAX_HIGHLIGHT_CLIP_SECONDS)} seconds or less.")
    if source_duration > 0 and end > source_duration + 0.25:
        raise ValueError("Trim end exceeds video duration.")


def apply_ffmpeg_trim(source: Path, dest: Path, *, trim_start: float, trim_end: float) -> bool:
    if not ffmpeg_available():
        return False
    duration = max(0.1, trim_end - trim_start)
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                f"{trim_start:.3f}",
                "-i",
                str(source),
                "-t",
                f"{duration:.3f}",
                "-c",
                "copy",
                str(dest),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if proc.returncode != 0:
            logger.warning("ffmpeg trim failed: %s", (proc.stderr or proc.stdout or "")[:500])
            return False
        return dest.is_file() and dest.stat().st_size > 0
    except (OSError, subprocess.TimeoutExpired) as exc:
        logger.warning("ffmpeg trim error: %s", exc)
        return False


def thumbnails_dir(base: Path | None = None) -> Path:
    root = base or Path(os.environ.get("APP_DATA_DIR", "/var/render/data")).expanduser().resolve()
    path = root / "highlights" / "thumbnails"
    path.mkdir(parents=True, exist_ok=True)
    return path


def extract_highlight_thumbnail(
    video_path: Path,
    thumb_path: Path,
    *,
    at_seconds: float = 0,
) -> bool:
    """Extract a JPEG poster frame from the highlight video."""
    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    if ffmpeg_available():
        try:
            proc = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    f"{max(0.0, at_seconds):.3f}",
                    "-i",
                    str(video_path),
                    "-frames:v",
                    "1",
                    "-q:v",
                    "2",
                    str(thumb_path),
                ],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            if proc.returncode == 0 and thumb_path.is_file() and thumb_path.stat().st_size > 0:
                return True
            logger.warning(
                "ffmpeg thumbnail failed: %s",
                (proc.stderr or proc.stdout or "")[:500],
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            logger.warning("ffmpeg thumbnail error: %s", exc)
    return False


def process_highlight_upload(
    source: Path,
    dest: Path,
    *,
    trim_start: float,
    trim_end: float,
) -> tuple[bool, bool]:
    """
    Write final highlight asset to dest.
    Returns (success, was_physically_trimmed).
    """
    source_duration = video_duration_seconds(source) or 0.0
    validate_trim_range(trim_start=trim_start, trim_end=trim_end, source_duration=source_duration)
    if apply_ffmpeg_trim(source, dest, trim_start=trim_start, trim_end=trim_end):
        return True, True
    shutil.copy2(source, dest)
    return True, False
