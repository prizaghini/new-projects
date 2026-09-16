import { supabase } from "../../js/supabase-client.js";

// ---------- auth guard ----------
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = "index.html";
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ---------- tabs ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- site settings ----------
async function uploadToSiteMedia(file, folder) {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

async function setupSettings() {
  const form = document.getElementById("form-settings");
  const msg = document.getElementById("settings-msg");
  const heroVideoNote = document.getElementById("hero-video-note");

  const { data } = await supabase.from("site_settings").select("*");
  (data || []).forEach(row => {
    if (form.elements[row.key]) form.elements[row.key].value = row.value;
  });
  heroVideoNote.textContent = form.elements.hero_video_url.value
    ? "A hero video is currently set. Uploading a new one replaces it."
    : "No hero video set — the hero photo above is used instead.";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";

    const heroVideoFile = form.elements.hero_video_file.files[0];
    if (heroVideoFile) {
      try {
        form.elements.hero_video_url.value = await uploadToSiteMedia(heroVideoFile, "hero");
      } catch (err) {
        msg.textContent = "Hero video upload failed — " + err.message;
        msg.className = "msg err";
        return;
      }
    }

    const rows = Array.from(form.elements)
      .filter(el => el.name && el.type !== "file")
      .map(el => ({ key: el.name, value: el.value }));

    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) {
      msg.textContent = "Something went wrong — " + error.message;
      msg.className = "msg err";
    } else {
      msg.textContent = "Saved. Refresh your public site to see the changes.";
      msg.className = "msg ok";
      form.elements.hero_video_file.value = "";
      heroVideoNote.textContent = form.elements.hero_video_url.value
        ? "A hero video is currently set. Uploading a new one replaces it."
        : "No hero video set — the hero photo above is used instead.";
    }
  });
}
setupSettings();

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

    if (editingId) {
      await supabase.from(table).update(payload).eq("id", editingId);
      editingId = null;
      form.querySelector("button[type=submit]").textContent = form.dataset.addLabel || "Add";
    } else {
      await supabase.from(table).insert(payload);
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
    const file = form.elements.video_file.files[0];
    if (!file) return {};
    const path = `portfolio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file);
    if (error) throw error;
    return { video_file_path: path };
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
