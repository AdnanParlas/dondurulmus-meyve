/* =============================================================
   SUPABASE BAĞLANTISI
   Site formu lead'i buraya yazar (insert). Admin paneli okur.
   Supabase hazır değilse site yine çalışır (localStorage'a düşer).
   ============================================================= */

let sb = null;      // oturum-farkında istemci (admin girişi + okuma)
let sbAnon = null;  // her zaman ZİYARETÇİ (anon) — form kaydı bunu kullanır
try {
  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY
      && !CONFIG.SUPABASE_URL.includes("xxxxx")) {
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    // Ayrı istemci: admin girişli olsa bile form kaydı hep anon kimliğiyle gitsin
    // (RLS anon insert politikası her durumda çalışsın; kayıtlar reddedilmesin).
    sbAnon = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sb-anon-form" },
    });
  }
} catch (e) {
  console.warn("Supabase başlatılamadı:", e);
}

// Teklif nesnesini veritabanı satırına çevirir.
function leadToRow(p) {
  return {
    ref_no: p.refNo,
    group_type: p.group,
    products: p.products || [],
    tonnage: p.tonnage,
    budget: p.budget,
    timing: p.timing,
    experience: p.experience,
    company: p.company,
    contact: p.contact,
    phone: p.phone,
    whatsapp: p.whatsapp,
    email: p.email,
    location: p.location,
    port: p.port,
    score: p.score,
    klass: p.klass,
    lead_group: p.leadGroup || null,
    wa_shown: !!p.showWhatsapp,
    meeting_shown: !!p.showMeeting,
    selected_slot: p.selectedSlot || null,
  };
}

// Yeni lead ekler (fire-and-forget). Hata olursa site akışını bozmaz.
// Yeni kolonlar (lead_group vb.) henüz eklenmemişse temel alanlarla tekrar dener.
async function sbInsertLead(p) {
  const client = sbAnon || sb;
  if (!client) return;
  const row = leadToRow(p);
  try {
    let { error } = await client.from("leads").insert(row);
    if (error && /column|schema cache|PGRST204/i.test(error.message + (error.code || ""))) {
      // Yeni kolonları çıkarıp yeniden dene (kurulum güncellenmeden de çalışsın)
      const { lead_group, wa_shown, meeting_shown, ...base } = row;
      ({ error } = await client.from("leads").insert(base));
    }
    if (error) console.warn("Supabase insert hata:", error.message);
  } catch (e) { console.warn("Supabase insert exception:", e); }
}

// Seçilen toplantı saatini günceller + slot_key (rezervasyon) + durum "Toplantı planlandı".
// slot_key kolonu henüz yoksa onsuz tekrar dener (kurulum güncellenmeden de çalışır).
async function sbUpdateSlot(p) {
  const client = sbAnon || sb;
  if (!client) return { conflict: false };
  try {
    // Güvenli fonksiyon: RLS'yi aşarak rezervasyonu yazar + slotu atomik kontrol eder.
    // Dönüş: "ok" (yazıldı) | "taken" (o saat az önce alınmış).
    const { data, error } = await client.rpc("reserve_slot", {
      p_ref: p.refNo, p_slot_key: p.slotKey || null, p_selected_slot: p.selectedSlot || null,
    });
    if (!error) return { conflict: data === "taken" };
    // reserve_slot henüz eklenmemişse (kurulum güncellenmemiş) eski yönteme düş
    await client.from("leads")
      .update({ selected_slot: p.selectedSlot, slot_key: p.slotKey || null })
      .eq("ref_no", p.refNo);
    return { conflict: false };
  } catch (e) { console.warn("Supabase update exception:", e); return { conflict: false }; }
}

// Rezerve (dolu) saat anahtarlarını döndürür: ["2026-07-15 14:00", ...]
// Güvenli fonksiyon (booked_slots) yoksa boş döner; site yine çalışır.
async function sbBookedSlots() {
  const client = sbAnon || sb;
  if (!client) return [];
  try {
    const { data, error } = await client.rpc("booked_slots");
    if (error) { console.warn("booked_slots hata:", error.message); return []; }
    return (data || []).map(x => (typeof x === "string" ? x : (x && x.slot_key))).filter(Boolean);
  } catch (e) { return []; }
}

