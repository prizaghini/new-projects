# Weekly Marketing Digest

Reads your Gmail for the past week, finds emails related to digital
marketing / social media / PPC / SEO (newsletters, platform updates,
industry news), and uses Claude to turn them into:

1. A summary of what was being talked about that week
2. A list of concrete social media content ideas based on it

The digest is emailed to you and saved under `reports/`. A GitHub Actions
workflow runs this automatically every Monday, so once it's set up you
don't need to trigger it yourself.

## One-time setup

### 1. Create a Gmail App Password

The script signs in to Gmail over IMAP/SMTP using an **App Password**, not
your real password, so it never sees your normal login credentials.

1. Turn on 2-Step Verification: https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords
   (choose "Mail" as the app) and copy the 16-character password.
3. Make sure IMAP is enabled: Gmail → Settings → "Forwarding and
   POP/IMAP" → Enable IMAP.

### 2. Get a Claude API key

Create one at https://console.anthropic.com/settings/keys.

### 3. Add repo secrets

In this repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | the app password from step 1 |
| `ANTHROPIC_API_KEY` | the key from step 2 |
| `DIGEST_RECIPIENT` *(optional)* | where to send the digest, defaults to `GMAIL_ADDRESS` |

### 4. Try it

Go to the **Actions** tab → "Weekly marketing digest" → **Run workflow** to
trigger it manually the first time instead of waiting for Monday. Check
your inbox and the `reports/` folder afterward.

## Customizing

- **Keywords/topics**: edit `config/keywords.json`. These are combined
  into a Gmail search query (`OR`'d together), so add/remove terms freely.
- **Schedule**: edit the `cron` line in
  `.github/workflows/weekly-digest.yml` (currently Mondays 13:00 UTC).
- **How far back it looks / how many emails it reads**: `LOOKBACK_DAYS`
  and `MAX_EMAILS` env vars (see `.env.example`).

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
- Those emails are sent to Claude with a prompt asking for a themed
  summary plus social content ideas.
- The result is saved to `reports/YYYY-MM-DD-digest.md` and emailed to you
  via SMTP.

## Privacy note

Email content is sent to the Anthropic API to generate the summary. Only
emails matching the marketing-related keywords are included — not your
full inbox. Credentials live only in GitHub Actions secrets / your local
`.env`, never in code.
