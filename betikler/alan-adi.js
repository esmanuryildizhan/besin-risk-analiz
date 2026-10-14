#!/usr/bin/env node
/*
 * betikler/alan-adi.js — alan adını TEK KOMUTLA değiştirir.
 * Çalıştırma:
 *     node betikler/alan-adi.js besinriskanaliz.com
 *     node betikler/alan-adi.js besinriskanaliz.com api.besinriskanaliz.com
 *
 * NİYE VAR: alan adı üç ayrı dosyada yazılı ve biri unutulursa sonuç
 * sessiz bir arıza oluyor:
 *   - vercel.json          -> CSP connect-src. Yanlışsa tarayıcı BÜTÜN API
 *                             çağrılarını engelliyor, uygulama boş açılıyor
 *                             ve sunucu günlüğünde hiçbir hata görünmüyor.
 *   - .env.production      -> bağlantı önizlemesi (og:image, og:url).
 *   - public/uyumluluk.html-> denetim sayfasının sunucu testi.
 * Elle değiştirmek, üçünden birini atlamak demek. Bu betik üçünü birden
 * değiştiriyor; derleme öncesi çalışan csp-kontrol.js de sonucu doğruluyor.
 *
 * ORTAM DEĞİŞKENLERİNİ DEĞİŞTİRMEZ: Vercel'deki REACT_APP_API_URL ve
 * Render'daki FRONTEND_URL panellerden elle girilir. Betik bitince ikisini
 * de ekrana yazıyor.
 */
const fs = require('fs');
const path = require('path');

const kok = path.join(__dirname, '..');
const [, , hamSite, hamApi] = process.argv;

if (!hamSite) {
  console.error('Kullanım: node betikler/alan-adi.js <alanadi.com> [api.alanadi.com]');
  process.exit(1);
}

/** "ornek.com", "https://ornek.com", "https://ornek.com/" -> "https://ornek.com" */
function adresiDuzelt(x) {
  const s = String(x).trim().replace(/\/+$/, '');
  const tam = /^https?:\/\//.test(s) ? s : `https://${s}`;
  let u;
  try { u = new URL(tam); } catch (e) {
    console.error(`Geçersiz adres: ${x}`);
    process.exit(1);
  }
  if (u.protocol !== 'https:') {
    console.error('Adres https olmalı; http ile sağlık verisi taşınmaz.');
    process.exit(1);
  }
  return u.origin;
}

const SITE = adresiDuzelt(hamSite);
const API = adresiDuzelt(hamApi || `api.${new URL(SITE).hostname}`);

function yaz(gorecelYol, degistir) {
  const yol = path.join(kok, gorecelYol);
  const eski = fs.readFileSync(yol, 'utf8');
  const yeni = degistir(eski);
  if (yeni === eski) {
    console.log(`  = ${gorecelYol} (değişiklik yok)`);
    return;
  }
  fs.writeFileSync(yol, yeni);
  console.log(`  ✓ ${gorecelYol}`);
}

console.log(`\nArayüz : ${SITE}\nAPI    : ${API}\n`);

/* 1) vercel.json -> CSP connect-src */
yaz('vercel.json', (m) => {
  const ayar = JSON.parse(m);
  const basliklar = ((ayar.headers || [])[0] || {}).headers || [];
  const csp = basliklar.find((h) => h.key === 'Content-Security-Policy');
  if (!csp) throw new Error('vercel.json içinde CSP başlığı yok');
  csp.value = csp.value.split(';').map((p) => {
    const t = p.trim();
    if (!t.startsWith('connect-src')) return t;
    return `connect-src 'self' ${API}`;
  }).filter(Boolean).join('; ');
  return `${JSON.stringify(ayar, null, 2)}\n`;
});

/* 2) .env.production -> REACT_APP_SITE_URL */
yaz('.env.production', (m) => m.replace(
  /^REACT_APP_SITE_URL=.*$/m,
  `REACT_APP_SITE_URL=${SITE}`,
));

/* 3) public/uyumluluk.html -> data-api */
yaz('public/uyumluluk.html', (m) => m.replace(
  /data-api="[^"]*"/,
  `data-api="${API}"`,
));

console.log(`
Şimdi panellerden şunları değiştirin (betik bunları yapamaz):

  Vercel  > Settings > Environment Variables
      REACT_APP_API_URL = ${API}

  Render  > Environment
      FRONTEND_URL      = ${SITE}

Sonra:  git add -A && git commit && git push
Derleme sırasında şu satırı görmelisiniz:
  [CSP] Uyumlu: connect-src içinde ${API} var.
`);
