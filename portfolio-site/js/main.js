let CATEGORIES = [
  { key: "beauty", label: "Beauty" },
  { key: "home-deco", label: "Home & Decor" },
  { key: "tech", label: "Tech & Apps" },
  { key: "finance", label: "Finance" },
  { key: "food", label: "Food" },
  { key: "drinks", label: "Drinks & Desserts" },
  { key: "fitness", label: "Health & Fitness" },
  { key: "fashion", label: "Fashion" },
  { key: "travel", label: "Travel" },
];

function parseCategories(str) {
  return str.split("|").map(pair => {
    const [key, label] = pair.split(":");
    return { key: (key || "").trim(), label: (label || key || "").trim() };
  }).filter(c => c.key);
}

const SERVICE_WORDS = [
  "Conversion UGC", "High-Performance Creatives", "Strategic Scripts",
  "Lifestyle Photos", "E-commerce Content", "UGC Consulting", "Sponsored Posts",
];

function fillMarquee(el, words) {
  const doubled = [...words, ...words];
  el.innerHTML = doubled.map(w => `<span>${w}</span><span class="marquee-dot">◆</span>`).join("");
}

const PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", other: "" };

const FONT_PAIRINGS = {
  grotesk: { display: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  fraunces: { display: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  playfair: { display: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif" },
  manrope: { display: "'Manrope', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif" },
};

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function resolveThumb(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.platform === "youtube") {
    const id = extractYoutubeId(item.link_url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

// ---------- animated stat counters ----------
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setupCounters() {
  const cards = document.querySelectorAll(".stat-card b");
  if (!("IntersectionObserver" in window)) {
    cards.forEach(animateCount);
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  cards.forEach(el => observer.observe(el));
}

// ---------- scroll reveal ----------
function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("in"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach(el => observer.observe(el));
}

// ---------- case studies ----------
async function loadCaseStudies(supabase) {
  const container = document.getElementById("case-studies");
  const { data, error } = await supabase
    .from("case_studies")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    container.innerHTML = `<div class="empty-note">No case studies yet — add some from the admin dashboard.</div>`;
    return;
  }
  container.innerHTML = data.map(cs => `
    <div class="case-card">
      ${cs.image_url ? `<img class="case-card-img" src="${cs.image_url}" alt="" loading="lazy">` : ""}
      <span class="brand">${cs.brand}</span>
      <b>${cs.headline_stat}</b>
      <p>${cs.description}</p>
    </div>
  `).join("");
}

// ---------- services ----------
async function loadServices(supabase) {
  const container = document.getElementById("services-grid");
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    container.innerHTML = `<div class="empty-note">No services yet — add some from the admin dashboard.</div>`;
    return;
  }
  container.innerHTML = data.map(svc => `
    <div class="service-card">
      ${svc.image_url ? `<img class="service-card-img" src="${svc.image_url}" alt="" loading="lazy">` : ""}
      <h3>${svc.title}</h3>
      <p>${svc.description}</p>
    </div>
  `).join("");
}

// ---------- video lightbox (used by self-hosted portfolio videos) ----------
function setupVideoLightbox() {
  const box = document.getElementById("video-lightbox");
  const video = document.getElementById("lightbox-video");

  function close() {
    box.classList.remove("open");
    video.pause();
    video.removeAttribute("src");
  }
  box.querySelector(".lightbox-close").addEventListener("click", close);
  box.addEventListener("click", e => { if (e.target === box) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  return {
    open(url, startSeconds) {
      video.src = url;
      box.classList.add("open");
      const onMeta = () => {
        video.currentTime = startSeconds || 0;
        video.play().catch(() => {});
        video.removeEventListener("loadedmetadata", onMeta);
      };
      video.addEventListener("loadedmetadata", onMeta);
    },
  };
}

// ---------- portfolio ----------
let allPortfolioItems = [];
let videoLightbox = null;

function renderPortfolio(category) {
  const track = document.getElementById("portfolio-track");
  const items = allPortfolioItems.filter(item => item.category === category);
  if (items.length === 0) {
    track.innerHTML = `<div class="empty-note">No items in this category yet — add some from the admin dashboard.</div>`;
    return;
  }
  track.innerHTML = items.map(item => {
    const thumb = resolveThumb(item);
    const platformLabel = PLATFORM_LABELS[item.platform] || "";
    const isVideo = !!item.videoUrl;
    return `
    <a class="portfolio-card" href="${item.link_url || "#"}"
       ${isVideo ? `data-video-url="${item.videoUrl}" data-start="${item.start_seconds || 0}"` : `target="_blank" rel="noopener"`}>
      <div class="portfolio-thumb">
        ${thumb
          ? `<img src="${thumb}" alt="${item.title}" loading="lazy">`
          : `<div class="portfolio-thumb-placeholder">${platformLabel || "View"}</div>`}
        ${isVideo ? `<span class="play-badge" aria-hidden="true">▶</span>` : ""}
      </div>
      <div class="meta"><b>${item.brand}</b><span>${item.title}${platformLabel ? ` · ${platformLabel}` : ""}</span></div>
    </a>
  `;
  }).join("");

  track.querySelectorAll("[data-video-url]").forEach(card => {
    card.addEventListener("click", e => {
      e.preventDefault();
      videoLightbox.open(card.dataset.videoUrl, parseFloat(card.dataset.start) || 0);
    });
  });
}

async function loadPortfolio(supabase) {
  const navContainer = document.getElementById("cat-nav");
  navContainer.innerHTML = CATEGORIES.map((cat, i) =>
    `<button class="cat-btn${i === 0 ? " active" : ""}" data-cat="${cat.key}">${cat.label}</button>`
  ).join("");

  const { data } = await supabase.from("portfolio_items").select("*").order("sort_order", { ascending: true });
  allPortfolioItems = (data || []).map(item => ({
    ...item,
    videoUrl: item.video_file_path
      ? supabase.storage.from("site-media").getPublicUrl(item.video_file_path).data.publicUrl
      : null,
  }));

  navContainer.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      navContainer.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPortfolio(btn.dataset.cat);
    });
  });

  renderPortfolio(CATEGORIES[0].key);
}

// ---------- brand logos ----------
async function loadBrandLogos(supabase) {
  const track = document.getElementById("logo-marquee");
  const { data, error } = await supabase
    .from("brand_logos")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    track.innerHTML = "";
    track.classList.remove("no-scroll");
    return;
  }
  const cards = data.map(logo => {
    const img = `<img src="${logo.image_url}" alt="${logo.brand_name || "Brand logo"}" loading="lazy" class="brand-logo-img">`;
    const inner = logo.link_url
      ? `<a href="${logo.link_url}" target="_blank" rel="noopener">${img}</a>`
      : img;
    return `<div class="logo-card">${inner}</div>`;
  });
  // Duplicating the list is what makes the scroll loop seamless, but with
  // few logos the duplicate is visible at rest instead of off-screen — so
  // only duplicate (and animate) once there are enough to fill the row.
  const enoughToScroll = cards.length > 5;
  track.classList.toggle("no-scroll", !enoughToScroll);
  track.innerHTML = (enoughToScroll ? [...cards, ...cards] : cards).join("");
}

// ---------- testimonials ----------
async function loadTestimonials(supabase) {
  const track = document.getElementById("testimonial-track");
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    track.innerHTML = `<div class="empty-note">No testimonials yet — add some from the admin dashboard.</div>`;
    return;
  }
  track.innerHTML = data.map(t => `
    <div class="testimonial-card">
      <span class="handle">${t.brand_handle}</span>
      <h3>${t.title}</h3>
      <p class="quote">"${t.quote}"</p>
      ${t.result_stat ? `<p class="result">${t.result_stat}</p>` : ""}
    </div>
  `).join("");
}

