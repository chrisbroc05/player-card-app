"""Gate transactional emails on user notification settings."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import BackgroundTasks

from models import User
from user_settings import user_wants_email


def schedule_user_email(
    background_tasks: BackgroundTasks,
    user: User | None,
    setting_key: str,
    send_fn: Callable[..., Any],
    *args: Any,
    **kwargs: Any,
) -> None:
    if not user_wants_email(user, setting_key):
        return
    background_tasks.add_task(send_fn, *args, **kwargs)
