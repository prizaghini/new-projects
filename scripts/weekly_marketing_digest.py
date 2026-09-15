#!/usr/bin/env python3
"""Digital marketing email digest.

Scans Gmail (via IMAP) for the last N days of emails related to digital
marketing / social media / PPC, summarizes recent themes with Gemini, and
emails a digest with content ideas back to the user.

Required environment variables:
    GMAIL_ADDRESS        - the Gmail account to read and send from
    GMAIL_APP_PASSWORD   - a Gmail "App Password" (not your normal password)
    GEMINI_API_KEY        - free Google AI Studio API key used to write the digest

Optional environment variables:
    DIGEST_RECIPIENT     - where to email the digest (default: GMAIL_ADDRESS)
    LOOKBACK_DAYS         - how many days back to search (default: 7)
    MAX_EMAILS            - cap on emails sent to Gemini (default: 40)
"""

import email
import html
import imaplib
import json
import os
import re
import smtplib
from datetime import datetime, timezone
from email.header import decode_header
from email.mime.text import MIMEText
from pathlib import Path

from google import genai

ROOT = Path(__file__).resolve().parent.parent
KEYWORDS_PATH = ROOT / "config" / "keywords.json"
REPORTS_DIR = ROOT / "reports"

GMAIL_ADDRESS = os.environ["GMAIL_ADDRESS"]
GMAIL_APP_PASSWORD = os.environ["GMAIL_APP_PASSWORD"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
DIGEST_RECIPIENT = os.environ.get("DIGEST_RECIPIENT") or GMAIL_ADDRESS
LOOKBACK_DAYS = int(os.environ.get("LOOKBACK_DAYS", "7"))
MAX_EMAILS = int(os.environ.get("MAX_EMAILS", "40"))
SNIPPET_CHARS = 600

DIGEST_PROMPT = """You are a digital marketing analyst helping a marketing \
professional stay on top of their inbox. Below are emails from the last \
{days} days related to digital marketing, social media, PPC, SEO, and \
advertising - newsletters, industry updates, platform announcements, etc.

Write a concise weekly digest with two sections:

## What's happening this week
Group the key themes/news/trends from these emails (platform changes, \
industry shifts, notable campaigns, tools, data points). Cite the specific \
source briefly where useful. Skip pure noise (receipts, unrelated promos).

## Content ideas for social media
Based on this week's themes, propose 6-8 concrete social media post ideas. \
For each: a short hook/headline, the format (e.g. carousel, short video, \
poll, thread), and one line on the angle/why it's timely.

Keep it tight and actionable - this is a working professional's weekly \
briefing, not a report.

EMAILS:
{emails}
"""


def load_keywords() -> list[str]:
    return json.loads(KEYWORDS_PATH.read_text())["keywords"]


def build_gmail_query(keywords: list[str]) -> str:
    terms = " OR ".join(f'"{k}"' if " " in k else k for k in keywords)
    return f"newer_than:{LOOKBACK_DAYS}d ({terms})"


def decode_mime_words(value: str) -> str:
    parts = decode_header(value or "")
    decoded = ""
    for text, charset in parts:
        if isinstance(text, bytes):
            decoded += text.decode(charset or "utf-8", errors="replace")
        else:
            decoded += text
    return decoded


def strip_html(raw: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?(</\1>)", " ", raw)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_body(msg: "email.message.Message") -> str:
    if msg.is_multipart():
        plain, htm = "", ""
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")
            if "attachment" in disp:
                continue
            payload = part.get_payload(decode=True)
            if not payload:
                continue
            charset = part.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ctype == "text/plain" and not plain:
                plain = text
            elif ctype == "text/html" and not htm:
                htm = text
        return plain.strip() or strip_html(htm)

    payload = msg.get_payload(decode=True) or b""
    charset = msg.get_content_charset() or "utf-8"
    text = payload.decode(charset, errors="replace")
    return text if msg.get_content_type() == "text/plain" else strip_html(text)


def imap_quoted(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def fetch_marketing_emails() -> list[dict]:
    query = build_gmail_query(load_keywords())

    imap = imaplib.IMAP4_SSL("imap.gmail.com")
    imap.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
    imap.select('"[Gmail]/All Mail"', readonly=True)

    # X-GM-RAW is a Gmail IMAP extension that accepts the same query
    # syntax as the Gmail search box, so this reuses one query across
    # every label/folder instead of re-implementing Gmail's search.
    # The query itself contains quoted phrases (e.g. "social media"), so
    # it must be escaped, not just wrapped, when quoted for IMAP itself.
    status, data = imap.uid("search", "X-GM-RAW", imap_quoted(query))
    if status != "OK":
        raise RuntimeError(f"Gmail search failed: {data}")

    uids = data[0].split()[-MAX_EMAILS:]
    emails = []
    for uid in uids:
        status, msg_data = imap.uid("fetch", uid, "(RFC822)")
        if status != "OK" or not msg_data or not msg_data[0]:
            continue
        msg = email.message_from_bytes(msg_data[0][1])
        emails.append(
            {
                "subject": decode_mime_words(msg.get("Subject", "(no subject)")),
                "sender": decode_mime_words(msg.get("From", "unknown")),
                "date": msg.get("Date", ""),
                "snippet": extract_body(msg)[:SNIPPET_CHARS],
            }
        )

    imap.logout()
    return emails


def format_emails_for_prompt(emails: list[dict]) -> str:
    blocks = [
        f"---\nFrom: {e['sender']}\nDate: {e['date']}\n"
        f"Subject: {e['subject']}\n{e['snippet']}\n"
        for e in emails
    ]
    return "\n".join(blocks)


def summarize(emails: list[dict]) -> str:
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = DIGEST_PROMPT.format(
        days=LOOKBACK_DAYS, emails=format_emails_for_prompt(emails)
    )
    response = client.models.generate_content(
        model="gemini-3.6-flash", contents=prompt
    )
    return response.text


def save_report(markdown: str) -> Path:
    REPORTS_DIR.mkdir(exist_ok=True)
    path = REPORTS_DIR / f"{datetime.now(timezone.utc):%Y-%m-%d}-digest.md"
    path.write_text(markdown)
    return path


def send_email(markdown: str) -> None:
    msg = MIMEText(markdown, "plain", "utf-8")
    msg["Subject"] = f"Your marketing digest - {datetime.now(timezone.utc):%b %d, %Y}"
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = DIGEST_RECIPIENT

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        smtp.send_message(msg)


def main() -> None:
    emails = fetch_marketing_emails()
    if not emails:
        print("No matching emails found this week.")
        return

    print(f"Found {len(emails)} matching emails. Summarizing...")
    digest = summarize(emails)

    path = save_report(digest)
    print(f"Saved report to {path}")

    send_email(digest)
    print(f"Emailed digest to {DIGEST_RECIPIENT}")


if __name__ == "__main__":
    main()