// ---------- site settings (identity/copy editable from admin) ----------
// Splits on blank lines into <p> paragraphs (for spacing), and turns any
// remaining single line break into <br> within a paragraph.
function textToParagraphs(text) {
  return text
    .replace(/\\n/g, "\n")
    .split(/\n\s*\n/)
    .map(p => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function setStat(id, value, suffix) {
  const el = document.getElementById(id);
  if (!el || !value) return;
  el.dataset.count = parseInt(value, 10) || 0;
  if (suffix) el.dataset.suffix = suffix;
}

function setPhoto(containerId, url, altText, objectPosition, fit, priority) {
  if (!url) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  const img = document.createElement("img");
  img.alt = altText || "";
  if (priority) {
    img.loading = "eager";
    img.fetchPriority = "high";
  } else {
    img.loading = "lazy";
  }
  img.style.position = "absolute";
  img.style.inset = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = fit === "contain" ? "contain" : "cover";
  img.style.objectPosition = objectPosition || "center";
  img.style.borderRadius = "16px";
  img.style.opacity = "0";
  img.style.transition = "opacity 0.25s ease";
  const reveal = () => {
    el.classList.add("has-media");
    el.classList.toggle("fit-contain", fit === "contain");
    requestAnimationFrame(() => { img.style.opacity = "1"; });
  };
  img.addEventListener("load", reveal, { once: true });
  img.addEventListener("error", reveal, { once: true });
  el.replaceChildren(img);
  img.src = url; // set src last so the load/error listeners are already attached
}

async function loadSiteSettings(supabase) {
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error || !data) return;
  const s = {};
  data.forEach(row => { s[row.key] = row.value; });

  if (s.site_title) document.title = s.site_title;
  if (s.favicon_url) document.getElementById("favicon-link").href = s.favicon_url;

  if (s.display_name) {
    document.querySelectorAll(".site-name-text").forEach(el => { el.textContent = s.display_name; });
  }
  if (s.name_text_color) {
    document.querySelectorAll(".site-name-text").forEach(el => { el.style.color = s.name_text_color; });
  }
  if (s.logo_url) {
    document.querySelectorAll(".logo-img").forEach(img => {
      img.src = s.logo_url;
      img.alt = s.display_name || "";
      img.style.display = "block";
    });
    document.querySelectorAll(".logo-text").forEach(el => { el.style.display = "none"; });
  }
  const labelEl = document.getElementById("hero-label");
  if (labelEl && (s.tagline || s.availability)) {
    labelEl.textContent = [s.tagline, s.availability].filter(Boolean).join(" · ");
  }
  if (labelEl && s.hero_label_color) labelEl.style.color = s.hero_label_color;
  const heroTextEl = document.getElementById("hero-text");
  if (heroTextEl) {
    heroTextEl.classList.remove("align-left", "align-center", "align-right");
    if (s.hero_text_align && s.hero_text_align !== "left") heroTextEl.classList.add(`align-${s.hero_text_align}`);
    heroTextEl.classList.remove("valign-top", "valign-center", "valign-bottom");
    if (s.hero_text_valign && s.hero_text_valign !== "center") heroTextEl.classList.add(`valign-${s.hero_text_valign}`);
  }
  if (s.hero_headline) document.getElementById("hero-headline").innerHTML = s.hero_headline.replace(/\\n|\n/g, "<br>");
  if (s.hero_subcopy) document.getElementById("hero-subcopy").textContent = s.hero_subcopy;
  if (s.hero_stats_line) document.getElementById("hero-stats-line").textContent = s.hero_stats_line;
  if (s.hero_btn_primary_text) document.getElementById("hero-btn-primary").textContent = s.hero_btn_primary_text;
  if (s.hero_btn_secondary_text) document.getElementById("hero-btn-secondary").textContent = s.hero_btn_secondary_text;
  if (s.hero_video_url) {
    const el = document.getElementById("hero-photo");
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.style.position = "absolute";
    video.style.inset = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.opacity = "0";
    video.style.transition = "opacity 0.25s ease";
    const reveal = () => {
      el.classList.add("has-media");
      requestAnimationFrame(() => { video.style.opacity = "1"; });
    };
    video.addEventListener("loadeddata", reveal, { once: true });
    video.addEventListener("error", reveal, { once: true });
    el.replaceChildren(video);
    video.src = s.hero_video_url;
  } else {
    setPhoto("hero-photo", s.hero_photo_url, s.display_name, s.hero_photo_position, s.hero_photo_fit, true);
  }

  const defaultBadgePositions = { 1: "top-right", 2: "bottom-left", 3: "middle-right" };
  for (const n of [1, 2, 3]) {
    const badge = document.getElementById(`hero-badge-${n}`);
    if (!badge) continue;
    const enabled = s[`hero_badge_${n}_enabled`] === "true" && s[`hero_badge_${n}_title`];
    badge.hidden = !enabled;
    if (!enabled) continue;
    document.getElementById(`hero-badge-${n}-title`).textContent = s[`hero_badge_${n}_title`];
    document.getElementById(`hero-badge-${n}-subtitle`).textContent = s[`hero_badge_${n}_subtitle`] || "";
    badge.className = "hero-badge float-" + n + " pos-" + (s[`hero_badge_${n}_position`] || defaultBadgePositions[n]);
  }

  const root = document.documentElement.style;
  if (s.bg_color) root.setProperty("--bg", s.bg_color);
  if (s.bg_alt_color) root.setProperty("--bg-alt", s.bg_alt_color);
  if (s.ink_color) root.setProperty("--ink", s.ink_color);
  if (s.alt_text_color) root.setProperty("--ink-alt", s.alt_text_color);
  if (s.accent_color) root.setProperty("--accent", s.accent_color);
  if (s.button_bg_color) root.setProperty("--btn-bg", s.button_bg_color);
  if (s.button_text_color) root.setProperty("--btn-ink", s.button_text_color);
  if (s.button_radius) root.setProperty("--btn-radius", `${s.button_radius}px`);

  if (s.hero_overlay_opacity) root.setProperty("--hero-overlay-opacity", parseInt(s.hero_overlay_opacity, 10) / 100);
  if (s.text_scale) root.setProperty("--text-scale", parseInt(s.text_scale, 10) / 100);

  const fontPairing = FONT_PAIRINGS[s.font_pairing];
  if (fontPairing) {
    root.setProperty("--display", fontPairing.display);
    root.setProperty("--body", fontPairing.body);
  }

  if (s.hero_bg_color) root.setProperty("--hero-bg", s.hero_bg_color);
  if (s.hero_bg_position) root.setProperty("--hero-bg-position", s.hero_bg_position.replace("-", " "));

  if (s.hero_bg_video_url) {
    const heroEl = document.querySelector(".hero");
    const bgVideo = document.createElement("video");
    bgVideo.src = s.hero_bg_video_url;
    bgVideo.autoplay = true;
    bgVideo.muted = true;
    bgVideo.loop = true;
    bgVideo.playsInline = true;
    bgVideo.className = "hero-bg-video";
    heroEl.prepend(bgVideo);
    heroEl.classList.add("has-bg-image");
  } else if (s.hero_bg_url) {
    const heroEl = document.querySelector(".hero");
    root.setProperty("--hero-bg-url", `url("${s.hero_bg_url}")`);
    heroEl.classList.add("has-bg-image");
  }

  const logoBadge = document.getElementById("hero-logo-badge");
  if (logoBadge && s.hero_logo_url) {
    const position = s.hero_logo_position || "top-left";
    logoBadge.src = s.hero_logo_url;
    logoBadge.hidden = false;
    logoBadge.className = "hero-logo-badge pos-" + position;
    if (s.hero_logo_size) root.setProperty("--hero-logo-size", `${s.hero_logo_size}px`);
    // Give the tagline clearance from the badge when it sits at the top,
    // so it doesn't land on top of the text (sized to match the badge's
    // own fixed footprint, not guessed against an image crop).
    const heroTextEl = document.getElementById("hero-text");
    if (heroTextEl) heroTextEl.classList.toggle("has-top-logo-badge", position === "top-left" || position === "top-right");
  }

  setStat("stat-videos", s.stat_videos, s.stat_videos_suffix);
  setStat("stat-partners", s.stat_partners, s.stat_partners_suffix);
  setStat("stat-views", s.stat_views, s.stat_views_suffix);
  setStat("stat-years", s.stat_years, s.stat_years_suffix);
  if (s.stat_videos_label) document.getElementById("stat-videos-label").textContent = s.stat_videos_label;
  if (s.stat_partners_label) document.getElementById("stat-partners-label").textContent = s.stat_partners_label;
  if (s.stat_views_label) document.getElementById("stat-views-label").textContent = s.stat_views_label;
  if (s.stat_years_label) document.getElementById("stat-years-label").textContent = s.stat_years_label;

  if (s.about_heading) {
    document.getElementById("about-heading").textContent = s.about_heading;
  } else if (s.display_name) {
    document.getElementById("about-heading").textContent = `Hey, I'm ${s.display_name}`;
  }
  if (s.about_bio) document.getElementById("about-bio").innerHTML = textToParagraphs(s.about_bio);
  if (s.about_text_color) {
    document.getElementById("about-heading").style.color = s.about_text_color;
    document.getElementById("about-bio").style.color = s.about_text_color;
    document.getElementById("about-location").style.color = s.about_text_color;
  }
  if (s.about_location) document.getElementById("about-location").textContent = s.about_location;
  setPhoto("about-photo", s.about_photo_url, s.display_name, s.about_photo_position, s.about_photo_fit);

  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`about-stat-${i}`);
    const item = document.getElementById(`about-stat-${i}-item`);
    if (item) item.hidden = s[`show_about_stat_${i}`] === "false";
    if (el && s[`about_stat_${i}`]) el.textContent = s[`about_stat_${i}`];
    if (el && s.about_stats_color) el.style.color = s.about_stats_color;
  }

  if (s.hero_text_color) {
    ["hero-headline", "hero-subcopy", "hero-stats-line"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.color = s.hero_text_color;
    });
  }

  if (s.categories) {
    const parsed = parseCategories(s.categories);
    if (parsed.length) CATEGORIES = parsed;
  }

  if (s.tagline) document.getElementById("footer-tagline").textContent = s.tagline;
  if (s.contact_email) {
    const el = document.getElementById("footer-email");
    el.textContent = s.contact_email;
    el.href = `mailto:${s.contact_email}`;
  }
  if (s.linkedin_handle) {
    document.getElementById("footer-linkedin").href = `https://linkedin.com/in/${s.linkedin_handle.replace("@", "")}`;
  }

  if (s.contact_heading) document.getElementById("contact-heading").textContent = s.contact_heading;
  if (s.contact_subcopy) document.getElementById("contact-subcopy").textContent = s.contact_subcopy;
  if (s.contact_text_color) {
    document.getElementById("contact-heading").style.color = s.contact_text_color;
    document.getElementById("contact-subcopy").style.color = s.contact_text_color;
  }
  const contactEmailEl = document.getElementById("contact-info-email");
  if (contactEmailEl) {
    contactEmailEl.hidden = s.show_contact_info_email === "false" || !s.contact_email;
    if (s.contact_email) contactEmailEl.href = `mailto:${s.contact_email}`;
  }
  const contactLinkedinEl = document.getElementById("contact-info-linkedin");
  if (contactLinkedinEl) {
    contactLinkedinEl.hidden = s.show_contact_info_linkedin === "false" || !s.linkedin_handle;
    if (s.linkedin_handle) contactLinkedinEl.href = `https://linkedin.com/in/${s.linkedin_handle.replace("@", "")}`;
  }
  const contactWhatsappEl = document.getElementById("contact-info-whatsapp");
  if (contactWhatsappEl) {
    contactWhatsappEl.hidden = s.show_contact_info_whatsapp === "false" || !s.whatsapp_number;
    if (s.whatsapp_number) {
      const w = s.whatsapp_number.trim();
      contactWhatsappEl.href = w.startsWith("http") ? w : `https://wa.me/${w.replace(/[^\d]/g, "")}`;
    }
  }
  const contactFormEl = document.getElementById("contact-form");
  if (contactFormEl) contactFormEl.hidden = s.show_contact_form === "false";
  const contactMediaEl = document.getElementById("contact-media");
  if (contactMediaEl && s.contact_media_url) {
    const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(s.contact_media_url);
    contactMediaEl.innerHTML = isVideo
      ? `<video src="${s.contact_media_url}" autoplay muted loop playsinline></video>`
      : `<img src="${s.contact_media_url}" alt="" loading="lazy">`;
    contactMediaEl.hidden = false;
  }

  if (s.marquee_text) {
    fillMarquee(document.getElementById("marquee-1"), s.marquee_text.split("|").map(w => w.trim()).filter(Boolean));
  }
  const marqueeEl = document.getElementById("section-marquee");
  if (marqueeEl) {
    if (s.marquee_bg_color) marqueeEl.style.background = s.marquee_bg_color;
    if (s.marquee_text_color) marqueeEl.style.color = s.marquee_text_color;
  }

  if (s.logos_heading) document.getElementById("logos-heading").textContent = s.logos_heading;
  if (s.logos_heading_color) document.getElementById("logos-heading").style.color = s.logos_heading_color;

  if (s.case_studies_heading) document.getElementById("case-studies-heading").textContent = s.case_studies_heading;
  if (s.case_studies_subheading) document.getElementById("case-studies-subheading").textContent = s.case_studies_subheading;
  if (s.case_studies_text_color) {
    document.getElementById("case-studies-heading").style.color = s.case_studies_text_color;
    document.getElementById("case-studies-subheading").style.color = s.case_studies_text_color;
  }

  if (s.services_heading) document.getElementById("services-heading").textContent = s.services_heading;
  if (s.services_subheading) {
    const el = document.getElementById("services-subheading");
    el.textContent = s.services_subheading;
    el.hidden = false;
  }
  if (s.services_text_color) {
    document.getElementById("services-heading").style.color = s.services_text_color;
    document.getElementById("services-subheading").style.color = s.services_text_color;
  }

  document.documentElement.classList.toggle("grain-on", s.texture_enabled === "true");
  if (s.texture_intensity) root.setProperty("--grain-opacity", parseInt(s.texture_intensity, 10) / 100);

  const sectionToggles = {
    show_marquee: "section-marquee",
    show_stats: "stats",
    show_about: "about",
    show_logos: "section-logos",
    show_case_studies: "section-case-studies",
    show_portfolio: "portfolio",
    show_services: "services",
    show_testimonials: "testimonials",
    show_contact: "contact",
  };
  for (const [key, id] of Object.entries(sectionToggles)) {
    if (s[key] === "false") {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    }
  }

  const navLinks = [
    { id: "nav-link-portfolio", textKey: "nav_link_1_text", showKey: "show_portfolio" },
    { id: "nav-link-services", textKey: "nav_link_2_text", showKey: "show_services" },
    { id: "nav-link-results", textKey: "nav_link_3_text", showKey: "show_testimonials" },
  ];
  navLinks.forEach(({ id, textKey, showKey }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (s[textKey]) el.textContent = s[textKey];
    el.hidden = s[showKey] === "false";
  });
  if (s.header_cta_text) document.getElementById("header-cta").textContent = s.header_cta_text;

  cacheTheme(root, s);
}

