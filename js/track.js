/* =============================================================
   FUNNEL ADIM TAKİBİ
   Amaç: ziyaretçilerin hangi adımda vazgeçtiğini görmek.
   Kaydedilenler: rastgele oturum kimliği + adım adı + zaman.
   KİŞİSEL VERİ YOK: isim, telefon, IP, çerez kullanılmaz.
   Takip başarısız olursa site normal çalışmaya devam eder.
   ============================================================= */

const TRACK_KEY = "klup_sid";

/* Oturum kimliği: sekme kapanınca biter (sessionStorage).
   Çerez değildir, kişiyi tanımlamaz; sadece "aynı ziyaret" demektir. */
function trackSession() {
  try {
    let s = sessionStorage.getItem(TRACK_KEY);
    if (!s) {
      s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem(TRACK_KEY, s);
    }
    return s;
  } catch (e) { return "anon"; }
}

/* Aynı adım tekrar tekrar yazılmasın (geri/ileri gidince şişmesin) */
const _trackSeen = new Set();

/* Tablo kurulmamışsa takibi tamamen kapat: her adımda boşa istek atıp
   ziyaretçinin konsolunu uyarıyla doldurmasın. */
let _trackKapali = false;

/* Bir funnel olayını kaydeder. Fire-and-forget: hata site akışını bozmaz. */
function trackStep(step, index) {
  try {
    if (_trackKapali) return;
    if (_trackSeen.has(step)) return;
    _trackSeen.add(step);

    const client = (typeof sbAnon !== "undefined" && sbAnon) ? sbAnon
                 : (typeof sb !== "undefined" && sb) ? sb : null;
    if (!client) return;

    // DÜZ insert kullanılır, upsert DEĞİL.
    // Sebep: PostgREST'te upsert "INSERT ... ON CONFLICT" demektir ve
    // INSERT'e ek olarak UPDATE politikası ister. Ziyaretçiye UPDATE yetkisi
    // vermek istemiyoruz (satırları değiştirebilirdi), o yüzden düz insert
    // atıp benzersiz indeksin ürettiği çakışma hatasını sessizce yutuyoruz.
    client.from("funnel_events")
      .insert({ session_id: trackSession(), step: step, step_index: index })
      .then(res => {
        if (!res || !res.error) return;
        const m = res.error.message || "";
        const kod = res.error.code || "";

        // Aynı oturum + aynı adım zaten yazılmış (sayfa yenilenmiş) -> normal, sessiz geç
        if (kod === "23505" || /duplicate key|already exists/i.test(m)) return;

        // Tablo henüz kurulmamış -> bu oturumda bir daha deneme
        if (/does not exist|schema cache|PGRST205/i.test(m)) {
          _trackKapali = true;
          console.warn("Funnel takibi kapalı: funnel_events tablosu yok " +
                       "(SUPABASE-KURULUM.md → 1b bölümündeki SQL'i çalıştırın).");
          return;
        }
        console.warn("track:", m);
      });
  } catch (e) { /* takip asla siteyi bozmaz */ }
}
