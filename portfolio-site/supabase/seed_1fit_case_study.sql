insert into case_study_pages (
  slug, page_title, meta_description, label, headline, intro, client, sector, period, stats,
  challenge_label, challenge_heading, challenge_body, tags, proof_caption, proof_urls,
  featured_label, featured_heading, featured_intro, featured_pages,
  wearables_label, wearables_heading, wearables_intro, wearables_pages,
  moodboard_label, moodboard_heading, moodboard_intro, moodboard_items, moodboard_note,
  reflection_label, reflection_heading, reflection_body,
  sort_order
) values (
  '1fit-website',
  $q$1FIT — Website & Product Marketing Case Study | Priscila Zaghini$q$,
  $q$How I built 10 new landing pages, rewrote existing platform pages, and created a website moodboard and redesign direction for 1FIT in under four months.$q$,
  $q$Case Study · Website & Product Marketing$q$,
  $q$Building the product marketing engine from scratch$q$,
  $q$In four months as the sole marketer at 1FIT, I created 10 new platform landing pages, rewrote existing product pages, produced a full website redesign moodboard, and developed the copy and content architecture that underpins the platform section of the site.$q$,
  $q$1FIT (1fit.com)$q$,
  $q$B2B SaaS · Health & Fitness$q$,
  $q$May – Aug 2026$q$,
  $q$10:New landing pages|2:Platform pages updated|12:Total URLs delivered|1:Website redesign moodboard$q$,

  $q$The challenge$q$,
  $q$A platform with depth — but no pages to show it$q$,
  $q$When I joined 1FIT, the platform section of the site was minimal. Core features like wearable integrations, supplement libraries, coaching templates, and payment automation existed in the product — but had no dedicated pages, no benefit-led copy, and no SEO presence.

As the sole marketer, I took ownership of the entire product marketing layer: auditing what existed, identifying gaps, writing the copy, and delivering live pages — all while building the SEO and content strategy in parallel.$q$,
  $q$Product Copywriting|Landing Pages|Information Architecture|Website Strategy|UX Writing|Moodboard & Direction$q$,
  $q$All URLs delivered · May – Aug 2026$q$,
  $q$https://1fit.com/platform/payments/|Updated
https://1fit.com/platform/habits-tracking-coaching/|Updated
https://1fit.com/platform/wearable-integrations/|New
https://1fit.com/platform/templates/|New
https://1fit.com/platform/templates/training-plan/|New
https://1fit.com/platform/templates/step-plans/|New
https://1fit.com/platform/check-in-management/daily-check-in/|New
https://1fit.com/platform/nutrition-coaching-software/supplement-plans/|New
https://1fit.com/platform/nutrition-coaching-software/supplement-library/|New
https://1fit.com/platform/nutrition-coaching-software/recipe-library/|New
https://1fit.com/platform/nutrition-coaching-software/food-library/|New
https://1fit.com/ingredient-library/|New$q$,

  $q$Featured page$q$,
  $q$1FIT Pay — Accept Payments. Automate Billing. Grow Your Coaching Business.$q$,
  $q$The payments landing page needed to do three things: build trust, explain how it works, and make the business case for integrated billing over disconnected tools.$q$,
  $q$Hero — benefit-led headline|Three-line headline that directly addresses the coach's goal: grow revenue, reduce admin. Social proof numbers anchor the value immediately: £2M processed, 99% payment success rate.
Feature section — time-saving framing|Reframes the product away from "payment software" toward time reclaimed for coaching. Dashboard mockup shows the product in context.
Product features — recurring & staged payments|Two-column layout showing the two core use cases: predictable recurring revenue and upfront/split payment structures.
Benefits grid — Stripe trust signal|Six benefit cards anchored by the Stripe logo — the clearest trust signal for coaches considering integrated billing for the first time.$q$,

  $q$Featured page$q$,
  $q$Wearable Integrations — built entirely from scratch$q$,
  $q$This page didn't exist. I identified the gap, wrote the copy, structured the page architecture, and delivered it to the web designer as a complete brief.$q$,
  $q$Hero — audience-specific headline|"Wearable Data Syncing Built for Personal Trainers & Fitness Coaches" — speaks directly to the ICP, not generic wearable language.
Metrics section — coaching context framing|Three metric categories (Activity, Sleep/Recovery, Health Markers) each framed around how a coach uses the data — not just what the data is.
Wearable metrics — coaching context framing|Three metric categories (Activity, Sleep/Recovery, Health Markers) each framed around how a coach uses the data — not just what the data is.
Key benefits — six cards|Automated syncing, clear data sources, instant history, early pattern detection, all-in-one interface, and universal device connections — each written as a coaching outcome, not a technical feature.
Mid-page CTA — insight-led hook|"Every Insight You're Missing Is Already on Your Clients' Wrists" — written to create urgency without pressure, connecting the product to real coaching gaps.
FAQ section — objection handling|Five questions covering compatibility, data visibility, sync behaviour, multiple devices, and coaching application — each written to remove friction at the point of decision.$q$,

  $q$Website redesign$q$,
  $q$Moodboard and redesign direction$q$,
  $q$Alongside the landing pages, I researched and produced a full website and app moodboard — covering visual references, typography exploration, navigation architecture, and onboarding flow concepts — to inform the next phase of the site redesign.$q$,
  $q$Visual references|Kinso (grid/gradient hero), Slider Revolution (animated backgrounds), Verity (scroll behaviour), Raycast (frosted-glass navbar) — each annotated with what works and what to leave out.
Typography exploration|Four typeface options explored against the 1FIT brand palette — Helvetica, Proxima Nova, Playfair Display, and DM Serif Display — with rationale for each.
Navigation architecture|Proposed mega menu structure inspired by Trainerize but rearchitected around 1FIT's target audience — Business Type and Specialism dropdowns designed to aid coach self-identification without sub-menus.
Onboarding flow|Wireframes for a personalised onboarding experience — "Tell us about you" and "Who's your main clientele?" steps designed to segment coaches from first click.
App UI references|Kenso referenced for dark mode interface, frosted-glass panels, and data visualisation style — matched to the 1FIT brand charcoal and teal palette.$q$,
  $q$The moodboard was produced as a strategic brief for the web designer — not a final design. Its purpose was to align on visual direction before the redesign brief was written.$q$,

  $q$Reflection$q$,
  $q$What this taught me$q$,
  $q$Product marketing at an early-stage SaaS startup means working without a brief, a designer on call, or a content team. Every page started with a question: who is reading this, what do they already believe, and what do they need to feel confident enough to start a trial?

The wearables page is the clearest example of that thinking in practice. Coaches don't think in terms of API integrations — they think in terms of client results. Every section was written to bridge that gap: from technical capability to coaching outcome.

The moodboard reinforced something I'd always believed but rarely had the space to demonstrate: good product marketing starts with knowing where the product is going, not just where it is today.$q$,

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
  stats = excluded.stats,
  challenge_label = excluded.challenge_label,
  challenge_heading = excluded.challenge_heading,
  challenge_body = excluded.challenge_body,
  tags = excluded.tags,
  proof_caption = excluded.proof_caption,
  proof_urls = excluded.proof_urls,
  featured_label = excluded.featured_label,
  featured_heading = excluded.featured_heading,
  featured_intro = excluded.featured_intro,
  featured_pages = excluded.featured_pages,
  wearables_label = excluded.wearables_label,
  wearables_heading = excluded.wearables_heading,
  wearables_intro = excluded.wearables_intro,
  wearables_pages = excluded.wearables_pages,
  moodboard_label = excluded.moodboard_label,
  moodboard_heading = excluded.moodboard_heading,
  moodboard_intro = excluded.moodboard_intro,
  moodboard_items = excluded.moodboard_items,
  moodboard_note = excluded.moodboard_note,
  reflection_label = excluded.reflection_label,
  reflection_heading = excluded.reflection_heading,
  reflection_body = excluded.reflection_body;
