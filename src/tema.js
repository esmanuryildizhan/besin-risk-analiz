// src/tema.js
//
// Açık / karanlık tema seçimi.
//
// NİYE SUNUCUDA DEĞİL TARAYICIDA SAKLANIYOR: tema bir görünüm tercihi,
// kişisel veri değil. Veritabanına yazmak hem şema göçü hem de her açılışta
// fazladan istek demekti; üstelik kullanıcı giriş yapmadan (kayıt, parola
// sıfırlama ekranlarında) da temanın doğru olması gerekiyor. localStorage
// giriş gerektirmiyor. Bedeli: tercih cihaz başına, cihazlar arası taşınmıyor.
//
// NİYE ÜÇ SEÇENEK: "sistem" varsayılan olduğu için kullanıcı hiçbir şey
// yapmadan işletim sistemindeki tercihine uygun açılıyor. İki durumlu bir
// anahtar olsaydı bu bilgiyi yok sayardık.

export const ANAHTAR = 'tema';
export const SECENEKLER = ['sistem', 'acik', 'karanlik'];

/** Kayıtlı tercih. Okunamazsa (gizli sekme, kapalı depolama) 'sistem'. */
export function kayitliTema() {
  try {
    const d = localStorage.getItem(ANAHTAR);
    return SECENEKLER.includes(d) ? d : 'sistem';
  } catch {
    return 'sistem';
  }
}

/** İşletim sistemi karanlık mı? Tarayıcı desteklemiyorsa false. */
export function sistemKaranlikMi() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Seçilen tercihin SONUCU: gerçekte karanlık mı görünecek? */
export function karanlikMi(tercih = kayitliTema()) {
  return tercih === 'karanlik' || (tercih === 'sistem' && sistemKaranlikMi());
}

/** <html> üzerindeki .dark sınıfını günceller. CSS'in tamamı buna bakıyor. */
export function uygula(tercih = kayitliTema()) {
  document.documentElement.classList.toggle('dark', karanlikMi(tercih));
}

/** Tercihi kaydeder ve hemen uygular. Depolama kapalıysa yine de uygular. */
export function temayiSec(tercih) {
  try {
    localStorage.setItem(ANAHTAR, tercih);
  } catch {
    /* gizli sekmede yazılamayabilir; görünüm yine de değişsin */
  }
  uygula(tercih);
}

/**
 * "Sistem" seçiliyken işletim sistemi teması değişirse arayüz de değişsin.
 * Temizleme fonksiyonu döndürüyor.
 */
export function sistemiIzle() {
  let mq;
  try {
    mq = window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return () => {};
  }
  const tepki = () => { if (kayitliTema() === 'sistem') uygula('sistem'); };
  mq.addEventListener('change', tepki);
  return () => mq.removeEventListener('change', tepki);
}
