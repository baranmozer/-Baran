#!/usr/bin/env python3
"""Ana giriş noktası: haber topla → taslak üret → onayla → zamanla/gönder."""

import argparse
import logging
import os
import sys

import yaml

from collector import init_db, collect_all, get_untweeted
from generator import generate_drafts_for_account, save_drafts, approve_drafts_interactive
from poster import post_approved_drafts
from scheduler import setup_schedule, run_scheduler


def setup_logging(log_path: str):
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def load_config(path: str = "config.yaml") -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def cmd_collect(config, conn):
    total = collect_all(config, conn)
    print(f"\nToplam {total} yeni haber toplandı.")


def cmd_generate(config, conn):
    draft_dir = config["settings"].get("draft_dir", "drafts")
    for acct_key, acct in config["accounts"].items():
        articles = get_untweeted(conn, acct_key)
        if not articles:
            print(f"[{acct['team_name']}] Yeni haber yok.")
            continue
        drafts = generate_drafts_for_account(articles, acct)
        filepath = save_drafts(drafts, acct_key, draft_dir)
        print(f"[{acct['team_name']}] {len(drafts)} taslak → {filepath}")


def cmd_approve(args, config):
    if args.file:
        approve_drafts_interactive(args.file)
    else:
        import glob as g
        draft_dir = config["settings"].get("draft_dir", "drafts")
        for f in sorted(g.glob(f"{draft_dir}/*.json")):
            print(f"\n📄 Dosya: {f}")
            approve_drafts_interactive(f)


def cmd_post(config, conn):
    dry_run = config["settings"].get("dry_run", True)
    draft_dir = config["settings"].get("draft_dir", "drafts")
    import glob as g, json
    for acct_key, acct in config["accounts"].items():
        files = sorted(g.glob(f"{draft_dir}/{acct_key}_*.json"), reverse=True)
        if not files:
            continue
        with open(files[0], "r", encoding="utf-8") as f:
            drafts = json.load(f)
        approved = [d for d in drafts if d.get("status") == "approved"]
        if approved:
            env_prefix = acct.get("env_prefix", acct_key.upper())
            posted = post_approved_drafts(approved, env_prefix, dry_run=dry_run, conn=conn)
            print(f"[{acct['team_name']}] {posted} tweet gönderildi (dry_run={dry_run})")


def cmd_schedule(config, conn):
    setup_schedule(config, conn)
    run_scheduler()


def main():
    parser = argparse.ArgumentParser(description="Türk Futbol/Basketbol Haber Botu")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("collect", help="Haberleri topla")
    sub.add_parser("generate", help="Tweet taslakları üret")
    ap = sub.add_parser("approve", help="Taslakları onayla")
    ap.add_argument("--file", help="Belirli taslak dosyası")
    sub.add_parser("post", help="Onaylı tweetleri gönder")
    sub.add_parser("schedule", help="Zamanlayıcıyı başlat")
    sub.add_parser("run", help="Topla + üret (tek seferlik)")

    args = parser.parse_args()
    config = load_config()
    setup_logging(config["settings"].get("log_path", "logs/bot.log"))
    conn = init_db(config["settings"].get("db_path", "db/news.db"))

    if args.command == "collect":
        cmd_collect(config, conn)
    elif args.command == "generate":
        cmd_generate(config, conn)
    elif args.command == "approve":
        cmd_approve(args, config)
    elif args.command == "post":
        cmd_post(config, conn)
    elif args.command == "schedule":
        cmd_schedule(config, conn)
    elif args.command == "run":
        cmd_collect(config, conn)
        cmd_generate(config, conn)
    else:
        parser.print_help()

    conn.close()


if __name__ == "__main__":
    main()
