// ---------- tabs (no backend dependency — must always work) ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

let supabase;
try {
  ({ supabase } = await import("../../js/supabase-client.js"));
} catch (err) {
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  const main = document.querySelector(".main");
  if (main) {
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.style.color = "#B3261E";
    notice.textContent = "Couldn't connect to the backend, so nothing here will load or save right now. Check your connection and refresh.";
    main.prepend(notice);
  }
  throw err;
}

// ---------- auth guard ----------
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = "index.html";
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ---------- site settings ----------
async function uploadToSiteMedia(file, folder) {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

// Fields that upload into a hidden URL field, with a note + optional "remove" checkbox.
// (hero photo / about photo / thumbnails use a *visible* url field instead — see below.)
const HIDDEN_MEDIA_FIELDS = [
  { file: "hero_video_file", url: "hero_video_url", remove: null, folder: "hero", noteId: "hero-video-note",
    setMsg: "A hero video is currently set. Uploading a new one replaces it.",
    unsetMsg: "No hero video set — the hero photo above is used instead." },
  { file: "logo_file", url: "logo_url", remove: "remove_logo", folder: "branding", noteId: "logo-note",
    setMsg: "A logo image is currently set. Uploading a new one replaces it.",
    unsetMsg: "No logo set — the text name is shown instead." },
  { file: "favicon_file", url: "favicon_url", remove: "remove_favicon", folder: "branding", noteId: "favicon-note",
    setMsg: "A custom favicon is currently set. Uploading a new one replaces it.",
    unsetMsg: "No custom favicon set — the default icon is used." },
  { file: "contact_media_file", url: "contact_media_url", remove: "remove_contact_media", folder: "contact", noteId: "contact-media-note",
    setMsg: "A photo/video is currently set next to the contact form. Uploading a new one replaces it.",
    unsetMsg: "No photo/video set next to the contact form." },
  { file: "hero_bg_file", url: "hero_bg_url", remove: "remove_hero_bg", folder: "hero-bg", noteId: "hero-bg-note",
    setMsg: "A hero background image is currently set. Uploading a new one replaces it.",
    unsetMsg: "No hero background image set." },
  { file: "hero_logo_file", url: "hero_logo_url", remove: "remove_hero_logo", folder: "hero", noteId: "hero-logo-note",
    setMsg: "A logo badge is currently set. Uploading a new one replaces it.",
    unsetMsg: "No logo badge set." },
  { file: "hero_bg_video_file", url: "hero_bg_video_url", remove: "remove_hero_bg", folder: "hero-bg", noteId: "hero-bg-video-note",
    setMsg: "A hero background video is currently set — it plays instead of the background image. Uploading a new one replaces it.",
    unsetMsg: "No hero background video set." },
];

// Fields with a plain visible text/URL input — uploading just fills that input.
const VISIBLE_MEDIA_FIELDS = [
  { file: "hero_photo_file", url: "hero_photo_url", folder: "hero" },
  { file: "about_photo_file", url: "about_photo_url", folder: "about" },
];

function refreshAllMediaNotes(form) {
  HIDDEN_MEDIA_FIELDS.forEach(f => {
    const note = document.getElementById(f.noteId);
    note.textContent = form.elements[f.url].value ? f.setMsg : f.unsetMsg;
  });
}

async function setupSettings() {
  const form = document.getElementById("form-settings");
  const msg = document.getElementById("settings-msg");

  const { data } = await supabase.from("site_settings").select("*");
  (data || []).forEach(row => {
    const el = form.elements[row.key];
    if (!el) return;
    if (el.type === "checkbox") el.checked = row.value === "true";
    else el.value = row.value;
  });
  refreshAllMediaNotes(form);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";

    try {
      for (const f of HIDDEN_MEDIA_FIELDS) {
        if (f.remove && form.elements[f.remove].checked) form.elements[f.url].value = "";
        const file = form.elements[f.file].files[0];
        if (file) form.elements[f.url].value = await uploadToSiteMedia(file, f.folder);
      }
      for (const f of VISIBLE_MEDIA_FIELDS) {
        const file = form.elements[f.file].files[0];
        if (file) form.elements[f.url].value = await uploadToSiteMedia(file, f.folder);
      }
    } catch (err) {
      msg.textContent = "Upload failed — " + err.message;
      msg.className = "msg err";
      return;
    }

    const skipNames = new Set(HIDDEN_MEDIA_FIELDS.map(f => f.remove).filter(Boolean));
    const rows = Array.from(form.elements)
      .filter(el => el.name && el.type !== "file" && !skipNames.has(el.name))
      .map(el => ({ key: el.name, value: el.type === "checkbox" ? String(el.checked) : el.value }));

    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) {
      msg.textContent = "Something went wrong — " + error.message;
      msg.className = "msg err";
    } else {
      msg.textContent = "Saved. Refresh your public site to see the changes.";
      msg.className = "msg ok";
      [...HIDDEN_MEDIA_FIELDS, ...VISIBLE_MEDIA_FIELDS].forEach(f => { form.elements[f.file].value = ""; });
      HIDDEN_MEDIA_FIELDS.forEach(f => { if (f.remove) form.elements[f.remove].checked = false; });
      refreshAllMediaNotes(form);
    }
  });
}
setupSettings();

