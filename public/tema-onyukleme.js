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
