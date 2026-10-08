// src/api.js
// Backend ile konuşan tek dosya. Bütün fetch çağrıları burada toplanıyor ki
// ekranlar sadece "ne istediğini" söylesin, "nasıl istendiğini" bilmesin.

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const TOKEN_ANAHTARI = 'bras_token';

/* ─────────────────────────── DEPOLAMA ───────────────────────────
 *
 * localStorage'a DOKUNMAK HATA FIRLATABİLİR. Sadece "yazılamaz" değil,
 * okumanın kendisi de patlar:
 *   - Chrome/Edge: Ayarlar > Çerezler > "Tüm çerezleri engelle" seçiliyse
 *     erişim SecurityError fırlatır.
 *   - Safari: "Tüm çerezleri engelle" açıkken aynı durum.
 *   - Bazı uygulama içi tarayıcılar (sosyal medya uygulamalarının kendi
 *     tarayıcıları) depolamayı kısıtlı açar.
 *   - Kurumsal/okul cihazlarında ilke ile kapatılabiliyor.
 *
 * ÖNCEDEN NE OLUYORDU: tokenAl() doğrudan localStorage'a gidiyordu ve
 * App.js'in açılış akışı onu try bloğunun DIŞINDA çağırıyordu. Hata
 * fırlayınca akış yarıda kesiliyor, "hazır" durumu hiç kurulmuyor ve
 * uygulama sonsuza kadar "Yükleniyor..." ekranında kalıyordu. Kullanıcı
 * tarafında bunun adı "site bende açılmıyor" oluyor, üstelik hata mesajı
 * da görünmüyordu.
 *
 * ÇÖZÜM: depolama bir kez yoklanıyor; çalışmıyorsa jeton BELLEKTE
 * tutuluyor. Uygulama tamamen çalışır kalıyor, tek fark oturumun sekme
 * kapanınca bitmesi. Kullanıcıya bunu giriş ekranında söylüyoruz
 * (depolamaCalisiyorMu).
 */
let bellektekiJeton = null;
let depoDurumu = null; // null = henüz yoklanmadı

function depoCalisiyor() {
  if (depoDurumu !== null) return depoDurumu;
  try {
    // Sadece okumak yetmiyor: bazı tarayıcılar okumaya izin verip yazmayı
    // engelliyor (eski iOS'ta gizli sekme böyleydi). Bu yüzden gerçek bir
    // yazma denemesi yapılıyor ve iz bırakmadan siliniyor.
    const deneme = '__bras_depo_denemesi__';
    window.localStorage.setItem(deneme, '1');
    window.localStorage.removeItem(deneme);
    depoDurumu = true;
  } catch (e) {
    depoDurumu = false;
  }
  return depoDurumu;
}

/** Arayüz, oturumun kalıcı olup olmayacağını kullanıcıya bildirmek için kullanıyor. */
export function depolamaCalisiyorMu() {
  return depoCalisiyor();
}

export function tokenAl() {
  if (!depoCalisiyor()) return bellektekiJeton;
  try {
    return window.localStorage.getItem(TOKEN_ANAHTARI);
  } catch (e) {
    // Yoklama sırasında çalışıyordu ama şimdi çalışmıyor (kullanıcı ayarı
    // sekme açıkken değiştirmiş olabilir). Bellek yedeğine düşüyoruz.
    depoDurumu = false;
    return bellektekiJeton;
  }
}

