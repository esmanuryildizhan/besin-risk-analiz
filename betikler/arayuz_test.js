#!/usr/bin/env node
/*
 * betikler/arayuz_test.js — ARAYÜZ TESTLERİ
 * Çalıştırma:  node betikler/arayuz_test.js   (ya da  npm run test:arayuz)
 *
 * NİYE AYRI BİR DOSYA: backend testleri saf iş mantığını ölçüyor. Buradaki
 * sorular tarayıcıya ait: "depolama kapalıyken uygulama açılıyor mu",
 * "React çizmezse kullanıcı bir şey görüyor mu", "uygulamanın adı her yerde
 * aynı mı". Bunlar jest/React kurulumu gerektirmeden ölçülebiliyor çünkü
 * ölçtüğümüz dosyalar düz betik (public/) ya da sadece ayrıştırılıyor (src/).
 *
 * NİYE GERÇEK BİR DOM: elle yazılmış sahte bir document, kendi varsayımlarımızı
 * doğrular, tarayıcıyı değil. jsdom zaten react-scripts ile birlikte kurulu.
 *
 * NİYE AST, REGEX DEĞİL: "localStorage her yerde try içinde mi" sorusunu
 * düzenli ifadeyle sormak daha önce yanlış cevap verdi (yorum satırlarını ve
 * çok satırlı yapıları karıştırıyor). Burada dosya gerçekten ayrıştırılıp
 * ağaçta yürünüyor.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const parser = require('@babel/parser');

const KOK = path.join(__dirname, '..');
let gecen = 0;
let kalan = 0;

function test(baslik, fn) {
  try {
    fn();
    gecen++;
    console.log(`  ✓ ${baslik}`);
  } catch (hata) {
    kalan++;
    console.log(`  ✗ ${baslik}\n      ${hata.message}`);
  }
}

function esit(bulunan, beklenen, aciklama = '') {
  if (bulunan !== beklenen) {
    throw new Error(`${aciklama} beklenen: ${JSON.stringify(beklenen)}, bulunan: ${JSON.stringify(bulunan)}`);
  }
}

function dogru(kosul, aciklama) {
  if (!kosul) throw new Error(aciklama);
}

/* ══════════════ 1. DEPOLAMA ERİŞİMİ KORUMALI MI ══════════════
 *
 * Yaşanmış hata: src/api.js içindeki tokenAl() doğrudan
 * localStorage.getItem çağırıyordu. Tarayıcı site verisini engellediğinde
 * (Chrome/Safari "tüm çerezleri engelle", bazı uygulama içi tarayıcılar,
 * kurumsal ilkeler) bu çağrı SecurityError fırlatıyor. Çağrı App.js'in
 * açılış akışında try bloğunun dışındaydı; hata akışı kesince "hazır"
 * durumu hiç kurulmuyor ve uygulama sonsuza kadar "Yükleniyor..." ekranında
 * kalıyordu. Kullanıcı bunu "site bende açılmıyor" diye bildiriyordu.
 *
 * Bu test, aynı hatanın bir daha girmesini engelliyor: depolamaya erişen
 * HER ifade bir try bloğunun içinde olmak zorunda.
 */
function jsDosyalari(dizin) {
  const liste = [];
  (function gez(d) {
    for (const ad of fs.readdirSync(d)) {
      const tam = path.join(d, ad);
      const bilgi = fs.statSync(tam);
      if (bilgi.isDirectory()) gez(tam);
      else if (ad.endsWith('.js')) liste.push(tam);
    }
  }(dizin));
  return liste;
}

/** Ağaçta yürür; her düğüm için "bir try bloğunun içinde miyim" bilgisini taşır. */
function korumasizDepoErisimleri(kod) {
  const agac = parser.parse(kod, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
    errorRecovery: false,
  });
  const bulgular = [];

  function depoAdiMi(dugum) {
    if (!dugum) return false;
    if (dugum.type === 'Identifier') {
      return dugum.name === 'localStorage' || dugum.name === 'sessionStorage';
    }
    // window.localStorage / globalThis.sessionStorage
    if (dugum.type === 'MemberExpression' && !dugum.computed) {
      return depoAdiMi(dugum.property);
    }
    return false;
  }

  function yuru(dugum, tryIcinde) {
    if (!dugum || typeof dugum.type !== 'string') return;

    if (dugum.type === 'MemberExpression' && depoAdiMi(dugum.object) && !tryIcinde) {
      bulgular.push({ satir: dugum.loc ? dugum.loc.start.line : 0 });
    }

    for (const anahtar of Object.keys(dugum)) {
      if (anahtar === 'loc' || anahtar === 'leadingComments'
        || anahtar === 'trailingComments' || anahtar === 'innerComments') continue;
      const deger = dugum[anahtar];
      // try'ın YALNIZCA block'u korumalı sayılıyor; handler ve finalizer değil.
      const icerde = tryIcinde || (dugum.type === 'TryStatement' && anahtar === 'block');
      if (Array.isArray(deger)) deger.forEach((x) => yuru(x, icerde));
      else if (deger && typeof deger === 'object') yuru(deger, icerde);
    }
  }

  yuru(agac, false);
  return bulgular;
}

