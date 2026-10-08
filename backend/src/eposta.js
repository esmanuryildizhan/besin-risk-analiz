// E-posta gönderimi.
//
// İKİ TAŞIYICI VAR ve hangisinin kullanılacağı ayarlardan anlaşılıyor:
//
//   BREVO_API_KEY tanımlıysa  -> Brevo'nun HTTP API'si (443 portu)
//   MAIL_KULLANICI tanımlıysa -> SMTP (587 portu)
//   hiçbiri yoksa             -> gönderim yok, bağlantı günlüğe yazılır
//
// NİYE İKİSİ BİRDEN — yaşanmış bir duvardan çıktı:
// Render'ın ÜCRETSİZ web servisleri Eylül 2025'ten beri 25, 465 ve 587
// numaralı SMTP portlarına giden trafiği tamamen engelliyor (Render'ın kendi
// değişiklik günlüğü). Yani Gmail SMTP orada hiçbir ayarla çalışmıyor; hata
// "Connection timeout" diye geliyor ve sebebi koddan anlaşılmıyor.
//
// HTTP API bu duvarı aşıyor çünkü 443 portunu kimse engellemiyor. SMTP yolu
// yine de duruyor: yerel geliştirmede ve ileride kendi sunucusunda (Hetzner
// gibi) çalışıyor, orada ayrı bir servise bağımlı olmaya gerek yok.
//
// BREVO NİYE: ücretsiz katmanı günde 300 posta ve ALAN ADI İSTEMİYOR — düz bir
// Gmail adresini "tek gönderen" olarak doğrulamak yetiyor. Resend gibi
// alternatifler alan adı doğrulaması istediği için bu projeye uymuyordu.
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');
const sablon = require('./eposta_sablon');

// Altbilgideki ve logo adresindeki site adresi. Arayüzün adresiyle aynı
// olmalı; FRONTEND_URL zaten CORS için tanımlı.
const SITE = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Ortam değişkeni değerini temizler ve ne yaptığını söyler. SAF fonksiyon.
 *
 * NİYE VAR: Render'ın ortam değişkeni ekranı değeri HARFİ HARFİNE alıyor.
 * `.env` dosyasında tırnak kullanmaya alışmış biri aynı değeri Render'a
 * tırnakla yapıştırınca tırnak değerin PARÇASI oluyor. Sonuç, Brevo'da
 * `401 Key not found` — yani "anahtar yanlış" gibi görünen, aslında
 * "anahtarın etrafında tırnak var" olan bir hata. Bu tuzağa bu projede
 * bir kez düşüldü; hata mesajından sebebi anlamak imkânsızdı.
 *
 * Kırpma her zaman doğru: ne API anahtarı ne e-posta adresi baş/son boşlukla
 * başlar. Tırnak soyma da güvenli: Brevo anahtarları (xkeysib-...) ve e-posta
 * adresleri tırnak içermiyor. Ama SESSİZCE yapılmıyor — ne düzeltildiyse
 * çağıran tarafa bildiriliyor ki yapılandırma gerçekten düzelsin.
 */
function ortamiTemizle(hamDeger) {
  const ham = typeof hamDeger === 'string' ? hamDeger : '';
  let deger = ham.trim();
  const bosluk = deger !== ham;

  let tirnak = false;
  // Tek seferde bir katman; iç içe tırnak gerçek bir senaryo değil.
  if (deger.length >= 2
      && (deger[0] === '"' || deger[0] === "'")
      && deger[deger.length - 1] === deger[0]) {
    deger = deger.slice(1, -1).trim();
    tirnak = true;
  }
  return { deger, bosluk, tirnak };
}

const SUNUCU = process.env.MAIL_SUNUCU || 'smtp.gmail.com';
const PORT = Number(process.env.MAIL_PORT || 587);
const KULLANICI = ortamiTemizle(process.env.MAIL_KULLANICI).deger;
const SIFRE = ortamiTemizle(process.env.MAIL_SIFRE).deger;

