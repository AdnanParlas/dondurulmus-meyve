/* =============================================================
   YÖNETİM PANELİ (CRM)  — Aa.txt madde 17,18,19,20
   Supabase hesabıyla giriş → merkezi leadler.
   Müşteri kartı: tüm bilgiler + durum + admin notu + takip tarihi.
   Filtreler + durum dağılımı. Supabase yoksa localStorage yedeği.
   ============================================================= */

const STORAGE_KEY = "klup_leads";
const gate = document.getElementById("gate");
const admin = document.getElementById("admin");
const pwErr = document.getElementById("pwErr");
let CACHE = [];
let activeStatus = "Tümü";
let activeAction = "Tüm aksiyonlar";
let SELECTED = new Set();   // çoklu seçim: lead anahtarları (Supabase'de id, yereldeyse refNo)

// Supabase kaydında id, localStorage yedeğinde refNo tekil anahtardır.
const leadKey = l => (l.id != null ? l.id : l.refNo);

const RLS_UYARI =
  "Silinemedi — 0 satır etkilendi.\n\n" +
  "Supabase'de leads tablosu için DELETE politikası tanımlı değil, " +
  "bu yüzden silme isteği sessizce reddediliyor.\n\n" +
  "Çözüm: Supabase → SQL Editor'de DELETE politikasını ekle " +
  "(SUPABASE-KURULUM.md içindeki SQL).";

// Lead durumları (yeni CRM akışı)
const STATUSES = [
  "Yeni lead", "İncelenecek", "WhatsApp gönderildi", "Cevap bekleniyor", "Görüşme yapıldı",
  "Teklif hazırlanıyor", "Teklif gönderildi", "Karar bekleniyor", "Siparişe döndü", "Kapatıldı",
];
// Kart alanı seçenekleri
const CALL_RESULTS  = ["Seçilmedi","Ulaşıldı","Ulaşılamadı","Meşgul / sonra","Geri aranacak","Yanlış numara","İlgilenmiyor"];
const NEXT_ACTIONS  = ["Seçilmedi","Ara","WhatsApp gönder","Teklif hazırla","Teklif gönder","Toplantı planla","Numune/evrak iste","Takibe al","Kapat"];
const CLOSE_REASONS = ["Seçilmedi","Fiyat yüksek","Rakip firmayı seçti","Zamanlama uygun değil","İlgilenmiyor","Ulaşılamadı","Bütçe yetersiz","Diğer"];

// funnel'dan gelen eski status alanı için (geriye uyum; leadStatus'tan ayrı)
function normStatus(s) {
  if (!s || s === "Yeni") return "Yeni lead";
  if (s === "Toplantı Planlandı") return "Toplantı planlandı";
  return s;
}
// leadStatus -> renk sınıfı
function statusClass(s) {
  return {
    "Yeni lead":"ls-yeni", "İncelenecek":"ls-incele", "WhatsApp gönderildi":"ls-wa",
    "Cevap bekleniyor":"ls-cevap", "Görüşme yapıldı":"ls-gorusme", "Teklif hazırlanıyor":"ls-thaz",
    "Teklif gönderildi":"ls-tgon", "Karar bekleniyor":"ls-karar", "Siparişe döndü":"ls-siparis",
    "Kapatıldı":"ls-kapali",
  }[s] || "ls-incele";
}
// Bugün (YYYY-AA-GG)
function todayStr() { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

// Lead durumu filtreleri
const STATUS_FILTERS = ["Tümü","Yeni lead","İncelenecek","Cevap bekleniyor","Teklif hazırlanıyor","Teklif gönderildi","Karar bekleniyor","Siparişe döndü","Kapatıldı"];
// Aksiyon filtreleri (takip tarihine göre)
const ACTION_FILTERS = ["Tüm aksiyonlar","Bugün takip edilecekler","Geciken takipler","Takip tarihi olmayanlar"];

/* --- Giriş / oturum --- */
async function tryLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("pw").value;
  pwErr.hidden = true;
  if (!sb) { showPanel(); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { pwErr.hidden = false; pwErr.textContent = "Giriş başarısız: " + error.message; return; }
  showPanel();
}
async function logout() {
  if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
  location.reload();
}
function showPanel() { gate.hidden = true; admin.hidden = false; renderFilters(); renderAll(); initAvail(); }

document.getElementById("loginBtn").addEventListener("click", tryLogin);
document.getElementById("pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
document.getElementById("email").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
document.getElementById("logoutBtn").addEventListener("click", logout);

(async function () {
  if (sb) {
    try { const { data } = await sb.auth.getSession(); if (data && data.session) showPanel(); } catch (e) {}
  }
})();

/* --- Veri çekme --- */
function rowToLead(r) {
  return {
    id: r.id, createdAt: r.created_at, refNo: r.ref_no,
    group: r.group_type, products: r.products || [],
    tonnage: r.tonnage, budget: r.budget, timing: r.timing, experience: r.experience,
    company: r.company, contact: r.contact, phone: r.phone, whatsapp: r.whatsapp,
    email: r.email, location: r.location, port: r.port,
    score: r.score, klass: r.klass, leadGroup: r.lead_group,
    waShown: r.wa_shown, meetingShown: r.meeting_shown,
    selectedSlot: r.selected_slot, status: normStatus(r.status),
    // Yeni CRM alanları (yoksa varsayılan — eski kayıtlar bozulmaz)
    leadStatus: r.lead_status || "İncelenecek",
    callResult: r.call_result || "Seçilmedi",
    nextAction: r.next_action || "Seçilmedi",
    followUpDate: r.next_followup || "",
    closeReason: r.close_reason || "",
    adminNote: r.notes || "",
  };
}
function localLeads() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(l =>
      Object.assign({ status: "Yeni lead", notes: "", nextFollowup: "",
        leadStatus: "İncelenecek", callResult: "Seçilmedi", nextAction: "Seçilmedi",
        followUpDate: l.nextFollowup || "", closeReason: "", adminNote: l.notes || "",
        leadGroup: l.leadGroup, waShown: l.showWhatsapp, meetingShown: l.showMeeting },
        l, { status: normStatus(l.status) }));
  } catch (e) { return []; }
}

