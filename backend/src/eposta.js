// E-posta gönderimi (şifre sıfırlama bağlantısı için).
//
// NİYE GMAIL SMTP: ücretsiz bir e-posta servisi gerekiyordu. Gmail, normal bir
// hesapla günde 500 ileti gönderimine izin veriyor ve bu proje için fazlasıyla
// yeterli. Ayrı bir servise (SendGrid, Mailgun) kayıt olmak ve kart bilgisi
// vermek gerekmiyor.
//
// UYGULAMA ŞİFRESİ: hesabın kendi şifresi KULLANILMIYOR. Google, iki adımlı
// doğrulama açık hesaplarda "uygulama şifresi" üretiyor; yalnızca posta
// göndermeye yarıyor, hesaba giriş yapmaya yaramıyor ve tek tıkla iptal
// edilebiliyor. Sızdığında zarar hesabın tamamı değil, yalnızca posta
// gönderimi oluyor.
//
// YAPILANDIRILMAMIŞSA NE OLUYOR: uygulama çökmüyor. Bağlantı sunucu
// günlüğüne yazılıyor, böylece posta hesabı olmadan da (yerel geliştirmede,
// ya da projeyi klonlayan biri) şifre sıfırlama akışı denenebiliyor.
const nodemailer = require('nodemailer');

const SUNUCU = process.env.MAIL_SUNUCU || 'smtp.gmail.com';
const PORT = Number(process.env.MAIL_PORT || 587);
const KULLANICI = process.env.MAIL_KULLANICI || '';
const SIFRE = process.env.MAIL_SIFRE || '';
const GONDEREN = process.env.MAIL_GONDEREN || KULLANICI;

let tasiyici = null;

function yapilandirildiMi() {
  return Boolean(KULLANICI && SIFRE);
}

function tasiyiciyiAl() {
  if (!tasiyici) {
    tasiyici = nodemailer.createTransport({
      host: SUNUCU,
      port: PORT,
      // 587 STARTTLS kullanıyor: bağlantı düz başlıyor, sonra şifreli hâle
      // geçiyor. secure:true yalnızca 465 için doğru olurdu.
      secure: PORT === 465,
      auth: { user: KULLANICI, pass: SIFRE },
    });
  }
  return tasiyici;
}

/**
 * Şifre sıfırlama bağlantısını gönderir.
 *
 * Dönen değer gönderimin BAŞARISINI bildirir ama uç nokta bunu kullanıcıya
 * YANSITMIYOR: "bu adrese posta gitti" demek, o adresin sistemde kayıtlı
 * olduğunu doğrulamak olurdu (bkz. index.js /api/sifre/unuttum).
 */
async function gonder(alici, konu, metin, gunlukNotu) {
  if (!yapilandirildiMi()) {
    console.warn(
      '[POSTA] E-posta yapılandırılmamış (MAIL_KULLANICI / MAIL_SIFRE yok).\n'
      + `[POSTA] ${gunlukNotu}`,
    );
    return false;
  }
  await tasiyiciyiAl().sendMail({ from: GONDEREN, to: alici, subject: konu, text: metin });
  return true;
}