const BREVO_HAM = ortamiTemizle(process.env.BREVO_API_KEY);
const BREVO_ANAHTAR = BREVO_HAM.deger;
// Brevo'da doğrulanmış gönderen adresi. Tanımlı değilse SMTP kullanıcısına
// düşüyor; ikisi de yoksa gönderim yapılamıyor.
const GONDEREN_HAM = ortamiTemizle(process.env.MAIL_GONDEREN);
const GONDEREN = GONDEREN_HAM.deger || KULLANICI;
const GONDEREN_ADI = ortamiTemizle(process.env.MAIL_GONDEREN_ADI).deger || 'Besin Risk Analiz';

let tasiyici = null;
let tasiyiciIp = null;
let cozumZamani = 0;
const IP_TAZELIK_MS = 10 * 60 * 1000;

/**
 * Hangi yol kullanılabilir, kullanılamıyorsa niye? SAF fonksiyon.
 *
 * Niye saf: bu kararın üç girdisi de modül yüklenirken process.env'den okunup
 * sabitlere alınıyor. Karar o sabitlerin içine gömülü kalırsa sınanamaz —
 * kombinasyonları denemek için her seferinde ayrı bir Node süreci başlatmak
 * gerekir. Burada ayırınca testler düpedüz çağırabiliyor (G58-G63).
 *
 * Niye bu kadar ayrıntılı teşhis: YARIM yapılandırma sessiz. Render'a
 * BREVO_API_KEY girip MAIL_GONDEREN unutmak postayı tamamen durduruyor, ama
 * kullanıcı ekranda "bağlantı gönderildi" görüyor. "Hiç ayar yok" ile "bir
 * ayar eksik" aynı mesajı verirse hatanın yeri bulunamaz.
 *
 * gonderenAcik = MAIL_GONDEREN'in KENDİSİ, MAIL_KULLANICI'ya geri düşmeden.
 * Ayrı duruyor çünkü dördüncü dalın mesajı adıyla "MAIL_GONDEREN tanımlı"
 * diyor; geri düşmüş değere bakarsak aslında MAIL_KULLANICI tanımlıyken o
 * cümle yalan olur. İlk yazımda bu yüzden yanlış teşhis çıkmıştı.
 *
 * DİKKAT — ölçtüm: bugün bu ayrım tek başına taşıyıcı DEĞİL. Dalların sırası
 * da aynı hatayı engelliyor (kullanıcı/parola dalları önce geliyor), yani iki
 * koruma birbirini yedekliyor; sadece birini bozmak teşhisi bozmuyor. O yüzden
 * bu davranışı tek bir mutasyona değil, 16 kombinasyonu birden gezen G64'e
 * bağladım. Yapıyı değiştirirken dayanak G64'ün tablosu olsun, bu yorum değil.
 */
function yoluCoz({
  brevoAnahtar = '', gonderenAcik = '', kullanici = '', sifre = '',
} = {}) {
  const gonderen = gonderenAcik || kullanici;
  if (brevoAnahtar && gonderen) return { yontem: 'brevo', gonderen, eksik: null };
  if (kullanici && sifre) return { yontem: 'smtp', gonderen, eksik: null };

  let eksik;
  if (brevoAnahtar) {
    eksik = 'BREVO_API_KEY tanımlı ama gönderen adresi yok. Brevo gönderen '
      + 'adresini tahmin edemez: Brevo panosunda doğruladığın adresi '
      + 'MAIL_GONDEREN olarak ekle.';
  } else if (kullanici && !sifre) {
    eksik = 'MAIL_KULLANICI tanımlı ama MAIL_SIFRE yok.';
  } else if (sifre && !kullanici) {
    eksik = 'MAIL_SIFRE tanımlı ama MAIL_KULLANICI yok.';
  } else if (gonderenAcik) {
    eksik = 'MAIL_GONDEREN tanımlı ama ne BREVO_API_KEY ne de '
      + 'MAIL_KULLANICI/MAIL_SIFRE var. Gönderecek bir yol yok.';
  } else {
    eksik = 'Hiçbir posta ayarı tanımlı değil (ne BREVO_API_KEY + '
      + 'MAIL_GONDEREN, ne MAIL_KULLANICI + MAIL_SIFRE).';
  }
  return { yontem: 'yok', gonderen, eksik };
}

