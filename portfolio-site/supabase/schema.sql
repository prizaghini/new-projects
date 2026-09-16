-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses "create table if not exists".

create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,           -- e.g. 'ai', 'beauty', 'home-deco', 'tech', 'finance', 'food', 'drinks', 'fitness', 'fashion', 'travel'
  brand text not null,
  title text not null,
  youtube_id text,                  -- YouTube video id, thumbnail is derived from it
  featured_ad boolean not null default false, -- shows in the "YouTube Ads" spotlight section
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  headline_stat text not null,      -- e.g. '+100M views'
  description text not null,        -- e.g. 'on TikTok alone'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  brand_handle text not null,       -- e.g. '@brandname'
  title text not null,              -- e.g. 'Record-breaking Meta video'
  quote text not null,
  result_stat text,                 -- e.g. '50M views on 1 video'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists checklist_notes (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  budget text,
  message text,
  status text not null default 'new', -- new | contacted | won | lost
  created_at timestamptz not null default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'film', -- film | edit | post
  event_date date not null,
  status text not null default 'planned',  -- planned | done
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  status text not null default 'active', -- active | pending | done
  deadline date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value text not null default ''
);

insert into site_settings (key, value) values
  ('display_name', '[Your Name]'),
  ('tagline', 'UGC Creator & Content Strategist'),
  ('availability', 'Available 2026'),
  ('hero_headline', 'Creating content\nthat converts'),
  ('hero_subcopy', 'From hook to CTA, every second designed to perform.'),
  ('hero_stats_line', '+500 videos · +200 brand partners · 100M+ views'),
  ('hero_photo_url', ''),
  ('stat_videos', '500'),
  ('stat_partners', '200'),
  ('stat_views', '100'),
  ('stat_views_suffix', 'M+'),
  ('stat_years', '3'),
  ('about_bio', 'Replace with your real bio — 2-4 sentences on your background, niche, and what makes your content work.'),
  ('about_location', '[Your City] · [Your Country]'),
  ('about_photo_url', ''),
  ('contact_email', 'you@example.com'),
  ('instagram_handle', '@yourhandle')
on conflict (key) do nothing;

-- Row Level Security: public site can read published content and submit leads,
-- only the logged-in admin (you) can write/manage anything.
alter table portfolio_items enable row level security;
alter table case_studies enable row level security;
alter table testimonials enable row level security;
alter table leads enable row level security;
alter table calendar_events enable row level security;
alter table campaigns enable row level security;
alter table checklist_notes enable row level security;
alter table site_settings enable row level security;

create policy "public can read portfolio_items" on portfolio_items for select using (true);
create policy "public can read case_studies" on case_studies for select using (true);
create policy "public can read testimonials" on testimonials for select using (true);
create policy "public can read site_settings" on site_settings for select using (true);
create policy "public can submit leads" on leads for insert with check (true);

create policy "admin manages portfolio_items" on portfolio_items for all using (auth.role() = 'authenticated');
create policy "admin manages case_studies" on case_studies for all using (auth.role() = 'authenticated');
create policy "admin manages testimonials" on testimonials for all using (auth.role() = 'authenticated');
create policy "admin manages leads" on leads for all using (auth.role() = 'authenticated');
create policy "admin manages calendar_events" on calendar_events for all using (auth.role() = 'authenticated');
create policy "admin manages campaigns" on campaigns for all using (auth.role() = 'authenticated');
create policy "admin manages checklist_notes" on checklist_notes for all using (auth.role() = 'authenticated');
create policy "admin manages site_settings" on site_settings for all using (auth.role() = 'authenticated');
