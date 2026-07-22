/* =============================================================
   AYARLAR (CONFIG)
   Sitenin tüm değiştirilebilir ayarları buradadır.
   Numara, e-posta, fiyatlar, toplantı saatleri vb. yalnızca
   bu dosyadan değiştirilir. Başka dosyalara dokunmanıza gerek yok.
   ============================================================= */

const CONFIG = {
  /* --- İletişim --- */
  // WhatsApp numarası: ülke kodu + numara, başında + ve 0 OLMADAN.
  // Örn: Türkiye 0532 051 44 08  ->  "905320514408"
  WHATSAPP: "905320514408",
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

  /* --- Meta (Facebook) pikseli — reklam dönüşüm takibi ---
     Nereden bulunur: Etkinlik Yöneticisi → Veri Kümeleri → adın altındaki numara.
     15-16 hanelidir. Boş bırakılırsa takip tamamen kapalı kalır (site normal çalışır). */
  META_PIXEL_ID: "1034712552628394",

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

  /* --- Türkiye şehirleri (şehir alanı autocomplete için) --- */
  CITIES: [
    "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın",
    "Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum",
    "Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
    "Gümüşhane","Hakkâri","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri",
    "Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin",
    "Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
    "Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray",
    "Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük",
    "Kilis","Osmaniye","Düzce",
  ],

  /* --- Türkiye limanları (liman alanı — opsiyonel, autocomplete) --- */
  PORTS: [
    "İstanbul / Ambarlı Limanı","İstanbul / Haydarpaşa Limanı","İzmir / Alsancak Limanı",
    "Aliağa Limanı","Mersin Limanı","İskenderun Limanı","Gemlik Limanı","Derince Limanı",
    "Bandırma Limanı","Samsun Limanı","Trabzon Limanı","Antalya Limanı","Tekirdağ Limanı",
    "Kocaeli Limanı","Gebze Limanı",
  ],
};