/** Bu süreçteki ayarlarla kararı verir. */
function kararim() {
  return yoluCoz({
    brevoAnahtar: BREVO_ANAHTAR,
    gonderenAcik: process.env.MAIL_GONDEREN || '',
    kullanici: KULLANICI,
    sifre: SIFRE,
  });
}

function yontem() {
  return kararim().yontem;
}

function yapilandirildiMi() {
  return yontem() !== 'yok';
}

/** Yapılandırma neden eksik? Yol varsa null. */
function eksikNe() {
  return kararim().eksik;
}

/* ───────────────────────────── SMTP yolu ───────────────────────────── */

/**
 * SMTP sunucusunun IPv4 adresini çözer.
 *
 * NİYE KENDİMİZ ÇÖZÜYORUZ — bu da yaşanmış bir hata:
 * Nodemailer adı hem IPv4 hem IPv6 olarak çözüp iki listeyi birleştiriyor ve
 * aralarından RASTGELE birini seçiyor (shared/index.js, formatDNSValue).
 * IPv6'sı olmayan bir ortamda gönderimlerin yaklaşık yarısı
 * "connect ENETUNREACH" diye patlıyor — kalıcı değil, yazı-tura bir hata.
 *
 * Nodemailer, host zaten bir IP adresiyse DNS'i hiç çalıştırmıyor; biz de
 * IPv4'e çözüp öyle veriyoruz.
 */
async function ipv4Coz() {
  if (net.isIP(SUNUCU)) return SUNUCU;
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
      // Bağlantı IP'ye gidiyor ama sertifika ALAN ADINA göre doğrulanıyor.
      // Bu satır olmasaydı sertifika IP'ye uymadığı için reddedilirdi.
      tls: { servername: SUNUCU },
    });
    tasiyiciIp = ip;
  }
  return tasiyici;
}

/* ───────────────────────────── Brevo yolu ───────────────────────────── */

async function brevoIleGonder(alici, konu, metin, html) {
  const cevap = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'api-key': BREVO_ANAHTAR,
    },
    body: JSON.stringify({
      sender: { name: GONDEREN_ADI, email: GONDEREN },
      to: [{ email: alici }],
      subject: konu,
      // İKİSİ BİRDEN: HTML'i göstermeyen ya da engelleyen istemcide düz
      // metin okunur kalıyor. Yalnızca HTML gönderilseydi o istemcilerde
      // posta boş görünürdü.
      textContent: metin,
      ...(html ? { htmlContent: html } : {}),
    }),
  });

  if (!cevap.ok) {
    // Brevo hatayı JSON gövdede açıklıyor; sebebi günlükte görünsün diye
    // okuyoruz. Okunamazsa durum koduyla yetiniyoruz.
    let ayrinti = '';
    try {
      const g = await cevap.json();
      ayrinti = g && (g.message || g.code) ? ` — ${g.code || ''} ${g.message || ''}`.trim() : '';
    } catch (e) { /* gövde JSON değil */ }
    if (cevap.status === 401) {
      // Anahtarın KENDİSİ günlüğe yazılmıyor — Render günlükleri sır saklamaz.
      // Yazılanlar anahtarın ŞEKLİ: hangi ihtimalin elendiğini gösteriyor.
      console.error(
        '[POSTA] Brevo anahtarı reddedildi. Anahtarın şekli:\n'
        + `[POSTA]   uzunluk: ${BREVO_ANAHTAR.length} karakter\n`
        + `[POSTA]   "xkeysib-" ile başlıyor mu: ${BREVO_ANAHTAR.startsWith('xkeysib-') ? 'EVET' : 'HAYIR'}\n`
        + `[POSTA]   çevresinde tırnak vardı mı: ${BREVO_HAM.tirnak ? 'EVET (soyuldu)' : 'hayır'}\n`
        + `[POSTA]   baş/son boşluk vardı mı: ${BREVO_HAM.bosluk ? 'EVET (kırpıldı)' : 'hayır'}\n`
        + '[POSTA] "xkeysib-" ile başlamıyorsa yanlış değer kopyalanmış:\n'
        + '[POSTA]   SMTP parolası ya da başka bir alan olabilir. Doğrusu\n'
        + '[POSTA]   Settings > SMTP & API > API Keys & MCP altındaki anahtar.\n'
        + '[POSTA] Şekil doğruysa anahtar silinmiş ya da devre dışı bırakılmış\n'
        + '[POSTA]   olabilir ("Create MCP server API key" seçeneği bunu yapıyor).',
      );
    }
    throw new Error(`Brevo ${cevap.status}${ayrinti}`);
  }
  return true;
}

