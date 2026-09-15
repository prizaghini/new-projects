const CATEGORIES = [
  { key: "ai", label: "AI" },
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

const SERVICE_WORDS = [
  "Conversion UGC", "High-Performance Creatives", "Strategic Scripts",
  "Lifestyle Photos", "E-commerce Content", "UGC Consulting", "Sponsored Posts",
];

const BRAND_LOGO_PLACEHOLDERS = ["Brand", "Brand", "Brand", "Brand", "Brand", "Brand"];

function fillMarquee(el, words) {
  const doubled = [...words, ...words];
  el.innerHTML = doubled.map(w => `<span>${w} ◆</span>`).join("");
}

function youtubeThumb(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
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
      <span class="brand">${cs.brand}</span>
      <b>${cs.headline_stat}</b>
      <p>${cs.description}</p>
    </div>
  `).join("");
}

// ---------- portfolio ----------
let allPortfolioItems = [];

function renderPortfolio(category) {
  const track = document.getElementById("portfolio-track");
  const items = allPortfolioItems.filter(item => item.category === category);
  if (items.length === 0) {
    track.innerHTML = `<div class="empty-note">No items in this category yet — add some from the admin dashboard.</div>`;
    return;
  }
  track.innerHTML = items.map(item => `
    <a class="portfolio-card" href="${item.youtube_id ? `https://youtube.com/watch?v=${item.youtube_id}` : "#"}" target="_blank" rel="noopener">
      <div class="portfolio-thumb">
        ${item.youtube_id ? `<img src="${youtubeThumb(item.youtube_id)}" alt="${item.title}" loading="lazy">` : ""}
      </div>
      <div class="meta"><b>${item.brand}</b><span>${item.title}</span></div>
    </a>
  `).join("");
}

async function loadPortfolio(supabase) {
  const navContainer = document.getElementById("cat-nav");
  navContainer.innerHTML = CATEGORIES.map((cat, i) =>
    `<button class="cat-btn${i === 0 ? " active" : ""}" data-cat="${cat.key}">${cat.label}</button>`
  ).join("");

  const { data } = await supabase.from("portfolio_items").select("*").order("sort_order", { ascending: true });
  allPortfolioItems = data || [];

  navContainer.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      navContainer.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPortfolio(btn.dataset.cat);
    });
  });

  renderPortfolio(CATEGORIES[0].key);
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
document.getElementById("logo-marquee").innerHTML =
  [...BRAND_LOGO_PLACEHOLDERS, ...BRAND_LOGO_PLACEHOLDERS]
    .map(() => `<span class="logo-chip">[Brand logo]</span>`).join("");

setupCounters();
setupReveal();

// Data-backed sections (portfolio, case studies, testimonials, contact form)
// need Supabase — loaded separately so a CDN hiccup degrades gracefully
// instead of breaking the whole page.
try {
  const { supabase } = await import("./supabase-client.js");
  setupContactForm(supabase);
  loadCaseStudies(supabase);
  loadPortfolio(supabase);
  loadTestimonials(supabase);
} catch (err) {
  console.error("Failed to load Supabase client:", err);
  disableContactForm("Contact form is temporarily unavailable — please email me directly instead.");
  showUnavailable("case-studies", "Content temporarily unavailable — please refresh or try again shortly.");
  showUnavailable("portfolio-track", "Portfolio temporarily unavailable — please refresh or try again shortly.");
  showUnavailable("testimonial-track", "Testimonials temporarily unavailable — please refresh or try again shortly.");
  document.getElementById("cat-nav").innerHTML = CATEGORIES.map((cat, i) =>
    `<button class="cat-btn${i === 0 ? " active" : ""}" disabled>${cat.label}</button>`
  ).join("");
}
