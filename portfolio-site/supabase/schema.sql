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
  image_url text,                   -- optional screenshot/thumbnail for the card
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table case_studies add column if not exists image_url text;
alter table case_studies add column if not exists link_url text;

-- Editable content for individual case study webpages (the pages case_studies.link_url
-- points to, e.g. case-studies/1fit-website.html). The hero section on each page
-- reads its text from the row whose slug matches the page — edit it from the
-- admin dashboard's "Case Study Pages" tab instead of the HTML file.
create table if not exists case_study_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- matches the page's filename, e.g. '1fit-website'
  page_title text not null,         -- browser tab title
  meta_description text,
  label text,                       -- small tag above the headline, e.g. 'Case Study · Website & Product Marketing'
  headline text not null,
  intro text,                       -- lead paragraph under the headline
  client text,
  sector text,
  period text,
  role text,                        -- optional 4th hero meta item, e.g. 'Growth Marketing Executive'
  stats text,                       -- 'number:label' groups separated by | — e.g. '10:New landing pages|2:Platform pages updated'
  -- "The challenge" section
  challenge_label text,
  challenge_heading text,
  challenge_body text,              -- paragraphs separated by a blank line
  tags text,                        -- pipe-separated, e.g. 'Product Copywriting|Landing Pages'
  proof_caption text,
  proof_urls text,                  -- one per line, 'url|status' — e.g. 'https://.../payments/|Updated'
  -- First "featured page" section
  featured_label text,
  featured_heading text,
  featured_intro text,
  featured_pages text,              -- one per line, 'heading|description'
  -- Second "featured page" section
  wearables_label text,
  wearables_heading text,
  wearables_intro text,
  wearables_pages text,             -- one per line, 'heading|description'
  -- Moodboard section
  moodboard_label text,
  moodboard_heading text,
  moodboard_intro text,
  moodboard_items text,             -- one per line, 'title|description'
  moodboard_note text,
  -- Reflection section (shared by every case study's closing section)
  reflection_label text,
  reflection_heading text,
  reflection_body text,             -- paragraphs separated by a blank line
  -- "Brand identity" section
  brand_label text,
  brand_heading text,
  brand_intro text,
  brand_pages text,                 -- one caption per line, matched to the brand guide images by position
  -- "LinkedIn presence" section
  linkedin_label text,
  linkedin_heading text,
  linkedin_intro text,
  -- Video case studies section
  video_label text,
  video_heading text,
  video_intro text,
  video_captions text,              -- one per line, matched to the video thumbnail cards by position
  video_all_caption text,           -- e.g. 'All 7 videos produced'
  video_all_list text,              -- one per line, the full list of videos produced
  -- Email marketing + "Also delivered" two-column section
  email_label text,
  email_heading text,
  email_intro text,
  email_segments text,              -- one per line, 'segment title|description'
  email_webinar_topic text,
  email_webinar_detail text,
  delivered_label text,
  delivered_heading text,
  delivered_intro text,
  delivered_items text,             -- one per line, 'title|description'
  -- "Approach" section (a labelled intro + a timeline of heading|description steps)
  approach_label text,
  approach_heading text,
  approach_intro text,
  approach_items text,              -- one per line, 'heading|description'
  -- Content/case spotlight section (a labelled intro, a pull-quote, and body paragraphs)
  spotlight_label text,
  spotlight_heading text,
  spotlight_intro text,
  spotlight_quote text,
  spotlight_body text,              -- paragraphs separated by a blank line
  -- Results section intro (the numbers themselves stay as static, bespoke panels)
  results_label text,
  results_heading text,
  results_intro text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Safe to re-run against a table created by an older version of this file:
alter table case_study_pages add column if not exists challenge_label text;
alter table case_study_pages add column if not exists challenge_heading text;
alter table case_study_pages add column if not exists challenge_body text;
alter table case_study_pages add column if not exists tags text;
alter table case_study_pages add column if not exists proof_caption text;
alter table case_study_pages add column if not exists proof_urls text;
alter table case_study_pages add column if not exists featured_label text;
alter table case_study_pages add column if not exists featured_heading text;
alter table case_study_pages add column if not exists featured_intro text;
alter table case_study_pages add column if not exists featured_pages text;
alter table case_study_pages add column if not exists wearables_label text;
alter table case_study_pages add column if not exists wearables_heading text;
alter table case_study_pages add column if not exists wearables_intro text;
alter table case_study_pages add column if not exists wearables_pages text;
alter table case_study_pages add column if not exists moodboard_label text;
alter table case_study_pages add column if not exists moodboard_heading text;
alter table case_study_pages add column if not exists moodboard_intro text;
alter table case_study_pages add column if not exists moodboard_items text;
alter table case_study_pages add column if not exists moodboard_note text;
alter table case_study_pages add column if not exists reflection_label text;
alter table case_study_pages add column if not exists reflection_heading text;
alter table case_study_pages add column if not exists reflection_body text;
alter table case_study_pages add column if not exists brand_label text;
alter table case_study_pages add column if not exists brand_heading text;
alter table case_study_pages add column if not exists brand_intro text;
alter table case_study_pages add column if not exists brand_pages text;
alter table case_study_pages add column if not exists linkedin_label text;
alter table case_study_pages add column if not exists linkedin_heading text;
alter table case_study_pages add column if not exists linkedin_intro text;
alter table case_study_pages add column if not exists video_label text;
alter table case_study_pages add column if not exists video_heading text;
alter table case_study_pages add column if not exists video_intro text;
alter table case_study_pages add column if not exists video_captions text;
alter table case_study_pages add column if not exists video_all_caption text;
alter table case_study_pages add column if not exists video_all_list text;
alter table case_study_pages add column if not exists email_label text;
alter table case_study_pages add column if not exists email_heading text;
alter table case_study_pages add column if not exists email_intro text;
alter table case_study_pages add column if not exists email_segments text;
alter table case_study_pages add column if not exists email_webinar_topic text;
alter table case_study_pages add column if not exists email_webinar_detail text;
alter table case_study_pages add column if not exists delivered_label text;
alter table case_study_pages add column if not exists delivered_heading text;
alter table case_study_pages add column if not exists delivered_intro text;
alter table case_study_pages add column if not exists delivered_items text;
alter table case_study_pages add column if not exists role text;
alter table case_study_pages add column if not exists approach_label text;
alter table case_study_pages add column if not exists approach_heading text;
alter table case_study_pages add column if not exists approach_intro text;
alter table case_study_pages add column if not exists approach_items text;
alter table case_study_pages add column if not exists spotlight_label text;
alter table case_study_pages add column if not exists spotlight_heading text;
alter table case_study_pages add column if not exists spotlight_intro text;
alter table case_study_pages add column if not exists spotlight_quote text;
alter table case_study_pages add column if not exists spotlight_body text;
alter table case_study_pages add column if not exists results_label text;
alter table case_study_pages add column if not exists results_heading text;
alter table case_study_pages add column if not exists results_intro text;
alter table testimonials add column if not exists image_url text;
alter table testimonials add column if not exists photo_url text;
alter table testimonials add column if not exists photo_position text not null default 'top';
alter table testimonials add column if not exists quote_date text;
alter table testimonials add column if not exists sender_email text;

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  brand_handle text not null,       -- e.g. '@brandname'
  title text not null,              -- e.g. 'Record-breaking Meta video'
  quote text not null,
  result_stat text,                 -- e.g. '50M views on 1 video'
  image_url text,                   -- optional screenshot (e.g. a LinkedIn recommendation) shown instead of/above the quote
  photo_url text,                   -- optional headshot shown next to the byline on text-only (pull-quote) cards
  photo_position text not null default 'top', -- which part of the photo stays visible when cropped to a circle
  quote_date text,                  -- optional "Sent:" date line for text-only cards (e.g. an emailed recommendation's send date)
  sender_email text,                -- optional "From:" email address for text-only cards; the part before '@' is blurred on display
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

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- One-time seed matching the site's previous hardcoded cards, so upgrading
-- to the admin-editable version doesn't leave the section empty. Only
-- inserts if the table is still empty, so it's safe to re-run.
insert into services (title, description, sort_order)
select * from (values
  ('Paid Traffic Creatives', 'Meta / TikTok / YouTube ad-ready content.', 0),
  ('E-commerce UGC', 'Product videos built to convert on-site and in ads.', 1),
  ('Sponsored Post', 'Content published through my own profile.', 2),
  ('Scale Management', 'Multi-creator and campaign management.', 3)
) as seed(title, description, sort_order)
where not exists (select 1 from services);

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
  ('about_bg_color', ''),
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
  ('stat_videos_suffix', ''),
  ('stat_partners_label', 'Brand partners'),
  ('stat_partners_suffix', ''),
  ('stat_views_label', 'Cumulative views'),
  ('stat_years_label', 'Years experience'),
  ('stat_years_suffix', ''),
  ('about_heading', ''),
  ('about_label', ''),
  ('linkedin_handle', ''),
  ('logos_heading', 'Brands I''ve worked with'),
  ('logos_heading_color', ''),
  ('case_studies_label', ''),
  ('case_studies_heading', 'Content that performed'),
  ('case_studies_subheading', 'A few highlights — replace with your own real numbers.'),
  ('case_studies_text_color', ''),
  ('case_studies_bg_color', ''),
  ('services_label', ''),
  ('services_heading', 'What we can create together'),
  ('services_subheading', ''),
  ('services_text_color', ''),
  ('contact_label', ''),
  ('contact_heading', 'Let''s work together'),
  ('contact_subcopy', 'Tell me about your brand and what you need — I''ll get back to you within a couple of days.'),
  ('contact_text_color', ''),
  ('contact_bg_color', ''),
  ('whatsapp_number', ''),
  ('show_contact_info_email', 'true'),
  ('show_contact_info_linkedin', 'true'),
  ('show_contact_info_whatsapp', 'true'),
  ('show_contact_form', 'true'),
  ('contact_media_url', ''),
  ('contact_info_text_color', ''),
  ('show_about_location', 'true'),
  ('testimonials_label', ''),
  ('testimonials_heading', 'What brands say'),
  ('testimonials_subheading', ''),
  ('testimonials_text_color', ''),
  ('testimonials_bg_color', ''),
  ('testimonials_quote_font_size', ''),
  ('testimonials_quote_color', ''),
  ('testimonials_quote_font', ''),
  ('site_title', ''),
  ('favicon_url', ''),
  ('nav_link_1_text', 'Portfolio'),
  ('nav_link_2_text', 'Services'),
  ('nav_link_3_text', 'Results'),
  ('header_cta_text', 'Work with me'),
  ('show_about_stat_1', 'true'),
  ('show_about_stat_2', 'true'),
  ('show_about_stat_3', 'true'),
  ('show_about_stat_4', 'true')
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
alter table services enable row level security;
alter table case_study_pages enable row level security;

create policy "public can read portfolio_items" on portfolio_items for select using (true);
create policy "public can read case_studies" on case_studies for select using (true);
create policy "public can read case_study_pages" on case_study_pages for select using (true);
create policy "public can read testimonials" on testimonials for select using (true);
create policy "public can read site_settings" on site_settings for select using (true);
create policy "public can read brand_logos" on brand_logos for select using (true);
create policy "public can read services" on services for select using (true);
create policy "public can submit leads" on leads for insert with check (true);

create policy "admin manages portfolio_items" on portfolio_items for all using (auth.role() = 'authenticated');
create policy "admin manages case_studies" on case_studies for all using (auth.role() = 'authenticated');
create policy "admin manages case_study_pages" on case_study_pages for all using (auth.role() = 'authenticated');
create policy "admin manages testimonials" on testimonials for all using (auth.role() = 'authenticated');
create policy "admin manages leads" on leads for all using (auth.role() = 'authenticated');
create policy "admin manages brand_logos" on brand_logos for all using (auth.role() = 'authenticated');
create policy "admin manages services" on services for all using (auth.role() = 'authenticated');
create policy "admin manages calendar_events" on calendar_events for all using (auth.role() = 'authenticated');
create policy "admin manages campaigns" on campaigns for all using (auth.role() = 'authenticated');
create policy "admin manages checklist_notes" on checklist_notes for all using (auth.role() = 'authenticated');
create policy "admin manages site_settings" on site_settings for all using (auth.role() = 'authenticated');

create policy "public can read site-media" on storage.objects
  for select using (bucket_id = 'site-media');
create policy "admin manages site-media" on storage.objects
  for all using (bucket_id = 'site-media' and auth.role() = 'authenticated');
