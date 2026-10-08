/* uyumluluk.js — tarayıcı denetim sayfasının mantığı.
 *
 * NİYE ES5: bu sayfanın görevi, uygulamanın açılamadığı tarayıcıda bile
 * açılmak. Modern sözdizimi kullanırsak tam da ölçmek istediğimiz eski
 * tarayıcıda bu sayfa da patlar ve hiçbir şey öğrenemeyiz. Bu yüzden ok
 * fonksiyonu, let/const, şablon dizesi ve Promise sözdizimi YOK; her şey
 * geri çağırmayla yürüyor.
 *
 * NİYE SONUÇLAR KOPYALANABİLİR: kullanıcıdan ekran görüntüsü istemek yerine
 * metin istiyoruz; metin aranabilir ve eksiksiz.
 *
 * KİŞİSEL VERİ TOPLAMIYOR: ölçülenler tarayıcı yetenekleri ve kullanıcı
 * aracısı dizesi. Hiçbir şey kendiliğinden gönderilmiyor; kullanıcı kopyalayıp
 * kendisi iletiyor (KVKK m.4: amaçla sınırlı, en az veri).
 */
(function () {
  var govde = document.getElementById('sonuc');
  var metinKutusu = document.getElementById('metin');
  var durum = document.getElementById('durum');
  var betik = document.querySelector('script[src*="uyumluluk.js"]');
  var apiAdresi = (betik && betik.getAttribute('data-api')) || '';

  var satirlar = [];

  function ekle(ad, sonuc, ayrinti) {
    satirlar.push({ ad: ad, sonuc: sonuc, ayrinti: ayrinti || '' });
    ciz();
  }

  function ciz() {
    govde.innerHTML = '';
    for (var i = 0; i < satirlar.length; i++) {
      var s = satirlar[i];
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = s.ad;
      var td = document.createElement('td');
      td.className = 'd';

      var im = document.createElement('span');
      // Renk TEK BAŞINA bilgi taşımıyor: yanında sözcük de var (WCAG 1.4.1).
      if (s.sonuc === true) { im.className = 'ok'; im.textContent = 'çalışıyor'; }
      else if (s.sonuc === false) { im.className = 'yok'; im.textContent = 'ÇALIŞMIYOR'; }
      else { im.className = 'nt'; im.textContent = String(s.sonuc); }
      td.appendChild(im);

      if (s.ayrinti) {
        var k = document.createElement('div');
        k.textContent = s.ayrinti;
        k.style.cssText = 'font-size:13px;margin-top:2px;';
        td.appendChild(k);
      }
      tr.appendChild(th); tr.appendChild(td);
      govde.appendChild(tr);
    }
    metinKutusu.textContent = duzMetin();
  }

  function duzMetin() {
    var c = 'BESİN RİSK ANALİZ SİSTEMİ — TARAYICI DENETİMİ\n';
    c += new Date().toString() + '\n\n';
    for (var i = 0; i < satirlar.length; i++) {
      var s = satirlar[i];
      var d = s.sonuc === true ? 'çalışıyor' : (s.sonuc === false ? 'ÇALIŞMIYOR' : String(s.sonuc));
      c += '- ' + s.ad + ': ' + d + (s.ayrinti ? ' (' + s.ayrinti + ')' : '') + '\n';
    }
    return c;
  }

  /* ---- ölçümler ---- */

  ekle('Sayfa açıldı', true, 'Bu sayfayı görüyorsanız alan adına erişiminiz var.');

  var ua = '';
  try { ua = navigator.userAgent; } catch (e) { ua = 'okunamadı'; }
  ekle('Tarayıcı', ua);

  try {
    ekle('Ekran genişliği', window.innerWidth + ' piksel');
  } catch (e) { ekle('Ekran genişliği', 'okunamadı'); }

  try {
    ekle('Bağlantı durumu', navigator.onLine ? 'çevrimiçi' : 'ÇEVRİMDIŞI');
  } catch (e) { ekle('Bağlantı durumu', 'okunamadı'); }

  // Site verisi (localStorage): oturumun kalıcı olması buna bağlı.
  var depoSonuc = false, depoNot = '';
  try {
    window.localStorage.setItem('__deneme__', '1');
    window.localStorage.removeItem('__deneme__');
    depoSonuc = true;
  } catch (e) {
    depoNot = 'Tarayıcı ayarlarında site verisi/çerez engellenmiş olabilir. '
      + 'Uygulama yine açılır ama sekmeyi kapatınca oturumunuz biter.';
  }
  ekle('Site verisi (oturum hatırlama)', depoSonuc, depoNot);

  var cerez = false;
  try {
    document.cookie = 'bras_deneme=1; SameSite=Lax; path=/';
    cerez = document.cookie.indexOf('bras_deneme') !== -1;
    document.cookie = 'bras_deneme=; Max-Age=0; path=/';
  } catch (e) { cerez = false; }
  ekle('Çerezler', cerez);

  ekle('fetch desteği', typeof window.fetch === 'function');
  ekle('Promise desteği', typeof window.Promise === 'function');
  ekle('AbortController desteği', typeof window.AbortController === 'function');
  ekle('Uygulama olarak kurulabilir', 'serviceWorker' in navigator);

  // Siteye erişim: bu dosyanın yanında duran manifest okunabiliyor mu?
  if (typeof window.fetch === 'function') {
    window.fetch('/manifest.json', { cache: 'no-store' })
      .then(function (c) { ekle('Site dosyalarına erişim', c.ok, 'HTTP ' + c.status); })
      .catch(function (e) { ekle('Site dosyalarına erişim', false, String(e)); });

    if (apiAdresi) {
      window.fetch(apiAdresi + '/api/meta', { cache: 'no-store' })
        .then(function (c) {
          ekle('Sunucuya erişim', c.ok, 'HTTP ' + c.status + ', ' + apiAdresi);
        })
        .catch(function (e) {
          ekle('Sunucuya erişim', false,
            'Sunucu uykudaysa ilk denemede bir dakika sürebilir; '
            + 'tekrar deneyin. Hata: ' + String(e));
        });
    }
  } else {
    ekle('Site dosyalarına erişim', 'ölçülemedi', 'fetch desteklenmiyor');
  }

  /* ---- kopyalama ---- */
  document.getElementById('kopyala').addEventListener('click', function () {
    var metin = duzMetin();
    function basarili() { durum.textContent = 'Kopyalandı. Bize iletebilirsiniz.'; }
    function basarisiz() {
      // Pano izni yoksa metni seçiyoruz; kullanıcı elle kopyalayabilsin.
      durum.textContent = 'Kopyalanamadı. Aşağıdaki metni elle seçip kopyalayın.';
      var kat = metinKutusu.parentNode;
      if (kat && kat.tagName === 'DETAILS') kat.open = true;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(metin).then(basarili, basarisiz);
      } else { basarisiz(); }
    } catch (e) { basarisiz(); }
  });
})();