function setupExport() {
  const btn = document.getElementById("export-settings-btn");
  const output = document.getElementById("export-settings-output");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const { data } = await supabase.from("site_settings").select("*");
    const obj = {};
    (data || []).forEach(row => { obj[row.key] = row.value; });
    output.value = JSON.stringify(obj, null, 2);
    output.style.display = "block";
    output.select();
  });
}
setupExport();

// ---------- dynamic portfolio categories ----------
async function setupCategoryOptions() {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "categories").maybeSingle();
  if (!data || !data.value) return;
  const categories = data.value.split("|").map(pair => {
    const [key, label] = pair.split(":");
    return { key: (key || "").trim(), label: (label || key || "").trim() };
  }).filter(c => c.key);
  if (!categories.length) return;

  document.querySelectorAll("select[name=category]").forEach(select => {
    const current = select.value;
    select.innerHTML = categories.map(c => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join("");
    if (categories.some(c => c.key === current)) select.value = current;
  });
}
setupCategoryOptions();

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- generic CRUD section (add / list / edit / delete) ----------
function setupCrudSection({ table, formId, tbodyId, orderCol, renderRow, mapRowToForm, beforeSubmit }) {
  const form = document.getElementById(formId);
  const tbody = document.getElementById(tbodyId);
  let editingId = null;

  async function reload() {
    const { data } = await supabase.from(table).select("*").order(orderCol, { ascending: false });
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="10">Nothing here yet — add one above.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(row => renderRow(row)).join("");

    tbody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = data.find(r => r.id === btn.dataset.edit);
        editingId = row.id;
        mapRowToForm(form, row);
        form.querySelector("button[type=submit]").textContent = "Save changes";
      });
    });
    tbody.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this item?")) return;
        await supabase.from(table).delete().eq("id", btn.dataset.delete);
        reload();
      });
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue; // file inputs are handled by beforeSubmit, not stored directly
      payload[key] = form.elements[key].type === "checkbox" ? form.elements[key].checked : value;
    }
    // unchecked checkboxes are omitted by FormData — fill them in as false
    form.querySelectorAll('input[type=checkbox]').forEach(cb => { payload[cb.name] = cb.checked; });

    if (beforeSubmit) {
      let extra;
      try {
        extra = await beforeSubmit(form);
      } catch (err) {
        alert("Upload failed — " + err.message);
        return;
      }
      Object.assign(payload, extra);
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from(table).update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from(table).insert(payload));
    }
    if (error) {
      alert("Save failed — " + error.message);
      return;
    }
    if (editingId) {
      editingId = null;
      form.querySelector("button[type=submit]").textContent = form.dataset.addLabel || "Add";
    }
    form.reset();
    reload();
  });

  reload();
}

