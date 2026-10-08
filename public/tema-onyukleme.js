/* Tema, React yüklenmeden ÖNCE uygulanır; yoksa karanlık mod kullanıcısı her
   açılışta bir an beyaz ekran görür (FOUC).

   NİYE AYRI DOSYA, NİYE SATIR İÇİ DEĞİL: satır içi betik katı bir
   Content-Security-Policy ile çalışmıyor. Ayrı dosya olunca script-src 'self'
   yetiyor ve CSP'yi gevşetmek gerekmiyor.

   Mantık src/tema.js ile aynı; orada değişiklik yapılırsa burası da
   güncellenmeli. */
(function () {
  try {
    var t = localStorage.getItem('tema');
    var karanlik = t === 'karanlik'
      || ((t === 'sistem' || t === null)
          && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (karanlik) document.documentElement.classList.add('dark');
  } catch (e) { /* depolama kapalı: açık mod ile devam */ }
})();


/* ─────────────────────────── AÇILMADI EKRANI ───────────────────────────
 *
 * NİYE VAR: React çalışmazsa #root boş kalıyor ve kullanıcı BEYAZ BİR
 * SAYFA görüyor. Ne bir mesaj var, ne bir ipucu. Kullanıcı "site bende
 * açılmıyor" diyor, biz de hangi tarayıcıda ne olduğunu öğrenemiyoruz.
 *
 * Bu blok iki durumu yakalıyor:
 *   1. Betik çalışırken hata fırladı (window.onerror / unhandledrejection).
 *   2. Sayfanın TÜM kaynakları yüklendi (readyState === 'complete') ama
 *      #root hâlâ boş — yani uygulama sessizce açılmadı.
 *
 * YAVAŞ BAĞLANTIYLA KARIŞMAZ: zaman aşımı yalnızca readyState 'complete'
 * olduğunda, yani ana betik İNDİRİLİP bittikten sonra bakıyor. Hâlâ
 * indiriliyorsa bu ekran çıkmaz.
 *
 * NİYE AYRI DOSYADA VE ÇERÇEVESİZ: uygulamanın kendi JavaScript'i ya da
 * CSS'i yüklenememiş olabilir. Bu yüzden burada ne React var, ne Tailwind;
 * stiller satır içi yazılıyor ve metin düz DOM ile kuruluyor.
 */
(function () {
  var gosterildi = false;
  var sonHata = '';

  function kokBos() {
    var kok = document.getElementById('root');
    return !kok || kok.childElementCount === 0;
  }

  function satir(ana, metin, stil) {
    var p = document.createElement('p');
    p.style.cssText = stil;
    p.textContent = metin;          // textContent: hata metni HTML olarak yorumlanmasın
    ana.appendChild(p);
    return p;
  }

  function goster() {
    if (gosterildi || !kokBos()) return;
    gosterildi = true;

    var kutu = document.createElement('div');
    kutu.setAttribute('role', 'alert');
    kutu.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;'
      + 'background:#f8f9fa;color:#1f2937;padding:32px 20px;'
      + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";

    var ic = document.createElement('div');
    ic.style.cssText = 'max-width:520px;margin:0 auto;';
    kutu.appendChild(ic);

    var baslik = document.createElement('h1');
    baslik.textContent = 'Uygulama açılamadı';
    baslik.style.cssText = 'margin:0 0 16px;font-size:22px;color:#15803d;';
    ic.appendChild(baslik);

    satir(ic, 'Besin Risk Analiz Sistemi bu tarayıcıda başlatılamadı. '
      + 'En sık görülen sebepler:', 'margin:0 0 12px;font-size:15px;line-height:1.6;');

    var liste = document.createElement('ul');
    liste.style.cssText = 'margin:0 0 20px;padding-left:22px;list-style:disc;'
      + 'font-size:15px;line-height:1.7;';
    [
      'Tarayıcı ayarlarında çerez ve site verisi tamamen engellenmiş olabilir.',
      'Bağlantınız ya da ağınız siteye erişimi kısıtlıyor olabilir.',
      'Çok eski bir tarayıcı sürümü kullanıyor olabilirsiniz.',
    ].forEach(function (m) {
      var li = document.createElement('li');
      li.textContent = m;
      liste.appendChild(li);
    });
    ic.appendChild(liste);

    var bag = document.createElement('a');
    bag.href = '/uyumluluk.html';
    bag.textContent = 'Tarayıcımı denetle';
    bag.style.cssText = 'display:inline-block;background:#15803d;color:#fff;text-decoration:none;'
      + 'padding:14px 24px;border-radius:12px;font-size:15px;font-weight:bold;';
    ic.appendChild(bag);

    satir(ic, 'Bu sayfa hangi özelliğin çalışmadığını gösteriyor ve sonucu '
      + 'bize iletmenizi sağlıyor.', 'margin:12px 0 24px;font-size:13px;color:#6b7280;line-height:1.6;');

    // Teknik ayrıntı kapalı duruyor: kullanıcıyı korkutmasın, ama destek
    // isterken kopyalanabilsin.
    var kat = document.createElement('details');
    var ozet = document.createElement('summary');
    ozet.textContent = 'Teknik ayrıntı';
    ozet.style.cssText = 'cursor:pointer;font-size:13px;color:#6b7280;';
    kat.appendChild(ozet);
    var pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:12px;'
      + 'background:#f3f4f6;padding:12px;border-radius:8px;margin:8px 0 0;color:#374151;';
    pre.textContent = (sonHata || 'Hata mesajı yok (uygulama sessizce açılmadı).')
      + '\n\n' + navigator.userAgent;
    kat.appendChild(pre);
    ic.appendChild(kat);

    document.body.appendChild(kutu);
  }

  window.addEventListener('error', function (e) {
    // Resim/stil yüklenememesi de 'error' olarak geliyor ama message taşımıyor;
    // onlar uygulamayı durdurmaz, bu ekranı açmamalı.
    if (!e || !e.message) return;
    sonHata = e.message + (e.filename ? ' @ ' + e.filename + ':' + e.lineno : '');
    goster();
  });

  window.addEventListener('unhandledrejection', function (e) {
    var s = e && e.reason;
    sonHata = 'İşlenmeyen hata: ' + ((s && (s.message || s)) || 'bilinmiyor');
    goster();
  });

  window.addEventListener('load', function () {
    // 20 sn: ana betik indirilmiş ama uygulama hiç çizmemişse artık
    // beklemenin anlamı yok.
    setTimeout(function () {
      if (document.readyState === 'complete') goster();
    }, 20000);
  });
})();