/* ──────────────────────── Ortak gönderim noktası ──────────────────────── */

async function gonder(alici, konu, metin, gunlukNotu, html) {
  const y = yontem();
  if (y === 'yok') {
    console.warn(
      `[POSTA] Gönderilemedi — yapılandırma eksik: ${eksikNe()}\n`
      + `[POSTA] ${gunlukNotu}`,
    );
    return false;
  }
  if (y === 'brevo') return brevoIleGonder(alici, konu, metin, html);

  const t = await tasiyiciyiAl();
  await t.sendMail({
    from: GONDEREN, to: alici, subject: konu, text: metin, ...(html ? { html } : {}),
  });
  return true;
}

async function sifirlamaGonder(alici, baglanti, dakika) {
  return gonder(
    alici,
    'Parola sıfırlama — Besin Risk Analiz Sistemi',
    [
      'Besin Risk Analiz Sistemi hesabınız için parola sıfırlama talebi alındı.',
      '',
      'Yeni parolanızı belirlemek için aşağıdaki bağlantıyı açın:',
      baglanti,
      '',
      `Bu bağlantı ${dakika} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      '',
      'Bu talebi siz yapmadıysanız bu iletiyi yok sayabilirsiniz; parolanız',
      'değişmeyecektir.',
    ].join('\n'),
    `Sıfırlama bağlantısı gönderilmedi, günlüğe yazılıyor:\n${baglanti}`,
    sablon.cerceve({
      baslik: 'Parolanızı Sıfırlayın',
      paragraflar: [
        'Merhaba,',
        'Besin Risk Analiz Sistemi hesabınız için bir parola sıfırlama talebi aldık.',
        'Aşağıdaki düğmeye tıklayarak yeni parolanızı belirleyebilirsiniz:',
      ],
      dugmeYazisi: 'Yeni Parola Oluştur',
      dugmeAdresi: baglanti,
      sureNotu: `Bu bağlantı ${dakika} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      dipNot: 'Bu talebi siz yapmadıysanız bu e-postayı dikkate almayabilirsiniz. '
        + 'Parolanız değişmeyecek ve hesabınız güvende kalmaya devam edecek.',
      siteAdresi: SITE,
    }),
  );
}

