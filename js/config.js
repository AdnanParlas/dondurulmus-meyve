/* =============================================================
   AYARLAR (CONFIG)
   Sitenin tüm değiştirilebilir ayarları buradadır.
   Numara, e-posta, fiyatlar, toplantı saatleri vb. yalnızca
   bu dosyadan değiştirilir. Başka dosyalara dokunmanıza gerek yok.
   ============================================================= */

const CONFIG = {
  /* --- İletişim --- */
  // WhatsApp numarası: ülke kodu + numara, başında + ve 0 OLMADAN.
  // Örn: Türkiye 0532 653 40 05  ->  "905326534005"
  WHATSAPP: "905326534005",
  EMAIL: "adnanparlas35@hotmail.com",

  // Firma / marka bilgisi (hero ve PDF'te görünür)
  BRAND: {
    name: "Klüp Dış Ticaret",
    tagline: "Dondurulmuş Meyve & Sebze İthalatı",
    experienceYears: 27,
  },

  /* --- Supabase (merkezi lead veritabanı) ---
     Site formu buraya YAZAR (insert). Admin paneli buradan OKUR (giriş sonrası).
     publishable (public) anahtar tarayıcıda kullanılmak için güvenlidir. */
  SUPABASE_URL: "https://amaejlvxbbnedawtqogy.supabase.co",
  SUPABASE_KEY: "sb_publishable_0ucM4ITFUiaZ-_scNUTJgQ_U4Y7tn-I",

  /* Admin paneline giriş artık Supabase hesabınla (e-posta + şifre) yapılır.
     Bu kullanıcıyı Supabase → Authentication → Users → Add user ile oluşturursun. */

  /* --- Müsait toplantı saatleri (yalnız Sıcak/VIP leadlere gösterilir) ---
     label: ekranda görünen yazı.  day: 0=Pazar ... 1=Pzt ... 6=Cmt.  time: "SS:DD" */
  MEETING_SLOTS: [
    { label: "Pazartesi 11:00", day: 1, time: "11:00" },
    { label: "Salı 14:00",      day: 2, time: "14:00" },
    { label: "Çarşamba 10:00",  day: 3, time: "10:00" },
    { label: "Perşembe 15:00",  day: 4, time: "15:00" },
    { label: "Cuma 11:00",      day: 5, time: "11:00" },
  ],
  MEETING_DURATION_MIN: 30,

  /* --- Lead puanlama eşikleri ---
     Toplam puana göre sınıf belirlenir. İstediğiniz gibi ayarlayın. */
  SCORE_THRESHOLDS: {
    vip: 80,    // bu puan ve üzeri -> VIP Lead
    hot: 55,    // bu puan ve üzeri -> Sıcak Lead
    follow: 30, // bu puan ve üzeri -> Takip Edilecek Lead
    // altı -> Düşük Lead
  },
  // Hangi sınıflara toplantı ekranı açılsın:
  MEETING_FOR_CLASSES: ["VIP Lead", "Sıcak Lead"],

  /* --- Grup (tonaj) bazlı ÖN FİYAT aralıkları ---
     NOT: Bunlar PLACEHOLDER (örnek) değerlerdir, gerçek rakamlarınızı yazın.
     Birim: USD / ton (örnek). Ekranda "ön değerlendirme" uyarısıyla gösterilir.
     Boş bırakırsanız ("") o kademede fiyat verilmez. */
  PRICE_TIERS: {
    "1 ton altı":        { min: "",     max: "",     note: "Bu miktar için öncelik düşüktür; uygun stok durumunda bilgi verilir." },
    "1–5 ton":           { min: 1800,   max: 2600,   note: "Standart toptan fiyat aralığı." },
    "5–10 ton":          { min: 1650,   max: 2300,   note: "Artan miktarla daha uygun birim fiyat." },
    "10–20 ton":         { min: 1500,   max: 2100,   note: "Ciddi alıcı fiyat aralığı." },
    "25 ton ve üzeri":   { min: 1350,   max: 1950,   note: "Konteyner / özel fiyat. Net teklif için görüşme önerilir." },
  },
  PRICE_CURRENCY: "USD",
  PRICE_UNIT: "ton",
};
