/* =============================================================
   FUNNEL KONTROLCÜSÜ
   Adımları yönetir, state tutar, ilerleme çubuğunu günceller,
   sonunda ön teklifi oluşturup ekrana basar.
   ============================================================= */

document.getElementById("year").textContent = new Date().getFullYear();

const state = {
  group: "",          // meyve / sebze / her ikisi
  products: [],       // seçilen ürünler
  tonnage: "",
  budget: "",
  timing: "",
  experience: "",
  company: "", contact: "", phone: "", whatsapp: "", location: "", port: "",
};

/* --- Form hatırlama (Aa.txt madde 10) ---
   Girilen bilgiler localStorage'da saklanır, tekrar gelince otomatik dolar. */
const DRAFT_KEY = "klup_form_draft";
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (d && typeof d === "object") {
      Object.keys(state).forEach(k => { if (d[k] != null) state[k] = d[k]; });
    }
  } catch (e) {}
}
loadDraft();

// --- Adım tanımları ---
const STEPS = [
  { key: "group",      render: renderGroup,      valid: () => !!state.group },
  { key: "products",   render: renderProducts,   valid: () => state.products.length > 0 },
  { key: "tonnage",    render: () => renderChoice("tonnage", "Yaklaşık kaç ton alım yapmayı düşünüyorsunuz?",
      ["1–5 ton","10–15 ton","20–25 ton","25 ton üzeri"]), valid: () => !!state.tonnage },
  { key: "budget",     render: () => renderChoice("budget", "Bu ithalat için yaklaşık bütçeniz nedir?",
      ["10.000 USD altı","10.000 – 25.000 USD","25.000 – 50.000 USD","50.000 USD üzeri"]), valid: () => !!state.budget },
  { key: "timing",     render: () => renderChoice("timing", "Ne zaman ithalat yapmak istiyorsunuz?",
      ["Hemen","1 ay içinde","1–3 ay içinde","3–6 ay içinde","Sadece araştırıyorum"]), valid: () => !!state.timing },
  { key: "experience", render: () => renderChoice("experience", "Daha önce ithalat yaptınız mı?",
      ["Evet, düzenli ithalat yapıyoruz","Evet, birkaç kez yaptık","Hayır, ilk kez yapacağız","Sadece araştırıyoruz"]), valid: () => !!state.experience },
  { key: "contact",    render: renderContact,    valid: validateContact },
];

let current = 0;

const els = {
  hero: document.getElementById("hero"),
  funnel: document.getElementById("funnel"),
  content: document.getElementById("stepContent"),
  progress: document.getElementById("progress"),
  counter: document.getElementById("stepCounter"),
  back: document.getElementById("backBtn"),
};

document.getElementById("startBtn").addEventListener("click", () => {
  els.hero.hidden = true;
  els.funnel.hidden = false;
  current = 0;
  showStep();
  els.funnel.scrollIntoView({ behavior: "smooth" });
});

els.back.addEventListener("click", () => {
  if (current > 0) { current--; showStep(); }
});