export function tokenKaydet(token) {
  // Bellek her durumda güncelleniyor: depolama sonradan bozulsa bile
  // oturum aynı sekmede ayakta kalsın.
  bellektekiJeton = token || null;
  if (!depoCalisiyor()) return;
  try {
    if (token) window.localStorage.setItem(TOKEN_ANAHTARI, token);
    else window.localStorage.removeItem(TOKEN_ANAHTARI);
  } catch (e) {
    depoDurumu = false;
  }
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

/**
 * Veri dökümünü indirir (KVKK m.11 / GDPR m.15, m.20).
 *
 * `istek` kullanılmıyor: o fonksiyon cevabı JSON olarak çözüyor, burada ise
 * dosya olarak kaydedilmesi gerekiyor. Düz bir <a href> de olmuyor, çünkü
 * istek Authorization başlığı taşımak zorunda — tarayıcı bunu bağlantıya
 * ekleyemez. Bu yüzden blob alınıp geçici bir bağlantıyla indiriliyor.
 */
export async function verileriniIndir() {
  const cevap = await fetch(`${API_URL}/api/me/verilerim`, {
    headers: { Authorization: `Bearer ${tokenAl()}` },
  });
  if (!cevap.ok) {
    let mesaj = `Sunucu hatası (${cevap.status})`;
    try { mesaj = (await cevap.json()).error || mesaj; } catch (e) { /* gövde JSON değil */ }
    throw new Error(mesaj);
  }

  // Dosya adını sunucunun verdiği başlıktan alıyoruz; yoksa kendimiz kuruyoruz.
  const basliktan = (cevap.headers.get('Content-Disposition') || '').match(/filename="(.+?)"/);
  const ad = basliktan ? basliktan[1] : 'verilerim.json';

  const blob = await cevap.blob();
  const adres = URL.createObjectURL(blob);
  const bag = document.createElement('a');
  bag.href = adres;
  bag.download = ad;
  document.body.appendChild(bag);
  bag.click();
  // Temizlik şart: object URL sayfa kapanana kadar bellekte kalırdı.
  document.body.removeChild(bag);
  URL.revokeObjectURL(adres);
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

  // Geri alınamaz. Parola doğrulaması sunucuda yapılıyor.
  hesabiSil: (password) =>
    istek('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) }),

  girisYap: (email, password) =>
    istek('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // --- İKİ AŞAMALI DOĞRULAMA ---
  // girisYap 2FA açık bir hesapta token yerine { ikinciAsama, geciciBilet }
  // döndürüyor; kod bununla doğrulanıyor.
  girisKodDogrula: (geciciBilet, kod) =>
    istek('/api/login/2fa', { method: 'POST', body: JSON.stringify({ geciciBilet, kod }) }),

  // --- E-POSTA DOĞRULAMA ---
  // Kayıt artık token döndürmüyor: { dogrulamaGerekli: true } dönüyor ve
  // kullanıcı postadaki bağlantıya tıklayana kadar giriş yapamıyor.
  ePostaDogrula: (bilet) =>
    istek('/api/eposta/dogrula', { method: 'POST', body: JSON.stringify({ bilet }) }),

  dogrulamaTekrarGonder: (email) =>
    istek('/api/eposta/tekrar-gonder', { method: 'POST', body: JSON.stringify({ email }) }),

  // --- ŞİFRE SIFIRLAMA ---
  // Sunucu, adres kayıtlı olsun olmasın AYNI yanıtı veriyor; arayüz de bu
  // yüzden "posta gitti" demiyor, "kayıtlıysa gitti" diyor.
  avatarSec: (avatar) =>
    istek('/api/me', { method: 'PUT', body: JSON.stringify({ avatar }) }),

  parolaDegistir: (mevcutParola, yeniParola, kod) =>
    istek('/api/parola/degistir', {
      method: 'POST',
      body: JSON.stringify({ mevcutParola, yeniParola, kod }),
    }),

  sifremiUnuttum: (email) =>
    istek('/api/sifre/unuttum', { method: 'POST', body: JSON.stringify({ email }) }),

  // 2FA açık hesapta kod gerekiyor. Kod gönderilmezse sunucu hata değil
  // { ikinciAsama: true } dönüyor; arayüz o zaman kodu soruyor.
  sifreYenile: (bilet, password, kod) =>
    istek('/api/sifre/yenile', {
      method: 'POST',
      body: JSON.stringify({ bilet, password, ...(kod ? { kod } : {}) }),
    }),

  ikiAsamaBaslat: () => istek('/api/2fa/baslat', { method: 'POST' }),

  ikiAsamaDogrula: (kod) =>
    istek('/api/2fa/dogrula', { method: 'POST', body: JSON.stringify({ kod }) }),

  ikiAsamaKapat: (password) =>
    istek('/api/2fa/kapat', { method: 'POST', body: JSON.stringify({ password }) }),

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