// ---------- portfolio ----------
setupCrudSection({
  table: "portfolio_items",
  formId: "form-portfolio",
  tbodyId: "table-portfolio",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${esc(row.category)}</td><td>${esc(row.brand)}</td><td>${esc(row.title)}</td>
    <td>${esc(row.platform)}</td>
    <td>${row.video_file_path ? "Yes" : ""}</td>
    <td>${row.featured_ad ? "Yes" : ""}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.category.value = row.category;
    form.brand.value = row.brand;
    form.title.value = row.title;
    form.platform.value = row.platform || "other";
    form.link_url.value = row.link_url || "";
    form.thumbnail_url.value = row.thumbnail_url || "";
    form.start_seconds.value = row.start_seconds || 0;
    form.featured_ad.checked = !!row.featured_ad;
    document.getElementById("portfolio-video-note").textContent = row.video_file_path
      ? `Video already uploaded: ${row.video_file_path} — choose a file above to replace it.`
      : "No video uploaded — using the link above instead.";
  },
  beforeSubmit: async form => {
    const extra = {};
    const videoFile = form.elements.video_file.files[0];
    if (videoFile) {
      const path = `portfolio/${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("site-media").upload(path, videoFile);
      if (error) throw error;
      extra.video_file_path = path;
    }
    const thumbFile = form.elements.thumbnail_file.files[0];
    if (thumbFile) {
      extra.thumbnail_url = await uploadToSiteMedia(thumbFile, "portfolio-thumbs");
    }
    return extra;
  },
});

// ---------- brand logos ----------
setupCrudSection({
  table: "brand_logos",
  formId: "form-logos",
  tbodyId: "table-logos",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td><img src="${esc(row.image_url)}" alt="" style="height:28px;width:auto;max-width:90px;object-fit:contain"></td>
    <td>${esc(row.brand_name)}</td><td>${row.sort_order}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.image_url.value = row.image_url;
    form.brand_name.value = row.brand_name || "";
    form.link_url.value = row.link_url || "";
    form.sort_order.value = row.sort_order || 0;
  },
  beforeSubmit: async form => {
    const file = form.elements.image_file.files[0];
    if (file) return { image_url: await uploadToSiteMedia(file, "brand-logos") };
    if (!form.elements.image_url.value) throw new Error("Please choose a logo image.");
    return {};
  },
});

// ---------- case studies ----------
setupCrudSection({
  table: "case_studies",
  formId: "form-case-studies",
  tbodyId: "table-case-studies",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${row.image_url ? `<img src="${esc(row.image_url)}" alt="" style="height:28px;width:auto;max-width:90px;object-fit:cover">` : ""}</td>
    <td>${esc(row.brand)}</td><td>${esc(row.headline_stat)}</td><td>${row.sort_order}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.brand.value = row.brand;
    form.headline_stat.value = row.headline_stat;
    form.description.value = row.description;
    form.image_url.value = row.image_url || "";
    form.sort_order.value = row.sort_order || 0;
  },
  beforeSubmit: async form => {
    const file = form.elements.image_file.files[0];
    if (file) return { image_url: await uploadToSiteMedia(file, "case-studies") };
    return {};
  },
});

// ---------- services ----------
setupCrudSection({
  table: "services",
  formId: "form-services",
  tbodyId: "table-services",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${row.image_url ? `<img src="${esc(row.image_url)}" alt="" style="height:28px;width:auto;max-width:90px;object-fit:cover">` : ""}</td>
    <td>${esc(row.title)}</td><td>${row.sort_order}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.title.value = row.title;
    form.description.value = row.description;
    form.image_url.value = row.image_url || "";
    form.sort_order.value = row.sort_order || 0;
  },
  beforeSubmit: async form => {
    const file = form.elements.image_file.files[0];
    if (file) return { image_url: await uploadToSiteMedia(file, "services") };
    return {};
  },
});

// ---------- testimonials ----------
setupCrudSection({
  table: "testimonials",
  formId: "form-testimonials",
  tbodyId: "table-testimonials",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${row.image_url ? `<img src="${esc(row.image_url)}" alt="" style="height:28px;width:auto;max-width:90px;object-fit:cover">` : ""}</td>
    <td>${esc(row.brand_handle)}</td><td>${row.sort_order}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.brand_handle.value = row.brand_handle || "";
    form.title.value = row.title || "";
    form.quote.value = row.quote || "";
    form.result_stat.value = row.result_stat || "";
    form.image_url.value = row.image_url || "";
    form.photo_url.value = row.photo_url || "";
    form.sort_order.value = row.sort_order || 0;
  },
  beforeSubmit: async form => {
    const extra = {};
    const imageFile = form.elements.image_file.files[0];
    if (imageFile) extra.image_url = await uploadToSiteMedia(imageFile, "testimonials");
    const photoFile = form.elements.photo_file.files[0];
    if (photoFile) extra.photo_url = await uploadToSiteMedia(photoFile, "testimonials");
    return extra;
  },
});

// ---------- checklist notes ----------
setupCrudSection({
  table: "checklist_notes",
  formId: "form-checklist",
  tbodyId: "table-checklist",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${esc(row.category)}</td><td>${esc(row.notes)}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.category.value = row.category;
    form.notes.value = row.notes;
  },
});

// ---------- calendar ----------
setupCrudSection({
  table: "calendar_events",
  formId: "form-calendar",
  tbodyId: "table-calendar",
  orderCol: "event_date",
  renderRow: row => `<tr>
    <td>${esc(row.event_date)}</td><td>${esc(row.title)}</td><td>${esc(row.event_type)}</td><td>${esc(row.status)}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.title.value = row.title;
    form.event_type.value = row.event_type;
    form.event_date.value = row.event_date;
    form.status.value = row.status;
  },
});

