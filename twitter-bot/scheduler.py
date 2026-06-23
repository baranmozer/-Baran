"""Zamanlayıcı: onaylanan tweetleri config saatlerinde sıraya koyar ve gönderir."""

import logging
import os
import glob as glob_mod
import json

import schedule
import time

from poster import post_approved_drafts

logger = logging.getLogger("bot.scheduler")


def _get_latest_draft(draft_dir: str, account_key: str) -> str | None:
    pattern = os.path.join(draft_dir, f"{account_key}_*.json")
    files = sorted(glob_mod.glob(pattern), reverse=True)
    return files[0] if files else None


def _run_posting_job(account_key: str, env_prefix: str, draft_dir: str,
                     dry_run: bool, conn):
    filepath = _get_latest_draft(draft_dir, account_key)
    if not filepath:
        logger.info("Taslak bulunamadı: %s", account_key)
        return

    with open(filepath, "r", encoding="utf-8") as f:
        drafts = json.load(f)

    approved = [d for d in drafts if d.get("status") == "approved"]
    if not approved:
        logger.info("Onaylı taslak yok: %s", account_key)
        return

    post_approved_drafts(approved[:1], env_prefix, dry_run=dry_run, conn=conn)

    # Gönderileni listeden çıkar
    approved[0]["status"] = "posted"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)


def setup_schedule(config: dict, conn):
    dry_run = config["settings"].get("dry_run", True)
    draft_dir = config["settings"].get("draft_dir", "drafts")

    for acct_key, acct in config["accounts"].items():
        env_prefix = acct.get("env_prefix", acct_key.upper())
        for time_str in acct.get("schedule_hours", []):
            schedule.every().day.at(time_str).do(
                _run_posting_job,
                account_key=acct_key,
                env_prefix=env_prefix,
                draft_dir=draft_dir,
                dry_run=dry_run,
                conn=conn,
            )
            logger.info("Zamanlandı: %s → %s", acct_key, time_str)


def run_scheduler():
    logger.info("Zamanlayıcı başlatıldı.")
    while True:
        schedule.run_pending()
        time.sleep(30)
