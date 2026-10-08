// src/eposta_sablon.js
//
// Postaların HTML gövdesi.
//
// NİYE HTML: postalar düz metindi ve bağlantı olarak çıplak adres
// yazıyordu. Bazı istemciler uzun adresleri kendiliğinden bağlantıya
// çevirmiyor ya da satır sonunda bölüyor — kullanıcı "bağlantı tıklanmıyor"
// diyordu. Gerçek bir <a> düğmesi bu sorunu kökten kaldırıyor.
//
// DÜZ METİN DE GÖNDERİLİYOR (çok parçalı posta): HTML'i engelleyen ya da
// göstermeyen istemcilerde posta yine okunabilir kalmalı. Erişilebilirlik
// açısından da gerekli.
//
// E-POSTA HTML'İ WEB HTML'İ DEĞİL:
//   - Düzen TABLOYLA kuruluyor. Outlook (Word motoru) flexbox ve grid
//     desteklemiyor; float ve modern düzen de güvenilmez.
//   - Stiller SATIR İÇİ. Gmail <style> bloklarını büyük ölçüde atıyor.
//   - Görsel UZAK ADRESTEN. data: URI'ler Gmail'de engelleniyor; arayüzün
//     kendi sunucusundaki logo kullanılıyor. Görseller kapalıysa alt
//     metni görünüyor, tasarım bozulmuyor.
//   - Genişlik 600 px: posta istemcilerinin okuma bölmesi için yerleşik ölçü.

const MARKA = 'Besin Risk Analiz Sistemi';
const YESIL = '#15803d';        // green-700 — arayüzdeki düğme rengiyle aynı
const KOYU = '#1f2937';
const GRI = '#6b7280';

/** HTML'e girecek her değer kaçırılıyor: adres ve adlar dışarıdan geliyor. */
function kacir(metin) {
  return String(metin == null ? '' : metin)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Ortak çerçeve.
 *
 * @param {object} p
 * @param {string} p.baslik      büyük başlık
 * @param {string[]} p.paragraflar  gövde paragrafları (düz metin, kaçırılıyor)
 * @param {string} [p.dugmeYazisi]
 * @param {string} [p.dugmeAdresi]
 * @param {string} [p.sureNotu]  düğmenin altındaki küçük not
 * @param {string} [p.dipNot]    gri kutudaki açıklama
 * @param {string} p.siteAdresi  altbilgideki bağlantı
 */
function cerceve({
  baslik, paragraflar = [], dugmeYazisi, dugmeAdresi, sureNotu, dipNot, siteAdresi,
}) {
  const logo = `${siteAdresi.replace(/\/+$/, '')}/logo192.png`;
  const govde = paragraflar
    .map((x) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${KOYU};">${kacir(x)}</p>`)
    .join('');

  const dugme = dugmeAdresi ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;width:100%;">
              <tr>
                <td align="center" bgcolor="${YESIL}" style="border-radius:12px;">
                  <a href="${kacir(dugmeAdresi)}"
                     style="display:block;padding:16px 28px;font-size:16px;font-weight:bold;
                            color:#ffffff;text-decoration:none;border-radius:12px;">
                    ${kacir(dugmeYazisi)}
                  </a>
                </td>
              </tr>
            </table>` : '';

  const sure = sureNotu ? `
            <p style="margin:0;text-align:center;font-size:13px;color:${GRI};">${kacir(sureNotu)}</p>` : '';

  const dip = dipNot ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
              <tr>
                <td style="background:#f3f4f6;border-left:4px solid #d1d5db;border-radius:8px;padding:16px 18px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${kacir(dipNot)}</p>
                </td>
              </tr>
            </table>` : '';

  // lang ve rol bilgileri ekran okuyucu için; düzen tabloları role="presentation".
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${kacir(baslik)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <!-- Önizleme metni: gelen kutusunda konu başlığının yanında görünür. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${kacir(paragraflar[0] || baslik)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
             style="width:600px;max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <tr><td style="height:6px;background:${YESIL};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px 36px 8px;" align="center">
            <img src="${kacir(logo)}" width="48" height="48" alt="${kacir(MARKA)}"
                 style="display:block;border:0;border-radius:12px;margin-bottom:12px;">
            <p style="margin:0;font-size:17px;font-weight:bold;color:${KOYU};">${kacir(MARKA)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 36px;">
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${YESIL};text-align:center;">
              ${kacir(baslik)}
            </h1>
            ${govde}${dugme}${sure}${dip}
          </td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
             style="width:600px;max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <tr><td align="center" style="padding:20px 16px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:${GRI};">${kacir(MARKA)} &copy; 2026</p>
          <p style="margin:0 0 6px;font-size:13px;">
            <a href="${kacir(siteAdresi)}" style="color:${YESIL};">${kacir(siteAdresi)}</a>
          </p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Bu otomatik bir e-postadır, lütfen yanıtlamayınız.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = { cerceve, kacir, MARKA };
