// src/api.js
// Backend ile konuşan tek dosya. Bütün fetch çağrıları burada toplanıyor ki
// ekranlar sadece "ne istediğini" söylesin, "nasıl istendiğini" bilmesin.

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const TOKEN_ANAHTARI = 'bras_token';

export function tokenAl() {
  return localStorage.getItem(TOKEN_ANAHTARI);
}

export function tokenKaydet(token) {
  if (token) localStorage.setItem(TOKEN_ANAHTARI, token);
  else localStorage.removeItem(TOKEN_ANAHTARI);
}

/**
 * Tüm isteklerin geçtiği ortak fonksiyon.
 * - Token varsa Authorization başlığına ekler
 * - Hata durumunda backend'in yazdığı mesajı fırlatır
 */
async function istek(yol, ayarlar = {}) {
  const token = tokenAl();
  const cevap = await fetch(`${API_URL}${yol}`, {
    ...ayarlar,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ayarlar.headers || {}),
    },
  });

  let veri = null;
  try {
    veri = await cevap.json();
  } catch (e) {
    // gövdesi boş cevaplar (örn. 204) için
  }

  if (!cevap.ok) {
    throw new Error((veri && veri.error) || `Sunucu hatası (${cevap.status})`);
  }
  return veri;
}

export const api = {
  kayitOl: (bilgiler) =>
    istek('/api/register', { method: 'POST', body: JSON.stringify(bilgiler) }),

  // --- KVKK ---
  kvkkMetinleri: () => istek('/api/kvkk'),

  onayVer: () =>
    istek('/api/onay', {
      method: 'POST',
      body: JSON.stringify({ aydinlatmaOkundu: true, acikRiza: true }),
    }),

  // Geri alınamaz. Şifre doğrulaması sunucuda yapılıyor.
  hesabiSil: (password) =>
    istek('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) }),

  girisYap: (email, password) =>
    istek('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  profilimiGetir: () => istek('/api/me'),

  profilGuncelle: (bilgiler) =>
    istek('/api/me', { method: 'PUT', body: JSON.stringify(bilgiler) }),

  besinAra: ({ search = '', category = 'Tümü', limit = 60 } = {}) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (category && category !== 'Tümü') p.set('category', category);
    p.set('limit', String(limit));
    return istek(`/api/foods?${p.toString()}`);
  },

  besinGetir: (id) => istek(`/api/foods/${id}`),

  meta: () => istek('/api/meta'),

  // --- GÜNLÜK TAKİP ---
  // Tarih her zaman "YYYY-AA-GG" METNİ olarak gidiyor, Date nesnesi olarak
  // değil. Sebebi: Date'i JSON'a çevirince saat dilimi devreye giriyor ve
  // akşam geç saatte girilen kayıt ertesi güne düşebiliyor.
  gunlukGetir: (gun) => istek(`/api/diary/${gun}`),

  gunlukKalemEkle: (gun, kalem) =>
    istek(`/api/diary/${gun}/kalem`, { method: 'POST', body: JSON.stringify(kalem) }),

  gunlukKalemAdet: (id, adet) =>
    istek(`/api/diary/kalem/${id}`, { method: 'PUT', body: JSON.stringify({ adet }) }),

  gunlukKalemSil: (id) =>
    istek(`/api/diary/kalem/${id}`, { method: 'DELETE' }),

  gunlukGunGuncelle: (gun, degerler) =>
    istek(`/api/diary/${gun}`, { method: 'PUT', body: JSON.stringify(degerler) }),

  gunlukAyGetir: (yilAy) => istek(`/api/diary/ay/${yilAy}`),

  // --- TAHLİL SONUÇLARI ---
  // PDF ham bayt olarak gönderiliyor (base64 şişirmesi ve ek paket olmasın
  // diye). Bu yüzden ortak `istek` yardımcısı kullanılmıyor: o her isteğe
  // Content-Type: application/json koyuyor.
  tahlilOku: async (dosya) => {
    const token = tokenAl();
    const govde = await dosya.arrayBuffer();
    const cevap = await fetch(`${API_URL}/api/lab/oku`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: govde,
    });
    const veri = await cevap.json().catch(() => null);
    if (!cevap.ok) throw new Error((veri && veri.error) || `Sunucu hatası (${cevap.status})`);
    return veri;
  },

  tahlilKaydet: (tarih, testler) =>
    istek('/api/lab', { method: 'POST', body: JSON.stringify({ tarih, testler }) }),

  tahlilleriGetir: () => istek('/api/lab'),

  tahlilOnerileri: () => istek('/api/lab/oneriler'),

  tahlilSil: (tarih) => istek(`/api/lab/${tarih}`, { method: 'DELETE' }),
};

export { API_URL };