function showStep() {
  const step = STEPS[current];
  els.content.innerHTML = "";
  step.render();
  els.counter.textContent = `Adım ${current + 1} / ${STEPS.length}`;
  els.progress.style.width = `${(current / STEPS.length) * 100}%`;
  els.back.hidden = current === 0;
  els.content.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function goNext() {
  const step = STEPS[current];
  if (!step.valid()) { shake(); return; }
  if (current < STEPS.length - 1) { current++; showStep(); }
  else finish();
}

// --- Yardımcı: kart seçim adımı (tek seçim) ---
function renderChoice(key, question, options) {
  const wrap = document.createElement("div");
  wrap.className = "step";
  wrap.innerHTML = `<h2 class="step__q">${question}</h2>`;
  const grid = document.createElement("div");
  grid.className = "choice-grid";
  options.forEach(opt => {
    const b = document.createElement("button");
    b.className = "choice" + (state[key] === opt ? " is-active" : "");
    b.textContent = opt;
    b.addEventListener("click", () => {
      state[key] = opt;
      saveDraft();
      grid.querySelectorAll(".choice").forEach(c => c.classList.remove("is-active"));
      b.classList.add("is-active");
      setTimeout(goNext, 180); // seçince otomatik ilerle
    });
    grid.appendChild(b);
  });
  wrap.appendChild(grid);
  els.content.appendChild(wrap);
}

// --- Adım: Ürün grubu ---
function renderGroup() {
  const wrap = document.createElement("div");
  wrap.className = "step";
  wrap.innerHTML = `<h2 class="step__q">Hangi ürün grubu ile ilgileniyorsunuz?</h2>`;
  const grid = document.createElement("div");
  grid.className = "choice-grid choice-grid--3";
  [["meyve","🍓 Meyve"],["sebze","🥦 Sebze"],["her ikisi","🍱 Her ikisi"]].forEach(([val,label]) => {
    const b = document.createElement("button");
    b.className = "choice choice--big" + (state.group === val ? " is-active" : "");
    b.innerHTML = label;
    b.addEventListener("click", () => {
      // grup değişince listede uyumsuz ürünleri temizle değil, sadece kaydet
      state.group = val;
      saveDraft();
      grid.querySelectorAll(".choice").forEach(c => c.classList.remove("is-active"));
      b.classList.add("is-active");
      setTimeout(goNext, 180);
    });
    grid.appendChild(b);
  });
  wrap.appendChild(grid);
  els.content.appendChild(wrap);
}

// --- Adım: Ürün seçimi (tıklanabilir seçenekler) ---
function renderProducts() {
  const wrap = document.createElement("div");
  wrap.className = "step";
  wrap.innerHTML = `
    <h2 class="step__q">Hangi ürünleri ithal etmek istiyorsunuz?</h2>
    <p class="step__hint">Ürünlere tıklayarak seçin veya aşağıya yazın (birden fazla seçebilirsiniz).</p>
    <div class="choice-grid choice-grid--3" id="prodOptions"></div>
    <div class="add-other">
      <div class="autocomplete" style="flex:1">
        <input id="prodInput" class="text-input" type="text" placeholder="Ürün yazın (örn: ahu... / brok...)" autocomplete="off" />
        <div id="suggestions" class="suggestions"></div>
      </div>
      <button type="button" class="btn btn--add" id="addBtn">+ Ekle</button>
    </div>
    <div id="chips" class="chips"></div>
  `;
  els.content.appendChild(wrap);

  const optWrap = wrap.querySelector("#prodOptions");
  const input = wrap.querySelector("#prodInput");
  const sug = wrap.querySelector("#suggestions");
  const addBtn = wrap.querySelector("#addBtn");
  const chips = wrap.querySelector("#chips");

  // Seçilen gruba göre bilinen ürünler
  let pool = PRODUCTS;
  if (state.group === "meyve") pool = PRODUCTS.filter(p => p.type === "meyve");
  else if (state.group === "sebze") pool = PRODUCTS.filter(p => p.type === "sebze");
  const known = pool.map(p => p.name);

  const eq = (a, b) => a.toLocaleLowerCase("tr") === b.toLocaleLowerCase("tr");
  const isSelected = (name) => state.products.some(p => eq(p, name));

  const renderOptions = () => {
    optWrap.innerHTML = "";
    known.forEach(name => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice" + (isSelected(name) ? " is-active" : "");
      b.textContent = name;
      b.addEventListener("click", () => {
        if (isSelected(name)) state.products = state.products.filter(p => !eq(p, name));
        else state.products.push(name);
        saveDraft(); renderOptions(); renderChips();
      });
      optWrap.appendChild(b);
    });
  };

  const renderChips = () => {
    // yalnızca listede olmayan (elle eklenen) ürünler chip olarak gösterilir
    const custom = state.products.filter(p => !known.some(k => eq(k, p)));
    chips.innerHTML = custom.length
      ? `<p class="step__hint" style="margin:12px 0 8px">Eklediğiniz diğer ürünler:</p>` : "";
    custom.forEach(p => {
      const c = document.createElement("span");
      c.className = "chip";
      c.innerHTML = `${esc(p)} <button aria-label="kaldır">✕</button>`;
      c.querySelector("button").addEventListener("click", () => {
        state.products = state.products.filter(x => x !== p);
        saveDraft(); renderOptions(); renderChips();
      });
      chips.appendChild(c);
    });
    ensureNextButton(wrap, state.products.length > 0);
  };

  const addCustom = (name) => {
    name = (name || input.value).trim();
    if (!name) return;
    if (!isSelected(name)) state.products.push(name);
    input.value = ""; sug.innerHTML = ""; saveDraft(); renderOptions(); renderChips(); input.focus();
  };

  // Autocomplete önerileri (madde 8)
  input.addEventListener("input", () => {
    const list = suggestProducts(input.value, state.group);
    sug.innerHTML = "";
    list.forEach(name => {
      const item = document.createElement("button");
      item.type = "button"; item.className = "suggestion"; item.textContent = name;
      item.addEventListener("click", () => addCustom(name));
      sug.appendChild(item);
    });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = sug.querySelector(".suggestion");
      addCustom(first ? first.textContent : input.value);
    }
  });
  addBtn.addEventListener("click", () => addCustom());

  renderOptions();
  renderChips();
}

