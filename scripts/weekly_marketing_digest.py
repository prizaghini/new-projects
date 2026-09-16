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
from email.mime.image import MIMEImage
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
# Newsletters that round up several short stories into one email can run
# long; 600 chars was cutting most of them off after the first item.
SNIPPET_CHARS = 8000

DIGEST_PROMPT = """You are a digital marketing analyst helping a marketing \
professional stay on top of their inbox. Below are emails from the last \
{days} days related to digital marketing, social media, PPC, SEO, and \
advertising - newsletters, industry updates, platform announcements, etc.

Some of these emails are themselves roundup newsletters bundling several \
distinct short stories into one email (e.g. "PPC News Feed" or "Summary \
of the Internet" style digests). Read the full body of each email \
carefully and treat EACH distinct story/headline as its own separate \
theme - do not collapse a multi-story newsletter into one vague summary. \
A single email can and should produce multiple themes if it covers \
multiple stories.

Analyze them and return two things:

1. "themes" - one entry per distinct, independently-reported news item \
or trend (a platform change, industry shift, notable campaign, tool, or \
data point that actually happened). Exclude anything that is really an \
ad or vendor pitch for a product/service, even when it isn't explicitly \
labeled "sponsored" or "partner spotlight" - watch for the telltale \
signs: a company or product name paired with a claim about its OWN \
capabilities, a call to action ("try it free", "get X% off", "sign up", \
a discount code), or a headline whose real purpose is to get you to \
click through to buy/try something rather than to inform you that \
something happened in the industry. A bold hook statement right at the \
top of a newsletter is very often this kind of ad banner - read past it \
for the actual news. Also skip receipts and unrelated promos. For each \
genuine theme give a short title and a 1-2 sentence summary in your own \
words (don't just copy the newsletter's headline verbatim). Each email \
below may include a "Links found in this email" list of (link text -> \
URL) pairs - when one of those link texts corresponds to this story, \
set source_label to the specific company/publication/person the story \
is actually about or from (not just the newsletter's own name), and \
source_url to that exact URL. Only ever use a URL that's actually \
listed for that email; never invent or guess one, and omit \
source_label/source_url entirely if nothing in the list matches.

2. "content_ideas" - 6-8 concrete social media post ideas built ONLY \
from the "themes" you just produced above - do not go back to the raw \
EMAILS text for extra facts or stats, even ones from a passage you \
correctly excluded from themes as an ad/vendor pitch. If a claim only \
appeared in promotional copy you excluded, it must not surface in a \
content idea either. For each idea, give:
   - "headline": a short punchy headline/hook
   - "format": the format (e.g. Carousel, Short video, Poll, Thread, \
Infographic, Newsletter)
   - "angle": one sentence on why this is timely/worth posting now
   - "key_points": 4-6 specific, concrete points the professional can \
actually use to make the post, written for the chosen format:
       * Carousel/Infographic -> one point per slide, in order
       * Short video/Reels/TikTok -> a script outline as ordered beats \
(hook, then each supporting point, then a closing CTA)
       * Poll -> the exact poll question as the first point, then each \
answer option as its own point
       * Thread (X/LinkedIn) -> one point per individual post in the \
thread, in posting order
       * Other formats -> the key points to cover, in a sensible order
     Every point must reference a specific fact, number, or detail from \
one of the themes above (not generic marketing advice) - this needs to \
be detailed enough that the professional could draft the actual post \
straight from these points without re-reading the source emails.

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
                    "key_points": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["headline", "format", "angle", "key_points"],
            },
        },
    },
    "required": ["themes", "content_ideas"],
}


def load_keywords() -> list[str]:
    return json.loads(KEYWORDS_PATH.read_text())["keywords"]


def build_gmail_query(keywords: list[str]) -> str:
    terms = " OR ".join(f'"{k}"' if " " in k else k for k in keywords)
    # -in:sent excludes the digest's own previously-sent emails, which are
    # full of marketing keywords and would otherwise get re-ingested as
    # if they were fresh source material on every run.
    return f"newer_than:{LOOKBACK_DAYS}d -in:sent ({terms})"


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


LINK_RE = re.compile(
    r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL
)
SKIP_LINK_PATTERNS = ("unsubscribe", "mailto:", "list-manage", "optout", "preferences")


def extract_links(raw_html: str, limit: int = 15) -> list[tuple[str, str]]:
    """Pull (visible link text, url) pairs, so each story in a multi-story
    newsletter can be matched to its own correct link rather than just
    grabbing the first few URLs found anywhere in the email."""
    links = []
    seen = set()
    for url, inner_html in LINK_RE.findall(raw_html):
        if not url.startswith(("http://", "https://")):
            continue
        if any(p in url.lower() for p in SKIP_LINK_PATTERNS):
            continue
        text = strip_html(inner_html)
        if len(text) < 3 or url in seen:
            continue
        seen.add(url)
        links.append((text, url))
        if len(links) >= limit:
            break
    return links


def extract_body_and_links(
    msg: "email.message.Message",
) -> tuple[str, list[tuple[str, str]]]:
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
        # Prefer the HTML part's stripped text over the raw plain-text
        # part: some senders (e.g. LinkedIn) pad their plain-text
        # alternative with long inline tracking URLs after every link,
        # which can eat most of SNIPPET_CHARS before real content even
        # starts. strip_html() already removes URLs (extract_links()
        # captures them separately), so it stays dense with substance.
        body = strip_html(htm) if htm else plain.strip()
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
            block += "Links found in this email (link text -> URL):\n"
            block += "\n".join(f'- "{text}" -> {url}' for text, url in e["links"])
            block += "\n"
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
        for point in idea.get("key_points", []):
            lines.append(f"   - {point}")
    return "\n".join(lines)


def esc(value) -> str:
    return html.escape(str(value or ""))


def render_html(
    data: dict, digest_date: str, mockups: list[bytes | None] | None = None
) -> str:
    mockups = mockups or []
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
              <p style="margin:0 0 10px 0;font-size:14px;line-height:1.5;color:#374151;">{esc(idea.get('angle'))}</p>
              <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#4B5563;">
                {"".join(f'<li style="margin:0 0 4px 0;">{esc(p)}</li>' for p in idea.get("key_points", []))}
              </ul>
              {
                f'<img src="cid:mockup-{i - 1}" alt="content mockup" '
                f'style="width:100%;max-width:520px;border-radius:8px;margin-top:14px;display:block;">'
                if i - 1 < len(mockups) and mockups[i - 1] else ""
              }
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


def _mockup_page(inner_html: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }}
</style></head>
<body>{inner_html}</body></html>"""


