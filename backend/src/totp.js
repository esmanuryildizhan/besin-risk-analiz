// src/totp.js
//
// İki aşamalı doğrulama (TOTP — RFC 6238) için gizli anahtarın şifrelenmesi
// ve kod doğrulama.
//
// NİYE AYRI DOSYA: bu mantık index.js içindeyken test edilemiyordu, çünkü o
// dosya yüklendiği anda sunucuyu başlatıyor. Ayrı modül olunca
// `guvenlik_test.js` doğrudan sınayabiliyor — ve gerçekten gerekti:
// otplib 13 ile `authenticator` nesnesi kaldırılmış, eski API'yle yazılan kod
// çalışma anında patlıyordu. Test olmadan bu, kullanıcı 2FA'yı açmaya
// çalıştığında ortaya çıkardı.

const crypto = require('crypto');
const { generateSecret, generateURI, verifySync } = require('otplib');

/**
 * Şifreleme anahtarını türetir.
 *
 * Ayrı bir ortam değişkeni (TOTP_ANAHTARI) tanımlıysa o kullanılır; yoksa
 * JWT_SECRET'ten türetilir. İkinci durumda JWT_SECRET değiştirilirse mevcut
 * TOTP kurulumları çözülemez ve kullanıcıların 2FA'yı yeniden kurması gerekir.
 * Ayrı değişken tanımlamak bu bağı koparır.
 */
function anahtarTuret(temelAnahtar) {
  return crypto.scryptSync(temelAnahtar, 'besin-risk-analiz-totp', 32);
}

/* ──────────────────────────────────────────────────────────────────────────
   NİYE ÖZETLEME DEĞİL ŞİFRELEME
   ──────────────────────────────────────────────────────────────────────────
   Şifreyi bcrypt ile özetliyoruz çünkü geri okumamız gerekmiyor — kullanıcının
   girdiğiyle karşılaştırmak yeter. TOTP anahtarı öyle değil: sunucunun o anki
   kodu HESAPLAMASI için anahtarın kendisi lazım. Yani geri döndürülebilir
   olmalı, dolayısıyla şifreleme.

   NİYE GEREKLİ: anahtar düz metin saklanırsa, veritabanı sızdığında saldırgan
   her kullanıcı için geçerli kod üretebilir — yani 2FA hiçbir işe yaramaz.

   AES-256-GCM: hem şifreliyor hem bütünlüğü doğruluyor. Kurcalanmış veri
   çözülmüyor, sessizce yanlış sonuç vermiyor.
   ────────────────────────────────────────────────────────────────────────── */

function sifrele(duzMetin, temelAnahtar) {
  const k = anahtarTuret(temelAnahtar);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const veri = Buffer.concat([c.update(duzMetin, 'utf8'), c.final()]);
  return [iv.toString('hex'), c.getAuthTag().toString('hex'), veri.toString('hex')].join(':');
}

function coz(saklanan, temelAnahtar) {
  if (!saklanan) return null;
  try {
    const [ivHex, etiketHex, veriHex] = saklanan.split(':');
    if (!ivHex || !etiketHex || !veriHex) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', anahtarTuret(temelAnahtar), Buffer.from(ivHex, 'hex'));
    d.setAuthTag(Buffer.from(etiketHex, 'hex'));
    return Buffer.concat([d.update(Buffer.from(veriHex, 'hex')), d.final()]).toString('utf8');
  } catch (e) {
    // Anahtar değişmiş ya da kayıt kurcalanmış. Sessizce kabul etmek güvenlik
    // açığı olurdu; null dönüyoruz, kullanıcı 2FA'yı yeniden kurmak zorunda.
    return null;
  }
}

/**
 * Kodu doğrular.
 *
 * window: 1 — kod 30 saniyede bir değişiyor; bir önceki ve bir sonraki
 * aralığın kodu da kabul ediliyor, telefon saati birkaç saniye kaymışsa
 * kullanıcı boşuna uğraşmasın diye.
 *
 * DİKKAT: verifySync boolean DEĞİL, { valid, delta, ... } nesnesi döndürüyor.
 * Doğrudan if içine koymak her kodu geçerli sayardı — nesne her zaman doğru.
 */
function gecerliMi(kod, anahtar) {
  if (!kod || !anahtar) return false;
  try {
    return verifySync({ secret: anahtar, token: String(kod), window: 1 }).valid === true;
  } catch (e) {
    return false;
  }
}

/** Doğrulayıcı uygulamaların okuduğu standart otpauth:// adresi. */
function kurulumAdresi(eposta, anahtar) {
  return generateURI({ issuer: 'Besin Risk Analiz', label: eposta, secret: anahtar });
}

module.exports = { sifrele, coz, gecerliMi, kurulumAdresi, yeniAnahtar: generateSecret };