// --- Adım: Firma & iletişim ---
function renderContact() {
  const wrap = document.createElement("div");
  wrap.className = "step";
  const cityOpts = CONFIG.CITIES.map(c => `<option value="${esc(c)}">`).join("");
  const portOpts = CONFIG.PORTS.map(p => `<option value="${esc(p)}">`).join("");
  wrap.innerHTML = `
    <h2 class="step__q">Firma ve iletişim bilgileriniz</h2>
    <p class="step__hint">Talebinizi oluşturup size ulaşabilmemiz için.</p>
    <div class="form-grid">
      <label class="bold">Şirket adı*<input id="f_company" class="text-input" value="${esc(state.company)}" required></label>
      <label class="bold">Yetkili kişi*<input id="f_contact" class="text-input" value="${esc(state.contact)}" required></label>
      <label class="bold">Telefon*<input id="f_phone" class="text-input" type="tel" value="${esc(state.phone)}" required></label>
      <label class="bold">Şehir*<input id="f_location" class="text-input" list="cityList" value="${esc(state.location)}" placeholder="Örn: İzmir" required><datalist id="cityList">${cityOpts}</datalist></label>
      <label class="bold">Liman<input id="f_port" class="text-input" list="portList" value="${esc(state.port)}" placeholder="Opsiyonel"><datalist id="portList">${portOpts}</datalist></label>
    </div>
    <p id="formErr" class="form-err" hidden></p>
  `;
  els.content.appendChild(wrap);
  ensureNextButton(wrap, true, "Talebimi Gönder");

  // canlı kayıt + hatırlama
  const map = { f_company:"company", f_contact:"contact", f_phone:"phone",
                f_location:"location", f_port:"port" };
  Object.entries(map).forEach(([id, key]) => {
    wrap.querySelector("#" + id).addEventListener("input", e => { state[key] = e.target.value; saveDraft(); });
  });
}

function validateContact() {
  const need = ["company","contact","phone","location"]; // şehir zorunlu, e-posta yok
  const ok = need.every(k => (state[k] || "").trim().length > 0);
  const err = document.getElementById("formErr");
  if (err) {
    err.hidden = ok;
    err.textContent = ok ? "" : "Lütfen zorunlu (*) alanları doldurun (şirket, yetkili, telefon, şehir).";
  }
  return ok;
}

// --- Her adıma "Devam" butonu ekler (kart adımları otomatik ilerlediği için onlarda gerekmez) ---
function ensureNextButton(wrap, enabled, label = "Devam →") {
  let btn = wrap.querySelector(".btn--next");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "btn btn--next";
    btn.addEventListener("click", goNext);
    wrap.appendChild(btn);
  }
  btn.textContent = label;
  btn.disabled = !enabled;
}

