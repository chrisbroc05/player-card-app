"""Highlight clip validation — no server-side transcoding."""

from __future__ import annotations

from highlight_video_utils import MAX_HIGHLIGHT_CLIP_SECONDS, video_duration_seconds

MAX_HIGHLIGHT_UPLOAD_SECONDS = 600.0  # 10 minutes
MAX_HIGHLIGHT_UPLOAD_BYTES = 100 * 1024 * 1024


def validate_upload_duration(path) -> float | None:
    """Return duration when known; None if unknown (upload still allowed)."""
    duration = video_duration_seconds(path)
    if duration is not None and duration > MAX_HIGHLIGHT_UPLOAD_SECONDS + 0.5:
        raise ValueError(
            "Please upload a shorter video. Maximum upload is 10 minutes — "
            "then trim to your best 10 seconds."
        )
    return duration


def validate_trim_range(*, trim_start: float, trim_end: float | None, source_duration: float | None) -> tuple[float, float | None]:
    start = max(0.0, float(trim_start))
    end = float(trim_end) if trim_end is not None else None
    if end is not None:
        if end <= start:
            raise ValueError("Trim end must be after trim start.")
        span = end - start
        if span > MAX_HIGHLIGHT_CLIP_SECONDS + 0.25:
            raise ValueError(f"Selected clip must be {int(MAX_HIGHLIGHT_CLIP_SECONDS)} seconds or less.")
        if source_duration and source_duration > 0 and end > source_duration + 0.25:
            raise ValueError("Trim end exceeds video duration.")
    return start, end
