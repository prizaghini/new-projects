insert into case_study_pages (
  slug, page_title, meta_description, label, headline, intro, client, sector, period,
  brand_label, brand_heading, brand_intro, brand_pages,
  linkedin_label, linkedin_heading, linkedin_intro,
  video_label, video_heading, video_intro, video_captions, video_all_caption, video_all_list,
  email_label, email_heading, email_intro, email_segments, email_webinar_topic, email_webinar_detail,
  delivered_label, delivered_heading, delivered_intro, delivered_items,
  reflection_label, reflection_heading, reflection_body,
  sort_order
) values (
  '1fit-brand-content',
  $q$1FIT, Brand & Content Operations Case Study | Priscila Zaghini$q$,
  $q$How I built 1FIT's brand identity system, tone of voice, LinkedIn presence, and produced 7 client case study videos in a concentrated sprint.$q$,
  $q$Case Study · Brand & Content Operations$q$,
  $q$Building 1FIT's brand voice, identity and content presence$q$,
  $q$From a visual identity system and tone of voice document to LinkedIn profiles, YouTube case study videos, and a webinar email campaign, I owned the full brand and content operation at 1FIT across four months as sole marketer.$q$,
  $q$1FIT (1fit.com)$q$,
  $q$B2B SaaS · Health & Fitness$q$,
  $q$May – Aug 2026$q$,

  $q$Brand identity$q$,
  $q$Visual identity system, built from scratch$q$,
  $q$1FIT had a logo and a colour but no documented brand system. I produced a full Visual Identity Guidelines document covering every touchpoint, from logo usage rules to social media templates.$q$,
  $q$Brand Guidelines cover
Primary Logo
Logo Scalability
Logo Rules
Social Media
Banners$q$,

  $q$LinkedIn presence$q$,
  $q$Company page and founder profiles, written to convert$q$,
  $q$I rewrote the 1FIT LinkedIn company page overview and wrote the About sections for both co-founders, aligning each voice with the brand positioning while keeping the tone personal and authentic.$q$,

  $q$YouTube content$q$,
  $q$Seven client case study videos$q$,
  $q$I edited, optimised and published each video, writing keyword-rich titles, benefit-led descriptions and CTAs linking back to 1fit.com. I also designed the thumbnails, edited captions and created a dedicated client review playlist.$q$,
  $q$Kevin Gomes, The Easiest Platform Switch. 72 views
Tom Serghi, 10 to 100 Clients in 10 Months. 58 views
Chae-Leon Hendricks, My Secret Weapon. 45 views$q$,
  $q$All 7 videos produced$q$,
  $q$Kevin Gomes, Switched coaching platforms without rebuilding a programme
Tom Serghi, 10 to 100 clients in just 10 months
Paul White, Replaced multiple coaching apps with one platform
Mark Meehan, How the game changed for his coaching business
Chae-Leon Hendricks, Why 1FIT became his best investment
Harry Longworth, The one thing he'd rather keep to himself
TaylorMae Coaching, Left WhatsApp and spreadsheets behind
7 client case studies$q$,

  $q$Email marketing$q$,
  $q$Webinar email campaign, segmented by audience$q$,
  $q$I planned and wrote the full email sequence promoting a client webinar on sleep and coaching performance, delivered in the week leading up to the event.$q$,
  $q$Existing clients, 4 emails|Warmer tone, community framing. Positioned as exclusive early access for active coaches already using the platform.
Prospects, 3 emails|Lead with value and expertise. The webinar as a proof point for the quality of 1FIT's coaching content, not a hard sell.$q$,
  $q$Sleep Coaching for Fitness Coaches: The Missing Link Between Recovery, Performance and Client Retention$q$,
  $q$Hosted by Phil Smith · 10 June 2026$q$,

  $q$Also delivered$q$,
  $q$Additional brand & copy work$q$,
  $q$Across the four months, brand and content work ran in parallel with everything else.$q$,
  $q$Tone of voice document|Editorial rules, brand voice principles, and writing guidelines for all 1FIT communications.
Brand strategy guidelines|Positioning framework repositioning 1FIT from "growth engine" to "right tool" language, Phase 1 of a broader brand evolution.
Competitor SWOT analysis|Full analysis across nine named competitors, produced for a founders strategy meeting.
Author bios|Professional author bios for Aaron (CMO) and Ben (CEO) for use across the blog and content platform.$q$,

  $q$Reflection$q$,
  $q$What this taught me$q$,
  $q$Brand work at an early-stage startup is less about perfection and more about giving the team something to point at. Before I produced the visual identity document, brand decisions were made case by case. Afterwards, the guidelines became the reference point, reducing back-and-forth and giving the web designer and founders a shared language.

The YouTube sprint taught me something different: volume and consistency of output matter as much as individual quality. Producing seven case study videos in three days required a repeatable structure, same brief format, same thumbnail template, same description framework, so each video felt distinctive while being efficient to produce.

The LinkedIn profiles were the most nuanced work. Writing in someone else's voice, especially a founder's, requires reading how they actually communicate, not just what they want to say. Ben's profile is written to sound like him, not like a marketing document.$q$,

  0
)
on conflict (slug) do update set
  page_title = excluded.page_title,
  meta_description = excluded.meta_description,
  label = excluded.label,
  headline = excluded.headline,
  intro = excluded.intro,
  client = excluded.client,
  sector = excluded.sector,
  period = excluded.period,
  brand_label = excluded.brand_label,
  brand_heading = excluded.brand_heading,
  brand_intro = excluded.brand_intro,
  brand_pages = excluded.brand_pages,
  linkedin_label = excluded.linkedin_label,
  linkedin_heading = excluded.linkedin_heading,
  linkedin_intro = excluded.linkedin_intro,
  video_label = excluded.video_label,
  video_heading = excluded.video_heading,
  video_intro = excluded.video_intro,
  video_captions = excluded.video_captions,
  video_all_caption = excluded.video_all_caption,
  video_all_list = excluded.video_all_list,
  email_label = excluded.email_label,
  email_heading = excluded.email_heading,
  email_intro = excluded.email_intro,
  email_segments = excluded.email_segments,
  email_webinar_topic = excluded.email_webinar_topic,
  email_webinar_detail = excluded.email_webinar_detail,
  delivered_label = excluded.delivered_label,
  delivered_heading = excluded.delivered_heading,
  delivered_intro = excluded.delivered_intro,
  delivered_items = excluded.delivered_items,
  reflection_label = excluded.reflection_label,
  reflection_heading = excluded.reflection_heading,
  reflection_body = excluded.reflection_body;
