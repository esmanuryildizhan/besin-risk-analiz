// Oturum ve parola sıfırlama biletlerine ait saf yardımcılar.
//
// NİYE AYRI DOSYA: index.js içindeyken test edilemiyorlardı (o dosya yüklenince
// sunucu ayağa kalkıyor). Buradaki iki fonksiyonun ikisi de sessizce yanlış
// çalışabilecek türden; bu yüzden testlerle sabitlenmeleri gerekiyordu.
const crypto = require('crypto');

/**
 * Parola sıfırlama biletinin veritabanında saklanan biçimi.
 *
 * SHA-256, bcrypt DEĞİL. Bcrypt'in yavaşlığı, insanların seçtiği düşük
 * entropili parolaları kaba kuvvetten korumak için. Bu bilet 32 baytlık
 * rastgele veri; tahmin edilemez, dolayısıyla yavaş özete ihtiyacı yok.
 * Özet DETERMİNİST olmalı, çünkü gelen bileti veritabanında arıyoruz.
 */
function biletOzeti(bilet) {
  return crypto.createHash('sha256').update(String(bilet)).digest('hex');
}

/**
 * Oturum bileti, kullanıcının "tüm oturumları kapat" damgasından SONRA mı
 * verilmiş?
 *
 * BİRİM TUZAĞI: JWT `iat` alanını SANİYE cinsinden yazıyor, JavaScript'in
 * Date.getTime() ise MİLİSANİYE veriyor. Çevirmeyi atlarsak iat her zaman
 * damgadan küçük çıkar ve HİÇBİR bilet kabul edilmez — yani bütün kullanıcılar
 * dışarıda kalır. Ters yöne hata yapılsa (damgayı saniyeye çevirmek) koruma
 * hiç çalışmazdı. İki hata da sessiz; testler bu yüzden var.
 *
 * Damga yoksa (parola hiç sıfırlanmamış) her bilet geçerli.
 */
function biletDamgadanSonraMi(iatSaniye, damga) {
  if (!damga) return true;
  if (!iatSaniye) return false;   // iat yoksa güvenli tarafta kal
  return iatSaniye * 1000 >= new Date(damga).getTime();
}

/* ──────────────────────────────────────────────────────────────────────────
   HESAP KİLİDİ
   ──────────────────────────────────────────────────────────────────────────

   Hız sınırlayıcı IP başına çalışıyor; IP değiştirebilen bir saldırgan tek bir
   hesabı denemeye devam edebiliyordu. Bu sayaç hesabın kendisine bağlı.

   KİLİT KALICI DEĞİL. Olsaydı, saldırgan istediği hesabı kasten kilitleyip
   sahibini dışarıda bırakabilirdi (hizmet engelleme). Süre dolunca
   kendiliğinden açılıyor.

   EŞİK 10: insanın parolasını unutup deneyeceğinden fazla, kaba kuvvetin işine
   yarayacağından az.
*/
const KILIT_ESIGI = 10;
const KILIT_DAKIKA = 15;

/**
 * Başarısız bir girişten sonra hesabın yeni durumunu hesaplar.
 *
 * Saf fonksiyon: veritabanına dokunmuyor, yalnızca karar veriyor. index.js bu
 * kararı uyguluyor. Böylece eşik ve sıfırlama mantığı testlerle sabitlenebiliyor
 * — kopyası değil, kendisi.
 */
function kilitKarari(oncekiSayac) {
  const sayac = (oncekiSayac || 0) + 1;
  if (sayac < KILIT_ESIGI) return { basarisizGiris: sayac, kilitBitisi: undefined };
  return {
    // Kilitlenince sayaç SIFIRLANIYOR: kilit bitince kullanıcı sıfırdan
    // başlasın, ilk hatada tekrar kilitlenmesin.
    basarisizGiris: 0,
    kilitBitisi: new Date(Date.now() + KILIT_DAKIKA * 60000),
  };
}

/** Hesap şu an kilitli mi? Kilit yoksa ya da süresi geçtiyse hayır. */
function kilitliMi(kilitBitisi, simdi = new Date()) {
  return Boolean(kilitBitisi) && new Date(kilitBitisi) > simdi;
}


/**
 * Durum değiştiren bir isteğin kaynağı (Origin) kabul edilir mi?
 *
 * SAF FONKSİYON: karar ara katmanın içine gömülü kalsaydı sınanamazdı —
 * express uygulaması ayağa kaldırmak, veritabanı bağlamak gerekirdi. Bu
 * projede aynı hata hesap kilidi mantığında bir kez yapıldı (karar index.js
 * içindeydi, testler onun KOPYASINI sınıyordu ve asıl kod bozulsa testler
 * geçmeye devam ederdi).
 *
 * KURAL:
 *  - GET/HEAD/OPTIONS: veri değiştirmiyor, serbest.
 *  - Origin yok: tarayıcı değil (curl, betik). CSRF kurbanın TARAYICISINDAKİ
 *    kimliği kullanır; tarayıcı olmayan istemci saldırının öznesi olamaz.
 *    Zorunlu kılmak saldırıyı engellemez, meşru araçları kırardı.
 *  - Origin var ve eşleşmiyor: reddet.
 */
function kaynakKabulEdilirMi(yontem, kaynak, izinliKoken) {
  const guvenli = ['GET', 'HEAD', 'OPTIONS'];
  if (guvenli.includes(String(yontem || '').toUpperCase())) return true;
  if (!kaynak) return true;
  return kaynak === izinliKoken;
}

module.exports = {
  kaynakKabulEdilirMi,
  biletOzeti, biletDamgadanSonraMi, kilitKarari, kilitliMi,
  KILIT_ESIGI, KILIT_DAKIKA,
};
