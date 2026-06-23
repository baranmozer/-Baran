"""Tweet taslak üretici: haberlerden 280 karakterlik tweet taslakları oluşturur."""

import json
import logging
import os
from datetime import datetime

logger = logging.getLogger("bot.generator")

MAX_TWEET_LEN = 280
LINK_LEN = 24  # X kısaltılmış link uzunluğu


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def generate_draft(article: dict, hashtags: list[str], team_name: str) -> str:
    prefix = "🚨 SON DAKİKA: " if article["is_breaking"] else ""
    tags = " ".join(hashtags[:2])
    link = article["link"]

    available = MAX_TWEET_LEN - len(prefix) - LINK_LEN - len(tags) - 3  # spaces/newlines
    title = _truncate(article["title"], available)

    tweet = f"{prefix}{title}\n\n{link}\n\n{tags}"

    if len(tweet.replace(article["link"], "x" * LINK_LEN)) > MAX_TWEET_LEN:
        title = _truncate(article["title"], available - 20)
        tweet = f"{prefix}{title}\n\n{link}\n\n{tags}"

    return tweet.strip()


def generate_drafts_for_account(articles: list[dict], account_config: dict) -> list[dict]:
    drafts = []
    hashtags = account_config.get("hashtags", [])
    team_name = account_config.get("team_name", "")

    for article in articles:
        tweet_text = generate_draft(article, hashtags, team_name)
        drafts.append({
            "article_id": article["id"],
            "title": article["title"],
            "tweet": tweet_text,
            "is_breaking": article["is_breaking"],
            "status": "pending",
        })
    return drafts


def save_drafts(drafts: list[dict], account_key: str, draft_dir: str) -> str:
    os.makedirs(draft_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(draft_dir, f"{account_key}_{ts}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)
    logger.info("Taslaklar kaydedildi: %s (%d adet)", filepath, len(drafts))
    return filepath


def load_drafts(filepath: str) -> list[dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def approve_drafts_interactive(filepath: str):
    """Konsol üzerinden taslak onay. Kullanıcı her taslağı onaylar/reddeder."""
    drafts = load_drafts(filepath)
    for i, draft in enumerate(drafts):
        print(f"\n{'='*50}")
        print(f"[{i+1}/{len(drafts)}] {'🚨 SON DAKİKA' if draft['is_breaking'] else 'Haber'}")
        print(f"Başlık: {draft['title']}")
        print(f"\nTweet taslağı:\n{draft['tweet']}")
        print(f"\nKarakter: {len(draft['tweet'])}/280")

        while True:
            choice = input("\nOnayla (e), Reddet (r), Düzenle (d): ").strip().lower()
            if choice == "e":
                draft["status"] = "approved"
                break
            elif choice == "r":
                draft["status"] = "rejected"
                break
            elif choice == "d":
                new_text = input("Yeni tweet metni: ").strip()
                if len(new_text) <= MAX_TWEET_LEN:
                    draft["tweet"] = new_text
                    draft["status"] = "approved"
                    break
                else:
                    print(f"Çok uzun ({len(new_text)}/280). Tekrar dene.")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)

    approved = sum(1 for d in drafts if d["status"] == "approved")
    print(f"\n{approved}/{len(drafts)} taslak onaylandı.")
    return drafts