console.log('\nDEPOLAMA ERİŞİMİ');

test('src/ içindeki tüm depolama erişimleri try bloğunda', () => {
  const sorunlu = [];
  for (const dosya of jsDosyalari(path.join(KOK, 'src'))) {
    const kod = fs.readFileSync(dosya, 'utf8');
    for (const b of korumasizDepoErisimleri(kod)) {
      sorunlu.push(`${path.relative(KOK, dosya)}:${b.satir}`);
    }
  }
  esit(sorunlu.join(', '), '', 'korumasız erişim(ler):');
});

test('public/ içindeki betiklerde de korumasız erişim yok', () => {
  const sorunlu = [];
  for (const ad of ['tema-onyukleme.js', 'uyumluluk.js', 'sw.js']) {
    const dosya = path.join(KOK, 'public', ad);
    if (!fs.existsSync(dosya)) continue;
    for (const b of korumasizDepoErisimleri(fs.readFileSync(dosya, 'utf8'))) {
      sorunlu.push(`public/${ad}:${b.satir}`);
    }
  }
  esit(sorunlu.join(', '), '', 'korumasız erişim(ler):');
});

test('testin kendisi çalışıyor: korumasız erişim yakalanıyor', () => {
  // Kontrol testi. Bu olmasaydı yürüyücü hiçbir şey bulamasa bile yukarıdaki
  // iki test yeşil yanar ve bize yanlış güven verirdi.
  esit(korumasizDepoErisimleri('localStorage.getItem("x");').length, 1, 'çıplak erişim');
  esit(korumasizDepoErisimleri('try { localStorage.getItem("x"); } catch (e) {}').length, 0, 'korunan erişim');
  esit(korumasizDepoErisimleri('try { a(); } catch (e) { localStorage.getItem("x"); }').length, 1,
    'catch içindeki erişim korumalı sayılmamalı');
});

/* ══════════════ 2. TEMA ÖN YÜKLEME ══════════════ */

/** Betiği gerçek bir DOM içinde çalıştırır; istenirse depolamayı bozar. */
function sayfaKur({ html, betikler = [], depo = 'calisir', depoDegeri = null }) {
  // url ŞART: jsdom, adressiz (opak kaynaklı) bir belgede localStorage'ı hiç
  // tanımlamıyor. O hâlde testin ölçtüğü şey tarayıcı davranışı olmaz.
  const dom = new JSDOM(html, {
    runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://ornek.test/',
  });
  const { window } = dom;

  if (depo === 'patlar') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new window.DOMException('erişim engellendi', 'SecurityError'); },
    });
  } else if (depoDegeri !== null) {
    window.localStorage.setItem('tema', depoDegeri);
  }

  for (const yol of betikler) window.eval(fs.readFileSync(yol, 'utf8'));
  return dom;
}

const ON_YUKLEME = path.join(KOK, 'public', 'tema-onyukleme.js');

console.log('\nTEMA ÖN YÜKLEME');

test('depolama patlasa bile hata fırlatmıyor, açık mod ile devam ediyor', () => {
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
    depo: 'patlar',
  });
  esit(dom.window.document.documentElement.classList.contains('dark'), false, 'karanlık sınıfı');
  dom.window.close();
});

test('kayıtlı tercih karanlıksa sınıf ekleniyor', () => {
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
    depoDegeri: 'karanlik',
  });
  esit(dom.window.document.documentElement.classList.contains('dark'), true, 'karanlık sınıfı');
  dom.window.close();
});

/* ══════════════ 3. "UYGULAMA AÇILAMADI" EKRANI ══════════════ */

console.log('\nAÇILAMADI EKRANI');

