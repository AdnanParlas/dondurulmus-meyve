# Supabase Kurulumu (merkezi lead veritabanı + CRM)

Bu adımlar sayesinde form dolan her müşteri **hangi cihazdan olursa olsun** senin
admin paneline düşer ve süreç takibi (teklif → toplantı → sipariş → sevkiyat) yapılır.

## 1) Tabloyu, kolonları ve izinleri oluştur
Supabase panelinde: sol menü → **SQL Editor** → **New query** → aşağıdakinin tamamını
yapıştır → **Run**. (Daha önce çalıştırdıysan sorun değil; bu betik tekrar çalıştırılabilir,
eksik kolon/izinleri tamamlar.)

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

-- CRM/süreç kolonları (varsa dokunmaz)
alter table public.leads add column if not exists status text default 'Yeni lead';
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists lead_group text;     -- A / B / C / D
alter table public.leads add column if not exists wa_shown boolean;    -- WhatsApp gösterildi mi
alter table public.leads add column if not exists meeting_shown boolean; -- Toplantı gösterildi mi
alter table public.leads add column if not exists next_followup text;   -- Sonraki takip tarihi

-- Güvenlik (Row Level Security) açık
alter table public.leads enable row level security;

-- İzinleri temiz kur (tekrar çalıştırılabilir olsun diye önce varsa siler)
drop policy if exists "site can insert leads" on public.leads;
drop policy if exists "site can update recent slot" on public.leads;
drop policy if exists "owner can read leads" on public.leads;
drop policy if exists "owner can update leads" on public.leads;

-- Site formu YENİ lead ekleyebilir (hem ziyaretçi hem giriş yapmış admin aynı tarayıcıda test edebilsin)
create policy "site can insert leads"
  on public.leads for insert to anon, authenticated with check (true);

-- Yeni kaydın toplantı/süreç bilgisini güncelleyebilir (son 2 saat)
create policy "site can update recent slot"
  on public.leads for update to anon, authenticated
  using (created_at > now() - interval '2 hours') with check (true);

-- Sadece SEN (giriş yapan) leadleri OKUyabilirsin
create policy "owner can read leads"
  on public.leads for select to authenticated using (true);

-- Sadece SEN süreç/durum/not güncelleyebilirsin (CRM)
create policy "owner can update leads"
  on public.leads for update to authenticated using (true) with check (true);
```

## 2) Kendine admin kullanıcısı oluştur
Sol menü → **Authentication** → **Users** → **Add user** → **Create new user**:
- **Email:** panele girişte kullanacağın e-posta
- **Password:** güçlü bir şifre
- **Auto Confirm User** seçeneğini **açık** bırak (ki hemen giriş yapabilesin)

Bu e-posta/şifre = admin paneli girişin.

## 3) Bitti ✅
- Müşteri formu doldurunca kayıt otomatik Supabase'e düşer (**status: Yeni**).
- `admin.html` → e-posta+şifrenle giriş → tüm leadleri görürsün.
- Bir lead'e tıkla → **Müşteri Kartı** açılır: tüm bilgileri görür, **süreç durumunu**
  (Teklif Gönderildi → Toplantı → Sipariş → Kalite Kontrol → Sevkiyat → Teslimat) günceller,
  **not** eklersin.

---

### Güvenlik notları
- Sitede sadece **publishable (public)** anahtar var — güvenli, tarayıcı için tasarlandı.
- Lead verileri (telefon, e-posta) **herkese açık değildir**; yalnız giriş yapan sen okursun.
- Daha önce sohbette paylaştığın **`sb_secret_...`** anahtarını Supabase'den **yenile (roll)**:
  Project Settings → API Keys.