// Caches the theme-driving CSS variables (and the hero photo URL) so a
// repeat visit can apply them instantly and start fetching the hero photo
// before the Supabase settings fetch even resolves — see the early preload
// script in index.html's <head>.
const THEME_CACHE_KEY = "portfolio_theme_cache";
const CACHED_CSS_VARS = [
  "--bg", "--bg-alt", "--ink", "--accent", "--btn-bg", "--btn-ink", "--btn-radius",
  "--hero-overlay-opacity", "--text-scale", "--display", "--body",
  "--hero-bg", "--hero-bg-position", "--grain-opacity",
];
function cacheTheme(root, s) {
  try {
    const vars = {};
    CACHED_CSS_VARS.forEach(name => {
      const val = root.getPropertyValue(name);
      if (val) vars[name] = val;
    });
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({
      vars, grainOn: document.documentElement.classList.contains("grain-on"),
      heroPhotoUrl: s.hero_video_url ? "" : (s.hero_photo_url || ""),
    }));
  } catch (e) { /* localStorage unavailable — skip caching, no functional impact */ }
}

// ---------- contact form ----------
function setupContactForm(supabase) {
  const form = document.getElementById("contact-form");
  const msg = document.getElementById("form-msg");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      budget: form.budget.value.trim(),
      message: form.message.value.trim(),
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const { error } = await supabase.from("leads").insert(payload);

    submitBtn.disabled = false;
    if (error) {
      msg.textContent = "Something went wrong — please try again or email me directly.";
      msg.className = "form-msg err";
    } else {
      msg.textContent = "Thanks! I'll get back to you soon.";
      msg.className = "form-msg ok";
      form.reset();
    }
  });
}