async function loadLeads() {
  const note = document.getElementById("sourceNote");
  if (sb) {
    const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (error) {
      note.innerHTML = "⚠️ Veritabanı okunamadı: <b>" + escapeHtml(error.message) + "</b>. " +
        "SUPABASE-KURULUM.md'deki SQL'i çalıştırdın mı? (Şimdilik bu tarayıcıdaki kayıtlar gösteriliyor.)";
      return localLeads();
    }
    note.innerHTML = "✅ Merkezi veritabanı (Supabase) — toplam <b>" + data.length + "</b> lead.";
    return data.map(rowToLead);
  }
  note.innerHTML = "ℹ️ Supabase bağlı değil; yalnızca bu tarayıcıdaki kayıtlar gösteriliyor.";
  return localLeads();
}

async function renderAll() {
  CACHE = await loadLeads();
  // Artık var olmayan (silinmiş) leadler seçimde asılı kalmasın
  const mevcut = new Set(CACHE.map(leadKey));
  SELECTED.forEach(k => { if (!mevcut.has(k)) SELECTED.delete(k); });
  renderStats(CACHE);
  renderStatusDist(CACHE);
  renderClassDist(CACHE);
  renderProductDist(CACHE);
  renderFieldDist("distTonnage", CACHE, "tonnage");
  renderFieldDist("distBudget", CACHE, "budget");
  renderFilters();
  renderTable(getFiltered());
  renderFunnel();
}

function matchStatusFilter(l) { return activeStatus === "Tümü" || l.leadStatus === activeStatus; }
function matchActionFilter(l) {
  const t = todayStr();
  if (activeAction === "Tüm aksiyonlar") return true;
  if (activeAction === "Bugün takip edilecekler") return l.followUpDate === t;
  if (activeAction === "Geciken takipler") return l.followUpDate && l.followUpDate < t;
  if (activeAction === "Takip tarihi olmayanlar") return !l.followUpDate;
  return true;
}
function getFiltered() { return CACHE.filter(l => matchStatusFilter(l) && matchActionFilter(l)); }

function statusCount(name) { return name === "Tümü" ? CACHE.length : CACHE.filter(l => l.leadStatus === name).length; }
function actionCount(name) {
  const t = todayStr();
  if (name === "Tüm aksiyonlar") return CACHE.length;
  if (name === "Bugün takip edilecekler") return CACHE.filter(l => l.followUpDate === t).length;
  if (name === "Geciken takipler") return CACHE.filter(l => l.followUpDate && l.followUpDate < t).length;
  return CACHE.filter(l => !l.followUpDate).length;
}

