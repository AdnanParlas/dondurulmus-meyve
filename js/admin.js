/* =============================================================
   YÖNETİM PANELİ
   Supabase hesabıyla giriş yapılır, leadler merkezi veritabanından
   okunur (tüm cihazlardan gelen kayıtlar). Supabase yoksa yerel
   (localStorage) veriye düşer.
   ============================================================= */

const STORAGE_KEY = "klup_leads";
const gate = document.getElementById("gate");
const admin = document.getElementById("admin");
const pwErr = document.getElementById("pwErr");
let CACHE = [];

/* --- Giriş / oturum --- */
async function tryLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("pw").value;
  pwErr.hidden = true;

  if (!sb) { // Supabase yoksa yalnız yerel veriyle çalış
    showPanel();
    return;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { pwErr.hidden = false; pwErr.textContent = "Giriş başarısız: " + error.message; return; }
  showPanel();
}

async function logout() {
  if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
  location.reload();
}

function showPanel() {
  gate.hidden = true;
  admin.hidden = false;
  renderAll();
}

document.getElementById("loginBtn").addEventListener("click", tryLogin);
document.getElementById("pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
document.getElementById("email").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
document.getElementById("logoutBtn").addEventListener("click", logout);

// Mevcut oturum varsa direkt panele geç
(async function () {
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) showPanel();
    } catch (e) {}
  }
})();

/* --- Veri çekme --- */
// Supabase satırını panelin beklediği şekle çevirir.
function rowToLead(r) {
  return {
    createdAt: r.created_at,
    refNo: r.ref_no,
    group: r.group_type,
    products: r.products || [],
    tonnage: r.tonnage, budget: r.budget, timing: r.timing, experience: r.experience,
    company: r.company, contact: r.contact, phone: r.phone, whatsapp: r.whatsapp,
    email: r.email, location: r.location, port: r.port,
    score: r.score, klass: r.klass, selectedSlot: r.selected_slot,
  };
}

async function loadLeads() {
  const note = document.getElementById("sourceNote");
  if (sb) {
    const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (error) {
      note.innerHTML = "⚠️ Veritabanı okunamadı: " + error.message +
        " — (leads tablosu oluşturuldu mu ve okuma izni verildi mi?)";
      return [];
    }
    note.innerHTML = "✅ Merkezi veritabanı (Supabase) — tüm cihazlardan gelen <b>" +
      data.length + "</b> lead. Yedek için CSV/JSON indirin.";
    return data.map(rowToLead);
  }
  // yedek: localStorage
  note.innerHTML = "ℹ️ Supabase bağlı değil; yalnızca bu tarayıcıdaki kayıtlar gösteriliyor.";
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
}

async function renderAll() {
  CACHE = await loadLeads();
  renderStats(CACHE);
  renderClassDist(CACHE);
  renderProductDist(CACHE);
  renderFieldDist("distTonnage", CACHE, "tonnage");
  renderFieldDist("distBudget", CACHE, "budget");
  renderTable(CACHE);
}

/* --- İstatistikler --- */
function renderStats(leads) {
  const total = leads.length;
  const hotVip = leads.filter(l => l.klass === "Sıcak Lead" || l.klass === "VIP Lead").length;
  const meetings = leads.filter(l => l.selectedSlot).length;
  const conv = total ? Math.round((hotVip / total) * 100) : 0;
  const stats = [
    ["Toplam Lead", total],
    ["Sıcak + VIP", hotVip],
    ["Toplantı seçen", meetings],
    ["Dönüşüm oranı", conv + "%"],
  ];
  document.getElementById("stats").innerHTML = stats
    .map(([s, b]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
}

function distBars(containerId, pairs) {
  const max = Math.max(1, ...pairs.map(p => p[1]));
  document.getElementById(containerId).innerHTML = pairs.length
    ? pairs.map(([lbl, n]) => `
      <div class="dist-row">
        <span class="lbl">${escapeHtml(lbl)}</span>
        <span class="bar"><i style="width:${(n / max) * 100}%"></i></span>
        <span class="val">${n}</span>
      </div>`).join("")
    : `<p class="empty">Veri yok.</p>`;
}

function renderClassDist(leads) {
  const order = ["VIP Lead", "Sıcak Lead", "Takip Edilecek Lead", "Düşük Lead"];
  distBars("distClass", order.map(k => [k, leads.filter(l => l.klass === k).length]));
}
function renderProductDist(leads) {
  const map = {};
  leads.forEach(l => (l.products || []).forEach(p => { map[p] = (map[p] || 0) + 1; }));
  distBars("distProduct", Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15));
}
function renderFieldDist(containerId, leads, field) {
  const map = {};
  leads.forEach(l => { const v = l[field] || "—"; map[v] = (map[v] || 0) + 1; });
  distBars(containerId, Object.entries(map).sort((a, b) => b[1] - a[1]));
}

function renderTable(leads) {
  const table = document.getElementById("leadTable");
  if (!leads.length) {
    table.innerHTML = `<tr><td class="empty">Henüz lead yok.</td></tr>`;
    return;
  }
  const head = `<tr>
    <th>Tarih</th><th>Firma</th><th>Yetkili</th><th>Grup</th><th>Ürünler</th>
    <th>Tonaj</th><th>Bütçe</th><th>Zaman</th><th>Sınıf</th><th>Puan</th>
    <th>Telefon</th><th>E-posta</th><th>Toplantı</th></tr>`;
  const rows = leads.map(l => `<tr>
    <td>${l.createdAt ? new Date(l.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
    <td>${escapeHtml(l.company)}</td>
    <td>${escapeHtml(l.contact)}</td>
    <td>${escapeHtml(l.group)}</td>
    <td>${escapeHtml((l.products || []).join(", "))}</td>
    <td>${escapeHtml(l.tonnage)}</td>
    <td>${escapeHtml(l.budget)}</td>
    <td>${escapeHtml(l.timing)}</td>
    <td><span class="lead-badge lead-${cssClass(l.klass)}">${escapeHtml(l.klass)}</span></td>
    <td>${l.score == null ? "" : l.score}</td>
    <td>${escapeHtml(l.phone)}</td>
    <td>${escapeHtml(l.email)}</td>
    <td>${escapeHtml(l.selectedSlot || "-")}</td>
  </tr>`).join("");
  table.innerHTML = head + rows;
}

/* --- Dışa aktarma --- */
function exportJSON() { download("leadler.json", JSON.stringify(CACHE, null, 2), "application/json"); }
function exportCSV() {
  const cols = ["createdAt","refNo","company","contact","phone","whatsapp","email","location","port",
                "group","products","tonnage","budget","timing","experience","klass","score","selectedSlot"];
  const rows = CACHE.map(l => cols.map(c => {
    let v = l[c];
    if (Array.isArray(v)) v = v.join(" | ");
    return `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  }).join(","));
  download("leadler.csv", "﻿" + [cols.join(","), ...rows].join("\r\n"), "text/csv");
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById("exportCsv").addEventListener("click", exportCSV);
document.getElementById("exportJson").addEventListener("click", exportJSON);
document.getElementById("refresh").addEventListener("click", renderAll);

/* --- yardımcılar --- */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function cssClass(klass) {
  return { "VIP Lead":"vip","Sıcak Lead":"hot","Takip Edilecek Lead":"follow","Düşük Lead":"low" }[klass] || "low";
}
