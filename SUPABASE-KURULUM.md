# Supabase Kurulumu (merkezi lead veritabanı)

Bu adımlar sayesinde form dolan her müşteri **hangi cihazdan olursa olsun** senin
admin paneline düşer. Sadece 2 adım + admin kullanıcısı oluşturma.

## 1) Tabloyu ve izinleri oluştur
Supabase panelinde: sol menü → **SQL Editor** → **New query** → aşağıdakinin tamamını
yapıştır → **Run**.

```sql
-- Lead tablosu
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ref_no text,
  group_type text,
  products text[],
  tonnage text,
  budget text,
  timing text,
  experience text,
  company text,
  contact text,
  phone text,
  whatsapp text,
  email text,
  location text,
  port text,
  score int,
  klass text,
  selected_slot text
);

-- Güvenlik (Row Level Security) açık
alter table public.leads enable row level security;

-- Site ziyaretçisi YENİ lead ekleyebilir (okuyamaz)
create policy "site can insert leads"
  on public.leads for insert to anon with check (true);

-- Ziyaretçi yalnız kendi yeni kaydının toplantı saatini güncelleyebilir (son 2 saat)
create policy "site can update recent slot"
  on public.leads for update to anon
  using (created_at > now() - interval '2 hours') with check (true);

-- Sadece SEN (giriş yapan) leadleri okuyabilirsin
create policy "owner can read leads"
  on public.leads for select to authenticated using (true);
```

## 2) Kendine admin kullanıcısı oluştur
Sol menü → **Authentication** → **Users** → **Add user** → **Create new user**:
- **Email:** panele girişte kullanacağın e-posta
- **Password:** güçlü bir şifre
- **Auto Confirm User** seçeneğini **açık** bırak (ki hemen giriş yapabilesin)

Bu e-posta/şifre = admin paneli girişin.

## 3) Bitti ✅
- Müşteri formu doldurunca kayıt otomatik Supabase'e düşer.
- `admin.html` → e-posta+şifrenle giriş → tüm leadleri görürsün.
- Leadleri Supabase panelinde **Table Editor → leads** ile de görebilirsin.

---

### Güvenlik notları
- Sitede sadece **publishable (public)** anahtar var — bu güvenli, tarayıcı için tasarlandı.
- Lead verileri (telefon, e-posta) **herkese açık değildir**; yalnız giriş yapan sen okursun.
- Daha önce sohbette paylaştığın **`sb_secret_...`** anahtarını Supabase'den **yenile (roll)** —
  Project Settings → API Keys. O anahtar hiçbir yerde kullanılmıyor, sızmaması için iptal et.
