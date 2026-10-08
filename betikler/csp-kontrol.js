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

/*
 * DENETİM 1 — public/uyumluluk.html ile vercel.json aynı API adresini mi
 * gösteriyor?
 *
 * Uyumluluk sayfası bir React bileşeni değil, düz HTML. Bu yüzden API
 * adresini ortam değişkeninden alamıyor ve script etiketinde data-api
 * olarak yazılı duruyor. Adres bir gün değişir de orası unutulursa denetim
 * sayfası "sunucuya erişilemiyor" der ve bizi yanlış yere bakmaya
 * gönderir. Burada ikisinin aynı kaldığı doğrulanıyor.
 *
 * Bu denetim REACT_APP_API_URL'den bağımsız: yerelde de çalışıyor.
 */
(function uyumlulukSayfasiniDenetle() {
  const sayfaYolu = path.join(kok, 'public', 'uyumluluk.html');
  let sayfa;
  try {
    sayfa = fs.readFileSync(sayfaYolu, 'utf8');
  } catch (e) {
    console.error('[CSP] public/uyumluluk.html okunamadı:', e.message);
    process.exit(1);
  }

  const esl = sayfa.match(/data-api="([^"]+)"/);
  if (!esl) {
    console.error('[CSP] uyumluluk.html içinde data-api özniteliği yok.');
    process.exit(1);
  }

  let ayar;
  try {
    ayar = JSON.parse(fs.readFileSync(path.join(kok, 'vercel.json'), 'utf8'));
  } catch (e) {
    console.error('[CSP] vercel.json okunamadı:', e.message);
    process.exit(1);
  }
  const bsl = ((ayar.headers || [])[0] || {}).headers || [];
  const politika = (bsl.find((h) => h.key === 'Content-Security-Policy') || {}).value || '';
  const baglan = politika.split(';').map((x) => x.trim()).find((x) => x.startsWith('connect-src')) || '';

  let sayfaKaynak;
  try {
    sayfaKaynak = new URL(esl[1]).origin;
  } catch (e) {
    console.error(`[CSP] uyumluluk.html data-api geçerli bir adres değil: ${esl[1]}`);
    process.exit(1);
  }

  if (!baglan.split(/\s+/).includes(sayfaKaynak)) {
    console.error('');
    console.error('  DERLEME DURDURULDU: uyumluluk.html ile CSP uyuşmuyor');
    console.error(`  uyumluluk.html data-api : ${sayfaKaynak}`);
    console.error(`  vercel.json             : ${baglan}`);
    console.error('  Denetim sayfası sunucuya ulaşamaz ve yanlış teşhis koyar.');
    console.error('');
    process.exit(1);
  }
  console.log(`[CSP] Uyumluluk sayfası denetlendi: ${sayfaKaynak}`);
}());

/*
 * DENETİM 2 — satır içi betik var mı?
 *
 * script-src 'self' satır içi betiğe izin vermiyor. index.html'e bir gün
 * satır içi <script> girerse tarayıcı onu engeller; hata yalnızca
 * kullanıcının konsolunda görünür, derlemede hiçbir uyarı çıkmaz.
 */
(function satirIciBetikDenetle() {
  const sayfa = fs.readFileSync(path.join(kok, 'public', 'index.html'), 'utf8');
  // src taşımayan <script ...> açılışları satır içi betiktir.
  const hepsi = sayfa.match(/<script\b[^>]*>/gi) || [];
  const satirIci = hepsi.filter((e) => !/\bsrc=/i.test(e));
  if (satirIci.length) {
    console.error('[CSP] index.html içinde satır içi betik var, CSP bunu engeller:');
    satirIci.forEach((e) => console.error('   ' + e));
    process.exit(1);
  }
  console.log('[CSP] index.html içinde satır içi betik yok.');
}());

if (!apiAdresi) {
  console.log('[CSP] REACT_APP_API_URL tanımlı değil (yerel derleme) — connect-src denetimi atlandı.');
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
