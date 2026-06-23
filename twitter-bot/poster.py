"""X (Twitter) Selenium entegrasyonu: Chrome otomasyon ile tweet gönderir."""

import logging
import os
import time

from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

load_dotenv()

logger = logging.getLogger("bot.poster")

TWEET_DELAY = 35


def _create_driver():
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")
    options.add_argument("--lang=tr")
    user_data = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    options.add_argument(f"--user-data-dir={user_data}")
    options.add_argument("--profile-directory=Default")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(10)
    return driver


def _login(driver, username: str, password: str):
    driver.get("https://x.com/i/flow/login")
    time.sleep(5)

    username_input = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
    )
    username_input.send_keys(username)
    username_input.send_keys(Keys.RETURN)
    time.sleep(2)

    password_input = WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'input[name="password"]'))
    )
    password_input.send_keys(password)
    password_input.send_keys(Keys.RETURN)
    time.sleep(5)

    if "home" in driver.current_url.lower():
        logger.info("X'e giriş başarılı: @%s", username)
        return True

    logger.error("X'e giriş başarısız. URL: %s", driver.current_url)
    return False


def _post_tweet(driver, text: str) -> bool:
    try:
        driver.get("https://x.com/compose/post")
        time.sleep(3)

        tweet_box = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
        )
        tweet_box.click()
        time.sleep(1)

        for line in text.split("\n"):
            tweet_box.send_keys(line)
            tweet_box.send_keys(Keys.SHIFT, Keys.RETURN)
        time.sleep(1)

        post_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetButton"]'))
        )
        post_button.click()
        time.sleep(3)

        logger.info("Tweet gönderildi: %s", text[:80])
        return True
    except Exception as e:
        logger.error("Tweet gönderilemedi: %s", e)
        return False


def post_tweet(text: str, env_prefix: str, dry_run: bool = True) -> bool:
    if dry_run:
        logger.info("[DRY RUN] Tweet gönderilecekti: %s", text[:80])
        print(f"[DRY RUN] {text}")
        return True

    username = os.getenv(f"{env_prefix}_X_USERNAME")
    password = os.getenv(f"{env_prefix}_X_PASSWORD")

    if not username or not password:
        logger.error("X kullanıcı adı veya şifre .env'de bulunamadı")
        return False

    driver = _create_driver()
    try:
        if not _login(driver, username, password):
            return False
        return _post_tweet(driver, text)
    finally:
        driver.quit()


def post_approved_drafts(drafts: list[dict], env_prefix: str, dry_run: bool = True,
                         conn=None) -> int:
    if dry_run:
        posted = 0
        for draft in drafts:
            if draft.get("status") != "approved":
                continue
            post_tweet(draft["tweet"], env_prefix, dry_run=True)
            posted += 1
        logger.info("%d tweet gönderildi (%s, dry_run=True)", posted, env_prefix)
        return posted

    username = os.getenv(f"{env_prefix}_X_USERNAME")
    password = os.getenv(f"{env_prefix}_X_PASSWORD")

    if not username or not password:
        logger.error("X kullanıcı adı veya şifre .env'de bulunamadı")
        return 0

    driver = _create_driver()
    posted = 0

    try:
        if not _login(driver, username, password):
            return 0

        for draft in drafts:
            if draft.get("status") != "approved":
                continue

            success = _post_tweet(driver, draft["tweet"])
            if success:
                posted += 1
                if conn:
                    conn.execute("UPDATE news SET tweeted = 1 WHERE id = ?",
                                 (draft["article_id"],))
                    conn.commit()
                time.sleep(TWEET_DELAY)
    finally:
        driver.quit()

    logger.info("%d tweet gönderildi (%s, dry_run=False)", posted, env_prefix)
    return posted
