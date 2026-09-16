# Portfolio + Admin Dashboard

A UGC-creator-style portfolio site (public) plus a password-protected admin
dashboard (private) to manage your portfolio, content calendar, campaigns
and leads — no build tools, plain HTML/CSS/JS, backed by Supabase.

Everything is currently filled with **placeholder content** (marked with
`[brackets]`) so you can see the full structure. Swap it for your real
name, bio, stats, photos and portfolio pieces whenever you're ready.

## What's here

```
portfolio-site/
├── index.html            public site
├── css/style.css
├── js/main.js             loads portfolio/testimonials/case studies from Supabase, handles the contact form
├── js/config.js           your Supabase URL + anon key go here
├── js/supabase-client.js
├── admin/
│   ├── index.html         admin login
│   ├── dashboard.html     admin dashboard (Portfolio, Checklist, Calendar, Campaigns, Leads, Email tabs)
│   ├── css/admin.css
│   └── js/admin.js
└── supabase/schema.sql    run this once in your Supabase project
```

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free account and a new
project.

### 2. Run the schema

In your Supabase project: **SQL Editor → New query**, paste the contents of
`supabase/schema.sql`, and run it. This creates all the tables (portfolio
items, case studies, testimonials, leads, calendar events, campaigns,
checklist notes) with Row Level Security so the public site can read
published content and submit the contact form, while only you (logged in)
can add/edit/delete anything. It also creates a public `site-media` Storage
bucket, used when you upload portfolio videos or a hero video instead of
linking out.

### 3. Create your admin login

**Authentication → Users → Add user** in the Supabase dashboard. Create one
user with your email and a password — this is what you'll use to log into
`/admin/`. (There's no public sign-up form by design — this is a
single-admin dashboard, just for you.)

### 4. Add your Supabase credentials

**Project Settings → API** in Supabase, copy the **Project URL** and the
**anon public key**. Paste them into `js/config.js`:

```js
window.SUPABASE_URL = "https://xxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

The anon key is safe to commit/expose — it's meant for the browser, and
access is controlled by the Row Level Security policies from step 2, not by
keeping this key secret.

### 5. Try it locally

Any static file server works, e.g.:

```bash
cd portfolio-site
python3 -m http.server 8080
```

Visit `http://localhost:8080` for the public site and
`http://localhost:8080/admin/` for the dashboard.

## Deploying (Cloudflare Pages, free)

1. Push this repo to GitHub (already done if you're reading this here).
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a
   project** → connect this GitHub repo.
3. Build settings: **no build command**, output directory `portfolio-site`
   (or set the "root directory" to `portfolio-site` if Cloudflare asks).
4. Deploy. You'll get a free `*.pages.dev` URL immediately.
5. To use your own domain: **Custom domains** tab in the Cloudflare Pages
   project → add your domain (buy one first from any registrar if you don't
   have one) → follow the DNS instructions Cloudflare gives you.

## Customizing content

- **Site copy/photos**: edit `index.html` directly — every placeholder is
  marked with `[brackets]`.
- **Your name, tagline, hero headline/subcopy, stat numbers, photos, bio,
  location, contact email, Instagram handle**: log into `/admin/` →
  **Site Settings** tab, edit, and save. This is the WordPress-style
  "edit the whole page without touching code" tab.
- **Portfolio items, case studies, testimonials, calendar, campaigns,
  checklist notes**: also in `/admin/`, their own tabs. The public site
  pulls all of this live from Supabase.
- **Colors**: `/admin/` → **Site Settings** → background, panel, text and
  accent color pickers. Applies live across the whole site (buttons, links,
  icons, active states all derive from the accent color) — no code needed.
  Fonts still require editing the `--display`/`--body`/`--mono` variables
  at the top of `css/style.css`.
- **Hero video**: `/admin/` → **Site Settings** → upload a video file and
  it autoplays (muted, looped) in place of the hero photo.
- **Portfolio item videos**: `/admin/` → **Portfolio** → either paste a
  link (YouTube/TikTok/Instagram/anything) or upload the video file
  itself. Uploading gives you a "start at N seconds" field and opens in an
  on-page player; TikTok/Instagram links can't support a start time since
  neither platform allows deep-linking to a timestamp — only a self-hosted
  upload can do that.
- **Categories**: edit the `CATEGORIES` array in `js/main.js` (and the
  `<select>` options in `admin/dashboard.html`) if you want different
  niches than AI/Beauty/Home & Decor/Tech/Finance/Food/Drinks/Fitness/
  Fashion/Travel.

## Adding real email sending (Email tab)

The Email tab in the admin dashboard is a placeholder — browsers can't send
email directly, and an API key for a mail provider must never live in
client-side code. To make it real:

1. Sign up for [Resend](https://resend.com) (or SendGrid/Postmark) and get
   an API key.
2. Create a Supabase Edge Function that accepts `{ to, subject, body }`,
   calls the provider's API with the key stored as a Supabase secret
   (`supabase secrets set RESEND_API_KEY=...`), and returns success/failure.
3. In `admin/js/admin.js`, replace the disabled Email form with a call to
   `supabase.functions.invoke("send-email", { body: {...} })`.

This is a deliberate follow-up step rather than something faked to look
functional — ask if you want help wiring it up once you have a provider
account.