/**
 * Kayıt sonrası e-posta doğrulama bağlantısı.
 *
 * Bağlantı 24 saat yaşıyor (parola sıfırlamanınki 60 dakika). Sebep: kullanıcı
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
    sablon.cerceve({
      baslik: 'E-posta Adresinizi Doğrulayın',
      paragraflar: [
        'Merhaba,',
        'Besin Risk Analiz Sistemi\'nde bu e-posta adresiyle bir hesap oluşturuldu.',
        'Hesabınızı etkinleştirmek ve sistemi kullanmaya başlamak için aşağıdaki '
          + 'düğmeye tıklayarak e-posta adresinizi doğrulayın:',
      ],
      dugmeYazisi: 'E-Posta Adresimi Doğrula',
      dugmeAdresi: baglanti,
      sureNotu: `Bu bağlantı ${saat} saat boyunca geçerlidir.`,
      dipNot: 'Eğer bu hesabı siz oluşturmadıysanız bu e-postayı dikkate '
        + 'almayabilirsiniz. Doğrulanmayan hesaplarla sisteme giriş yapılamaz.',
      siteAdresi: SITE,
    }),
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
      'Bunu siz yaptıysanız doğrudan giriş yapabilirsiniz. Parolanızı',
      'hatırlamıyorsanız giriş ekranındaki "Parolamı unuttum" bağlantısını',
      'kullanın.',
      '',
      'Bu denemeyi siz yapmadıysanız bir şey yapmanız gerekmiyor; hesabınıza',
      'erişilmedi ve hiçbir bilgisi değişmedi.',
    ].join('\n'),
    `${alici} adresine "zaten kayıtlı" bilgilendirmesi gönderilemedi.`,
    sablon.cerceve({
      baslik: 'Bu Adrese Ait Bir Hesap Zaten Var',
      paragraflar: [
        'Merhaba,',
        'Bu e-posta adresiyle Besin Risk Analiz Sistemi\'ne kayıt olunmaya '
          + 'çalışıldı, ancak bu adrese ait bir hesap zaten bulunuyor.',
        'Bunu siz yaptıysanız doğrudan giriş yapabilirsiniz. Parolanızı '
          + 'hatırlamıyorsanız giriş ekranındaki "Parolamı unuttum" '
          + 'bağlantısını kullanabilirsiniz.',
      ],
      dugmeYazisi: 'Giriş Yap',
      dugmeAdresi: SITE,
      dipNot: 'Bu denemeyi siz yapmadıysanız bir şey yapmanız gerekmiyor; '
        + 'hesabınıza erişilmedi ve hiçbir bilgisi değişmedi.',
      siteAdresi: SITE,
    }),
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
    sablon.cerceve({
      baslik: 'Hesabınız Yakında Silinecek',
      paragraflar: [
        'Merhaba,',
        'Besin Risk Analiz Sistemi hesabınıza uzun süredir giriş yapılmadı.',
        `Hesabınız ve içindeki tüm veriler ${kalanGun} gün içinde kalıcı olarak `
          + 'silinecek. Bu, verinin gerektiğinden uzun saklanmaması için '
          + 'uygulanan otomatik bir kuraldır.',
        'Hesabınızı korumak için tek yapmanız gereken giriş yapmak.',
      ],
      dugmeYazisi: 'Giriş Yap ve Hesabımı Koru',
      dugmeAdresi: SITE,
      sureNotu: `Kalan süre: ${kalanGun} gün.`,
      dipNot: 'Hesabınızı kullanmayacaksanız bir şey yapmanıza gerek yok; '
        + 'süre dolduğunda veriler kendiliğinden silinecek.',
      siteAdresi: SITE,
    }),
  );
}

/**
 * SMTP bağlantısını ve kimlik doğrulamasını sınar, posta GÖNDERMEDEN.
 *
 * Niye ayrı: "posta gitmiyor" iki ayrı sorun olabilir — ayarlar hiç yok, ya da
 * ayarlar var ama Gmail reddediyor. İkincisinin sebebi de birkaç türlü
 * (uygulama parolası yanlış, iki adımlı doğrulama kapalı, port engelli).
 * verify() bunları gönderim denemeden ayırt ediyor.
 */
async function baglantiyiDene() {
  const y = yontem();
  if (y === 'yok') return { tamam: false, sebep: 'yapilandirilmamis' };
  if (y === 'brevo') {
    // Brevo'da "bağlantıyı sına" diye ayrı bir uç nokta yok; hesap bilgisini
    // çeken uç nokta anahtarın geçerliliğini doğrulamaya yetiyor.
    const c = await fetch('https://api.brevo.com/v3/account', {
      headers: { accept: 'application/json', 'api-key': BREVO_ANAHTAR },
    });
    if (!c.ok) throw new Error(`Brevo ${c.status} — API anahtarı reddedildi.`);
    return { tamam: true, yontem: 'brevo' };
  }
  const t = await tasiyiciyiAl();
  await t.verify();
  return { tamam: true, yontem: 'smtp' };
}

