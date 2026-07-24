/* =============================================================
   LEAD İÇE AKTARMA (Meta Lead Ads CSV / Excel)
   Meta'dan indirilen dosyayı panele yükler.
   Sütun adları forma göre değiştiği için eşleştirme ELLE
   ayarlanabilir; yaygın adlar otomatik tahmin edilir.
   ============================================================= */

/* Panelin kolonlarına karşılık gelen hedef alanlar.
   ipuclari: sütun başlığında bunlardan biri geçerse otomatik eşleşir. */
const IMP_ALANLAR = [
  { key: "company",    ad: "Şirket adı",   ipuclari: ["company_name", "company", "şirket", "sirket", "firma"] },
  { key: "contact",    ad: "Yetkili kişi", ipuclari: ["full_name", "yetkili", "ad_soyad", "ad soyad", "isim", "name"] },
  { key: "phone",      ad: "Telefon",      ipuclari: ["phone_number", "phone", "telefon", "gsm", "tel"] },
  { key: "email",      ad: "E-posta",      ipuclari: ["email", "e-posta", "eposta", "mail"] },
  { key: "location",   ad: "Şehir",        ipuclari: ["city", "şehir", "sehir", "il", "location"] },
  { key: "port",       ad: "Liman",        ipuclari: ["port", "liman"] },
  { key: "tonnage",    ad: "Tonaj",        ipuclari: ["tonaj", "tonnage", "ton", "miktar"] },
  { key: "budget",     ad: "Bütçe",        ipuclari: ["butce", "bütçe", "budget", "usd"] },
  { key: "timing",     ad: "Zamanlama",    ipuclari: ["zaman", "timing", "ne_zaman"] },
  { key: "experience", ad: "Tecrübe",      ipuclari: ["tecrube", "tecrübe", "experience", "deneyim", "daha_once"] },
  { key: "createdAt",  ad: "Tarih",        ipuclari: ["created_time", "created", "tarih", "date"] },
];

let IMP_BASLIK = [];   // dosyadaki sütun başlıkları
let IMP_SATIR  = [];   // dosyadaki veri satırları
let IMP_ESLES  = {};   // { hedefAlan: sütunIndeksi }

/* --- CSV çözümleyici (tırnak, gömülü virgül, CRLF, BOM) --- */
function impCSVCoz(metin) {
  metin = metin.replace(/^﻿/, "");
  const ilkSon = metin.indexOf("\n");
  const ilk = ilkSon >= 0 ? metin.slice(0, ilkSon) : metin;
  // Meta virgül kullanır; Excel'den gelen Türkçe dosyalar noktalı virgül olabilir
  const ayr = ilk.split(";").length > ilk.split(",").length ? ";" : ",";

  const satirlar = [];
  let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; }
        else tirnak = false;
      } else alan += c;
    } else {
      if (c === '"') tirnak = true;
      else if (c === ayr) { satir.push(alan); alan = ""; }
      else if (c === "\n") { satir.push(alan); satirlar.push(satir); satir = []; alan = ""; }
      else if (c !== "\r") alan += c;
    }
  }
  if (alan.length || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar.filter(r => r.some(h => String(h).trim().length));
}

/* --- Excel (.xlsx): kütüphaneyi sadece gerektiğinde yükle --- */
function impSheetJSYukle() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((ok, hata) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = ok;
    s.onerror = () => hata(new Error("Excel okuyucu yüklenemedi (internet?)"));
    document.head.appendChild(s);
  });
}

/* --- Değer normalleştirme: Meta cevabını panelin beklediği şıkka çevirir --- */
const impSayilar = s => (String(s).match(/\d+/g) || []).map(Number);

function impTonajEsle(ham) {
  if (!ham) return "";
  const s = String(ham).toLocaleLowerCase("tr");
  const n = impSayilar(s);
  if (/üzeri|üstü|uzeri|ustu|\+/.test(s) && n.includes(25)) return "25 ton üzeri";
  if (n.includes(1) && n.includes(5))   return "1–5 ton";
  if (n.includes(10) && n.includes(15)) return "10–15 ton";
  if (n.includes(20) && n.includes(25)) return "20–25 ton";
  if (n.length === 1 && n[0] >= 25)     return "25 ton üzeri";
  return "";
}

function impButceEsle(ham) {
  if (!ham) return "";
  const s = String(ham).toLocaleLowerCase("tr");
  // "10.000" -> 10000 olacak şekilde nokta/boşluk temizle
  const n = (s.replace(/[.\s]/g, "").match(/\d+/g) || []).map(Number);
  if (/altı|alti|az|under|</.test(s) && n.includes(10000)) return "10.000 USD altı";
  if (/üzeri|üstü|uzeri|ustu|\+|fazla/.test(s) && n.includes(50000)) return "50.000 USD üzeri";
  if (n.includes(10000) && n.includes(25000)) return "10.000 – 25.000 USD";
  if (n.includes(25000) && n.includes(50000)) return "25.000 – 50.000 USD";
  if (n.length === 1) {
    const v = n[0];
    if (v < 10000)  return "10.000 USD altı";
    if (v <= 25000) return "10.000 – 25.000 USD";
    if (v <= 50000) return "25.000 – 50.000 USD";
    return "50.000 USD üzeri";
  }
  return "";
}

