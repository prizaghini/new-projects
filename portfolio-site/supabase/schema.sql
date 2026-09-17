-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses "create table if not exists".

create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,           -- e.g. 'ai', 'beauty', 'home-deco', 'tech', 'finance', 'food', 'drinks', 'fitness', 'fashion', 'travel'
  brand text not null,
  title text not null,
  platform text not null default 'other', -- 'youtube' | 'tiktok' | 'instagram' | 'other'
  link_url text,                    -- full video/post URL on that platform (used when not self-hosting the file)
  thumbnail_url text,               -- manual thumbnail image; optional for YouTube (auto-derived from link_url if omitted), required for TikTok/Instagram
  video_file_path text,             -- path in the 'site-media' storage bucket, when you upload the video instead of linking out
  start_seconds numeric not null default 0, -- playback start time, only applies to uploaded video_file_path
  featured_ad boolean not null default false, -- shows in the "YouTube Ads" spotlight section
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Safe to re-run against a table created by an older version of this file:
alter table portfolio_items add column if not exists video_file_path text;
alter table portfolio_items add column if not exists start_seconds numeric not null default 0;

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

create table if not exists brand_logos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  brand_name text,             -- used as the image alt text
  link_url text,                -- optional, opens the brand's site when clicked
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
  ('instagram_handle', '@yourhandle'),
  ('bg_color', '#F7F5F0'),
  ('bg_alt_color', '#EFEBE2'),
  ('alt_text_color', ''),
  ('ink_color', '#16160F'),
  ('accent_color', '#2F6F5E'),
  ('hero_video_url', ''),
  ('logo_url', ''),
  ('marquee_text', 'Conversion UGC|High-Performance Creatives|Strategic Scripts|Lifestyle Photos|E-commerce Content|UGC Consulting|Sponsored Posts'),
  ('marquee_bg_color', ''),
  ('marquee_text_color', ''),
  ('texture_enabled', 'false'),
  ('texture_intensity', '45'),
  ('show_marquee', 'true'),
  ('show_stats', 'true'),
  ('show_about', 'true'),
  ('show_logos', 'true'),
  ('show_case_studies', 'true'),
  ('show_portfolio', 'true'),
  ('show_services', 'true'),
  ('show_testimonials', 'true'),
  ('show_contact', 'true'),
  ('hero_badge_1_enabled', 'false'),
  ('hero_badge_1_title', ''),
  ('hero_badge_1_subtitle', ''),
  ('hero_badge_1_position', 'top-right'),
  ('hero_badge_2_enabled', 'false'),
  ('hero_badge_2_title', ''),
  ('hero_badge_2_subtitle', ''),
  ('hero_badge_2_position', 'bottom-left'),
  ('hero_badge_3_enabled', 'false'),
  ('hero_badge_3_title', ''),
  ('hero_badge_3_subtitle', ''),
  ('hero_badge_3_position', 'middle-right'),
  ('hero_bg_color', ''),
  ('hero_bg_position', 'center'),
  ('hero_bg_url', ''),
  ('hero_logo_url', ''),
  ('hero_logo_position', 'top-left'),
  ('hero_logo_size', '48'),
  ('hero_bg_video_url', ''),
  ('hero_overlay_opacity', '62'),
  ('button_bg_color', ''),
  ('button_text_color', ''),
  ('button_radius', '6'),
  ('about_text_color', ''),
  ('categories', 'ai:AI|beauty:Beauty|home-deco:Home & Decor|tech:Tech & Apps|finance:Finance|food:Food|drinks:Drinks & Desserts|fitness:Health & Fitness|fashion:Fashion|travel:Travel'),
  ('hero_btn_primary_text', 'Let''s create together'),
  ('hero_btn_secondary_text', 'Learn more →'),
  ('hero_text_color', ''),
  ('hero_label_color', ''),
  ('hero_text_align', 'left'),
  ('hero_text_valign', 'center'),
  ('text_scale', '100'),
  ('hero_photo_position', 'center'),
  ('about_photo_position', 'center'),
  ('about_stat_1', '140M+ campaign views'),
  ('about_stat_2', 'Meta CTR record'),
  ('about_stat_3', 'CPA reduced up to 38%'),
  ('about_stat_4', 'ROAS 2.4x'),
  ('about_stats_color', ''),
  ('name_text_color', ''),
  ('hero_photo_fit', 'cover'),
  ('about_photo_fit', 'cover'),
  ('font_pairing', 'grotesk'),
  ('stat_videos_label', 'Videos recorded'),
  ('stat_partners_label', 'Brand partners'),
  ('stat_views_label', 'Cumulative views'),
  ('stat_years_label', 'Years experience'),
  ('about_heading', ''),
  ('linkedin_handle', ''),
  ('logos_heading', 'Brands I''ve worked with')
on conflict (key) do nothing;

-- Storage bucket for uploaded portfolio videos and the hero video.
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

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
alter table brand_logos enable row level security;

create policy "public can read portfolio_items" on portfolio_items for select using (true);
create policy "public can read case_studies" on case_studies for select using (true);
create policy "public can read testimonials" on testimonials for select using (true);
create policy "public can read site_settings" on site_settings for select using (true);
create policy "public can read brand_logos" on brand_logos for select using (true);
create policy "public can submit leads" on leads for insert with check (true);

create policy "admin manages portfolio_items" on portfolio_items for all using (auth.role() = 'authenticated');
create policy "admin manages case_studies" on case_studies for all using (auth.role() = 'authenticated');
create policy "admin manages testimonials" on testimonials for all using (auth.role() = 'authenticated');
create policy "admin manages leads" on leads for all using (auth.role() = 'authenticated');
create policy "admin manages brand_logos" on brand_logos for all using (auth.role() = 'authenticated');
create policy "admin manages calendar_events" on calendar_events for all using (auth.role() = 'authenticated');
create policy "admin manages campaigns" on campaigns for all using (auth.role() = 'authenticated');
create policy "admin manages checklist_notes" on checklist_notes for all using (auth.role() = 'authenticated');
create policy "admin manages site_settings" on site_settings for all using (auth.role() = 'authenticated');

create policy "public can read site-media" on storage.objects
  for select using (bucket_id = 'site-media');
create policy "admin manages site-media" on storage.objects
  for all using (bucket_id = 'site-media' and auth.role() = 'authenticated');
