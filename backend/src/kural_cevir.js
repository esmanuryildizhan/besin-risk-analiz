// src/kural_cevir.js
//
// Veritabanı kural satırı <-> risk motoru kural nesnesi çevirisi.
//
// NİYE AYRI DOSYA: bu eşleme eskiden index.js içinde elle yazılıydı ve muafiyet
// alanları (muafLifYogunlugu, muafDoymamisOran) atlanmıştı. Sonuç: testler
// HASTALIKLAR'ı doğrudan okuduğu için geçiyordu, canlı API ise muafiyetsiz
// çalışıyordu — baklagiller ve zeytinyağı haksız uyarı alıyordu. Çözüm tek bir
// KURAL_ALANLARI tablosu olmuştu. Aynı mantığı denetim araçlarına KOPYALAMAK o
// hatayı geri davet etmek olurdu, o yüzden çeviri tek yerde duruyor.
const { KURAL_ALANLARI } = require('../prisma/hastalik_kurallari');

/** Veritabanı kural satırını risk motorunun beklediği şekle çevirir. */
function kuraliCoz(k) {
  const kural = {};
  for (const [motorAnahtar, sutun] of Object.entries(KURAL_ALANLARI)) {
    let deger = k[sutun];
    if (sutun === 'categories') deger = deger && deger.length ? deger : null;
    if (deger === null || deger === undefined) continue;   // motor yokluğu "yok" sayıyor
    kural[motorAnahtar] = deger;
  }
  return kural;
}

module.exports = { kuraliCoz };
