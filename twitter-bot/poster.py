"""X (Twitter) API entegrasyonu: tweepy ile tweet gönderir."""

import logging
import os
import time

import tweepy
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("bot.poster")

RATE_LIMIT_WAIT = 15 * 60  # 15 dakika
MAX_RETRIES = 3


def get_client(env_prefix: str) -> tweepy.Client:
    return tweepy.Client(
        consumer_key=os.getenv(f"{env_prefix}_API_KEY"),
        consumer_secret=os.getenv(f"{env_prefix}_API_SECRET"),
        access_token=os.getenv(f"{env_prefix}_ACCESS_TOKEN"),
        access_token_secret=os.getenv(f"{env_prefix}_ACCESS_TOKEN_SECRET"),
    )


def post_tweet(client: tweepy.Client, text: str, dry_run: bool = True) -> bool:
    if dry_run:
        logger.info("[DRY RUN] Tweet gönderilecekti: %s", text[:80])
        print(f"[DRY RUN] {text}")
        return True

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            client.create_tweet(text=text)
            logger.info("Tweet gönderildi: %s", text[:80])
            return True
        except tweepy.TooManyRequests:
            logger.warning("Rate limit! %d saniye bekleniyor... (deneme %d/%d)",
                           RATE_LIMIT_WAIT, attempt, MAX_RETRIES)
            time.sleep(RATE_LIMIT_WAIT)
        except tweepy.TweepyException as e:
            logger.error("Tweet gönderilemedi (deneme %d/%d): %s", attempt, MAX_RETRIES, e)
            time.sleep(5 * attempt)

    logger.error("Tweet gönderilemedi, tüm denemeler tükendi: %s", text[:80])
    return False


def post_approved_drafts(drafts: list[dict], env_prefix: str, dry_run: bool = True,
                         conn=None) -> int:
    client = get_client(env_prefix)
    posted = 0

    for draft in drafts:
        if draft.get("status") != "approved":
            continue

        success = post_tweet(client, draft["tweet"], dry_run=dry_run)
        if success:
            posted += 1
            if conn and not dry_run:
                conn.execute("UPDATE news SET tweeted = 1 WHERE id = ?",
                             (draft["article_id"],))
                conn.commit()
            time.sleep(2)

    logger.info("%d tweet gönderildi (%s, dry_run=%s)", posted, env_prefix, dry_run)
    return posted
