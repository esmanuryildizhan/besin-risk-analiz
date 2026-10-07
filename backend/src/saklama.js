// src/saklama.js
//
// SAKLAMA VE İMHA POLİTİKASI — kod hâli.
//
// NİYE VAR: aydınlatma metni önceden "verileriniz hesabınız var olduğu sürece
// saklanır" diyordu. Bu, süresiz saklama demek ve KVKK m.4 "ilgili mevzuatta
// öngörülen veya işlendikleri amaç için gerekli olan SÜRE KADAR muhafaza
// edilme" ilkesiyle bağdaşmıyor. Süre belirlenmeli ve o süre dolunca veri
// kendiliğinden silinmeli — kullanıcının hatırlamasına bırakılmamalı.
//
// ÖLÇÜT NİYE "SON GİRİŞ": amaç, kişinin besinleri kendi sağlık profiline göre
// değerlendirmesi. Kişi uygulamayı kullanmayı bıraktığında o amaç ortadan
// kalkıyor, dolayısıyla veriyi tutmanın dayanağı da kalkıyor.
//
// UYARI ÖNCE GİDİYOR: veri sessizce silinmiyor. Silmeden önce kullanıcıya
// posta gönderiliyor; giriş yapması hesabı kurtarıyor. Uyarısız silme,
// kullanıcıyı kendi verisinden habersiz etmek olurdu.

// Varsayılanlar ortam değişkeniyle değiştirilebiliyor: demo ortamında kısa
// tutmak, gerçek kullanımda uzatmak mantıklı olabilir.
const HAREKETSIZ_GUN = Number(process.env.SAKLAMA_GUN || 180);
const UYARI_GUN_ONCE = Number(process.env.SAKLAMA_UYARI_GUN || 14);

const GUN_MS = 24 * 60 * 60 * 1000;

/** Kullanıcının son hareket zamanı. Hiç giriş yapmamışsa kayıt tarihi. */
function sonHareket(user) {
  return new Date(user.sonGirisAt || user.createdAt);
}

/** Hesap kaç gündür hareketsiz? */
function hareketsizGun(user, simdi = new Date()) {
  return (simdi - sonHareket(user)) / GUN_MS;
}

/**
 * Bu hesap silinmeli mi?
 *
 * UYARI ŞARTI: yalnızca süresi dolmuş olmak yetmiyor, kullanıcının
 * uyarılmış ve uyarıdan sonra da dönmemiş olması gerekiyor. Uyarı
 * gönderilmemişse silme YAPILMIYOR — aksi hâlde posta gönderimi bozuk olan
 * bir dönemde hesaplar habersiz silinirdi.
 */
function silinmeliMi(user, simdi = new Date()) {
  if (hareketsizGun(user, simdi) < HAREKETSIZ_GUN) return false;
  if (!user.silmeUyarisiAt) return false;
  // Uyarıdan sonra kullanıcı giriş yaptıysa sayaç zaten sıfırlanmış olur;
  // yine de uyarının üstünden yeterli süre geçmiş olmalı.
  const uyaridanBeri = (simdi - new Date(user.silmeUyarisiAt)) / GUN_MS;
  return uyaridanBeri >= UYARI_GUN_ONCE;
}

/**
 * Bu hesaba silme uyarısı gönderilmeli mi?
 *
 * Eşiğe UYARI_GUN_ONCE kala gönderiliyor. Daha önce uyarılmışsa tekrar
 * gönderilmiyor; kullanıcı giriş yaparsa uyarı damgası temizleniyor
 * (bkz. index.js, başarılı giriş).
 */
function uyarilmaliMi(user, simdi = new Date()) {
  if (user.silmeUyarisiAt) return false;
  return hareketsizGun(user, simdi) >= (HAREKETSIZ_GUN - UYARI_GUN_ONCE);
}

/** Uyarı metninde kullanılacak kalan gün sayısı. */
function kalanGun(user, simdi = new Date()) {
  return Math.max(0, Math.ceil(HAREKETSIZ_GUN - hareketsizGun(user, simdi)));
}

module.exports = {
  silinmeliMi, uyarilmaliMi, hareketsizGun, kalanGun,
  HAREKETSIZ_GUN, UYARI_GUN_ONCE,
};