async function sifirlamaGonder(alici, baglanti, dakika) {
  if (!yapilandirildiMi()) {
    console.warn(
      '[POSTA] E-posta yapılandırılmamış (MAIL_KULLANICI / MAIL_SIFRE yok).\n'
      + `[POSTA] Sıfırlama bağlantısı gönderilmedi, günlüğe yazılıyor:\n${baglanti}`,
    );
    return false;
  }

  const metin = [
    'Besin Risk Analiz Sistemi hesabınız için şifre sıfırlama talebi alındı.',
    '',
    'Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:',
    baglanti,
    '',
    `Bu bağlantı ${dakika} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
    '',
    'Bu talebi siz yapmadıysanız bu iletiyi yok sayabilirsiniz; şifreniz',
    'değişmeyecektir.',
  ].join('\n');

  await tasiyiciyiAl().sendMail({
    from: GONDEREN,
    to: alici,
    subject: 'Şifre sıfırlama — Besin Risk Analiz Sistemi',
    text: metin,
  });
  return true;
}

/**
 * Kayıt sonrası e-posta doğrulama bağlantısı.
 *
 * Bağlantı 24 saat yaşıyor (şifre sıfırlamanınki 60 dakika). Sebep: kullanıcı
 * kayıt postasını ertesi gün açabilir ve bu bilet tek başına hesabı ele
 * geçirmeye yaramıyor — yalnızca "bu adres gerçekten benim" diyor.
 */
async function dogrulamaGonder(alici, baglanti, saat) {
  return gonder(
    alici,
    'E-posta adresinizi doğrulayın — Besin Risk Analiz Sistemi',
    [
      'Besin Risk Analiz Sistemi\'nde bu adresle bir hesap oluşturuldu.',
      '',
      'Hesabı kullanmaya başlamak için aşağıdaki bağlantıyı açın:',
      baglanti,
      '',
      `Bu bağlantı ${saat} saat geçerlidir.`,
      '',
      'Bu hesabı siz oluşturmadıysanız bu iletiyi yok sayın; doğrulanmayan',
      'hesaplarla giriş yapılamaz.',
    ].join('\n'),
    `Doğrulama bağlantısı gönderilmedi, günlüğe yazılıyor:\n${baglanti}`,
  );
}

/**
 * "Bu adresle zaten bir hesap var" bilgilendirmesi.
 *
 * NİYE VAR: kayıt uç noktası eskiden "Bu e-posta zaten kayıtlı" diyordu ve bu,
 * bir adresin sistemde olup olmadığını sorgulamaya yarıyordu (hesap sayımı /
 * account enumeration). Artık kayıt denemesi her durumda AYNI yanıtı veriyor;
 * adres zaten kayıtlıysa durumu yalnızca ADRESİN SAHİBİ bu postayla öğreniyor.
 */
async function zatenKayitliGonder(alici) {
  return gonder(
    alici,
    'Hesabınız zaten var — Besin Risk Analiz Sistemi',
    [
      'Bu adresle Besin Risk Analiz Sistemi\'ne kayıt olunmaya çalışıldı, ancak',
      'bu adrese ait bir hesap zaten var.',
      '',
      'Bunu siz yaptıysanız doğrudan giriş yapabilirsiniz. Şifrenizi',
      'hatırlamıyorsanız giriş ekranındaki "Şifremi unuttum" bağlantısını',
      'kullanın.',
      '',
      'Bu denemeyi siz yapmadıysanız bir şey yapmanız gerekmiyor; hesabınıza',
      'erişilmedi ve hiçbir bilgisi değişmedi.',
    ].join('\n'),
    `${alici} adresine "zaten kayıtlı" bilgilendirmesi gönderilemedi.`,
  );
}

/**
 * Hareketsizlik nedeniyle hesabın silineceği uyarısı.
 *
 * Veri sessizce silinmiyor: kullanıcı önce haber alıyor ve giriş yaparak
 * hesabını kurtarabiliyor. Uyarısız silme, kişiyi kendi verisinden habersiz
 * etmek olurdu.
 */
async function silmeUyarisiGonder(alici, kalanGun) {
  return gonder(
    alici,
    'Hesabınız yakında silinecek — Besin Risk Analiz Sistemi',
    [
      'Besin Risk Analiz Sistemi hesabınıza uzun süredir giriş yapılmadı.',
      '',
      `Hesabınız ve içindeki tüm veriler ${kalanGun} gün içinde kalıcı olarak`,
      'silinecek. Bu, verinin gerektiğinden uzun saklanmaması için uygulanan',
      'otomatik bir kuraldır.',
      '',
      'Hesabınızı korumak için tek yapmanız gereken giriş yapmak.',
      '',
      'Hesabınızı kullanmayacaksanız bir şey yapmanıza gerek yok; süre',
      'dolduğunda veriler kendiliğinden silinecek.',
    ].join('\n'),
    `${alici} adresine silme uyarısı gönderilemedi.`,
  );
}

/**
 * SMTP bağlantısını ve kimlik doğrulamasını sınar, posta GÖNDERMEDEN.
 *
 * Niye ayrı: "posta gitmiyor" iki ayrı sorun olabilir — ayarlar hiç yok, ya da
 * ayarlar var ama Gmail reddediyor. İkincisinin sebebi de birkaç türlü
 * (uygulama şifresi yanlış, iki adımlı doğrulama kapalı, port engelli).
 * verify() bunları gönderim denemeden ayırt ediyor.
 */
async function baglantiyiDene() {
  if (!yapilandirildiMi()) return { tamam: false, sebep: 'yapilandirilmamis' };
  await tasiyiciyiAl().verify();
  return { tamam: true };
}

/** Teşhis için: hangi ayar tanımlı? ŞİFRENİN KENDİSİNİ DÖNDÜRMÜYOR. */
function ayarlar() {
  return {
    sunucu: SUNUCU,
    port: PORT,
    kullanici: KULLANICI || null,
    sifreTanimliMi: Boolean(SIFRE),
    sifreUzunlugu: SIFRE.length,
    gonderen: GONDEREN || null,
  };
}

module.exports = {
  sifirlamaGonder, dogrulamaGonder, zatenKayitliGonder, silmeUyarisiGonder,
  yapilandirildiMi, baglantiyiDene, ayarlar,
};
