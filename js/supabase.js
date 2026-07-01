/* =============================================================
   SUPABASE BAĞLANTISI
   Site formu lead'i buraya yazar (insert). Admin paneli okur.
   Supabase hazır değilse site yine çalışır (localStorage'a düşer).
   ============================================================= */

let sb = null;
try {
  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY
      && !CONFIG.SUPABASE_URL.includes("xxxxx")) {
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
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
    selected_slot: p.selectedSlot || null,
  };
}

// Yeni lead ekler (fire-and-forget). Hata olursa site akışını bozmaz.
async function sbInsertLead(p) {
  if (!sb) return;
  try {
    const { error } = await sb.from("leads").insert(leadToRow(p));
    if (error) console.warn("Supabase insert hata:", error.message);
  } catch (e) { console.warn("Supabase insert exception:", e); }
}

// Seçilen toplantı saatini günceller.
async function sbUpdateSlot(p) {
  if (!sb) return;
  try {
    const { error } = await sb.from("leads")
      .update({ selected_slot: p.selectedSlot })
      .eq("ref_no", p.refNo);
    if (error) console.warn("Supabase update hata:", error.message);
  } catch (e) { console.warn("Supabase update exception:", e); }
}
