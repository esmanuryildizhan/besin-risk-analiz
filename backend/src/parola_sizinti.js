// src/parola_sizinti.js
//
// Parolanın bilinen veri ihlallerinde geçip geçmediğini sorar.
//
// NİYE BU, KOMPOZİSYON KURALINDAN DAHA ÖNEMLİ:
// NIST SP 800-63B §5.1.1.2 doğrudan bunu istiyor — yeni parolalar "önceki
// ihlallerde ele geçirilmiş değerler" listesine karşı kontrol edilmeli.
// "Parola123!" bütün kompozisyon kurallarını geçiyor ama milyonlarca kez
// sızmış durumda; kaba kuvvet değil, sözlük saldırısı onu ilk denemelerde
// bulur.
//
// PAROLA DIŞARI ÇIKMIYOR — k-anonimlik:
// SHA-1 özetinin yalnızca İLK 5 HANESİ gönderiliyor. Sunucu o ön ekle
// başlayan bütün özet KUYRUKLARINI döndürüyor (tipik olarak ~500-800 tane),
// eşleşme karşılaştırması bizde yapılıyor. Yani uzak sunucu hangi parolayı
// sorduğumuzu bilemiyor; yalnızca 5 hanelik bir ön ek görüyor.
//
// SHA-1 burada parola SAKLAMAK için değil, bu protokolün tanımladığı arama
// anahtarı olarak kullanılıyor. Saklama bcrypt ile yapılıyor (index.js).
//
// AĞ HATASINDA GEÇİRİYOR (fail-open):
// Servis erişilemezse kayıt tamamen durmamalı. Kompozisyon kuralı ve uzunluk
// zaten uygulanmış oluyor; bu denetim onların ÜSTÜNE eklenen bir katman.
// Fail-closed yapılsaydı api.pwnedpasswords.com'daki bir kesinti bütün
// kayıt ve parola değiştirme akışını kilitlerdi.

const crypto = require('crypto');

const ADRES = 'https://api.pwnedpasswords.com/range/';
const SURE_MS = Number(process.env.SIZINTI_SURE_MS || 3000);
// Kaç kez görüldüyse reddedilsin. 1 bile sızmış demek; eşiği 1'de tutuyoruz.
const ESIK = 1;

/**
 * @returns {Promise<{bakildi: boolean, sizmis: boolean, kezSayisi: number}>}
 *   bakildi=false -> servise ulaşılamadı, karar verilemedi (geçiriliyor)
 */
async function sizintiKontrol(parola) {
  if (typeof parola !== 'string' || !parola) {
    return { bakildi: false, sizmis: false, kezSayisi: 0 };
  }
  const ozet = crypto.createHash('sha1').update(parola, 'utf8').digest('hex').toUpperCase();
  const onEk = ozet.slice(0, 5);
  const kuyruk = ozet.slice(5);

  const iptal = new AbortController();
  const zamanlayici = setTimeout(() => iptal.abort(), SURE_MS);
  try {
    const cevap = await fetch(ADRES + onEk, {
      signal: iptal.signal,
      headers: {
        // Yanıta yapay kayıtlar ekleterek gerçek kuyruğu gizliyor.
        'Add-Padding': 'true',
        'User-Agent': 'besin-risk-analiz',
      },
    });
    if (!cevap.ok) return { bakildi: false, sizmis: false, kezSayisi: 0 };
    const govde = await cevap.text();
    for (const satir of govde.split('\n')) {
      const [k, sayi] = satir.trim().split(':');
      if (k === kuyruk) {
        const n = Number(sayi) || 0;
        return { bakildi: true, sizmis: n >= ESIK, kezSayisi: n };
      }
    }
    return { bakildi: true, sizmis: false, kezSayisi: 0 };
  } catch (e) {
    // Zaman aşımı, DNS, ağ engeli... Karar verilemedi.
    return { bakildi: false, sizmis: false, kezSayisi: 0 };
  } finally {
    clearTimeout(zamanlayici);
  }
}

module.exports = { sizintiKontrol, SURE_MS };