/** Teşhis için: hangi ayar tanımlı? ŞİFRENİN KENDİSİNİ DÖNDÜRMÜYOR. */
function ayarlar() {
  return {
    yontem: yontem(),
    sunucu: SUNUCU,
    port: PORT,
    kullanici: KULLANICI || null,
    sifreTanimliMi: Boolean(SIFRE),
    sifreUzunlugu: SIFRE.length,
    brevoAnahtariVar: Boolean(BREVO_ANAHTAR),
    gonderen: GONDEREN || null,
    // Hangi değerlerin etrafında tırnak/boşluk bulunup temizlendiği.
    // Temizlik sessiz kalırsa Render'daki yanlış değer hiç düzelmez.
    temizlenenler: [
      BREVO_HAM.tirnak || BREVO_HAM.bosluk ? 'BREVO_API_KEY' : null,
      GONDEREN_HAM.tirnak || GONDEREN_HAM.bosluk ? 'MAIL_GONDEREN' : null,
    ].filter(Boolean),
  };
}


/**
 * Hesaba art arda başarısız giriş denendiğinde hesap SAHİBİNE gider.
 *
 * NİYE YÖNETİCİYE DEĞİL KULLANICIYA: saldırıya uğrayan hesabın sahibi,
 * parolasını değiştirip 2FA açabilecek tek kişi. Yöneticiye gitseydi
 * yöneticinin yapabileceği tek şey zaten kullanıcıyı uyarmak olurdu, üstelik
 * araya bir kişi daha girmiş olurdu.
 *
 * İÇERİĞİ KASTEN FAKİR: hangi IP'den denendiği, kaç kez denendiği gibi
 * ayrıntılar yazılmıyor. Postanın kendisi ele geçerse saldırgana bilgi
 * vermemeli; kullanıcının ihtiyacı olan tek şey "bir şey oluyor, önlem al".
 */
async function supheliGirisGonder(alici) {
  return gonder(
    alici,
    'Hesabınızda başarısız giriş denemeleri — Besin Risk Analiz',
    [
      'Besin Risk Analiz hesabınıza kısa süre içinde birden çok kez başarısız',
      'giriş denendi.',
      '',
      'Bu denemeler siz yaptıysanız bir şey yapmanıza gerek yok.',
      '',
      'Siz yapmadıysanız hesabınız hedef alınmış olabilir. Önerilen adımlar:',
      '  1. Parolanızı değiştirin (Profil > Parola Değiştir).',
      '  2. İki aşamalı doğrulamayı açın (Profil > İki Aşamalı Doğrulama).',
      '',
      'Bu iletiye cevap vermenize gerek yok.',
    ].join('\n'),
    `şüpheli giriş uyarısı: ${alici}`,
    sablon.cerceve({
      baslik: 'Hesabınızda Başarısız Giriş Denemeleri',
      paragraflar: [
        'Merhaba,',
        'Besin Risk Analiz hesabınıza kısa süre içinde birden çok kez başarısız '
          + 'giriş denendi.',
        'Bu denemeler size aitse bir şey yapmanıza gerek yok.',
        'Siz yapmadıysanız hesabınız hedef alınmış olabilir. Parolanızı '
          + 'değiştirmenizi ve iki aşamalı doğrulamayı açmanızı öneririz '
          + '(Profil > Güvenlik).',
      ],
      dugmeYazisi: 'Hesabımı Kontrol Et',
      dugmeAdresi: SITE,
      dipNot: 'Güvenlik gerekçesiyle hangi adresten denendiği ve kaç kez '
        + 'denendiği bu iletide yazılmıyor.',
      siteAdresi: SITE,
    }),
  );
}

module.exports = {
  yontem,
  sifirlamaGonder, dogrulamaGonder, zatenKayitliGonder, silmeUyarisiGonder,
  yapilandirildiMi, eksikNe, yoluCoz, ortamiTemizle, baglantiyiDene, ayarlar,
  supheliGirisGonder,
};
