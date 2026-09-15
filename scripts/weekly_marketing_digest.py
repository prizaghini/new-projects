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
import time
from datetime import datetime, timezone
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google import genai
from google.genai import errors as genai_errors

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

Analyze them and return two things:

1. "themes" - the key trends/news from these emails (platform changes, \
industry shifts, notable campaigns, tools, data points). Skip pure noise \
(receipts, unrelated promos). For each theme give a short title and a \
1-2 sentence summary. Only when the source email included a \
"Source link(s)" line, also include source_label (the newsletter/sender \
name) and source_url (the first of those URLs). Omit source_label and \
source_url entirely rather than guessing a URL that wasn't given.

2. "content_ideas" - 6-8 concrete social media post ideas based on those \
themes. For each: a short punchy headline, the format (e.g. Carousel, \
Short video, Poll, Thread), and one sentence on the angle/why it's \
timely.

EMAILS:
{emails}
"""

DIGEST_SCHEMA = {
    "type": "object",
    "properties": {
        "themes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "source_label": {"type": "string"},
                    "source_url": {"type": "string"},
                },
                "required": ["title", "summary"],
            },
        },
        "content_ideas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "headline": {"type": "string"},
                    "format": {"type": "string"},
                    "angle": {"type": "string"},
                },
                "required": ["headline", "format", "angle"],
            },
        },
    },
    "required": ["themes", "content_ideas"],
}


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


LINK_RE = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
SKIP_LINK_PATTERNS = ("unsubscribe", "mailto:", "list-manage", "optout")


def extract_links(raw_html: str, limit: int = 3) -> list[str]:
    links = []
    for url in LINK_RE.findall(raw_html):
        if not url.startswith(("http://", "https://")):
            continue
        if any(p in url.lower() for p in SKIP_LINK_PATTERNS):
            continue
        if url not in links:
            links.append(url)
        if len(links) >= limit:
            break
    return links


def extract_body_and_links(msg: "email.message.Message") -> tuple[str, list[str]]:
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
        body = plain.strip() or strip_html(htm)
        return body, (extract_links(htm) if htm else [])

    payload = msg.get_payload(decode=True) or b""
    charset = msg.get_content_charset() or "utf-8"
    text = payload.decode(charset, errors="replace")
    if msg.get_content_type() == "text/html":
        return strip_html(text), extract_links(text)
    return text, []


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
        body, links = extract_body_and_links(msg)
        emails.append(
            {
                "subject": decode_mime_words(msg.get("Subject", "(no subject)")),
                "sender": decode_mime_words(msg.get("From", "unknown")),
                "date": msg.get("Date", ""),
                "snippet": body[:SNIPPET_CHARS],
                "links": links,
            }
        )

    imap.logout()
    return emails


def format_emails_for_prompt(emails: list[dict]) -> str:
    blocks = []
    for e in emails:
        block = (
            f"---\nFrom: {e['sender']}\nDate: {e['date']}\n"
            f"Subject: {e['subject']}\n{e['snippet']}\n"
        )
        if e.get("links"):
            block += "Source link(s): " + ", ".join(e["links"]) + "\n"
        blocks.append(block)
    return "\n".join(blocks)


# Guessing model names drifts out of date as Google renames/retires
# them; ask the API which ones are actually live for this key instead.
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"]


def discover_models(client: "genai.Client") -> list[str]:
    try:
        names = []
        for model in client.models.list():
            name = (model.name or "").removeprefix("models/")
            actions = model.supported_actions or []
            if "generateContent" in actions and "flash" in name.lower():
                names.append(name)
        return names or FALLBACK_MODELS
    except Exception:
        return FALLBACK_MODELS


def generate_digest(emails: list[dict]) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = DIGEST_PROMPT.format(
        days=LOOKBACK_DAYS, emails=format_emails_for_prompt(emails)
    )
    config = {
        "response_mime_type": "application/json",
        "response_json_schema": DIGEST_SCHEMA,
    }

    last_error: Exception | None = None
    for model in discover_models(client):
        # A model may be temporarily overloaded (503) - worth a few
        # retries with real backoff. A model that's missing/retired
        # (404, a ClientError) won't fix itself, so move on immediately.
        for attempt, delay in enumerate([0, 10, 30, 60]):
            if delay:
                time.sleep(delay)
            try:
                response = client.models.generate_content(
                    model=model, contents=prompt, config=config
                )
                return json.loads(response.text)
            except genai_errors.ServerError as e:
                last_error = e
            except genai_errors.ClientError as e:
                last_error = e
                break

    raise last_error


def render_markdown(data: dict) -> str:
    lines = ["## What's happening\n"]
    for t in data.get("themes", []):
        line = f"- **{t.get('title', '')}**: {t.get('summary', '')}"
        url = t.get("source_url")
        if url:
            label = t.get("source_label") or "source"
            line += f" ([{label}]({url}))"
        lines.append(line)

    lines.append("\n## Content ideas for social media\n")
    for i, idea in enumerate(data.get("content_ideas", []), 1):
        lines.append(
            f"{i}. **{idea.get('headline', '')}** "
            f"({idea.get('format', '')}) - {idea.get('angle', '')}"
        )
    return "\n".join(lines)


def esc(value) -> str:
    return html.escape(str(value or ""))


def render_html(data: dict, digest_date: str) -> str:
    theme_cards = "".join(
        f"""
        <tr><td style="padding:0 0 16px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#111827;">{esc(t.get('title'))}</p>
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#374151;">{esc(t.get('summary'))}</p>
              {
                f'<a href="{esc(t["source_url"])}" style="color:#4F46E5;text-decoration:none;'
                f'font-size:13px;font-weight:600;">{esc(t.get("source_label") or "Read source")} &rarr;</a>'
                if t.get("source_url") else ""
              }
            </td></tr>
          </table>
        </td></tr>"""
        for t in data.get("themes", [])
    )

    idea_cards = "".join(
        f"""
        <tr><td style="padding:0 0 16px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;">
            <tr><td style="padding:20px 24px;">
              <span style="display:inline-block;background:#EEF2FF;color:#4F46E5;font-size:11px;
                           font-weight:700;letter-spacing:0.5px;padding:4px 10px;border-radius:999px;">
                {esc(idea.get('format')).upper()}
              </span>
              <p style="margin:10px 0 6px 0;font-size:16px;font-weight:700;color:#111827;">{i}. {esc(idea.get('headline'))}</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">{esc(idea.get('angle'))}</p>
            </td></tr>
          </table>
        </td></tr>"""
        for i, idea in enumerate(data.get("content_ideas", []), 1)
    )

    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr><td style="padding:0 16px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#4F46E5;background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:16px;margin-bottom:24px;">
              <tr><td style="padding:32px 28px;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;">Your Marketing Digest</p>
                <p style="margin:6px 0 0 0;font-size:13px;color:#E0E7FF;">{esc(digest_date)}</p>
              </td></tr>
            </table>

            <p style="margin:0 0 12px 4px;font-size:13px;font-weight:700;letter-spacing:0.5px;
                      color:#6B7280;text-transform:uppercase;">What's happening</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              {theme_cards}
            </table>

            <p style="margin:8px 0 12px 4px;font-size:13px;font-weight:700;letter-spacing:0.5px;
                      color:#6B7280;text-transform:uppercase;">Content ideas for social media</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              {idea_cards}
            </table>

            <p style="margin:16px 4px 0 4px;font-size:12px;color:#9CA3AF;text-align:center;">
              Generated automatically from your inbox.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
"""


def save_report(markdown: str) -> Path:
    REPORTS_DIR.mkdir(exist_ok=True)
    path = REPORTS_DIR / f"{datetime.now(timezone.utc):%Y-%m-%d}-digest.md"
    path.write_text(markdown)
    return path


def send_email(data: dict, digest_date: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your marketing digest - {datetime.now(timezone.utc):%b %d, %Y}"
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = DIGEST_RECIPIENT

    # Ordered least- to most-preferred: clients that can't render HTML
    # fall back to the plain-text part.
    msg.attach(MIMEText(render_markdown(data), "plain", "utf-8"))
    msg.attach(MIMEText(render_html(data, digest_date), "html", "utf-8"))

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
    data = generate_digest(emails)
    digest_date = f"{datetime.now(timezone.utc):%B %d, %Y}"

    path = save_report(render_markdown(data))
    print(f"Saved report to {path}")

    send_email(data, digest_date)
    print(f"Emailed digest to {DIGEST_RECIPIENT}")


if __name__ == "__main__":
    main()