function disableContactForm(reason) {
  const form = document.getElementById("contact-form");
  const msg = document.getElementById("form-msg");
  form.querySelector("button[type=submit]").disabled = true;
  msg.textContent = reason;
  msg.className = "form-msg err";
}

function showUnavailable(id, note) {
  document.getElementById(id).innerHTML = `<div class="empty-note">${note}</div>`;
}

// ---------- init ----------
// UI-only behaviour (marquees, counters, reveal animations) never depends on
// Supabase loading, so it always runs even if the data layer below fails.
fillMarquee(document.getElementById("marquee-1"), SERVICE_WORDS);
document.getElementById("footer-year").textContent = new Date().getFullYear();

setupReveal();
videoLightbox = setupVideoLightbox();

// Data-backed sections (settings, portfolio, case studies, testimonials,
// contact form) need Supabase — loaded separately so a CDN hiccup degrades
// gracefully instead of breaking the whole page. Counters are started only
// after settings load, so they animate to the real numbers, not defaults.
try {
  const { supabase } = await import("./supabase-client.js");
  await loadSiteSettings(supabase);
  setupCounters();
  setupContactForm(supabase);
  loadCaseStudies(supabase);
  loadServices(supabase);
  loadPortfolio(supabase);
  loadTestimonials(supabase);
  loadBrandLogos(supabase);
} catch (err) {
  setupCounters(); // still animate using the placeholder numbers already in the markup
  console.error("Failed to load Supabase client:", err);
  disableContactForm("Contact form is temporarily unavailable — please email me directly instead.");
  showUnavailable("case-studies", "Content temporarily unavailable — please refresh or try again shortly.");
  showUnavailable("services-grid", "Services temporarily unavailable — please refresh or try again shortly.");
  showUnavailable("portfolio-track", "Portfolio temporarily unavailable — please refresh or try again shortly.");
  showUnavailable("testimonial-track", "Testimonials temporarily unavailable — please refresh or try again shortly.");
  document.getElementById("cat-nav").innerHTML = CATEGORIES.map((cat, i) =>
    `<button class="cat-btn${i === 0 ? " active" : ""}" disabled>${cat.label}</button>`
  ).join("");
}
