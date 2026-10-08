#!/usr/bin/env node
/*
 * src/posta_onizleme.js — postaların nasıl göründüğünü dosyaya basar.
 * Çalıştırma:  node src/posta_onizleme.js
 *
 * NİYE VAR: posta tasarımını değiştirince sonucu görmek için gerçekten posta
 * göndermek gerekiyordu. Her denemede gelen kutusu kirleniyor, Brevo'nun
 * günlük kotası eriyor ve bir yazım hatasını görmek için dakikalar geçiyor.
 * Bu betik hiçbir şey göndermiyor: gönderim katmanını yakalayıp HTML gövdeyi
 * tek bir dosyaya yazıyor.
 *
 * NASIL: eposta.js, Brevo yolunda global fetch kullanıyor. Burada fetch
 * yerine bir yakalayıcı konuyor; modül kendini normal sanıyor ama hiçbir ağ
 * isteği çıkmıyor. Böylece ÖNİZLEME İLE GERÇEK POSTA AYNI KODDAN üretiliyor;
 * elle kopyalanmış bir taslak bir gün asıl postadan ayrışırdı.
 *
 * Çıktı: backend/posta-onizleme.html (depoya girmiyor, .gitignore'da)
 */
const fs = require('fs');
const path = require('path');

// Önizlemede gerçek anahtar yok; yalnızca "brevo yolu seçilsin" diye yazılı.
process.env.BREVO_API_KEY = process.env.BREVO_API_KEY || 'xkeysib-onizleme';
process.env.MAIL_GONDEREN = process.env.MAIL_GONDEREN || 'ornek@ornek.com';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'https://besin-risk-analiz.vercel.app';

let yakalanan = null;
global.fetch = async (adres, ayar) => {
  yakalanan = JSON.parse(ayar.body);
  return { ok: true, status: 201, json: async () => ({}) };
};

const eposta = require('./eposta');

const SITE = process.env.FRONTEND_URL;
const POSTALAR = [
  ['Parola sıfırlama', () => eposta.sifirlamaGonder('ornek@ornek.com', `${SITE}/sifre-yenile?bilet=ORNEKBILET`, 60)],
  ['E-posta doğrulama', () => eposta.dogrulamaGonder('ornek@ornek.com', `${SITE}/eposta-dogrula?bilet=ORNEKBILET`, 1440)],
  ['Hesap zaten var', () => eposta.zatenKayitliGonder('ornek@ornek.com')],
  ['Hesap silme uyarısı', () => eposta.silmeUyarisiGonder('ornek@ornek.com', 14)],
  ['Şüpheli giriş uyarısı', () => eposta.supheliGirisGonder('ornek@ornek.com', 5, 15)],
];

function kacir(m) {
  return String(m).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async () => {
  const bolumler = [];
  for (const [ad, fn] of POSTALAR) {
    yakalanan = null;
    await fn();
    if (!yakalanan) { bolumler.push(`<h2>${kacir(ad)}</h2><p>Üretilemedi.</p>`); continue; }

    // srcdoc: her posta kendi belgesi olarak, kendi stilleriyle görünüyor.
    // Aynı sayfaya gömülseydi stiller birbirine karışırdı.
    bolumler.push(`
      <section>
        <h2>${kacir(ad)}</h2>
        <p class="k"><b>Konu:</b> ${kacir(yakalanan.subject)}</p>
        <iframe title="${kacir(ad)} önizlemesi" srcdoc="${kacir(yakalanan.htmlContent || '')}"></iframe>
        <details>
          <summary>HTML'i göstermeyen istemcilerde okunan düz metin</summary>
          <pre>${kacir(yakalanan.textContent || '')}</pre>
        </details>
      </section>`);
  }

  const sayfa = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Posta önizlemesi</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
       margin:0;padding:28px 18px;background:#eef0f2;color:#1f2937;}
  .sar{max-width:760px;margin:0 auto;}
  h1{font-size:22px;color:#15803d;}
  h2{font-size:17px;margin:34px 0 6px;}
  .k{margin:0 0 10px;font-size:14px;color:#4b5563;}
  iframe{width:100%;height:640px;border:1px solid #d1d5db;border-radius:12px;background:#fff;}
  pre{white-space:pre-wrap;background:#fff;border:1px solid #e5e7eb;border-radius:10px;
      padding:12px;font-size:12px;}
  summary{cursor:pointer;font-size:13px;color:#6b7280;margin-top:8px;}
</style></head>
<body><div class="sar">
<h1>Posta önizlemesi</h1>
<p class="k">Gerçek gönderim yapılmadı. Bu sayfa, uygulamanın gönderdiği
postaların aynı koddan üretilmiş kopyasıdır.</p>
${bolumler.join('\n')}
</div></body></html>`;

  const cikti = path.join(__dirname, '..', 'posta-onizleme.html');
  fs.writeFileSync(cikti, sayfa);
  console.log(`Yazıldı: ${cikti}`);
})();
