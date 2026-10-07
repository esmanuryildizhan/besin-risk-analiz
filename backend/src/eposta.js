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
const dns = require('dns').promises;
const net = require('net');

const SUNUCU = process.env.MAIL_SUNUCU || 'smtp.gmail.com';
const PORT = Number(process.env.MAIL_PORT || 587);
const KULLANICI = process.env.MAIL_KULLANICI || '';
const SIFRE = process.env.MAIL_SIFRE || '';
const GONDEREN = process.env.MAIL_GONDEREN || KULLANICI;

let tasiyici = null;
let tasiyiciIp = null;
let cozumZamani = 0;

// Çözülen adres bu kadar süre yeniden kullanılıyor. Gmail'in IP'leri dönüyor,
// o yüzden süresiz önbelleklemiyoruz; ama her postada DNS sorgusu da gereksiz.
const IP_TAZELIK_MS = 10 * 60 * 1000;

function yapilandirildiMi() {
  return Boolean(KULLANICI && SIFRE);
}

/**
 * SMTP sunucusunun IPv4 adresini çözer.
 *
 * NİYE KENDİMİZ ÇÖZÜYORUZ — gerçek bir hatadan çıktı:
 * Render'ın konteynerinde IPv6 bağlantısı yok. Nodemailer ise adı hem IPv4 hem
 * IPv6 olarak çözüp iki listeyi birleştiriyor ve aralarından RASTGELE birini
 * seçiyor (shared/index.js, formatDNSValue). IPv6 seçildiği anda bağlantı
 * "connect ENETUNREACH ...:587" diye patlıyor.
 *
 * Yani hata kalıcı değil, YAZI-TURA: bazı postalar gidiyor, bazıları gitmiyor.
 * Teşhis edilmesi en zor hata türü.
 *
 * Çözüm aynı dosyadan geliyor: nodemailer, host zaten bir IP adresiyse DNS'i
 * hiç çalıştırmıyor (resolveHostname içinde net.isIP kontrolü). Biz IPv4'e
 * çözüp öyle veriyoruz, rastgele seçim devreye hiç girmiyor.
 */
async function ipv4Coz() {
  if (net.isIP(SUNUCU)) return SUNUCU;          // zaten IP verilmişse dokunma
  if (tasiyiciIp && Date.now() - cozumZamani < IP_TAZELIK_MS) return tasiyiciIp;
  const adresler = await dns.resolve4(SUNUCU);
  if (!adresler || !adresler.length) {
    throw new Error(`${SUNUCU} için IPv4 adresi bulunamadı.`);
  }
  cozumZamani = Date.now();
  return adresler[0];
}

async function tasiyiciyiAl() {
  const ip = await ipv4Coz();
  if (!tasiyici || tasiyiciIp !== ip) {
    tasiyici = nodemailer.createTransport({
      host: ip,
      port: PORT,
      // 587 STARTTLS kullanıyor: bağlantı düz başlıyor, sonra şifreli hâle
      // geçiyor. secure:true yalnızca 465 için doğru olurdu.
      secure: PORT === 465,
      auth: { user: KULLANICI, pass: SIFRE },
      // SERTİFİKA DOĞRULAMASI BOZULMUYOR: bağlantı IP'ye gidiyor ama TLS
      // el sıkışmasında sunucu adı olarak alan adı sunuluyor, sertifika da
      // ona göre doğrulanıyor. Bu satır olmasaydı sertifika IP'ye
      // uymadığı için bağlantı reddedilirdi.
      tls: { servername: SUNUCU },
    });
    tasiyiciIp = ip;
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
  const t = await tasiyiciyiAl();
  await t.sendMail({ from: GONDEREN, to: alici, subject: konu, text: metin });
  return true;
}

async function sifirlamaGonder(alici, baglanti, dakika) {
  return gonder(
    alici,
    'Şifre sıfırlama — Besin Risk Analiz Sistemi',
    [
      'Besin Risk Analiz Sistemi hesabınız için şifre sıfırlama talebi alındı.',
      '',
      'Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:',
      baglanti,
      '',
      `Bu bağlantı ${dakika} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      '',
      'Bu talebi siz yapmadıysanız bu iletiyi yok sayabilirsiniz; şifreniz',
      'değişmeyecektir.',
    ].join('\n'),
    `Sıfırlama bağlantısı gönderilmedi, günlüğe yazılıyor:\n${baglanti}`,
  );
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
  const t = await tasiyiciyiAl();
  await t.verify();
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
