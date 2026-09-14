#!/usr/bin/env python3
"""Digital marketing email digest (Outlook + Gemini).

Scans Outlook (via Microsoft Graph) for the last N days of emails related
to digital marketing / social media / PPC, summarizes recent themes with
Gemini, and emails a digest with content ideas back to the user.

Required environment variables:
    OUTLOOK_CLIENT_ID      - Azure app registration's Application (client) ID
    OUTLOOK_REFRESH_TOKEN  - refresh token from the one-time device login
    GEMINI_API_KEY          - free Google AI Studio API key used to write the digest

Optional environment variables:
    DIGEST_RECIPIENT   - where to email the digest (default: your Outlook address)
    LOOKBACK_DAYS       - how many days back to search (default: 7)
    MAX_EMAILS          - cap on emails sent to Gemini (default: 40)

Microsoft rotates the refresh token on every use, so each run may produce
a new one. When running in GitHub Actions, this script prints it as a
masked step output (new_refresh_token) so the workflow can save it back
to the OUTLOOK_REFRESH_TOKEN secret for the next run.
"""

import html
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import msal
import requests
from google import genai

ROOT = Path(__file__).resolve().parent.parent
KEYWORDS_PATH = ROOT / "config" / "keywords.json"
REPORTS_DIR = ROOT / "reports"
GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPES = ["Mail.Read", "Mail.Send", "offline_access"]
AUTHORITY = "https://login.microsoftonline.com/consumers"

OUTLOOK_CLIENT_ID = os.environ["OUTLOOK_CLIENT_ID"]
OUTLOOK_REFRESH_TOKEN = os.environ["OUTLOOK_REFRESH_TOKEN"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
LOOKBACK_DAYS = int(os.environ.get("LOOKBACK_DAYS", "7"))
MAX_EMAILS = int(os.environ.get("MAX_EMAILS", "40"))
SNIPPET_CHARS = 600

DIGEST_PROMPT = """You are a digital marketing analyst helping a marketing \
professional stay on top of their inbox. Below are emails from the last \
{days} days related to digital marketing, social media, PPC, SEO, and \
advertising - newsletters, industry updates, platform announcements, etc.

Write a concise digest with two sections:

## What's happening
Group the key themes/news/trends from these emails (platform changes, \
industry shifts, notable campaigns, tools, data points). Cite the specific \
source briefly where useful. Skip pure noise (receipts, unrelated promos).

## Content ideas for social media
Based on these themes, propose 6-8 concrete social media post ideas. \
For each: a short hook/headline, the format (e.g. carousel, short video, \
poll, thread), and one line on the angle/why it's timely.

Keep it tight and actionable - this is a working professional's briefing, \
not a report.

EMAILS:
{emails}
"""


def load_keywords() -> list[str]:
    return json.loads(KEYWORDS_PATH.read_text())["keywords"]


def strip_html(raw: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?(</\1>)", " ", raw)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def get_access_token() -> tuple[str, str | None]:
    app = msal.PublicClientApplication(OUTLOOK_CLIENT_ID, authority=AUTHORITY)
    result = app.acquire_token_by_refresh_token(
        OUTLOOK_REFRESH_TOKEN, scopes=GRAPH_SCOPES
    )
    if "access_token" not in result:
        raise RuntimeError(
            "Outlook login failed - the refresh token may have expired, "
            "re-run the one-time device login: "
            f"{result.get('error')}: {result.get('error_description')}"
        )
    return result["access_token"], result.get("refresh_token")


def get_my_email(access_token: str) -> str:
    resp = requests.get(
        f"{GRAPH_ROOT}/me",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"$select": "mail,userPrincipalName"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("mail") or data["userPrincipalName"]


def fetch_marketing_emails(access_token: str) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
        # Ask Graph to convert HTML bodies to plain text for us.
        "Prefer": 'outlook.body-content-type="text"',
    }
    params = {
        "$filter": f"receivedDateTime ge {cutoff}",
        "$select": "subject,from,receivedDateTime,body",
        "$orderby": "receivedDateTime desc",
        "$top": "100",
    }
    resp = requests.get(
        f"{GRAPH_ROOT}/me/messages", headers=headers, params=params, timeout=30
    )
    resp.raise_for_status()
    messages = resp.json().get("value", [])

    keywords = [k.lower() for k in load_keywords()]
    matched = []
    for m in messages:
        subject = m.get("subject") or "(no subject)"
        body = m.get("body") or {}
        content = body.get("content", "")
        if body.get("contentType") == "html":
            content = strip_html(content)

        haystack = f"{subject} {content}".lower()
        if not any(k in haystack for k in keywords):
            continue

        sender = ((m.get("from") or {}).get("emailAddress") or {}).get(
            "address", "unknown"
        )
        matched.append(
            {
                "subject": subject,
                "sender": sender,
                "date": m.get("receivedDateTime", ""),
                "snippet": content[:SNIPPET_CHARS],
            }
        )
        if len(matched) >= MAX_EMAILS:
            break

    return matched


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
        model="gemini-2.0-flash", contents=prompt
    )
    return response.text


def save_report(markdown: str) -> Path:
    REPORTS_DIR.mkdir(exist_ok=True)
    path = REPORTS_DIR / f"{datetime.now(timezone.utc):%Y-%m-%d}-digest.md"
    path.write_text(markdown)
    return path


def send_email(access_token: str, markdown: str, recipient: str) -> None:
    payload = {
        "message": {
            "subject": f"Your marketing digest - {datetime.now(timezone.utc):%b %d, %Y}",
            "body": {"contentType": "Text", "content": markdown},
            "toRecipients": [{"emailAddress": {"address": recipient}}],
        },
        "saveToSentItems": "true",
    }
    resp = requests.post(
        f"{GRAPH_ROOT}/me/sendMail",
        headers={"Authorization": f"Bearer {access_token}"},
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()


def persist_rotated_token(new_refresh_token: str | None) -> None:
    if not new_refresh_token or new_refresh_token == OUTLOOK_REFRESH_TOKEN:
        return
    # Mask it in the Actions log, then expose it as a step output so the
    # workflow can save it back to the OUTLOOK_REFRESH_TOKEN secret.
    print(f"::add-mask::{new_refresh_token}")
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            f.write(f"new_refresh_token={new_refresh_token}\n")


def main() -> None:
    access_token, new_refresh_token = get_access_token()
    persist_rotated_token(new_refresh_token)

    recipient = os.environ.get("DIGEST_RECIPIENT") or get_my_email(access_token)

    emails = fetch_marketing_emails(access_token)
    if not emails:
        print("No matching emails found this period.")
        return

    print(f"Found {len(emails)} matching emails. Summarizing...")
    digest = summarize(emails)

    path = save_report(digest)
    print(f"Saved report to {path}")

    send_email(access_token, digest, recipient)
    print(f"Emailed digest to {recipient}")


if __name__ == "__main__":
    main()
