# Dondurulmuş Meyve & Sebze İthalatı — Funnel Sitesi

Meta reklamlarından gelen müşteriyi karşılayan, **ön teklif oluşturan** statik web sitesi.
Sunucu gerektirmez (saf HTML/CSS/JS). **GitHub Pages** ile ücretsiz yayınlanır.

## Ne yapar?
1. Açılış ekranı → **Hemen Teklif Al**
2. Adım adım sorular: ürün grubu → ürün adı (otomatik öneri) → tonaj → bütçe → zaman → tecrübe → firma/iletişim
3. Cevaplara göre **lead puanlama** (Düşük / Takip / Sıcak / VIP)
4. **Ön teklif** ekranı + grup bazlı ön fiyat aralığı
5. Gönderim: **WhatsApp** • **E-posta** • **PDF indir**
6. Sadece Sıcak/VIP leadlere **toplantı saati** seçimi + Google Takvime ekle
7. Leadler merkezi **Supabase** veritabanına kaydolur (tüm cihazlardan)
8. Size özel **admin paneli** (`admin.html`) — Supabase girişiyle: leadler, istatistikler,
   **müşteri kartı** (CRM) ve **süreç takibi** (Teklif → Toplantı → Sipariş → Kalite Kontrol
   → Sevkiyat → Teslimat)

> Supabase kurulumu için: **SUPABASE-KURULUM.md** (SQL + admin kullanıcısı).

## Dosyalar
```
index.html       Müşteri funnel'ı (ana sayfa)
admin.html       Yönetim paneli (size özel)
css/styles.css   Tasarım
js/config.js     ⭐ TÜM AYARLAR BURADA (numara, e-posta, fiyat, saatler, şifre)
js/products.js   Ürün listesi + otomatik öneri
js/scoring.js    Lead puanlama + fiyat mantığı
js/proposal.js   Teklif + WhatsApp/e-posta/takvim linkleri
js/pdf.js        PDF teklif (jsPDF CDN)
js/funnel.js     Adım yönetimi
js/admin.js      Panel mantığı (CRM + süreç takibi)
js/supabase.js   Merkezi veritabanı bağlantısı
SUPABASE-KURULUM.md  Veritabanı kurulum rehberi (SQL)
```

## Ayarları değiştirme (`js/config.js`)
Sadece bu dosyayı düzenlemeniz yeterli:
- `WHATSAPP` — numaranız (ülke kodu + numara, başında `+` ve `0` olmadan). Örn: `0532 051 44 08` → `905320514408`
- `EMAIL` — e-posta adresiniz
- `SUPABASE_URL` / `SUPABASE_KEY` — merkezi veritabanı (publishable key)
- `MEETING_SLOTS` — müsait toplantı gün/saatleri
- `PRICE_TIERS` — **ön fiyat aralıkları (şu an örnek/placeholder — gerçek rakamlarınızı yazın)**
- `SCORE_THRESHOLDS` — hangi puanda hangi lead sınıfı

## Yerelde test
Dosyaya çift tıklayıp `index.html`'i tarayıcıda açabilirsiniz. (jsPDF için internet gerekir.)
Daha sağlıklısı küçük bir yerel sunucu:
```
python -m http.server 8000
```
Sonra tarayıcıda `http://localhost:8000` açın.

## GitHub Pages ile yayınlama
1. GitHub'da yeni bir repo oluşturun (ör. `dondurulmus-meyve`).
2. Bu klasördeki tüm dosyaları repoya yükleyin (`index.html` kök dizinde olmalı).
3. Repo → **Settings** → **Pages**.
4. **Build and deployment** → Source: **Deploy from a branch**.
5. Branch: **main**, klasör: **/ (root)** → **Save**.
6. 1-2 dakika sonra siteniz şurada yayında olur:
   `https://KULLANICIADINIZ.github.io/dondurulmus-meyve/`
7. Admin paneli: aynı adresin sonuna `admin.html` ekleyin.

> Meta reklamındaki butonu bu adrese yönlendirin.

## Önemli notlar (sunucusuz sınırlar)
Site statik olduğundan şunlar **otomatik/sunucu taraflı değildir**:
- WhatsApp/e-posta **otomatik gönderilmez**; müşterinin uygulaması ön-doldurulmuş mesajla açılır, müşteri **Gönder**'e basar.
- Google Meet **otomatik oluşmaz**; "Google Takvime Ekle" linki verilir.
- **Admin paneli yalnızca aynı tarayıcıdaki** leadleri gösterir (localStorage). Müşteri kendi cihazında doldurduğunda sizin panelinize düşmez — asıl bilgi size **WhatsApp/e-posta** ile gelir.

İleride gerçek otomasyon (her leadin merkezi panele düşmesi, otomatik e-posta) istenirse
küçük bir backend ya da Google Sheets/Formspree gibi ücretsiz bir servis eklenebilir.

## Ön fiyat uyarısı
Tüm tekliflerde şu not görünür:
> *Bu teklif ön değerlendirme niteliğindedir. Nihai fiyat; ürün kalitesi, sezon, stok, ambalaj, miktar ve teslim şekline göre netleşir.*
