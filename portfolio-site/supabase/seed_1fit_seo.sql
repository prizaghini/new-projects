insert into case_study_pages (
  slug, page_title, meta_description, label, headline, intro, client, sector, period, role,
  challenge_label, challenge_heading, challenge_body, tags,
  approach_label, approach_heading, approach_intro, approach_items,
  spotlight_label, spotlight_heading, spotlight_intro, spotlight_quote, spotlight_body,
  results_label, results_heading, results_intro,
  reflection_label, reflection_heading, reflection_body,
  sort_order
) values (
  '1fit-seo',
  $q$1FIT, SEO and Content Strategy Case Study | Priscila Zaghini$q$,
  $q$How I grew 1FIT's organic keyword portfolio by 56% and increased organic traffic by 12% in three months through SEO content strategy, technical fixes, and video case studies.$q$,
  $q$Case Study · SEO & Content Strategy$q$,
  $q$Growing 1FIT's organic presence from the ground up$q$,
  $q$In three months, a focused SEO and content strategy grew 1FIT's keyword portfolio by 56%, increased organic traffic by 12%, and turned a single blog post into the site's top non-branded traffic driver, with results still compounding after handover.$q$,
  $q$1FIT (1fit.com)$q$,
  $q$B2B SaaS · Health & Fitness$q$,
  $q$May – Aug 2026$q$,
  $q$Growth Marketing Executive$q$,

  $q$The brief$q$,
  $q$A platform with strong product, but limited organic visibility$q$,
  $q$1FIT is a UK-based B2B SaaS platform for fitness and health coaches, helping them manage clients, deliver programmes, and grow their businesses in one place.

When I joined in May 2026 as Growth Marketing Executive, the site had no structured SEO strategy and a site health score of 81%, eleven points below top-performing sites. Almost all Google traffic came from people already searching for 1FIT by name. There was no presence for the searches that matter most to growth: personal trainer software, coaching platforms, PT apps. People who had never heard of 1FIT were not finding it. The gaps were clear and fixable, and the opportunity to build a content engine from scratch was real.$q$,
  $q$SEO Audit|Content Strategy|Technical SEO|On-Page Optimisation$q$,

  $q$Approach$q$,
  $q$One brief, four workstreams$q$,
  $q$The audit came first. Once I had a clear picture of what was broken, what was missing and where the fastest wins were, the work fell into four areas.$q$,
  $q$Technical SEO audit and fixes|Ran a full Semrush site audit on joining. Identified 46 pages missing meta descriptions, 14 with long title elements, broken pages, and AI Search optimisation gaps. Prioritised and systematically resolved the highest-impact issues, reducing errors from 5 to 0 and raising site health from 81% to 87%.
SEO content strategy|Conducted keyword research to identify high-intent, low-competition terms relevant to personal trainers looking for software. Built a content plan targeting commercial and informational intent across the buyer journey.
Blog content production|Produced 11 new blog posts and rewrote 3 existing pages, all optimised for target keywords. The first post, published in May 2026, became the site's top non-branded traffic driver within weeks, ranking for 36 keywords and appearing in Google's top 10 for terms including "personal trainer software" (720 searches/month).
Video case studies and email campaign|Produced seven YouTube client case study videos in a concentrated sprint during July, each scripted, filmed, and optimised with keyword-rich titles and descriptions. Also planned and wrote a segmented email sequence promoting a client webinar in June, delivering tailored sends to both existing clients and prospects.$q$,

  $q$Content spotlight$q$,
  $q$One blog post. 36 keywords. The site's top organic asset.$q$,
  $q$Published in May 2026, this single piece of content became responsible for the majority of 1FIT's non-branded organic traffic growth.$q$,
  $q$"Best personal trainer software", ranking positions 4 to 8 across multiple high-intent variants, targeting fitness coaches actively searching for a platform solution."$q$,
  $q$The article was built around a cluster of commercial and informational keywords identified during research. Rather than targeting a single term, it was structured to capture the full range of language personal trainers use when looking for software: from "pt apps" to "online personal training platforms" to "best personal trainer software uk".

The page now accounts for <strong>8.6% of all organic traffic</strong> on the site and ranks for <strong>15 commercial-intent keywords</strong> and <strong>25 informational-intent keywords</strong> in the UK.$q$,

  $q$Results$q$,
  $q$The numbers, verified$q$,
  $q$All data sourced from Semrush UK database. September 2026 figures reflect work carried out during tenure. SEO improvements typically take 4–8 weeks to show in rankings.$q$,

  $q$Reflection$q$,
  $q$What this taught me$q$,
  $q$Working at an early-stage SaaS company meant doing everything with limited resources and no existing SEO foundation. That constraint was useful: it forced prioritisation. Rather than spreading effort across dozens of improvements, focusing on one well-researched, well-structured piece of content delivered more measurable impact than any number of smaller fixes.

It also reinforced something important about how to report SEO work honestly: results lag behind execution by weeks, sometimes months. The September data, showing growth after I'd left, is not a coincidence. It's how organic search works, and knowing how to explain that clearly is part of the job.$q$,

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
  role = excluded.role,
  challenge_label = excluded.challenge_label,
  challenge_heading = excluded.challenge_heading,
  challenge_body = excluded.challenge_body,
  tags = excluded.tags,
  approach_label = excluded.approach_label,
  approach_heading = excluded.approach_heading,
  approach_intro = excluded.approach_intro,
  approach_items = excluded.approach_items,
  spotlight_label = excluded.spotlight_label,
  spotlight_heading = excluded.spotlight_heading,
  spotlight_intro = excluded.spotlight_intro,
  spotlight_quote = excluded.spotlight_quote,
  spotlight_body = excluded.spotlight_body,
  results_label = excluded.results_label,
  results_heading = excluded.results_heading,
  results_intro = excluded.results_intro,
  reflection_label = excluded.reflection_label,
  reflection_heading = excluded.reflection_heading,
  reflection_body = excluded.reflection_body;