function hataFirlat(dom, mesaj) {
  const { window } = dom;
  const olay = new window.ErrorEvent('error', {
    message: mesaj, filename: '/static/js/main.js', lineno: 1,
  });
  window.dispatchEvent(olay);
}

function uyariVar(dom) {
  return !!dom.window.document.querySelector('[role="alert"]');
}

test('React çizmediyse ve hata olduysa kullanıcıya mesaj gösteriliyor', () => {
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
  });
  esit(uyariVar(dom), false, 'başta uyarı olmamalı');
  hataFirlat(dom, 'Unexpected token');
  dogru(uyariVar(dom), 'hata sonrası uyarı görünmeliydi');
  dogru(dom.window.document.body.textContent.includes('Uygulama açılamadı'), 'başlık yok');
  dogru(dom.window.document.body.textContent.includes('Unexpected token'),
    'teknik ayrıntı hata metnini taşımalı');
  dom.window.close();
});

test('uygulama çizdiyse hata olsa bile ekran kaplanmıyor', () => {
  // Bu çok önemli: uygulama çalışırken oluşan sıradan bir hata (örneğin bir
  // tarayıcı eklentisinin hatası) kullanıcının önüne tam ekran "açılamadı"
  // mesajı koymamalı.
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"><main>uygulama</main></div></body></html>',
    betikler: [ON_YUKLEME],
  });
  hataFirlat(dom, 'bir eklenti hatası');
  esit(uyariVar(dom), false, 'uyarı görünmemeliydi');
  dom.window.close();
});

test('görsel/stil yüklenememesi ekranı açmıyor', () => {
  // Kaynak hataları da window üzerinde "error" olarak geliyor ama message
  // taşımıyor. Uygulamayı durdurmadıkları için yok sayılmalılar.
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
  });
  dom.window.dispatchEvent(new dom.window.Event('error'));
  esit(uyariVar(dom), false, 'kaynak hatası ekranı açmamalı');
  dom.window.close();
});

test('işlenmeyen söz (promise) hatası da yakalanıyor', () => {
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
  });
  const olay = new dom.window.Event('unhandledrejection');
  olay.reason = new Error('ağ hatası');
  dom.window.dispatchEvent(olay);
  dogru(uyariVar(dom), 'uyarı görünmeliydi');
  dom.window.close();
});

test('uyarı ekranı denetim sayfasına yönlendiriyor', () => {
  const dom = sayfaKur({
    html: '<!doctype html><html><body><div id="root"></div></body></html>',
    betikler: [ON_YUKLEME],
  });
  hataFirlat(dom, 'hata');
  const bag = dom.window.document.querySelector('[role="alert"] a');
  dogru(bag, 'bağlantı yok');
  esit(bag.getAttribute('href'), '/uyumluluk.html', 'bağlantı adresi');
  dom.window.close();
});

/* ══════════════ 4. UYUMLULUK SAYFASI ══════════════ */

console.log('\nUYUMLULUK SAYFASI');

function denetimSayfasi({ depo = 'calisir', getir = null } = {}) {
  const html = fs.readFileSync(path.join(KOK, 'public', 'uyumluluk.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://ornek.test/uyumluluk.html' });
  const { window } = dom;
  if (depo === 'patlar') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new window.DOMException('engellendi', 'SecurityError'); },
    });
  }
  if (getir) window.fetch = getir;
  window.eval(fs.readFileSync(path.join(KOK, 'public', 'uyumluluk.js'), 'utf8'));
  return dom;
}

test('denetim sayfası depolama patlasa bile çalışıyor ve sonucu yazıyor', () => {
  const dom = denetimSayfasi({ depo: 'patlar' });
  const metin = dom.window.document.getElementById('sonuc').textContent;
  dogru(metin.includes('ÇALIŞMIYOR'), 'engelli depolama "ÇALIŞMIYOR" olarak görünmeli');
  dogru(metin.includes('çalışıyor'), 'çalışan özellikler de listelenmeli');
  dom.window.close();
});

test('depolama açıkken "çalışıyor" yazıyor', () => {
  const dom = denetimSayfasi();
  const satirlar = dom.window.document.querySelectorAll('#sonuc tr');
  dogru(satirlar.length >= 8, `en az 8 satır bekleniyordu, ${satirlar.length} var`);
  const depoSatiri = Array.from(satirlar).find((t) => t.textContent.includes('Site verisi'));
  dogru(depoSatiri, 'site verisi satırı yok');
  dogru(depoSatiri.textContent.includes('çalışıyor'), 'çalışıyor yazmalıydı');
  dom.window.close();
});

