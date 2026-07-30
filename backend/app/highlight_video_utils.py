"""Highlight clip validation helpers."""

from __future__ import annotations

import struct
import subprocess
from pathlib import Path

MAX_HIGHLIGHT_DURATION_SECONDS = 10.0
MAX_HIGHLIGHT_CLIP_SECONDS = MAX_HIGHLIGHT_DURATION_SECONDS

_VIDEO_EXTENSIONS = frozenset({".mp4", ".mov", ".avi", ".webm"})
_VIDEO_CONTENT_TYPES = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/webm": ".webm",
}


def video_extension_for_content_type(content_type: str | None, filename: str | None = None) -> str | None:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in _VIDEO_CONTENT_TYPES:
        return _VIDEO_CONTENT_TYPES[ct]
    if filename:
        ext = Path(filename).suffix.lower()
        if ext in _VIDEO_EXTENSIONS:
            return ext
    return None


def _mp4_duration_seconds(data: bytes) -> float | None:
    """Best-effort MP4 duration from mvhd atom (no external deps)."""
    idx = 0
    while idx + 8 <= len(data):
        size = struct.unpack(">I", data[idx : idx + 4])[0]
        if size < 8:
            break
        atom_type = data[idx + 4 : idx + 8]
        if atom_type == b"moov":
            return _mp4_duration_seconds(data[idx + 8 : idx + size])
        if atom_type == b"mvhd" and size >= 32:
            version = data[idx + 8]
            if version == 0 and idx + 28 <= len(data):
                timescale = struct.unpack(">I", data[idx + 20 : idx + 24])[0]
                duration = struct.unpack(">I", data[idx + 24 : idx + 28])[0]
                if timescale > 0:
                    return duration / timescale
            elif version == 1 and idx + 40 <= len(data):
                timescale = struct.unpack(">I", data[idx + 28 : idx + 32])[0]
                duration = struct.unpack(">Q", data[idx + 32 : idx + 40])[0]
                if timescale > 0:
                    return duration / timescale
            return None
        idx += size
    return None


def video_duration_seconds(path: Path) -> float | None:
    """Return clip duration in seconds, or None if unknown."""
    try:
        proc = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return float(proc.stdout.strip())
    except (FileNotFoundError, ValueError, subprocess.TimeoutExpired, OSError):
        pass

    if path.suffix.lower() == ".mp4":
        try:
            data = path.read_bytes()
            return _mp4_duration_seconds(data)
        except OSError:
            return None
    return None


def validate_highlight_duration(path: Path) -> None:
    duration = video_duration_seconds(path)
    if duration is None:
        raise ValueError("Could not determine video duration. Try MP4 format under 10 seconds.")
    if duration > MAX_HIGHLIGHT_DURATION_SECONDS + 0.25:
        raise ValueError(
            f"Highlight clips must be {int(MAX_HIGHLIGHT_DURATION_SECONDS)} seconds or less "
            f"(yours is about {duration:.1f}s)."
        )
