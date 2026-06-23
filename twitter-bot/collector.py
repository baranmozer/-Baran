"""Haber toplama modülü: RSS feed'lerinden haberleri çeker, SQLite'a kaydeder."""

import hashlib
import logging
import os
import sqlite3
import time
from datetime import datetime, timedelta

import feedparser
import requests

logger = logging.getLogger("bot.collector")


def init_db(db_path: str):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id TEXT PRIMARY KEY,
            account TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            link TEXT,
            source TEXT,
            is_breaking INTEGER DEFAULT 0,
            collected_at TEXT NOT NULL,
            tweeted INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    return conn


def _hash_article(title: str, link: str) -> str:
    raw = f"{title.strip().lower()}|{link.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _is_breaking(title: str) -> bool:
    markers = ["son dakika", "flaş", "flash", "breaking", "acil"]
    title_lower = title.lower()
    return any(m in title_lower for m in markers)


def collect_rss(feed_url: str, account: str, conn: sqlite3.Connection, delay: float):
    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        logger.error("RSS parse hatası (%s): %s", feed_url, e)
        return 0

    count = 0
    for entry in feed.entries:
        title = entry.get("title", "").strip()
        link = entry.get("link", "").strip()
        summary = entry.get("summary", "").strip()[:500]
        if not title or not link:
            continue

        article_id = _hash_article(title, link)
        try:
            conn.execute(
                "INSERT INTO news (id, account, title, summary, link, source, is_breaking, collected_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (article_id, account, title, summary, link, feed_url,
                 int(_is_breaking(title)), datetime.utcnow().isoformat()),
            )
            count += 1
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    time.sleep(delay)
    logger.info("RSS %s → %d yeni haber (%s)", feed_url, count, account)
    return count


def collect_all(config: dict, conn: sqlite3.Connection) -> int:
    delay = config["settings"].get("request_delay_seconds", 2)
    total = 0
    for acct_key, acct in config["accounts"].items():
        for feed_url in acct.get("rss_feeds", []):
            total += collect_rss(feed_url, acct_key, conn, delay)
    return total


def get_untweeted(conn: sqlite3.Connection, account: str, limit: int = 10) -> list[dict]:
    hours = 48
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    rows = conn.execute(
        "SELECT id, title, summary, link, is_breaking FROM news "
        "WHERE account = ? AND tweeted = 0 AND collected_at > ? "
        "ORDER BY is_breaking DESC, collected_at DESC LIMIT ?",
        (account, cutoff, limit),
    ).fetchall()
    return [
        {"id": r[0], "title": r[1], "summary": r[2], "link": r[3], "is_breaking": bool(r[4])}
        for r in rows
    ]
