"""APScheduler wiring for marketplace maintenance jobs."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from marketplace_jobs import run_marketplace_expiration_pass

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_marketplace_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    sched = BackgroundScheduler()
    sched.add_job(
        run_marketplace_expiration_pass,
        "interval",
        hours=24,
        id="marketplace_expiration",
        replace_existing=True,
    )
    sched.start()
    _scheduler = sched
    logger.info("Marketplace scheduler started (24h marketplace expiration job)")


def shutdown_marketplace_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