/* Telefon: Meta "p:+905321234567" gibi verebilir -> son 10 hane */
function impTelefonNorm(ham) {
  const d = String(ham || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

/* --- Dosyayı oku --- */
async function impDosyaOku(dosya) {
  const ad = (dosya.name || "").toLowerCase();
  if (ad.endsWith(".xlsx") || ad.endsWith(".xls")) {
    await impSheetJSYukle();
    const buf = await dosya.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, defval: "" })
      .filter(r => r.some(h => String(h).trim().length));
  }
  return impCSVCoz(await dosya.text());
}

/* --- Başlıkları hedef alanlara otomatik eşle --- */
function impOtoEslestir() {
  IMP_ESLES = {};
  const norm = s => String(s).toLocaleLowerCase("tr").replace(/[\s_-]+/g, "_").trim();
  const kullanilan = new Set();
  IMP_ALANLAR.forEach(alan => {
    for (let i = 0; i < IMP_BASLIK.length; i++) {
      if (kullanilan.has(i)) continue;
      const b = norm(IMP_BASLIK[i]);
      if (alan.ipuclari.some(ip => b.includes(norm(ip)))) {
        IMP_ESLES[alan.key] = i; kullanilan.add(i); break;
      }
    }
  });
}

/* --- Eşleştirme arayüzü --- */
function impEslesCiz() {
  const box = document.getElementById("impMap");
  if (!box) return;
  box.innerHTML = IMP_ALANLAR.map(alan => {
    const secili = IMP_ESLES[alan.key];
    const opts = ['<option value="">— yok —</option>'].concat(
      IMP_BASLIK.map((b, i) =>
        `<option value="${i}"${secili === i ? " selected" : ""}>${escapeHtml(b)}</option>`)
    ).join("");
    return `<label class="imp-row"><span>${alan.ad}</span>
      <select data-alan="${alan.key}" class="text-input">${opts}</select></label>`;
  }).join("");
  box.querySelectorAll("select").forEach(s => {
    s.addEventListener("change", e => {
      const v = e.target.value;
      if (v === "") delete IMP_ESLES[e.target.dataset.alan];
      else IMP_ESLES[e.target.dataset.alan] = +v;
      impOnizle();
    });
  });
}

/* --- Satırdan lead nesnesi üret --- */
function impSatirdanLead(satir) {
  const al = k => IMP_ESLES[k] != null ? String(satir[IMP_ESLES[k]] || "").trim() : "";
  const tonajHam  = al("tonnage");
  const butceHam  = al("budget");
  const tonaj = impTonajEsle(tonajHam);
  const butce = impButceEsle(butceHam);

  const state = {
    company: al("company"), contact: al("contact"), phone: al("phone"),
    whatsapp: al("phone"), email: al("email"),
    location: al("location"), port: al("port"),
    tonnage: tonaj, budget: butce,
    timing: al("timing"), experience: al("experience"),
    products: [],
  };
  const c = (typeof classifyLead === "function") ? classifyLead(state) : {};
  return {
    ...state,
    klass: c.klass || "", score: c.score || 0, leadGroup: c.group || null,
    showWhatsapp: !!c.showWhatsapp, showMeeting: !!c.showMeeting,
    createdAt: al("createdAt"),
    _tonajHam: tonajHam, _butceHam: butceHam,
    _tonajTanindi: !tonajHam || !!tonaj,
    _butceTanindi: !butceHam || !!butce,
  };
}

