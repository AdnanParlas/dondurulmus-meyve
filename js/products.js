/* =============================================================
   ÜRÜN LİSTESİ ve OTOMATİK ÖNERİ MANTIĞI
   Müşteri yazdıkça öneri çıkar. Listede olmayan ürünü müşteri
   serbestçe yazabilir (özellikle sebzeler).
   ============================================================= */

// Bilinen ürünler (Aa.txt madde 8). İstediğinizi ekleyip çıkarabilirsiniz.
const PRODUCTS = [
  // Meyveler
  { name: "Ahududu",        type: "meyve" },
  { name: "Böğürtlen",      type: "meyve" },
  { name: "Vişne",          type: "meyve" },
  { name: "Çilek",          type: "meyve" },
  { name: "Mango",          type: "meyve" },
  { name: "Ananas",         type: "meyve" },
  { name: "Şeftali",        type: "meyve" },
  { name: "Kayısı",         type: "meyve" },
  { name: "Yaban mersini",  type: "meyve" },
  { name: "Ejder meyvesi",  type: "meyve" },
  { name: "Papaya",         type: "meyve" },
  // Sebzeler
  { name: "Brokoli",          type: "sebze" },
  { name: "Karnabahar",       type: "sebze" },
  { name: "Tatlı mısır",      type: "sebze" },
  { name: "Garnitür(Karışık sebze)", type: "sebze" },
  { name: "Mantar çeşitleri", type: "sebze" },
  { name: "Bezelye",          type: "sebze" },
  { name: "Havuç",            type: "sebze" },
  { name: "Sarımsak",         type: "sebze" },
  { name: "Fasulye",          type: "sebze" },
  { name: "Ispanak",          type: "sebze" },
  // Deniz ürünleri
  { name: "Somon",            type: "deniz" },
  { name: "Karides",          type: "deniz" },
  { name: "Levrek",           type: "deniz" },
  { name: "Çipura",           type: "deniz" },
  { name: "Kalamar",          type: "deniz" },
  { name: "Ahtapot",          type: "deniz" },
  { name: "Midye",            type: "deniz" },
  { name: "Beyaz balık",      type: "deniz" },
  // Bakliyat
  { name: "Nohut",            type: "bakliyat" },
  { name: "Kırmızı mercimek", type: "bakliyat" },
  { name: "Yeşil mercimek",   type: "bakliyat" },
  { name: "Kuru fasulye",     type: "bakliyat" },
  { name: "Barbunya",         type: "bakliyat" },
  { name: "Börülce",          type: "bakliyat" },
];

/* Türkçe karakterleri sadeleştirip küçük harfe çevirir.
   "ŞEFTALİ" / "seftali" / "şeftali" hepsi eşleşsin diye. */
function normalizeTR(str) {
  return (str || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/* Yazılan metne göre öneri listesi döndürür.
   groupFilter: "meyve" | "sebze" | "her ikisi" -> seçilen gruba göre filtreler. */
function suggestProducts(query, groupFilter) {
  const q = normalizeTR(query);
  if (!q) return [];

  let pool = PRODUCTS;
  if (groupFilter === "meyve") pool = PRODUCTS.filter(p => p.type === "meyve");
  else if (groupFilter === "sebze") pool = PRODUCTS.filter(p => p.type === "sebze");
  else if (groupFilter === "deniz") pool = PRODUCTS.filter(p => p.type === "deniz");
  else if (groupFilter === "bakliyat") pool = PRODUCTS.filter(p => p.type === "bakliyat");
  // "hepsi" -> hepsi

  const starts = [];
  const contains = [];
  for (const p of pool) {
    const n = normalizeTR(p.name);
    if (n.startsWith(q)) starts.push(p.name);
    else if (n.includes(q)) contains.push(p.name);
  }
  // Önce baştan eşleşenler, sonra içinde geçenler. En fazla 6 öneri.
  return [...starts, ...contains].slice(0, 6);
}
