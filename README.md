# Marketing Email Digest

Reads your Outlook mailbox for recent emails related to digital marketing
/ social media / PPC / SEO (newsletters, platform updates, industry
news), and uses Google's Gemini (free tier) to turn them into:

1. A summary of what was being talked about
2. A list of concrete social media content ideas based on it

The digest is emailed to you and saved under `reports/`. A GitHub Actions
workflow runs this automatically every **Monday and Thursday**, so once
it's set up you don't need to trigger it yourself. Each run only looks
back 4 days, so the two digests don't overlap and together cover the
full week.

Outlook requires a few more setup steps than Gmail would (Microsoft
retired simple password-based mail access), but they're all one-time and
happen once — after that it runs on its own indefinitely.

## One-time setup

### 1. Register a free Azure app (lets the script read/send mail as you)

1. Go to https://portal.azure.com, sign in with your Outlook account, and
   open **Microsoft Entra ID → App registrations → New registration**.
2. Name it anything (e.g. "Marketing Digest"). Under "Supported account
   types" choose **"Personal Microsoft accounts only."** Leave Redirect
   URI blank. Click **Register**.
3. Copy the **Application (client) ID** shown on the overview page — this
   is `OUTLOOK_CLIENT_ID`.
4. Go to **Authentication** (left sidebar) → under "Advanced settings"
   turn **"Allow public client flows"** to **Yes** → Save.
5. Go to **API permissions** → **Add a permission → Microsoft Graph →
   Delegated permissions** → add `Mail.Read`, `Mail.Send`, and
   `offline_access`. No admin approval is needed for a personal account —
   you approve it yourself on first login in step 3 below.

This is free; Azure won't ask for billing info for this.

### 2. Get a free Gemini API key

Go to https://aistudio.google.com/apikey and click "Create API key." This
is free for the volume this project uses (a couple of digests a week) —
no credit card required.

### 3. Get an Outlook refresh token (one-time login)

Run `scripts/outlook_first_login.py` once with `OUTLOOK_CLIENT_ID` set —
either locally, or ask Claude to run it in a session. It prints a short
code and a URL; open the URL on any device, enter the code, and sign in
with your Outlook account to approve access. It then prints a refresh
token — save it, you'll paste it into a secret in the next step.

```bash
pip install msal
OUTLOOK_CLIENT_ID=your-client-id python scripts/outlook_first_login.py
```

You only do this once. After that, the scheduled workflow refreshes the
token itself and keeps the secret below updated automatically.

### 4. Create a GitHub personal access token for secret rotation

Microsoft rotates your Outlook refresh token every time it's used, so
each scheduled run needs to save the new one back to this repo's secret
— otherwise the *next* run would fail to log in. To let the workflow do
that:

1. Go to https://github.com/settings/personal-access-tokens/new
2. Set **Resource owner** to your account, **Repository access** to
   "Only select repositories" → this repo.
3. Under **Permissions → Repository permissions**, set **Secrets** to
   **Read and write**.
4. Generate it and copy the token — this is `GH_SECRETS_PAT`.

### 5. Add repo secrets

In this repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `OUTLOOK_CLIENT_ID` | the Application (client) ID from step 1 |
| `OUTLOOK_REFRESH_TOKEN` | the refresh token from step 3 |
| `GEMINI_API_KEY` | the key from step 2 |
| `GH_SECRETS_PAT` | the token from step 4 |
| `DIGEST_RECIPIENT` *(optional)* | where to send the digest, defaults to your Outlook address |

### 6. Try it

Go to the **Actions** tab → "Marketing email digest" → **Run workflow** to
trigger it manually the first time instead of waiting for the next
scheduled run. Check your inbox and the `reports/` folder afterward.

## Customizing

- **Keywords/topics**: edit `config/keywords.json`. Matching is done
  against each email's subject and body text (case-insensitive), so
  add/remove terms freely.
- **Schedule**: edit the `cron` line in
  `.github/workflows/weekly-digest.yml` (currently Mondays and Thursdays
  at 13:00 UTC). If you change the cadence, also adjust the `LOOKBACK_DAYS`
  env var in that same workflow file so runs don't overlap or leave gaps.
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

- `scripts/weekly_marketing_digest.py` signs in to Microsoft Graph using
  a refresh token (OAuth, no stored password), pulls messages from the
  last N days across your whole mailbox, and locally filters them by
  subject/body keyword match.
- Those emails are sent to Gemini with a prompt asking for a themed
  summary plus social content ideas.
- The result is saved to `reports/YYYY-MM-DD-digest.md` and emailed to
  you via Graph's sendMail.
- Because Microsoft rotates the refresh token on each use, the workflow
  saves the new one back to the `OUTLOOK_REFRESH_TOKEN` secret after
  every run (see `.github/workflows/weekly-digest.yml`). If that step
  ever breaks, re-run `scripts/outlook_first_login.py` to get a fresh
  token.

## Privacy note

Email content is sent to the Google Gemini API to generate the summary.
Only emails matching the marketing-related keywords are included — not
your full inbox. Credentials live only in GitHub Actions secrets / your
local `.env`, never in code.