// ---------- campaigns ----------
setupCrudSection({
  table: "campaigns",
  formId: "form-campaigns",
  tbodyId: "table-campaigns",
  orderCol: "created_at",
  renderRow: row => `<tr>
    <td>${esc(row.name)}</td><td>${esc(row.brand)}</td><td>${esc(row.status)}</td><td>${esc(row.deadline)}</td>
    <td class="actions-cell"><button data-edit="${row.id}">Edit</button><button data-delete="${row.id}">Delete</button></td>
  </tr>`,
  mapRowToForm: (form, row) => {
    form.name.value = row.name;
    form.brand.value = row.brand || "";
    form.status.value = row.status;
    form.deadline.value = row.deadline || "";
    form.notes.value = row.notes || "";
  },
});

// ---------- leads (read + status update + delete, no add form) ----------
async function loadLeads() {
  const tbody = document.getElementById("table-leads");
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No leads yet — they'll show up here when someone submits your contact form.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(lead => `<tr>
    <td>${new Date(lead.created_at).toLocaleDateString()}</td>
    <td>${esc(lead.name)}</td><td>${esc(lead.email)}</td><td>${esc(lead.company)}</td><td>${esc(lead.budget)}</td>
    <td><select data-status="${lead.id}">
      ${["new", "contacted", "won", "lost"].map(s => `<option value="${s}"${lead.status === s ? " selected" : ""}>${s}</option>`).join("")}
    </select></td>
    <td class="actions-cell"><button data-delete-lead="${lead.id}">Delete</button></td>
  </tr>`).join("");

  tbody.querySelectorAll("[data-status]").forEach(sel => {
    sel.addEventListener("change", async () => {
      await supabase.from("leads").update({ status: sel.value }).eq("id", sel.dataset.status);
    });
  });
  tbody.querySelectorAll("[data-delete-lead]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this lead?")) return;
      await supabase.from("leads").delete().eq("id", btn.dataset.deleteLead);
      loadLeads();
    });
  });
}
loadLeads();