SLIDE_PREFIX_RE = re.compile(r"^\s*slide\s*\d+\s*[:\-]\s*", re.IGNORECASE)


def render_carousel_mockup(idea: dict) -> str:
    points = (idea.get("key_points") or [idea.get("headline", "")])[:6]
    slides = "".join(
        f'''<div style="width:150px;height:150px;background:#4F46E5;
             background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:12px;color:#fff;
             padding:14px;display:flex;flex-direction:column;justify-content:space-between;">
          <span style="font-size:10px;font-weight:700;opacity:0.85;letter-spacing:0.5px;">SLIDE {i}</span>
          <span style="font-size:12px;font-weight:600;line-height:1.35;">{esc(SLIDE_PREFIX_RE.sub("", p))[:110]}</span>
        </div>'''
        for i, p in enumerate(points, 1)
    )
    return _mockup_page(
        f'<div style="display:flex;flex-wrap:wrap;gap:10px;padding:16px;background:#F3F4F6;width:520px;">{slides}</div>'
    )


def render_poll_mockup(idea: dict) -> str:
    points = idea.get("key_points") or []
    question = points[0] if points else idea.get("headline", "")
    options = points[1:5] or ["Option A", "Option B"]
    options_html = "".join(
        f'''<div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;
             padding:12px 16px;margin-bottom:8px;font-size:14px;font-weight:600;color:#3730A3;">{esc(o)}</div>'''
        for o in options
    )
    return _mockup_page(f'''
      <div style="width:480px;padding:24px;background:#FFFFFF;">
        <div style="font-size:17px;font-weight:800;color:#111827;margin-bottom:16px;line-height:1.35;">{esc(question)}</div>
        {options_html}
      </div>
    ''')


