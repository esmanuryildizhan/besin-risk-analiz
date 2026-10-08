// src/guvenlik_gunlugu.js
//
// Güvenlik olaylarının kaydı ve şüpheli örüntü tespiti.
//
// ÖNCEKİ DURUM: olaylar yalnızca console.warn ile yazılıyordu. Render'ın
// günlükleri sınırlı süre tutuluyor, aranabilir değil ve servis uyanıp
// uyuduğunda akış kopuyor. Yani "hesabıma saldırı oldu mu" sorusunun
// cevabı hiçbir yerde yoktu.
//
// IP DÜZ SAKLANMIYOR. IP, KVKK ve GDPR açısından kişisel veri. Saldırı
// tespiti için gereken tek şey "aynı kaynak mı" sorusunun cevabı; bunun
// için ham adres gerekmiyor. HMAC-SHA256 özetinin ilk 16 hanesi saklanıyor:
//  - özetten adrese geri dönülemiyor,
//  - anahtar olmadan başka bir veri kümesiyle eşleştirilemiyor,
//  - ama aynı adres her zaman aynı özeti veriyor, yani sayım yapılabiliyor.
// Düz SHA-256 yeterli olmazdı: IPv4 uzayı 2^32, kaba kuvvetle tersine
// çevrilebilir. HMAC anahtarı bunu engelliyor.

const crypto = require('crypto');

const SAKLAMA_GUN = Number(process.env.GUVENLIK_SAKLAMA_GUN || 90);

// Şüpheli sayılma eşiği: aynı hesap için 15 dakikada 5 başarısız giriş.
const PENCERE_DK = Number(process.env.GUVENLIK_PENCERE_DK || 15);
const ESIK = Number(process.env.GUVENLIK_ESIK || 5);

// Kullanıcıya en fazla günde bir uyarı. Yoksa saldırgan art arda deneme
// yaparak kurbanın posta kutusunu doldurabilirdi (uyarının kendisi silah olur).
const UYARI_ARALIK_SAAT = 24;

let anahtar = null;
function ipAnahtari() {
  if (anahtar) return anahtar;
  // VERI_ANAHTARI'ndan TÜRETİLİYOR, doğrudan kullanılmıyor: aynı sırrı iki
  // ayrı amaçla kullanmak, birinin sızması hâlinde diğerini de açar.
  const temel = process.env.GUVENLIK_IP_ANAHTARI
    || process.env.VERI_ANAHTARI
    || process.env.JWT_SECRET
    || '';
  if (!temel) return null;
  anahtar = crypto.createHmac('sha256', temel).update('ip-ozeti-v1').digest();
  return anahtar;
}

/** IP'yi geri döndürülemez bir sayma anahtarına çevirir. */
function ipOzetle(ip) {
  if (!ip) return null;
  const k = ipAnahtari();
  if (!k) return null;          // anahtar yoksa hiç saklama
  return crypto.createHmac('sha256', k).update(String(ip)).digest('hex').slice(0, 16);
}

/**
 * Olayı veritabanına yazar.
 *
 * HATA YUTULUYOR: günlük tutmak, kullanıcının isteğini ASLA bozmamalı.
 * Tablo henüz oluşmamışsa (göç uygulanmadıysa) ya da veritabanı o an
 * erişilemiyorsa uygulama çalışmaya devam etmeli. Konsola yazma zaten
 * ayrıca yapılıyor, yani kayıt tamamen kaybolmuyor.
 */
async function kaydet(prisma, { olay, ip, kullaniciId = null, ayrinti = null }) {
  try {
    await prisma.guvenlikOlayi.create({
      data: { olay, ipOzeti: ipOzetle(ip), kullaniciId, ayrinti },
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Bu hesap için son PENCERE_DK dakikada kaç başarısız giriş var?
 * Eşiği aşınca çağıran taraf kullanıcıyı uyarıyor.
 */
async function sonBasarisizSayisi(prisma, kullaniciId) {
  if (!kullaniciId) return 0;
  try {
    return await prisma.guvenlikOlayi.count({
      where: {
        kullaniciId,
        olay: { in: ['giriş başarısız', 'kilitli hesaba giriş denemesi'] },
        zaman: { gte: new Date(Date.now() - PENCERE_DK * 60 * 1000) },
      },
    });
  } catch (e) {
    return 0;
  }
}

/** Son UYARI_ARALIK_SAAT içinde bu hesaba uyarı gönderildi mi? */
async function yakindaUyarildiMi(prisma, kullaniciId) {
  try {
    const n = await prisma.guvenlikOlayi.count({
      where: {
        kullaniciId,
        olay: 'şüpheli giriş uyarısı gönderildi',
        zaman: { gte: new Date(Date.now() - UYARI_ARALIK_SAAT * 60 * 60 * 1000) },
      },
    });
    return n > 0;
  } catch (e) {
    return true;   // emin olamıyorsak GÖNDERME: posta bombardımanı riski
  }
}

/** Saklama süresi dolan olayları siler. KVKK m.4 (amaçla sınırlı süre). */
async function eskileriSil(prisma) {
  try {
    const sinir = new Date(Date.now() - SAKLAMA_GUN * 24 * 60 * 60 * 1000);
    const { count } = await prisma.guvenlikOlayi.deleteMany({
      where: { zaman: { lt: sinir } },
    });
    return count;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  ipOzetle, kaydet, sonBasarisizSayisi, yakindaUyarildiMi, eskileriSil,
  SAKLAMA_GUN, PENCERE_DK, ESIK, UYARI_ARALIK_SAAT,
};
