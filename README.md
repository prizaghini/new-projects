# Marketing Email Digest

Reads a Gmail inbox for recent emails related to digital marketing /
social media / PPC / SEO (newsletters, platform updates, industry news),
and uses Google's Gemini (free tier) to turn them into:

1. A summary of what was being talked about
2. A list of concrete social media content ideas based on it, each with
   a visual mockup (carousel slides, a poll card, a thread preview, or
   an infographic layout — everything except video, which can't be
   mocked up as a static image)

The digest is emailed to you and saved under `reports/`. A GitHub Actions
workflow runs this automatically every **weekday (Mon-Fri) at 05:45
UTC**, so once it's set up you don't need to trigger it yourself. Each
run looks back exactly as far as the previous one — 1 day Tuesday
through Friday, and 3 days on Monday to also cover the weekend — so
consecutive digests tile the week with no gaps and no overlap.

If your actual mailbox is Outlook rather than Gmail: set up an Outlook
inbox rule that forwards matching mail to a Gmail address (step 0 below),
and this script reads/summarizes from that Gmail inbox instead. Your
original Outlook mail is untouched — forwarding just leaves a copy there.

## One-time setup

### 0. (Outlook users) Forward marketing mail to Gmail

1. Sign in to https://outlook.com with your Outlook account.
2. Go to **Settings (gear icon) → Mail → Rules → Add new rule**.
3. **Condition**: "Subject or body includes" → paste in the same keywords
   as `config/keywords.json` (or a representative subset — digital
   marketing, social media, PPC, SEO, advertising, newsletter, etc.).
4. **Action**: "Forward to" → your Gmail address.
5. Save. This leaves the original email in Outlook and just sends a copy
   to Gmail — nothing is moved or deleted.

### 1. Create a Gmail App Password

The script signs in to Gmail over IMAP/SMTP using an **App Password**, not
your real password, so it never sees your normal login credentials.

1. Turn on 2-Step Verification: https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords
   (choose "Mail" as the app) and copy the 16-character password.
3. Make sure IMAP is enabled: Gmail → Settings → "Forwarding and
   POP/IMAP" → Enable IMAP.

### 2. Get a free Gemini API key

Go to https://aistudio.google.com/apikey and click "Create API key." This
is free for the volume this project uses (a couple of digests a week) —
no credit card required. Sign in with the same Google account as your
Gmail if you like, it doesn't have to match.

### 3. Add repo secrets

In this repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | the app password from step 1 |
| `GEMINI_API_KEY` | the key from step 2 |
| `DIGEST_RECIPIENT` *(optional)* | where to send the digest, defaults to `GMAIL_ADDRESS` |

### 4. Try it

Go to the **Actions** tab → "Marketing email digest" → **Run workflow** to
trigger it manually the first time instead of waiting for the next
scheduled run. Check your inbox and the `reports/` folder afterward.

## Customizing

- **Keywords/topics**: edit `config/keywords.json`. These are combined
  into a Gmail search query (`OR`'d together), so add/remove terms freely.
- **Schedule**: edit the `cron` line in
  `.github/workflows/weekly-digest.yml` (currently weekdays at 05:45
  UTC — chosen to land by 7am UK time year-round, since GitHub Actions
  cron doesn't auto-adjust for daylight saving). If you change the
  cadence, also update the "Compute lookback window" step in that same
  file so runs don't overlap or leave gaps.
- **How many emails it reads per run**: `MAX_EMAILS` env var (see
  `.env.example`). `LOOKBACK_DAYS` is now computed automatically by the
  workflow rather than set as a fixed value.

## Running locally

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in real values
export $(grep -v '^#' .env | xargs)
python scripts/weekly_marketing_digest.py
```

## How it works

- `scripts/weekly_marketing_digest.py` connects to Gmail via IMAP, uses
  Gmail's own search syntax (`X-GM-RAW`) to find matching emails from the
  last N days across all labels, and pulls subject/sender/date/snippet
  from each.
- Those emails are sent to Gemini with a prompt asking for a themed
  summary plus social content ideas, returned as structured JSON.
- For each content idea (except video), a small HTML mockup matching its
  format is rendered and screenshotted with a headless Chromium
  (Playwright) — a slide grid for Carousel, a card for Poll, stacked
  bubbles for Thread, a numbered layout for Infographic/other formats.
- The result is saved to `reports/YYYY-MM-DD-digest.md` (text only) and
  emailed to you via SMTP as a styled HTML email with the mockups
  embedded inline, plus a plain-text fallback.

## Privacy note

Email content is sent to the Google Gemini API to generate the summary.
Only emails matching the marketing-related keywords are included — not
your full inbox. Credentials live only in GitHub Actions secrets / your
local `.env`, never in code.