def render_thread_mockup(idea: dict) -> str:
    points = (idea.get("key_points") or [idea.get("headline", "")])[:6]
    posts = "".join(
        f'''<div style="display:flex;gap:10px;margin-bottom:14px;">
          <div style="flex:0 0 32px;width:32px;height:32px;border-radius:50%;background:#4F46E5;
               background:linear-gradient(135deg,#4F46E5,#7C3AED);"></div>
          <div style="flex:1;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;
               padding:12px 14px;font-size:13px;line-height:1.5;color:#1F2937;">{esc(p)}</div>
        </div>'''
        for p in points
    )
    return _mockup_page(f'<div style="width:480px;padding:20px;background:#FFFFFF;">{posts}</div>')


def render_infographic_mockup(idea: dict) -> str:
    points = (idea.get("key_points") or [idea.get("headline", "")])[:6]
    rows = "".join(
        f'''<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
          <div style="flex:0 0 28px;width:28px;height:28px;border-radius:8px;background:#4F46E5;color:#fff;
               display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;">{i}</div>
          <div style="flex:1;font-size:13px;line-height:1.5;color:#1F2937;padding-top:3px;">{esc(p)}</div>
        </div>'''
        for i, p in enumerate(points, 1)
    )
    return _mockup_page(f'''
      <div style="width:480px;padding:24px;background:#EEF2FF;">
        <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:16px;">{esc(idea.get("headline", ""))}</div>
        {rows}
      </div>
    ''')


def render_mockup_html(idea: dict) -> str | None:
    fmt = (idea.get("format") or "").lower()
    if any(v in fmt for v in ("video", "reel", "tiktok", "short")):
        return None
    if "carousel" in fmt:
        return render_carousel_mockup(idea)
    if "poll" in fmt:
        return render_poll_mockup(idea)
    if "thread" in fmt:
        return render_thread_mockup(idea)
    # Infographic and any other/unrecognized static format fall back to
    # the same numbered-outline layout.
    return render_infographic_mockup(idea)


def generate_mockups(content_ideas: list[dict]) -> list[bytes | None]:
    htmls = [render_mockup_html(idea) for idea in content_ideas]
    if not any(htmls):
        return [None] * len(htmls)

    # Mockups are a nice-to-have on top of an otherwise-working digest;
    # never let a browser-automation failure break the actual send.
    try:
        from playwright.sync_api import sync_playwright

        results: list[bytes | None] = [None] * len(htmls)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for i, page_html in enumerate(htmls):
                if page_html is None:
                    continue
                page = browser.new_page(viewport={"width": 560, "height": 100})
                page.set_content(page_html)
                results[i] = page.screenshot(full_page=True)
                page.close()
            browser.close()
        return results
    except Exception as e:
        print(f"Skipping content mockups (screenshot failed): {e}")
        return [None] * len(htmls)


def save_report(markdown: str) -> Path:
    REPORTS_DIR.mkdir(exist_ok=True)
    path = REPORTS_DIR / f"{datetime.now(timezone.utc):%Y-%m-%d}-digest.md"
    path.write_text(markdown)
    return path


def send_email(data: dict, digest_date: str) -> None:
    mockups = generate_mockups(data.get("content_ideas", []))

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your marketing digest - {datetime.now(timezone.utc):%b %d, %Y}"
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = DIGEST_RECIPIENT

    # Ordered least- to most-preferred: clients that can't render HTML
    # fall back to the plain-text part.
    msg.attach(MIMEText(render_markdown(data), "plain", "utf-8"))

    # The HTML part and its inline mockup images travel together in a
    # multipart/related, itself the "html" alternative above.
    related = MIMEMultipart("related")
    related.attach(MIMEText(render_html(data, digest_date, mockups), "html", "utf-8"))
    for i, png in enumerate(mockups):
        if png is None:
            continue
        image = MIMEImage(png, "png")
        image.add_header("Content-ID", f"<mockup-{i}>")
        image.add_header("Content-Disposition", "inline", filename=f"mockup-{i}.png")
        related.attach(image)
    msg.attach(related)

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