/* --- Filtre butonları (durum + aksiyon) --- */
function renderFilters() {
  const sf = document.getElementById("filters");
  if (sf) {
    sf.innerHTML = "";
    STATUS_FILTERS.forEach(name => {
      const b = document.createElement("button");
      b.className = "filter-btn" + (name === activeStatus ? " is-active" : "");
      b.innerHTML = escapeHtml(name) + ` <span class="cnt">${statusCount(name)}</span>`;
      b.addEventListener("click", () => { activeStatus = name; renderFilters(); renderTable(getFiltered()); });
      sf.appendChild(b);
    });
  }
  const af = document.getElementById("actionFilters");
  if (af) {
    af.innerHTML = "";
    ACTION_FILTERS.forEach(name => {
      const b = document.createElement("button");
      b.className = "filter-btn" + (name === activeAction ? " is-active" : "");
      b.innerHTML = escapeHtml(name) + ` <span class="cnt">${actionCount(name)}</span>`;
      b.addEventListener("click", () => { activeAction = name; renderFilters(); renderTable(getFiltered()); });
      af.appendChild(b);
    });
  }
}

/* --- İstatistikler --- */
function renderStats(leads) {
  const total = leads.length;
  const hotVip = leads.filter(l => l.klass === "Sıcak Lead" || l.klass === "VIP Lead").length;
  const meetings = leads.filter(l => l.selectedSlot).length;
  const orders = leads.filter(l => l.leadStatus === "Siparişe döndü").length;
  const stats = [
    ["Toplam Lead", total],
    ["Sıcak + VIP", hotVip],
    ["Toplantı", meetings],
    ["Siparişe Dönen", orders],
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
function renderStatusDist(leads) {
  const pairs = STATUSES.map(s => [s, leads.filter(l => l.leadStatus === s).length]).filter(p => p[1] > 0);
  distBars("distStatus", pairs);
}
function renderClassDist(leads) {
  const order = ["VIP Lead", "Sıcak Lead", "Takip Edilecek Lead", "Düşük Öncelikli Lead"];
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

/* --- Tablo (tıklanabilir satırlar) --- */
function renderTable(leads) {
  const table = document.getElementById("leadTable");
  if (!leads.length) {
    table.innerHTML = `<tr><td class="empty">Bu filtrede lead yok.</td></tr>`;
    updateBulkBar(leads);   // çubuk eski sayıyla asılı kalmasın
    return;
  }
  const head = `<tr>
    <th class="c-sel"><input type="checkbox" id="selAll" title="Görünen tümünü seç" aria-label="Görünen tümünü seç"></th>
    <th>Tarih</th><th>Firma</th><th>Tonaj</th><th>Sınıf</th>
    <th>Durum</th><th>Sonraki takip</th><th>Telefon</th><th>Sil</th></tr>`;
  const rows = leads.map((l, idx) => `<tr class="clickable" data-idx="${idx}">
    <td class="c-sel" data-label="Seç"><input type="checkbox" class="row-sel" data-idx="${idx}"
      ${SELECTED.has(leadKey(l)) ? "checked" : ""} aria-label="Bu lead'i seç"></td>
    <td data-label="Tarih">${l.createdAt ? new Date(l.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
    <td data-label="Firma">${escapeHtml(l.company)}</td>
    <td data-label="Tonaj">${escapeHtml(l.tonnage)}</td>
    <td data-label="Sınıf"><span class="lead-badge lead-${cssClass(l.klass)}">${escapeHtml(klassShort(l.klass))}</span></td>
    <td data-label="Durum"><span class="status-badge ${statusClass(l.leadStatus)}">${escapeHtml(l.leadStatus)}</span></td>
    <td data-label="Sonraki takip">${followCell(l.followUpDate)}</td>
    <td data-label="Telefon">${escapeHtml(l.phone)}</td>
    <td data-label="Sil"><button class="row-del" data-idx="${idx}" title="Bu lead'i sil" aria-label="Sil">🗑️</button></td>
  </tr>`).join("");
  table.innerHTML = head + rows;
  table.querySelectorAll("tr.clickable").forEach(tr => {
    tr.addEventListener("click", () => openCard(leads[+tr.dataset.idx]));
  });
  table.querySelectorAll(".row-del").forEach(b => {
    // Satır tıklaması kartı açıyor; silme butonu onu tetiklemesin.
    b.addEventListener("click", e => { e.stopPropagation(); deleteLead(leads[+b.dataset.idx], b); });
  });
  table.querySelectorAll(".row-sel").forEach(c => {
    c.addEventListener("click", e => e.stopPropagation()); // kart açılmasın
    c.addEventListener("change", e => {
      const k = leadKey(leads[+c.dataset.idx]);
      e.target.checked ? SELECTED.add(k) : SELECTED.delete(k);
      updateBulkBar(leads);
    });
  });
  const all = document.getElementById("selAll");
  if (all) all.addEventListener("change", e => {
    leads.forEach(l => e.target.checked ? SELECTED.add(leadKey(l)) : SELECTED.delete(leadKey(l)));
    renderTable(leads);
  });
  updateBulkBar(leads);
}

/* --- Çoklu seçim çubuğu --- */
function updateBulkBar(leads) {
  const bar = document.getElementById("bulkBar");
  if (!bar) return;
  bar.hidden = SELECTED.size === 0;
  const cnt = document.getElementById("bulkCount");
  if (cnt) cnt.textContent = SELECTED.size + " lead seçildi";

  // Başlık kutusu: görünenlerin hepsi seçiliyse dolu, bir kısmıysa karışık
  const all = document.getElementById("selAll");
  if (all) {
    const secili = leads.filter(l => SELECTED.has(leadKey(l))).length;
    all.checked = leads.length > 0 && secili === leads.length;
    all.indeterminate = secili > 0 && secili < leads.length;
  }
}

/* --- Seçilenleri toplu sil --- */
async function bulkDelete() {
  const keys = [...SELECTED];
  if (!keys.length) return;
  if (!confirm(`${keys.length} lead silinecek.\n\nBu işlem geri alınamaz. Emin misiniz?`)) return;

  const btn = document.getElementById("bulkDel");
  const eski = btn.textContent;
  btn.disabled = true; btn.textContent = "Siliniyor…";

  if (sb) {
    const res = await sbAdminDeleteMany(keys);
    if (res.error === "rls") { alert(RLS_UYARI); btn.disabled = false; btn.textContent = eski; return; }
    if (res.error) {
      alert("Silinemedi: " + res.error + (res.deleted ? `\n\n${res.deleted} lead silindikten sonra durdu.` : ""));
    }
  } else {
    try {
      const arr = (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).filter(l => !SELECTED.has(l.refNo));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) { alert("Silinemedi: " + e); }
  }

  SELECTED.clear();
  btn.disabled = false; btn.textContent = eski;
  await renderAll();
}

/* --- Lead silme (satır butonu) --- */
async function deleteLead(lead, btn) {
  const ad = lead.company || lead.contact || lead.refNo || "Bu lead";
  if (!confirm(`"${ad}" silinecek.\n\nBu işlem geri alınamaz. Emin misiniz?`)) return;

  const eski = btn.textContent;
  btn.disabled = true; btn.textContent = "…";

  if (sb && lead.id) {
    const res = await sbAdminDelete(lead.id);
    if (res.error === "rls") {
      alert(RLS_UYARI);
      btn.disabled = false; btn.textContent = eski; return;
    }
    if (res.error) {
      alert("Silinemedi: " + res.error);
      btn.disabled = false; btn.textContent = eski; return;
    }
  } else {
    // Supabase yoksa localStorage yedeğinden sil
    try {
      const arr = (JSON.parse(localStorage.getItem(STORAGE_KEY)) || [])
        .filter(l => l.refNo !== lead.refNo);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) { alert("Silinemedi: " + e); btn.disabled = false; btn.textContent = eski; return; }
  }

  await renderAll();
}

/* --- Müşteri Kartı (CRM) --- */
const overlay = document.getElementById("overlay");
document.getElementById("cardClose").addEventListener("click", closeCard);
overlay.addEventListener("click", e => { if (e.target === overlay) closeCard(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeCard(); });
function closeCard() { overlay.hidden = true; }

function openCard(lead) {
  document.getElementById("cardTitle").textContent = lead.company || lead.contact || "Müşteri Kartı";
  document.getElementById("cardRef").textContent =
    (lead.refNo ? "Talep No: " + lead.refNo + "  •  " : "") +
    (lead.createdAt ? new Date(lead.createdAt).toLocaleString("tr-TR") : "");

  const kv = (s, v) => `<div><span>${s}</span><b>${escapeHtml(v || "-")}</b></div>`;
  const yn = (v) => v ? "Evet" : "Hayır";
  const opt = (list, sel) => list.map(o => `<option${o === sel ? " selected" : ""}>${escapeHtml(o)}</option>`).join("");

  document.getElementById("cardBody").innerHTML = `
    <div class="kv">
      ${kv("Ad soyad (yetkili)", lead.contact)}
      ${kv("Firma adı", lead.company)}
      ${kv("Telefon", lead.phone)}
      ${kv("WhatsApp", lead.whatsapp)}
      ${kv("Şehir", lead.location)}
      ${kv("Liman", lead.port)}
      ${kv("Ürün tipi", lead.group)}
      ${kv("Girilen ürünler", (lead.products || []).join(", "))}
      ${kv("Tonaj", lead.tonnage)}
      ${kv("Bütçe", lead.budget)}
      ${kv("İthalat zamanı", lead.timing)}
      ${kv("Daha önce ithalat?", lead.experience)}
      ${kv("Lead grubu", lead.leadGroup)}
      ${kv("Lead etiketi", lead.klass)}
      ${kv("Lead puanı", lead.score == null ? "-" : String(lead.score))}
      ${kv("WhatsApp gösterildi mi?", yn(lead.waShown))}
      ${kv("Toplantı gösterildi mi?", yn(lead.meetingShown))}
      ${kv("Seçilen görüşme", lead.selectedSlot)}
    </div>

    <div class="edit-grid">
      <div class="field"><label class="field-label">Lead durumu</label><select id="stSelect" class="text-input">${opt(STATUSES, lead.leadStatus)}</select></div>
      <div class="field"><label class="field-label">Arama sonucu</label><select id="stCall" class="text-input">${opt(CALL_RESULTS, lead.callResult)}</select></div>
      <div class="field"><label class="field-label">Sonraki aksiyon</label><select id="stNext" class="text-input">${opt(NEXT_ACTIONS, lead.nextAction)}</select></div>
      <div class="field"><label class="field-label">Sonraki takip tarihi</label><input id="stFollow" class="text-input" type="date" value="${escapeHtml(lead.followUpDate || "")}"></div>
      <div class="field full"><label class="field-label">Kapatma nedeni <span style="font-weight:400;text-transform:none">(yalnızca “Kapatıldı” durumunda)</span></label><select id="stClose" class="text-input">${opt(CLOSE_REASONS, lead.closeReason)}</select></div>
      <div class="field full"><label class="field-label">Admin notu</label><textarea id="stNotes" class="text-input" placeholder="Görüşme notu, hatırlatma, teklif detayı...">${escapeHtml(lead.adminNote || "")}</textarea></div>
    </div>

    <div class="card-actions">
      <button class="btn btn--cta" id="stSave" style="flex:1">💾 Kaydet</button>
      <a class="btn btn--wa" id="stWa" target="_blank" rel="noopener">📲 WhatsApp</a>
    </div>
    <p id="stMsg" style="margin:10px 0 0"></p>
  `;

  const waNum = ((lead.whatsapp || lead.phone) || "").replace(/[^0-9]/g, "").replace(/^0/, "90");
  const waBtn = document.getElementById("stWa");
  if (waNum.length >= 10) waBtn.href = "https://wa.me/" + waNum;
  else waBtn.style.display = "none";

  document.getElementById("stSave").addEventListener("click", () => saveCard(lead));
  overlay.hidden = false;
}

async function saveCard(lead) {
  const msg = document.getElementById("stMsg");
  lead.leadStatus   = document.getElementById("stSelect").value;
  lead.callResult   = document.getElementById("stCall").value;
  lead.nextAction   = document.getElementById("stNext").value;
  lead.followUpDate = document.getElementById("stFollow").value;
  lead.closeReason  = document.getElementById("stClose").value;
  lead.adminNote    = document.getElementById("stNotes").value;

  const refresh = () => { renderStatusDist(CACHE); renderStats(CACHE); renderFilters(); renderTable(getFiltered()); };

  if (sb && lead.id != null) {
    msg.textContent = "Kaydediliyor…"; msg.className = "muted";
    const full = {
      lead_status: lead.leadStatus, call_result: lead.callResult, next_action: lead.nextAction,
      close_reason: lead.closeReason, next_followup: lead.followUpDate || null, notes: lead.adminNote,
    };
    let res = await sbAdminUpdate(lead.id, full);
    if (res.error && /column|schema cache|PGRST204/i.test(res.error)) {
      // Yeni kolonlar henüz eklenmemiş -> mevcut kolonları kaydet (kalanlar bu oturumda görünür)
      res = await sbAdminUpdate(lead.id, { next_followup: lead.followUpDate || null, notes: lead.adminNote });
      if (!res.error) {
        msg.innerHTML = "✓ Kaydedildi. <b>Not:</b> Durum/aksiyon alanlarının kalıcı olması için Supabase'e yeni kolonları ekleyin (kurulum SQL'i).";
        msg.className = "save-ok"; refresh(); return;
      }
    }
    if (res.error) { msg.textContent = "Hata: " + res.error; msg.className = "form-err"; return; }
    msg.textContent = "✓ Kaydedildi"; msg.className = "save-ok";
  } else {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      const i = arr.findIndex(x => x.refNo === lead.refNo);
      if (i >= 0) {
        Object.assign(arr[i], {
          leadStatus: lead.leadStatus, callResult: lead.callResult, nextAction: lead.nextAction,
          followUpDate: lead.followUpDate, closeReason: lead.closeReason, adminNote: lead.adminNote,
          notes: lead.adminNote, nextFollowup: lead.followUpDate,
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      }
    } catch (e) {}
    msg.textContent = "✓ Kaydedildi (yerel)"; msg.className = "save-ok";
  }
  refresh();
}

/* --- Dışa aktarma --- */
function exportJSON() { download("leadler.json", JSON.stringify(CACHE, null, 2), "application/json"); }
function exportCSV() {
  const cols = ["createdAt","refNo","company","contact","phone","whatsapp","location","port",
                "group","products","tonnage","budget","timing","experience","leadGroup","klass","score",
                "selectedSlot","leadStatus","callResult","nextAction","followUpDate","closeReason","adminNote"];
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
document.getElementById("impFile").addEventListener("change", impDosyaSecildi);
document.getElementById("impRun").addEventListener("click", impCalistir);
document.getElementById("funnelRange").addEventListener("change", e => {
  funnelGun = +e.target.value; renderFunnel();
});
document.getElementById("bulkDel").addEventListener("click", bulkDelete);
document.getElementById("bulkClear").addEventListener("click", () => {
  SELECTED.clear(); renderTable(getFiltered());
});
document.getElementById("exportCsv").addEventListener("click", exportCSV);
document.getElementById("exportJson").addEventListener("click", exportJSON);
document.getElementById("refresh").addEventListener("click", renderAll);

/* --- Funnel düşüş raporu (ziyaretçi hangi adımda vazgeçti?) --- */
const FUNNEL_ADIMLAR = [
  { key: "landing",    ad: "Siteye girdi" },
  { key: "start",      ad: "“Teklif Al”a bastı" },
  { key: "group",      ad: "1. Ürün grubu" },
  { key: "products",   ad: "2. Ürün seçimi" },
  { key: "tonnage",    ad: "3. Tonaj" },
  { key: "budget",     ad: "4. Bütçe" },
  { key: "timing",     ad: "5. Zamanlama" },
  { key: "experience", ad: "6. Tecrübe" },
  { key: "contact",    ad: "7. İletişim formu" },
  { key: "finish",     ad: "✅ Talebi gönderdi" },
];

let funnelGun = 30;

async function renderFunnel() {
  const box = document.getElementById("funnelReport");
  if (!box) return;
  box.innerHTML = '<p class="muted">Yükleniyor…</p>';

  const { rows, error } = await sbFunnelEvents(funnelGun);
  if (error) {
    const yok = /does not exist|schema cache|PGRST205/i.test(error);
    box.innerHTML = yok
      ? '<p class="muted">📋 Takip tablosu henüz kurulmamış. <b>SUPABASE-KURULUM.md → bölüm 1b</b>’deki SQL’i çalıştırın; sonra ziyaretçiler geldikçe rapor burada dolar.</p>'
      : '<p class="muted">Rapor okunamadı: ' + escapeHtml(error) + '</p>';
    return;
  }

  // Adım -> kaç FARKLI ziyaretçi ulaştı
  const sayac = {};
  FUNNEL_ADIMLAR.forEach(a => sayac[a.key] = new Set());
  rows.forEach(r => { if (sayac[r.step]) sayac[r.step].add(r.session_id); });

  const giren = sayac.landing.size;
  if (!giren) {
    box.innerHTML = '<p class="muted">Bu dönemde ziyaretçi kaydı yok. (Takip yeni kurulduysa ilk ziyaretçileri bekleyin.)</p>';
    return;
  }

  const bitiren = sayac.finish.size;
  const oran = giren ? ((bitiren / giren) * 100).toFixed(1) : "0";

  let html =
    '<div class="fn-top">' +
      '<div class="fn-kpi"><b>' + giren + '</b><span>siteye giren</span></div>' +
      '<div class="fn-kpi"><b>' + bitiren + '</b><span>form gönderen</span></div>' +
      '<div class="fn-kpi"><b>%' + oran + '</b><span>dönüşüm</span></div>' +
    '</div>';

  let onceki = null;
  FUNNEL_ADIMLAR.forEach(a => {
    const n = sayac[a.key].size;
    const yuzde = giren ? (n / giren) * 100 : 0;
    // Bir önceki adıma göre kaç kişi kayboldu
    const kayip = (onceki === null || onceki === 0) ? null : onceki - n;
    const kayipYuzde = (onceki && kayip > 0) ? ((kayip / onceki) * 100).toFixed(0) : null;
    html +=
      '<div class="fn-row' + (a.key === "finish" ? " is-final" : "") + '">' +
        '<div class="fn-lbl">' + escapeHtml(a.ad) + '</div>' +
        '<div class="fn-bar"><i style="width:' + yuzde.toFixed(1) + '%"></i></div>' +
        '<div class="fn-n">' + n + '</div>' +
        '<div class="fn-drop">' + (kayipYuzde && kayip > 0 ? '−' + kayip + ' (%' + kayipYuzde + ')' : '') + '</div>' +
      '</div>';
    onceki = n;
  });

  // En büyük düşüşün olduğu adımı bul ve vurgula
  let enBuyuk = { ad: null, kayip: 0 };
  for (let i = 1; i < FUNNEL_ADIMLAR.length; i++) {
    const onc = sayac[FUNNEL_ADIMLAR[i - 1].key].size;
    const simdi = sayac[FUNNEL_ADIMLAR[i].key].size;
    if (onc - simdi > enBuyuk.kayip) enBuyuk = { ad: FUNNEL_ADIMLAR[i].ad, kayip: onc - simdi, onceki: FUNNEL_ADIMLAR[i - 1].ad };
  }
  if (enBuyuk.ad && enBuyuk.kayip > 0) {
    html += '<p class="fn-hint">🔎 En büyük kayıp: <b>' + escapeHtml(enBuyuk.onceki) +
            '</b> → <b>' + escapeHtml(enBuyuk.ad) + '</b> arasında <b>' + enBuyuk.kayip + ' kişi</b> vazgeçti.</p>';
  }
  box.innerHTML = html;
}

/* --- Görüşme müsaitliği yönetimi (admin ayarlar; funnel okur) --- */
const AV_TIMES = []; for (let _h = 10; _h <= 18; _h++) AV_TIMES.push(String(_h).padStart(2, "0") + ":00");
let AVAIL = {};        // date -> { closed, openTimes }
let avOpenSet = {};
let avInited = false;

function avPad(n) { return String(n).padStart(2, "0"); }
function avTrDate(s) {
  const M = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const D = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  const p = String(s).split("-"); const d = new Date(+p[0], +p[1] - 1, +p[2]);
  return (+p[2]) + " " + M[+p[1] - 1] + " " + p[0] + " " + D[d.getDay()];
}
async function loadAvail() {
  if (typeof sbGetAvailability === "function" && sb) {
    const rows = await sbGetAvailability();
    AVAIL = {};
    (rows || []).forEach(r => { if (r && r.date) AVAIL[r.date] = { closed: !!r.closed, openTimes: r.open_times || [] }; });
  } else {
    try { AVAIL = JSON.parse(localStorage.getItem("klup_availability")) || {}; } catch (e) { AVAIL = {}; }
  }
}
function saveLocalAvail() { try { localStorage.setItem("klup_availability", JSON.stringify(AVAIL)); } catch (e) {} }
function avCurrentOpen() { return AV_TIMES.filter(t => avOpenSet[t]); }
function avRenderEffect() {
  const e = document.getElementById("avEffect"); if (!e) return;
  if (document.getElementById("avClosed").checked) { e.textContent = "Müşteri bu gün hiç saat görmez (kapalı)."; return; }
  const op = avCurrentOpen();
  if (op.length === AV_TIMES.length) { e.textContent = "Müşteri tüm saatleri görür (dolu olanlar hariç)."; return; }
  if (!op.length) { e.textContent = "Hiç saat açık değil → müşteri saat göremez."; return; }
  e.textContent = "Müşteri yalnızca şunları görür: " + op.join(", ") + " (dolu olanlar hariç).";
}
function avRenderHours() {
  const wrap = document.getElementById("avHours"); if (!wrap) return;
  const closed = document.getElementById("avClosed").checked;
  wrap.innerHTML = "";
  AV_TIMES.forEach(t => {
    const b = document.createElement("button"); b.type = "button";
    b.className = "hbtn" + (avOpenSet[t] ? " on" : ""); b.textContent = t; b.disabled = closed;
    b.addEventListener("click", () => { avOpenSet[t] = !avOpenSet[t]; avRenderHours(); });
    wrap.appendChild(b);
  });
  const lbl = document.getElementById("avHoursLbl"); if (lbl) lbl.style.opacity = closed ? ".4" : "1";
  avRenderEffect();
}
function avLoadDateIntoForm() {
  const d = document.getElementById("avDate").value;
  const o = AVAIL[d];
  document.getElementById("avClosed").checked = o ? !!o.closed : false;
  avOpenSet = {}; AV_TIMES.forEach(t => { avOpenSet[t] = (o && o.openTimes && o.openTimes.length) ? o.openTimes.indexOf(t) >= 0 : true; });
  avRenderHours();
}
function avRenderList() {
  const list = document.getElementById("avList"); if (!list) return;
  const keys = Object.keys(AVAIL).sort();
  if (!keys.length) { list.innerHTML = '<p class="empty">Henüz özel gün ayarı yok.</p>'; return; }
  list.innerHTML = "";
  keys.forEach(k => {
    const o = AVAIL[k]; let summary;
    if (o.closed) summary = "KAPALI";
    else if (o.openTimes && o.openTimes.length && o.openTimes.length < AV_TIMES.length) summary = "Sadece: " + o.openTimes.join(", ");
    else summary = "Tüm saatler açık";
    const row = document.createElement("div"); row.className = "ov" + (o.closed ? " closed" : "");
    row.innerHTML = '<div><div class="d">' + escapeHtml(avTrDate(k)) + '</div><div class="s">' + escapeHtml(summary) + '</div></div><button class="rm">Kaldır</button>';
    row.querySelector(".rm").addEventListener("click", async () => {
      delete AVAIL[k];
      if (typeof sbDeleteAvailability === "function" && sb) await sbDeleteAvailability(k); else saveLocalAvail();
      avRenderList();
      if (document.getElementById("avDate").value === k) avLoadDateIntoForm();
    });
    list.appendChild(row);
  });
}
async function avSaveDay() {
  const d = document.getElementById("avDate").value; if (!d) return;
  const msg = document.getElementById("avMsg");
  const closed = document.getElementById("avClosed").checked;
  let row, del = false;
  if (closed) { AVAIL[d] = { closed: true, openTimes: [] }; row = { date: d, closed: true, open_times: [] }; }
  else {
    const op = avCurrentOpen();
    if (op.length === AV_TIMES.length) { delete AVAIL[d]; del = true; }   // tümü açık = varsayılan
    else { AVAIL[d] = { closed: false, openTimes: op }; row = { date: d, closed: false, open_times: op }; }
  }
  if (typeof sbSetAvailability === "function" && sb) {
    msg.textContent = "Kaydediliyor…"; msg.className = "muted";
    const res = del ? await sbDeleteAvailability(d) : await sbSetAvailability(row);
    if (res && res.error) { msg.textContent = "Hata: " + res.error + " (meeting_availability tablosu eklendi mi?)"; msg.className = "form-err"; return; }
  } else saveLocalAvail();
  msg.textContent = del ? "✓ Kaydedildi (bu gün varsayılana döndü)" : "✓ Kaydedildi"; msg.className = "save-ok";
  avRenderList();
}
async function initAvail() {
  const dateEl = document.getElementById("avDate"); if (!dateEl) return;
  if (!avInited) {
    avInited = true;
    const t = new Date(); t.setDate(t.getDate() + 1);
    const min = t.getFullYear() + "-" + avPad(t.getMonth() + 1) + "-" + avPad(t.getDate());
    if (!dateEl.value) dateEl.value = min;
    dateEl.min = min;
    dateEl.addEventListener("change", avLoadDateIntoForm);
    document.getElementById("avClosed").addEventListener("change", avRenderHours);
    document.getElementById("avSave").addEventListener("click", avSaveDay);
  }
  await loadAvail();
  avLoadDateIntoForm();
  avRenderList();
}

/* --- yardımcılar --- */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function followCell(s) {
  if (!s) return '<span class="due-none">—</span>';
  const t = todayStr(), p = String(s).split("-"), shown = p[2]+"."+p[1]+"."+p[0];
  if (s === t) return '<span class="due-today">'+shown+' • bugün</span>';
  if (s < t)  return '<span class="due-late">'+shown+' • gecikti</span>';
  return shown;
}
function cssClass(klass) {
  return {
    "VIP Lead":"vip", "Sıcak Lead":"hot", "Takip Edilecek Lead":"follow",
    "Düşük Öncelikli Lead":"low", "Düşük Lead":"low",
  }[klass] || "low";
}
function klassShort(klass) {
  return {
    "VIP Lead":"VIP", "Sıcak Lead":"Sıcak", "Takip Edilecek Lead":"Takip",
    "Düşük Öncelikli Lead":"Düşük", "Düşük Lead":"Düşük",
  }[klass] || (klass || "-");
}