/* --- Önizleme --- */
function impOnizle() {
  const box = document.getElementById("impPreview");
  const btn = document.getElementById("impRun");
  if (!box) return;

  const leadler = IMP_SATIR.map(impSatirdanLead);

  // Çift kayıt: paneldeki mevcut leadler + dosya içi tekrarlar (telefona göre)
  const mevcut = new Set((CACHE || []).map(l => impTelefonNorm(l.phone)).filter(Boolean));
  const dosyada = new Set();
  leadler.forEach(l => {
    const t = impTelefonNorm(l.phone);
    l._telefonYok = !t;
    l._cift = t ? (mevcut.has(t) || dosyada.has(t)) : false;
    if (t) dosyada.add(t);
  });

  const yeni = leadler.filter(l => !l._cift && !l._telefonYok);
  const cift = leadler.filter(l => l._cift).length;
  const telsiz = leadler.filter(l => l._telefonYok).length;
  const taninmayan = yeni.filter(l => !l._tonajTanindi || !l._butceTanindi).length;

  window._IMP_YUKLENECEK = yeni;

  let h = '<div class="fn-top">' +
    '<div class="fn-kpi"><b>' + leadler.length + '</b><span>dosyadaki satır</span></div>' +
    '<div class="fn-kpi"><b style="color:#1a7a45">' + yeni.length + '</b><span>eklenecek</span></div>' +
    '<div class="fn-kpi"><b style="color:#c0392b">' + (cift + telsiz) + '</b><span>atlanacak</span></div>' +
    '</div>';

  if (cift)   h += '<p class="row-hint">↩︎ ' + cift + ' satır zaten kayıtlı (aynı telefon), atlanacak.</p>';
  if (telsiz) h += '<p class="row-hint">⚠️ ' + telsiz + ' satırda telefon yok — çift kontrolü yapılamadığı için atlanacak. Telefon sütununu doğru eşleştirdiğinizden emin olun.</p>';
  if (taninmayan) h += '<p class="fn-hint">⚠️ ' + taninmayan + ' satırda tonaj/bütçe cevabı tanınamadı. Bunlar yine eklenir ama <b>sınıflandırma boş kalır</b> (VIP/Sıcak hesaplanmaz). Aşağıdaki tabloda ⚠️ ile işaretli.</p>';

  const gost = yeni.slice(0, 12);
  if (gost.length) {
    h += '<div class="table-wrap" style="margin-top:12px"><table><thead><tr>' +
      '<th>Firma</th><th>Yetkili</th><th>Telefon</th><th>Tonaj</th><th>Bütçe</th><th>Sınıf</th></tr></thead><tbody>' +
      gost.map(l => '<tr>' +
        '<td>' + escapeHtml(l.company || "—") + '</td>' +
        '<td>' + escapeHtml(l.contact || "—") + '</td>' +
        '<td>' + escapeHtml(l.phone || "—") + '</td>' +
        '<td>' + (l._tonajTanindi ? escapeHtml(l.tonnage || "—") : '⚠️ ' + escapeHtml(l._tonajHam)) + '</td>' +
        '<td>' + (l._butceTanindi ? escapeHtml(l.budget || "—") : '⚠️ ' + escapeHtml(l._butceHam)) + '</td>' +
        '<td>' + escapeHtml(l.klass || "—") + '</td>' +
      '</tr>').join("") + '</tbody></table></div>';
    if (yeni.length > gost.length)
      h += '<p class="row-hint">… ve ' + (yeni.length - gost.length) + ' satır daha.</p>';
  }

  box.innerHTML = h;
  if (btn) {
    btn.disabled = yeni.length === 0;
    btn.textContent = yeni.length ? "⬆️ " + yeni.length + " lead'i içe aktar" : "Eklenecek lead yok";
  }
}

/* --- İçe aktar --- */
async function impCalistir() {
  const leadler = window._IMP_YUKLENECEK || [];
  if (!leadler.length) return;
  if (!confirm(leadler.length + " lead panele eklenecek.\n\nDevam edilsin mi?")) return;

  const btn = document.getElementById("impRun");
  const eski = btn.textContent;
  btn.disabled = true; btn.textContent = "Ekleniyor…";

  const satirlar = leadler.map((l, i) => {
    const r = {
      ref_no: "IMP-" + Date.now().toString().slice(-8) + "-" + i,
      company: l.company, contact: l.contact, phone: l.phone, whatsapp: l.whatsapp,
      email: l.email, location: l.location, port: l.port,
      tonnage: l.tonnage, budget: l.budget, timing: l.timing, experience: l.experience,
      products: [], score: l.score, klass: l.klass, lead_group: l.leadGroup,
      wa_shown: l.showWhatsapp, meeting_shown: l.showMeeting,
      lead_status: "Yeni lead",
      notes: "Meta reklamından içe aktarıldı",
    };
    const t = Date.parse(l.createdAt);
    if (!isNaN(t)) r.created_at = new Date(t).toISOString();
    return r;
  });

  const res = await sbAdminInsertMany(satirlar);
  btn.disabled = false; btn.textContent = eski;

  if (res.error) { alert("İçe aktarma hatası: " + res.error +
    (res.eklenen ? "\n\n" + res.eklenen + " lead eklendikten sonra durdu." : "")); }
  else { alert("✓ " + res.eklenen + " lead eklendi."); }

  document.getElementById("impFile").value = "";
  document.getElementById("impMap").innerHTML = "";
  document.getElementById("impPreview").innerHTML = "";
  IMP_BASLIK = []; IMP_SATIR = []; IMP_ESLES = {};
  await renderAll();
}

/* --- Dosya seçildiğinde --- */
async function impDosyaSecildi(e) {
  const dosya = e.target.files && e.target.files[0];
  if (!dosya) return;
  const box = document.getElementById("impPreview");
  box.innerHTML = '<p class="muted">Okunuyor…</p>';
  try {
    const satirlar = await impDosyaOku(dosya);
    if (satirlar.length < 2) { box.innerHTML = '<p class="form-err">Dosyada veri satırı bulunamadı.</p>'; return; }
    IMP_BASLIK = satirlar[0].map(x => String(x).trim());
    IMP_SATIR  = satirlar.slice(1);
    impOtoEslestir();
    impEslesCiz();
    impOnizle();
  } catch (err) {
    box.innerHTML = '<p class="form-err">Dosya okunamadı: ' + escapeHtml(String(err.message || err)) + '</p>';
  }
}
