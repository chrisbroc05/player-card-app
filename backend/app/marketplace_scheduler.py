"""APScheduler wiring for marketplace maintenance and card cleanup jobs."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from card_cleanup import run_deleted_cards_cleanup_pass
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
    sched.add_job(
        run_deleted_cards_cleanup_pass,
        CronTrigger(hour=3, minute=0),
        id="cleanup_deleted_cards",
        replace_existing=True,
    )
    sched.start()
    _scheduler = sched
    logger.info(
        "Scheduler started (marketplace expiration every 24h, deleted cards cleanup daily 03:00 UTC)"
    )


def shutdown_marketplace_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