// --- Final: ön teklif oluştur ---
function finish() {
  els.progress.style.width = "100%";
  els.counter.textContent = "Ön teklifiniz hazır 🎉";
  els.back.hidden = true;
  const p = buildProposal(state);
  window._lastProposal = p;
  renderProposal(p);
}

function renderProposal(p) {
  saveLead(p); // CRM'e kaydet (fiyat/PDF/e-posta yok)

  const c = els.content;
  c.innerHTML = "";

  const waIcon = `<svg class="wa-ico" viewBox="0 0 32 32" fill="#ffffff" aria-hidden="true"><path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.8L.5 31.5l7.9-2c2.3 1.2 4.9 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.7 1.2 1.2-4.6-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.2 5.9-13.1 13.1-13.1S29.1 8.8 29.1 16 23.2 28.8 16 28.8zm7.2-9.8c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.7.2-.2.2-.4.3-.6.1-.3 0-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.6-.7-.9-.7h-.7c-.2 0-.6.1-.9.5-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .8.8.3 1.6.2 2.2.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.1-.3-.2-.7-.4z"/></svg>`;
  const waBtnHtml = p.showWhatsapp
    ? `<a class="btn btn--wa" id="waBtn" target="_blank" rel="noopener">${waIcon} Teklifimi WhatsApp ile gönder</a>`
    : "";

  const card = document.createElement("div");
  card.className = "proposal";
  card.innerHTML = `
    <div class="proposal__head">
      <div>
        <h2>Talebiniz Alındı</h2>
        <p class="muted">Talep No: ${p.refNo}</p>
      </div>
    </div>

    <div class="proposal__grid">
      <div><span>Ürün grubu</span><b>${esc(p.group)}</b></div>
      <div><span>Seçilen ürünler</span><b>${p.products.map(esc).join(", ") || "-"}</b></div>
      <div><span>Tahmini tonaj</span><b>${esc(p.tonnage)}</b></div>
      <div><span>Bütçe</span><b>${esc(p.budget)}</b></div>
      <div><span>İthalat zamanı</span><b>${esc(p.timing)}</b></div>
      <div><span>Şehir</span><b>${esc(p.location) || "-"}</b></div>
    </div>

    <div class="info-box">✅ ${esc(p.message)}</div>

    ${waBtnHtml ? `<div class="actions actions--single">${waBtnHtml}</div>` : ""}

    <div id="meetingArea"></div>
  `;
  c.appendChild(card);

  if (p.showWhatsapp) {
    const refreshLinks = () => { document.getElementById("waBtn").href = whatsappLink(p); };
    refreshLinks();
    const area = document.getElementById("meetingArea");
    if (p.showMeeting) renderMeeting(area, p, refreshLinks);
  }
}

function renderMeeting(area, p, refreshLinks) {
  area.innerHTML = `
    <div class="meeting">
      <h3>📅 Görüşme planlayın</h3>
      <p class="muted">Size özel bir görüşme saati seçin. Onay için WhatsApp mesajınıza eklenir.</p>
      <div class="slots" id="slots"></div>
    </div>`;
  const slots = area.querySelector("#slots");
  CONFIG.MEETING_SLOTS.forEach(slot => {
    const b = document.createElement("button");
    b.className = "slot";
    b.textContent = slot.label;
    b.addEventListener("click", () => {
      slots.querySelectorAll(".slot").forEach(s => s.classList.remove("is-active"));
      b.classList.add("is-active");
      p.selectedSlot = slot.label;
      refreshLinks(); // WhatsApp özetine seçilen saat eklensin
      updateLead(p);  // panele seçilen toplantı saatini yansıt
    });
    slots.appendChild(b);
  });
}

// --- küçük yardımcılar ---
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function cssClass(klass) {
  return {
    "VIP Lead":"vip", "Sıcak Lead":"hot", "Takip Edilecek Lead":"follow",
    "Düşük Öncelikli Lead":"low", "Düşük Lead":"low",
  }[klass] || "low";
}
function shake() {
  els.content.classList.remove("shake");
  void els.content.offsetWidth;
  els.content.classList.add("shake");
}