test('kopyalanacak metin tüm satırları içeriyor', () => {
  const dom = denetimSayfasi();
  const metin = dom.window.document.getElementById('metin').textContent;
  dogru(metin.includes('TARAYICI DENETİMİ'), 'başlık yok');
  dogru(metin.includes('Tarayıcı:'), 'tarayıcı satırı yok');
  dogru(metin.includes('fetch desteği'), 'fetch satırı yok');
  dom.window.close();
});

test('sunucuya erişim ölçülüyor (sahte fetch ile)', () => {
  // Not: eşzamanlı test düzeni olduğu için söz çözülene kadar bekleyemiyoruz;
  // burada yalnızca isteğin DOĞRU ADRESE gittiği ölçülüyor.
  const cagrilar = [];
  const dom = denetimSayfasi({
    getir: (adres) => { cagrilar.push(adres); return new Promise(() => {}); },
  });
  dogru(cagrilar.some((a) => a === '/manifest.json'), `manifest istenmedi: ${cagrilar}`);
  dogru(
    cagrilar.some((a) => a.indexOf('/api/meta') !== -1),
    `API denenmedi: ${cagrilar}`,
  );
  dom.window.close();
});

/* ══════════════ 5. UYGULAMA ADI ══════════════
 *
 * Ad üç ayrı dosyada geçiyor ve biri unutulursa kullanıcı bunu kurulu
 * uygulamanın altında görüyor. Bu test üçünü birbirine bağlıyor.
 */

console.log('\nUYGULAMA ADI');

const AD = 'Besin Risk Analiz Sistemi';
const manifest = JSON.parse(fs.readFileSync(path.join(KOK, 'public', 'manifest.json'), 'utf8'));
const indexHtml = fs.readFileSync(path.join(KOK, 'public', 'index.html'), 'utf8');

test('manifest.json tam adı taşıyor', () => {
  esit(manifest.name, AD, 'manifest adı');
});

test('sekme başlığı manifest ile aynı', () => {
  const esl = indexHtml.match(/<title>([^<]+)<\/title>/);
  dogru(esl, 'başlık etiketi yok');
  esit(esl[1].trim(), AD, 'sekme başlığı');
});

test('bağlantı önizleme başlığı da aynı', () => {
  const esl = indexHtml.match(/property="og:title" content="([^"]+)"/);
  dogru(esl, 'og:title yok');
  esit(esl[1], AD, 'og:title');
});

test('kısa ad başlatıcıda kesilmeyecek uzunlukta', () => {
  // Android ve iOS ana ekran etiketi yaklaşık 12 karakterde kesiyor. Daha
  // uzun bir kısa ad "Besin Risk A…" gibi görünür.
  dogru(manifest.short_name.length <= 12,
    `short_name ${manifest.short_name.length} karakter: "${manifest.short_name}"`);
});

test('bağlantı önizleme görseli mutlak adres kullanıyor', () => {
  // Göreli yol ("/logo512.png") ile WhatsApp, Telegram ve benzeri uygulamalar
  // görseli bulamıyor; Open Graph MUTLAK adres istiyor. CRA, index.html
  // içindeki %REACT_APP_*% kalıplarını derleme sırasında değiştiriyor.
  const gorsel = indexHtml.match(/property="og:image" content="([^"]+)"/);
  dogru(gorsel, 'og:image yok');
  dogru(
    gorsel[1].startsWith('%REACT_APP_SITE_URL%') || /^https?:\/\//.test(gorsel[1]),
    `og:image mutlak değil: ${gorsel[1]}`,
  );
});

test('site adresi .env.production içinde tanımlı', () => {
  // Tanımlı olmasaydı derlemede kalıp olduğu gibi kalır ve önizleme sessizce
  // bozulurdu. Varsayılanın depoda durması bunu engelliyor.
  const ortam = fs.readFileSync(path.join(KOK, '.env.production'), 'utf8');
  const esl = ortam.match(/^REACT_APP_SITE_URL=(\S+)/m);
  dogru(esl, '.env.production içinde REACT_APP_SITE_URL yok');
  dogru(/^https:\/\//.test(esl[1]), `https ile başlamalı: ${esl[1]}`);
});

console.log(`\nSonuç: ${gecen} test geçti, ${kalan} test kaldı.\n`);
process.exit(kalan > 0 ? 1 : 0);
