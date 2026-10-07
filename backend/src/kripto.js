// src/kripto.js
//
// Özel nitelikli kişisel verilerin (sağlık verisi) alan bazlı şifrelenmesi.
//
// ───────────────────────────────────────────────────────────────────────────
// NİYE VAR — bu bir tercih değil, yükümlülük
//
// KVKK Kurulu'nun 31/01/2018 tarih ve 2018/10 sayılı kararı, özel nitelikli
// kişisel veriler elektronik ortamda saklanırken şunu istiyor:
//
//   3a. "Verilerin kriptografik yöntemler kullanılarak muhafaza edilmesi"
//   3b. "Kriptografik anahtarların güvenli ve farklı ortamlarda tutulması"
//
// Hastalık bilgisi, besin alerjisi ve kan tahlili sonuçları özel nitelikli
// kişisel veridir (KVKK m.6). Bu yüzden veritabanına düz metin yazılamazlar.
//
// 3b maddesi karşılanıyor: anahtar ortam değişkeninde duruyor, veritabanında
// DEĞİL. Veritabanı sızsa bile anahtar sızmıyor, şifreli veri okunamıyor.
// ───────────────────────────────────────────────────────────────────────────
//
// YÖNTEM: AES-256-GCM. Hem şifreliyor hem bütünlüğü doğruluyor — kurcalanmış
// kayıt çözülmüyor, sessizce yanlış değer vermiyor.
//
// Her kayıt RASTGELE bir IV ile şifreleniyor. Sonucu: aynı hastalık iki
// kullanıcıda farklı şifreli metin üretiyor. Bu kasıtlı — aksi hâlde
// saldırgan, hangi satırların aynı değeri taşıdığını görüp hastalıkları
// frekans analiziyle tahmin edebilirdi.
//
// BUNUN BEDELİ: şifreli alanda VERİTABANI ARAMASI VE SIRALAMASI YAPILAMAZ.
// Bu yüzden `userId` ve `testDate` bilerek şifrelenmiyor — sorgular onların
// üzerinden yürüyor ve ikisi tek başına sağlık verisi değil. Test adına göre
// sıralama artık veritabanında değil, çözüldükten sonra bellekte yapılıyor.

const crypto = require('crypto');

const ONEK = 'v1';   // sürüm öneki: ileride yöntem değişirse eski kayıtlar ayırt edilsin

let anahtar = null;

/**
 * Anahtarı ortam değişkeninden türetir.
 *
 * VERI_ANAHTARI tanımlıysa o kullanılır. Tanımlı değilse JWT_SECRET'ten
 * türetilir ki uygulama çalışmaya devam etsin — ama o durumda JWT_SECRET
 * değiştirilirse TÜM sağlık verisi okunamaz hâle gelir. Yayında ayrı
 * değişken tanımlanmalı.
 */
function anahtariAl() {
  if (anahtar) return anahtar;
  const temel = process.env.VERI_ANAHTARI || process.env.JWT_SECRET;
  if (!temel) throw new Error('VERI_ANAHTARI veya JWT_SECRET tanımlı değil.');
  anahtar = crypto.scryptSync(temel, 'besin-risk-analiz-veri', 32);
  return anahtar;
}

/** Metni şifreler. null/undefined aynen geçer (boş alan boş kalsın). */
function sifrele(deger) {
  if (deger === null || deger === undefined) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', anahtariAl(), iv);
  const veri = Buffer.concat([c.update(String(deger), 'utf8'), c.final()]);
  return [ONEK, iv.toString('hex'), c.getAuthTag().toString('hex'), veri.toString('hex')].join(':');
}

/** Şifreli metni çözer. Çözülemezse null — sessizce yanlış değer dönmez. */
function coz(saklanan) {
  if (saklanan === null || saklanan === undefined) return null;
  try {
    const [onek, ivHex, etiketHex, veriHex] = String(saklanan).split(':');
    if (onek !== ONEK || !ivHex || !etiketHex || !veriHex) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', anahtariAl(), Buffer.from(ivHex, 'hex'));
    d.setAuthTag(Buffer.from(etiketHex, 'hex'));
    return Buffer.concat([d.update(Buffer.from(veriHex, 'hex')), d.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

/** Sayıyı şifreler (metin olarak saklanır). */
function sayiSifrele(deger) {
  if (deger === null || deger === undefined || deger === '') return null;
  const n = Number(deger);
  return Number.isFinite(n) ? sifrele(String(n)) : null;
}

/** Şifreli sayıyı geri okur. */
function sayiCoz(saklanan) {
  const m = coz(saklanan);
  if (m === null) return null;
  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

module.exports = { sifrele, coz, sayiSifrele, sayiCoz };
