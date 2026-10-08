#!/usr/bin/env node
/*
 * CSP ile API adresinin uyuştuğunu DERLEME ZAMANINDA doğrular.
 *
 * NİYE VAR: CSP'deki connect-src adresi vercel.json içinde SABİT yazılı,
 * API adresi ise REACT_APP_API_URL ortam değişkeninden geliyor. İkisi
 * ayrışırsa tarayıcı bütün API çağrılarını engelliyor ve uygulama "hiçbir
 * şey yüklenmiyor" diye bozuluyor — üstelik sunucu tarafında hiçbir hata
 * görünmüyor, sebebi bulmak çok zor.
 *
 * Bu betik npm'in "prebuild" kancasıyla kendiliğinden çalışıyor, yani
 * Vercel'de de çalışıyor. Uyuşmazlık varsa derleme BAŞARISIZ oluyor:
 * bozuk bir sürümün yayına çıkmasındansa derlemenin durması iyidir.
 */
const fs = require('fs');
const path = require('path');

const kok = path.join(__dirname, '..');
const apiAdresi = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');

if (!apiAdresi) {
  console.log('[CSP] REACT_APP_API_URL tanımlı değil (yerel derleme) — denetim atlandı.');
  process.exit(0);
}

let vercel;
try {
  vercel = JSON.parse(fs.readFileSync(path.join(kok, 'vercel.json'), 'utf8'));
} catch (e) {
  console.error('[CSP] vercel.json okunamadı:', e.message);
  process.exit(1);
}

const basliklar = ((vercel.headers || [])[0] || {}).headers || [];
const csp = (basliklar.find((h) => h.key === 'Content-Security-Policy') || {}).value;
if (!csp) {
  console.error('[CSP] vercel.json içinde Content-Security-Policy başlığı yok.');
  process.exit(1);
}

const yonerge = csp.split(';').map((x) => x.trim()).find((x) => x.startsWith('connect-src'));
if (!yonerge) {
  console.error('[CSP] connect-src yönergesi yok; API çağrıları engellenir.');
  process.exit(1);
}

let kaynak;
try {
  kaynak = new URL(apiAdresi).origin;
} catch (e) {
  console.error(`[CSP] REACT_APP_API_URL geçerli bir adres değil: ${apiAdresi}`);
  process.exit(1);
}

if (!yonerge.split(/\s+/).includes(kaynak)) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  DERLEME DURDURULDU: CSP ile API adresi uyuşmuyor            ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error(`  REACT_APP_API_URL : ${kaynak}`);
  console.error(`  vercel.json       : ${yonerge}`);
  console.error('');
  console.error('  Bu hâliyle yayına çıksaydı tarayıcı BÜTÜN API çağrılarını');
  console.error('  engellerdi ve uygulama boş görünürdü.');
  console.error('');
  console.error(`  Çözüm: vercel.json içindeki connect-src yönergesine ${kaynak} ekleyin.`);
  console.error('');
  process.exit(1);
}

console.log(`[CSP] Uyumlu: connect-src içinde ${kaynak} var.`);
