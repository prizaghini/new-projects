// Shared loader for all case study webpages (case-studies/*.html).
// Populates a page's text from the case_study_pages table by slug, falling back
// to whatever's already hardcoded in the HTML for any field left blank in the
// database. Fix bugs or add sections here once — every case study page that
// calls loadCaseStudyPage() picks up the change.
import { supabase } from "./supabase-client.js";

// Site-wide name and header-button text, kept in sync with the main site's own
// Site Settings (display_name, name_text_color, header_cta_text) instead of
// being hardcoded per case study page — so a change made once in the admin
// dashboard's Site Settings tab applies here too, automatically.
export async function loadSiteChrome() {
  const { data } = await supabase.from("site_settings").select("*");
  if (!data) return;
  const s = {};
  data.forEach(row => { s[row.key] = row.value; });

  if (s.display_name) {
    document.querySelectorAll(".site-name-text").forEach(el => { el.textContent = s.display_name; });
  }
  if (s.name_text_color) {
    document.querySelectorAll(".site-name-text").forEach(el => { el.style.color = s.name_text_color; });
  }
  if (s.header_cta_text) {
    document.querySelectorAll(".site-cta-text").forEach(el => { el.textContent = s.header_cta_text; });
  }
}

// Only updates each mockup card's existing heading/description text, leaving its
// screenshot image untouched, matched by position (line 1 -> first card, etc).
function applyPageCards(gridId, pagesText) {
  if (!pagesText) return;
  const pairs = pagesText.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const [heading, desc] = line.split("|");
    return { heading: (heading || "").trim(), desc: (desc || "").trim() };
  });
  const cards = document.querySelectorAll(`#${gridId} .page-card-body`);
  cards.forEach((card, i) => {
    if (!pairs[i]) return;
    const h3 = card.querySelector("h3");
    const p = card.querySelector("p");
    if (h3 && pairs[i].heading) h3.textContent = pairs[i].heading;
    if (p && pairs[i].desc) p.textContent = pairs[i].desc;
  });
}

// Splits on blank lines into paragraphs. The first paragraph keeps the "lead"
// class + top margin so there's still visible space under the heading above it
// (losing that class here was a real bug — it collapsed the heading/body gap).
// Never adds class="reveal": elements created after the page's scroll-reveal
// IntersectionObserver has already run never get observed, so they'd stay
// permanently invisible (opacity: 0) — that was the second real bug.
function paragraphsHtml(text, { leadFirst = false } = {}) {
  return text.split(/\n\s*\n/).map((p, i) => {
    const t = p.trim();
    return i === 0 && leadFirst
      ? `<p class="lead" style="margin-top:16px;">${t}</p>`
      : `<p style="color:var(--ink-soft);">${t}</p>`;
  }).join("");
}

export async function loadCaseStudyPage(slug) {
  const { data } = await supabase.from("case_study_pages").select("*").eq("slug", slug).maybeSingle();
  if (!data) return;

  if (data.page_title) {
    document.title = data.page_title;
    const titleEl = document.getElementById("cs-page-title");
    if (titleEl) titleEl.textContent = data.page_title;
  }
  const metaEl = document.getElementById("cs-meta-description");
  if (data.meta_description && metaEl) metaEl.setAttribute("content", data.meta_description);

  const setText = (id, value) => {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Hero
  setText("cs-label", data.label);
  setText("cs-headline", data.headline);
  setText("cs-intro", data.intro);
  setText("cs-client", data.client);
  setText("cs-sector", data.sector);
  setText("cs-period", data.period);

  const statsEl = document.getElementById("cs-stats");
  if (data.stats && statsEl) {
    statsEl.innerHTML = data.stats.split("|").map(pair => {
      const [number, label] = pair.split(":");
      return `
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:20px;text-align:center;">
          <div style="font-family:var(--display);font-size:2rem;font-weight:700;color:#fff;line-height:1;">${(number || "").trim()}</div>
          <div style="font-family:var(--mono);font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.45);margin-top:6px;">${(label || "").trim()}</div>
        </div>`;
    }).join("");
  }

  // "The challenge" section
  setText("cs-challenge-label", data.challenge_label);
  setText("cs-challenge-heading", data.challenge_heading);
  const challengeBodyEl = document.getElementById("cs-challenge-body");
  if (data.challenge_body && challengeBodyEl) challengeBodyEl.innerHTML = paragraphsHtml(data.challenge_body, { leadFirst: true });
  const tagsEl = document.getElementById("cs-tags");
  if (data.tags && tagsEl) tagsEl.innerHTML = data.tags.split("|").map(t => `<span class="tag">${t.trim()}</span>`).join("");
  setText("cs-proof-caption", data.proof_caption);
  const proofUrlsEl = document.getElementById("cs-proof-urls");
  if (data.proof_urls && proofUrlsEl) {
    proofUrlsEl.innerHTML = data.proof_urls.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [url, status] = line.split("|").map(s => (s || "").trim());
      const badgeClass = /new/i.test(status) ? "new" : "update";
      return `<li><span class="dot"></span><a href="${url}" target="_blank">${url.replace(/^https?:\/\//, "")}</a><span class="badge ${badgeClass}">${status || "Updated"}</span></li>`;
    }).join("");
  }

  // First "featured page" section
  setText("cs-featured-label", data.featured_label);
  setText("cs-featured-heading", data.featured_heading);
  setText("cs-featured-intro", data.featured_intro);
  applyPageCards("cs-featured-grid", data.featured_pages);

  // Second "featured page" section
  setText("cs-wearables-label", data.wearables_label);
  setText("cs-wearables-heading", data.wearables_heading);
  setText("cs-wearables-intro", data.wearables_intro);
  applyPageCards("cs-wearables-grid", data.wearables_pages);

  // Moodboard section
  setText("cs-moodboard-label", data.moodboard_label);
  setText("cs-moodboard-heading", data.moodboard_heading);
  setText("cs-moodboard-intro", data.moodboard_intro);
  if (data.moodboard_items) {
    const pairs = data.moodboard_items.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [title, desc] = line.split("|");
      return { title: (title || "").trim(), desc: (desc || "").trim() };
    });
    const items = document.querySelectorAll("#cs-moodboard-items .moodboard-item");
    items.forEach((item, i) => {
      if (!pairs[i]) return;
      const titleEl = item.querySelector("div");
      const p = item.querySelector("p");
      if (titleEl && pairs[i].title) titleEl.textContent = pairs[i].title;
      if (p && pairs[i].desc) p.textContent = pairs[i].desc;
    });
  }
  setText("cs-moodboard-note", data.moodboard_note);

  // Reflection section
  setText("cs-reflection-label", data.reflection_label);
  setText("cs-reflection-heading", data.reflection_heading);
  const reflectionBodyEl = document.getElementById("cs-reflection-body");
  if (data.reflection_body && reflectionBodyEl) reflectionBodyEl.innerHTML = paragraphsHtml(data.reflection_body);
}

// Scroll-reveal fade-in, shared by every case study page. Called once after
// loadCaseStudyPage() settles (whether or not a database row was found) so it
// observes the final DOM — including anything the loader just replaced — instead
// of a stale snapshot from before the database content arrived.
export function initReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  revealEls.forEach(el => io.observe(el));
}
