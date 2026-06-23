"""X (Twitter) API entegrasyonu: tweepy v1.1 API ile tweet gönderir."""

import logging
import os
import time

import tweepy
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("bot.poster")

MAX_RETRIES = 3


def get_api(env_prefix: str) -> tweepy.API:
    auth = tweepy.OAuth1UserHandler(
        consumer_key=os.getenv(f"{env_prefix}_API_KEY"),
        consumer_secret=os.getenv(f"{env_prefix}_API_SECRET"),
        access_token=os.getenv(f"{env_prefix}_ACCESS_TOKEN"),
        access_token_secret=os.getenv(f"{env_prefix}_ACCESS_TOKEN_SECRET"),
    )
    return tweepy.API(auth, wait_on_rate_limit=True)


def post_tweet(api: tweepy.API, text: str, dry_run: bool = True) -> bool:
    if dry_run:
        logger.info("[DRY RUN] Tweet: %s", text[:80])
        print(f"[DRY RUN] {text}")
        return True

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            api.update_status(status=text)
            logger.info("Tweet gönderildi: %s", text[:80])
            print(f"[OK] Tweet gönderildi: {text[:80]}")
            return True
        except tweepy.TweepyException as e:
            logger.error("Hata (deneme %d/%d): %s", attempt, MAX_RETRIES, e)
            time.sleep(5 * attempt)

    logger.error("Tweet gönderilemedi: %s", text[:80])
    return False


def post_approved_drafts(drafts: list[dict], env_prefix: str, dry_run: bool = True,
                         conn=None) -> int:
    api = get_api(env_prefix)
    posted = 0

    for draft in drafts:
        if draft.get("status") != "approved":
            continue

        success = post_tweet(api, draft["tweet"], dry_run=dry_run)
        if success:
            posted += 1
            if conn and not dry_run:
                conn.execute("UPDATE news SET tweeted = 1 WHERE id = ?",
                             (draft["article_id"],))
                conn.commit()
            time.sleep(2)

    logger.info("%d tweet gönderildi (%s, dry_run=%s)", posted, env_prefix, dry_run)
    return posted