// --- Görüşme müsaitliği (admin ayarlar, funnel okur) ---
async function sbGetAvailability() {
  const client = sbAnon || sb;
  if (!client) return [];
  try {
    const { data, error } = await client.from("meeting_availability").select("*");
    if (error) { console.warn("availability oku hata:", error.message); return []; }
    return data || [];
  } catch (e) { return []; }
}
async function sbSetAvailability(row) { // { date, closed, open_times }
  if (!sb) return { error: "Supabase yok" };
  try {
    const { error } = await sb.from("meeting_availability").upsert(row, { onConflict: "date" });
    return { error: error ? error.message : null };
  } catch (e) { return { error: String(e) }; }
}
async function sbDeleteAvailability(date) {
  if (!sb) return { error: "Supabase yok" };
  try {
    const { error } = await sb.from("meeting_availability").delete().eq("date", date);
    return { error: error ? error.message : null };
  } catch (e) { return { error: String(e) }; }
}

// ADMIN: birden fazla lead ekler (CSV/Excel içe aktarma).
// 50'lik gruplar hâlinde gider. Dönüş: { eklenen, error }.
async function sbAdminInsertMany(rows) {
  if (!sb) return { eklenen: 0, error: "Supabase yok" };
  let eklenen = 0;
  try {
    for (let i = 0; i < rows.length; i += 50) {
      const grup = rows.slice(i, i + 50);
      const { data, error } = await sb.from("leads").insert(grup).select("id");
      if (error) return { eklenen, error: error.message };
      eklenen += (data || []).length;
    }
    return { eklenen, error: null };
  } catch (e) { return { eklenen, error: String(e) }; }
}

// ADMIN: funnel adım olaylarını okur (giriş yapılmış olmalı).
// gun: kaç günlük geçmiş (varsayılan 30). Tablo yoksa boş döner, panel bozulmaz.
async function sbFunnelEvents(gun = 30) {
  if (!sb) return { rows: [], error: "Supabase yok" };
  try {
    const since = new Date(Date.now() - gun * 86400000).toISOString();
    const { data, error } = await sb
      .from("funnel_events")
      .select("session_id,step,step_index,created_at")
      .gte("created_at", since)
      .limit(50000);
    if (error) return { rows: [], error: error.message };
    return { rows: data || [], error: null };
  } catch (e) { return { rows: [], error: String(e) }; }
}

// ADMIN: lead durum/not günceller (giriş yapılmış olmalı). id ile.
async function sbAdminUpdate(id, fields) {
  if (!sb) return { error: "Supabase yok" };
  try {
    const { error } = await sb.from("leads").update(fields).eq("id", id);
    return { error: error ? error.message : null };
  } catch (e) { return { error: String(e) }; }
}

// ADMIN: lead siler (giriş yapılmış olmalı). id ile.
// .select() ile silinen satırları geri ister: DELETE politikası yoksa Supabase
// hata DÖNDÜRMEZ, sessizce 0 satır siler. O durumu "rls" olarak ayırt ediyoruz.
async function sbAdminDelete(id) {
  if (!sb) return { error: "Supabase yok" };
  try {
    const { data, error } = await sb.from("leads").delete().eq("id", id).select("id");
    if (error) return { error: error.message };
    if (!data || !data.length) return { error: "rls" };
    return { error: null };
  } catch (e) { return { error: String(e) }; }
}

// ADMIN: birden fazla lead siler (çoklu seçim). 40'lık gruplar hâlinde gider,
// aksi halde uzun id listesi URL sınırını aşar.
// Dönüş: { deleted, error }. Hiç satır silinmediyse error === "rls".
async function sbAdminDeleteMany(ids) {
  if (!sb) return { deleted: 0, error: "Supabase yok" };
  let deleted = 0;
  try {
    for (let i = 0; i < ids.length; i += 40) {
      const batch = ids.slice(i, i + 40);
      const { data, error } = await sb.from("leads").delete().in("id", batch).select("id");
      if (error) return { deleted, error: error.message };
      deleted += (data || []).length;
    }
    if (!deleted && ids.length) return { deleted: 0, error: "rls" };
    return { deleted, error: null };
  } catch (e) { return { deleted, error: String(e) }; }
}
