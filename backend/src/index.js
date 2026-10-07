// src/index.js — Besin Risk Analiz Sistemi API'si
//
// Çalıştırma (backend klasöründe):  node src/index.js
// Adres: http://localhost:3001
//
// UÇ NOKTALAR (endpoint)
//   POST /api/register        kayıt ol
//   POST /api/login           giriş yap -> token döner
//   POST /api/login/2fa       iki aşamalı doğrulama kodu
//   POST /api/eposta/dogrula  kayıt sonrası adres doğrulama
//   POST /api/eposta/tekrar-gonder  yeni doğrulama bağlantısı
//   POST /api/sifre/unuttum   sıfırlama bağlantısı istenir
//   POST /api/sifre/yenile    bağlantıdaki biletle yeni şifre
//   POST /api/2fa/baslat      2FA kurulumunu başlat       (token gerekir)
//   POST /api/2fa/dogrula     kurulumu kodla onayla       (token gerekir)
//   POST /api/2fa/kapat       2FA'yı kapat                (token gerekir)
//   GET  /api/kvkk            aydınlatma ve rıza metinleri
//   POST /api/onay            onay kaydı                  (token gerekir)
//   GET  /api/me/verilerim    tüm kişisel veriyi indir    (token gerekir)
//   DELETE /api/me            hesabı ve tüm veriyi sil    (token gerekir)
//   GET  /api/me              profilimi getir            (token gerekir)
//   PUT  /api/me              profilimi güncelle         (token gerekir)
//   GET  /api/foods           besin ara/listele          (token isteğe bağlı)
//   GET  /api/foods/:id       tek besin + tam analiz     (token isteğe bağlı)
//   GET  /api/meta            kategoriler, hastalıklar, alerjenler
//   GET  /api/diary/:gun      bir günün tamamı          (token gerekir)
//   POST /api/diary/:gun/kalem  öğüne kalem ekle        (token gerekir)
//   PUT  /api/diary/kalem/:id   kalemin adedini değiştir  (token gerekir)
//   DELETE /api/diary/kalem/:id kalem sil               (token gerekir)
//   PUT  /api/diary/:gun      yakılan kalori / su       (token gerekir)
//   GET  /api/diary/ay/:yilAy takvim için ay özeti      (token gerekir)
//   POST /api/lab/oku         PDF'i oku, KAYDETME        (token gerekir)
//   POST /api/lab             onaylananı kaydet          (token gerekir)
//   GET  /api/lab             kayıtlı tahliller          (token gerekir)
//   GET  /api/lab/oneriler    düşük değerler için besin  (token gerekir)
//   DELETE /api/lab/:tarih    bir tahlil gününü sil      (token gerekir)
//
// Token gönderilirse besinler kullanıcının hastalık/alerji profiline göre
// analiz edilir; gönderilmezse genel bilgi döner.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const { riskHesapla } = require('./risk');
const {
  HASTALIK_ALERJEN, ALERJENLER, DIYETLER, ETIKET_ADI, KAYNAKLAR,
} = require('../prisma/hastalik_kurallari');
// Çeviri ortak dosyada: denetim araçları da aynısını kullanıyor (bkz. kural_cevir.js).
const { kuraliCoz } = require('./kural_cevir');
const KVKK = require('./kvkk_metinleri');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const totp = require('./totp');
const kripto = require('./kripto');
const eposta = require('./eposta');
const saklama = require('./saklama');
const {
  biletOzeti, biletDamgadanSonraMi, kilitKarari, kilitliMi,
} = require('./oturum');
const gunluk = require('./gunluk');
const { kalemiCoz, gunKaydiniCoz, kalemiDondur } = gunluk;
const QRCode = require('qrcode');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// Oturum biletinin ömrü. Kısaltmak çalıntı biletin işe yaradığı süreyi
// kısaltır; uzatmak kullanıcıyı daha az yorar. Bkz. oturumBileti().
const OTURUM_SURESI = '1d';

if (!JWT_SECRET) {
  console.error('HATA: .env dosyasında JWT_SECRET yok. Örnek:\n  JWT_SECRET="gizli-bir-cumle-yaz"');
  process.exit(1);
}

// CORS — hangi adresten gelen isteği kabul ediyoruz?
//
// Yerelde React 3000'de, API 3001'de çalışıyor; tarayıcı bunları farklı köken
// sayıyor, o yüzden izin şart. Yayında ise "herkese açık" bırakmak, başka bir
// sitenin bu API'yi kendi arka ucu gibi kullanabilmesi demek olurdu.
//
// FRONTEND_URL tanımlıysa yalnızca o adres kabul edilir; tanımlı değilse
// (yani yerelde) localhost:3000.
const IZINLI_KOKEN = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: IZINLI_KOKEN, credentials: true }));

// Güvenlik başlıkları. API JSON döndürüyor, sayfa sunmuyor; bu yüzden
// tarayıcıya "bu içerikte HTML arama, MIME tipini tahmin etme" diyen
// başlıklar işe yarıyor, içerik güvenlik politikası (CSP) ise gereksiz.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Render gibi ortamlarda istek bir vekil sunucudan geçiyor. Bu ayar olmadan
// hız sınırlayıcı herkesi TEK bir IP sanar ve bir kullanıcının denemeleri
// diğerlerini de kilitler. 1 = yalnızca en yakın vekile güven.
app.set('trust proxy', 1);

/**
 * Hız sınırlayıcılar — kaba kuvvet ve kaynak tüketimi saldırılarına karşı.
 *
 * Giriş/kayıt ayrı ve dar tutuluyor: şifre deneme saldırısının asıl hedefi
 * orası. Sağlık verisi tutan bir uygulamada bir hesabın ele geçirilmesi,
 * hastalık ve tahlil bilgilerinin ele geçirilmesi demek.
 */
const girisSinirlayici = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 dakika
  limit: 10,                    // IP başına 10 deneme
  message: { error: 'Çok fazla deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // başarılı girişler sayılmıyor
});

// Şifre sıfırlama ayrı ve DAHA SIKI sınırlanıyor: her istek bir e-posta
// gönderiyor. Sınır olmasaydı bu uç nokta başkasının posta kutusunu
// doldurmak için kullanılabilirdi (ve posta hesabı günlük kotayı aşardı).
const sifirlamaSinirlayici = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 saat
  limit: 5,
  message: { error: 'Çok fazla sıfırlama isteği gönderildi. Lütfen bir saat sonra deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// PDF ayrıştırma CPU yiyor (pdfjs). Dosya en çok 3 MB (bkz. PDF_SINIRI),
// ayrıca sayfa sınırı ve zaman aşımı var (bkz. tahlil_ayristir.js).
const pdfSinirlayici = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 saat
  limit: 20,
  message: { error: 'Saatlik PDF yükleme sınırına ulaşıldı.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Genel sınır — geri kalan her şey için geniş, yalnızca kötüye kullanımı keser.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json());   // gelen JSON gövdeyi otomatik çözer

// ---------------------------------------------------------------------------
// KURALLAR: veritabanından bir kez okunup bellekte tutulur (her istekte sorgu atmayalım)
// ---------------------------------------------------------------------------

// ÖNBELLEK NEDEN SÜRESİZ DEĞİL — 1 Ekim 2026.
// Eskiden `if (kurallarOnbellek) return kurallarOnbellek;` yazıyordu, yani
// kurallar sunucu ömrü boyunca bir kez okunuyordu. Somut sonuç: trans yağ
// kuralını RİSKLİ'den DİKKAT'e çevirdik, `prisma db seed` çalıştırdık, ama
// uygulama lüferi RİSKLİ göstermeye devam etti — çalışan sunucu hâlâ eski
// kuralları tutuyordu. Kuralı kodda değiştirip veritabanına yazmak yetmiyor,
// bir de sunucuyu yeniden başlatmak gerekiyordu; bunu hatırlamak zorunda
// kalmak hata kaynağı.
// 42 kuralı 6 hastalıkla okumak yerel PostgreSQL'de milisaniyenin altında, yani
// burada önbellek zaten performans için değil, aynı istek içindeki tekrarlı
// çağrıları toplamak için var. Kısa bir ömür ikisini de çözüyor: seed'den sonra
// en fazla bu kadar bekliyoruz, kendiliğinden tazeleniyor.
const ONBELLEK_OMRU_MS = 5000;
let kurallarOnbellek = null;
let kurallarOnbellekZamani = 0;

async function kurallariGetir() {
  if (kurallarOnbellek && (Date.now() - kurallarOnbellekZamani) < ONBELLEK_OMRU_MS) {
    return kurallarOnbellek;
  }
  const hastaliklar = await prisma.disease.findMany({
    include: { rules: { orderBy: { sortOrder: 'asc' } } },
  });
  kurallarOnbellek = {
    hastaliklar: hastaliklar.map((h) => ({
      key: h.key,
      name: h.name,
      icon: h.icon,
      note: h.note,
      degerlendirilemez: !h.evaluable,
      // Tek tek elle eşlemiyoruz: KURAL_ALANLARI tablosu üzerinden dönüyoruz.
      // Eskiden elle yazılıyordu ve muafiyet alanları atlanmıştı; sonuç olarak
      // API'den gelen kurallar testlerdeki kurallardan farklıydı.
      rules: h.rules.map(kuraliCoz),
    })),
    hastalikAlerjen: HASTALIK_ALERJEN,
    alerjenler: ALERJENLER,
    diyetler: DIYETLER,
    etiketAdi: ETIKET_ADI,
    kaynakca: KAYNAKLAR,
  };
  kurallarOnbellekZamani = Date.now();
  // Çalışan sunucunun HANGİ kurallarla çalıştığı görünür olsun: sessiz bayat
  // önbellek bu projede bir kere canlı hatayla sonuçlandı.
  const kuralSayisi = kurallarOnbellek.hastaliklar
    .reduce((t, h) => t + (h.rules || []).length, 0);
  console.log(`Kurallar veritabanından okundu: ${kurallarOnbellek.hastaliklar.length} hastalık, ${kuralSayisi} kural`);
  return kurallarOnbellek;
}

// ---------------------------------------------------------------------------
// YARDIMCILAR
// ---------------------------------------------------------------------------

/** Token varsa kullanıcıyı bulur, yoksa null bırakır. İsteği engellemez. */
async function kullaniciyiCoz(req, _res, next) {
  req.kullanici = null;
  const baslik = req.headers.authorization || '';
  const token = baslik.startsWith('Bearer ') ? baslik.slice(7) : null;
  if (token) {
    try {
      // Algoritma SABİTLENİYOR. Sabitlenmezse, kütüphanenin ileride
      // kabul edebileceği başka bir algoritmayla imzalanmış bir bilet
      // geçerli sayılabilir. Biz yalnızca HS256 üretiyoruz, yalnızca
      // HS256 kabul ediyoruz.
      const veri = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      // GÜVENLİK: iki aşamalı doğrulamanın ARA bileti buraya giremez.
      // O bilet de userId taşıyor; bu kontrol olmasaydı, şifreyi bilen ama
      // 2FA kodunu giremeyen biri ara biletle tam erişim alırdı — yani 2FA
      // hiçbir işe yaramazdı.
      if (veri.asama === '2fa') return next();
      const bulunan = await prisma.user.findUnique({
        where: { id: veri.userId },
        include: { allergies: true, diseases: true },
      });
      // ŞİFRE DEĞİŞTİYSE ESKİ BİLETLER GEÇERSİZ. Birim çevrimi ve sınır
      // durumları src/oturum.js içinde, testleriyle birlikte.
      if (bulunan && !biletDamgadanSonraMi(veri.iat, bulunan.oturumlarGecersizAt)) {
        return next();   // misafir gibi davran
      }
      req.kullanici = bulunan;
    } catch (e) {
      // geçersiz/süresi dolmuş token -> misafir gibi davran
    }
  }
  next();
}

/** Token ZORUNLU olan uç noktalar için. */
/**
 * Beklenmeyen sunucu hatalarını karşılar.
 *
 * NİYE hata.message DOĞRUDAN DÖNDÜRÜLMÜYOR: Prisma hataları tablo ve sütun
 * adlarını, bazen sorgu parçalarını içeriyor. Bunları dışarı vermek, veri
 * tabanı yapısını saldırgana anlatmak demek. Gerçek hata sunucu günlüğüne
 * yazılıyor (geliştirici görebiliyor), kullanıcıya genel bir mesaj gidiyor.
 *
 * Kullanıcı hatalarında (400/401/404) bu fonksiyon kullanılmıyor; oralarda
 * mesajın açık olması gerekiyor ve o mesajları biz yazıyoruz.
 */
// TOTP temel anahtarı. Ayrı değişken yoksa JWT_SECRET'ten türetiliyor
// (gerekçesi src/totp.js içinde).
const TOTP_TEMEL = process.env.TOTP_ANAHTARI || JWT_SECRET;

/* ──────────────────────────────────────────────────────────────────────────
   İKİ AŞAMALI DOĞRULAMA (TOTP) YARDIMCILARI
   ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
   GÜVENLİK GÜNLÜĞÜ  (OWASP A09: Security Logging and Monitoring Failures)
   ──────────────────────────────────────────────────────────────────────────

   NİYE GEREKLİ: başarısız giriş denemeleri kaydedilmezse, birinin bir hesabı
   kaba kuvvetle zorladığı hiç görülmez. Hız sınırlayıcı denemeyi yavaşlatıyor
   ama olup bittiğini kimseye söylemiyor.

   E-POSTA MASKELENİYOR. Sunucu günlüğü de kişisel veri içeren bir kayıt
   ortamıdır; adresin tamamını yazmak gereksiz veri işlemek olurdu. Maskeli
   biçim ("es***@gmail.com") saldırının hangi hesaba yöneldiğini anlamaya
   yetiyor, kimliği ortaya koymuyor — amaçla sınırlı veri işleme (KVKK m.4).

   ŞİFRE, KOD VE BİLET ASLA YAZILMIYOR. Günlükte düz şifre tutmak,
   veritabanında tutmaktan farksızdır.
*/
function adresiMaskele(adres) {
  const d = String(adres || '');
  const at = d.indexOf('@');
  if (at < 1) return '(geçersiz adres)';
  const bas = d.slice(0, Math.min(2, at));
  return `${bas}***${d.slice(at)}`;
}

function guvenlikGunlugu(olay, req, ek = '') {
  const ip = req.ip || '(bilinmiyor)';
  const zaman = new Date().toISOString();
  console.warn(`[GÜVENLİK] ${zaman} ${olay} ip=${ip}${ek ? ` ${ek}` : ''}`);
}

/**
 * Şifre doğru ama 2FA açıksa verilen KISA ÖMÜRLÜ bilet.
 *
 * Normal oturum biletinden ayrı tutuluyor (`asama: '2fa'`), çünkü bu bilet
 * hiçbir veriye erişim vermemeli — yalnızca "şifreyi doğru girdim" demeli.
 * 5 dakika içinde kod girilmezse baştan başlanır.
 */
/**
 * Normal oturum bileti.
 *
 * SÜRE 1 GÜN. Önceden 7 gündü. Bilet imzalıdır, yani sunucu onu geri
 * çağıramaz: çalınan bir bilet süresi dolana kadar geçerli kalır. Bu yüzden
 * süre, kullanıcıyı her gün şifre sormakla yormamakla çalıntı biletin
 * kullanılabileceği pencereyi kısaltmak arasındaki denge.
 *
 * "Oturumu kapat" dendiğinde bilet tarayıcıdan siliniyor ve kullanıcı yeniden
 * giriş yapıyor; yani süreyi kısaltmak oturum kapatmanın yerine geçmez,
 * kullanıcının kapatmayı unuttuğu durumu sınırlar.
 */
function oturumBileti(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: OTURUM_SURESI });
}

function geciciBilet(userId) {
  return jwt.sign({ userId, asama: '2fa' }, JWT_SECRET, { expiresIn: '5m' });
}

/**
 * İkinci aşama kodunu doğrular: önce doğrulayıcı uygulamanın kodu, tutmazsa
 * tek kullanımlık yedek kodlar.
 *
 * NİYE AYRI FONKSİYON: aynı denetim iki yerde gerekiyor — girişin ikinci
 * aşamasında ve şifre sıfırlamada. İki kopya kalsaydı birinde yapılan
 * düzeltme ötekine geçmezdi.
 */
async function ikinciAsamaDogru(user, kod) {
  if (!kod) return false;
  const temiz = String(kod).replace(/\s/g, '').toUpperCase();
  const anahtar = totp.coz(user.totpSecret, TOTP_TEMEL);
  if (totp.gecerliMi(temiz, anahtar)) return true;

  for (const ozet of user.totpYedekKodlari || []) {
    /* eslint-disable no-await-in-loop */
    if (await bcrypt.compare(temiz, ozet)) {
      // Yedek kod TEK KULLANIMLIK: kullanıldığı anda listeden çıkıyor.
      await prisma.user.update({
        where: { id: user.id },
        data: { totpYedekKodlari: user.totpYedekKodlari.filter((x) => x !== ozet) },
      });
      return true;
    }
  }
  return false;
}

/** Tek kullanımlık yedek kodlar. Kullanıcıya bir kez gösterilir. */
function yedekKodUret() {
  const kodlar = [];
  for (let i = 0; i < 8; i += 1) {
    // Karışması kolay karakterler (0/O, 1/I) bilerek dışarıda.
    const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let kod = '';
    for (let j = 0; j < 10; j += 1) {
      kod += harfler[crypto.randomInt(harfler.length)];
      if (j === 4) kod += '-';
    }
    kodlar.push(kod);
  }
  return kodlar;
}

/**
 * Veritabanından gelen şifreli tahlil satırını okunur hâle getirir.
 *
 * TEK YER olması önemli: her sorgudan sonra elle çözmeye kalksaydık bir
 * yerde unutulur ve kullanıcıya şifreli metin görünürdü — ya da daha kötüsü,
 * kural motoru şifreli metni "test adı" sanıp sessizce yanlış çalışırdı.
 */
/**
 * Hastalık/alerji listesini çözer ve ÇÖZÜLEMEYENİ SESSİZCE YUTMAZ.
 *
 * NİYE ÖNEMLİ: anahtar yanlışsa ya da kayıt bozuksa çözme null döner. Bunu
 * sessizce listeden düşürürsek, kullanıcı "hiç hastalığı yokmuş" gibi
 * değerlendirilir ve RİSKLİ besinler UYGUN görünür. Yani şifreleme hatası,
 * bir sağlık uygulamasında sessizce YANLIŞ VE TEHLİKELİ sonuca dönüşür.
 *
 * Çözülemeyen kayıt listeden çıkıyor (şifreli metni kural motoruna vermek
 * daha kötü olurdu) ama günlüğe hata basılıyor ki fark edilsin.
 */
function cozVeDenetle(kayitlar, tur, userId) {
  const cozulen = [];
  let bozuk = 0;
  for (const k of kayitlar) {
    const d = kripto.coz(k.name);
    if (d === null) bozuk += 1;
    else cozulen.push(d);
  }
  if (bozuk > 0) {
    console.error(
      `[KRİTİK] Kullanıcı ${userId}: ${bozuk} ${tur} kaydı ÇÖZÜLEMEDİ. `
      + 'Şifreleme anahtarı değişmiş olabilir. Bu kullanıcının risk '
      + 'değerlendirmesi EKSİK yapılıyor.',
    );
  }
  return cozulen;
}

function tahliliCoz(satir) {
  return {
    ...satir,
    testName: kripto.coz(satir.testName),
    value: kripto.sayiCoz(satir.value),
    unit: kripto.coz(satir.unit),
    refLow: kripto.sayiCoz(satir.refLow),
    refHigh: kripto.sayiCoz(satir.refHigh),
    valueOp: kripto.coz(satir.valueOp),
    textValue: kripto.coz(satir.textValue),
    pdfYorumu: kripto.coz(satir.pdfYorumu),
    pdfAralik: kripto.coz(satir.pdfAralik),
  };
}

function sunucuHatasi(res, hata, nerede) {
  console.error(`[HATA] ${nerede}:`, hata);
  res.status(500).json({ error: 'Beklenmeyen bir sunucu hatası oluştu.' });
}

function girisGerekli(req, res, next) {
  if (!req.kullanici) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  next();
}

function profilCikar(user) {
  if (!user) return { allergies: [], diseases: [], diet: 'Normal' };
  return {
    allergies: cozVeDenetle(user.allergies, 'alerji', user.id),
    diseases: cozVeDenetle(user.diseases, 'hastalık', user.id),
    diet: user.diet || 'Normal',
  };
}

function kullaniciyiDondur(user) {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    kcalGoal: user.kcalGoal,
    waterGoalL: user.waterGoalL,
    email: user.email,
    gender: user.gender,
    diet: user.diet,
    allergies: user.allergies ? cozVeDenetle(user.allergies, 'alerji', user.id) : [],
    diseases: user.diseases ? cozVeDenetle(user.diseases, 'hastalık', user.id) : [],
    // Arayüz buna bakıp onay ekranını gösteriyor. Şifre özeti gibi hassas
    // alanlar burada YOK — bu fonksiyon "dışarı ne çıkar" kapısı.
    onayGerekli: onayGerekliMi(user),
    rizaSurumu: user.rizaSurumu || null,
    totpEnabled: !!user.totpEnabled,
    yedekKodSayisi: (user.totpYedekKodlari || []).length,
  };
}

/**
 * Kullanıcıdan (yeniden) onay istenmeli mi?
 *
 * Üç durumda evet:
 *  - hiç onay vermemiş (bu özellik eklenmeden önce kayıt olmuş kullanıcılar),
 *  - iki beyandan biri eksik,
 *  - metinler değişip SURUM artmış (eski sürüme verilen rıza yeni metni
 *    kapsamaz; KVKK açık rızanın BELİRLİ bir konuya ilişkin olmasını istiyor).
 */
function onayGerekliMi(user) {
  if (!user) return false;
  if (!user.aydinlatmaOkunduAt || !user.acikRizaAt) return true;
  return user.rizaSurumu !== KVKK.SURUM;
}

app.use(kullaniciyiCoz);

// ---------------------------------------------------------------------------
// KİMLİK DOĞRULAMA
// ---------------------------------------------------------------------------
app.post('/api/register', girisSinirlayici, async (req, res) => {
  try {
    const {
      name, surname, email, password, gender, diet, allergies = [], diseases = [],
      aydinlatmaOkundu, acikRiza,
    } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur.' });
    }
    // KVKK: sağlık verisi özel nitelikli kişisel veridir ve bu uygulamada
    // işlemenin tek hukuki dayanağı açık rızadır. Rıza yoksa kayıt da yok.
    // Sunucu tarafında kontrol ediyoruz: arayüzdeki onay kutusu atlanabilir,
    // bu kontrol atlanamaz.
    if (aydinlatmaOkundu !== true) {
      return res.status(400).json({ error: 'Aydınlatma metnini okuyup anladığınızı beyan etmeniz gerekiyor.' });
    }
    if (acikRiza !== true) {
      return res.status(400).json({
        error: 'Sağlık verileriniz için açık rıza vermeden kayıt oluşturulamıyor. '
          + 'Bu uygulamanın tek işlevi hastalık ve tahlil bilgilerinize göre '
          + 'değerlendirme yapmak olduğu için, bu veriler olmadan çalışamıyor.',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı.' });
    }
    // HESAP SAYIMI (account enumeration) KAPATILDI.
    // Eskiden burada 409 "Bu e-posta zaten kayıtlı" dönüyordu; bu, bir adresin
    // sistemde olup olmadığını sorgulamaya yarıyordu. Sağlık verisi tutan bir
    // uygulamada "şu kişi buraya kayıtlı" bilgisi başlı başına ifşadır.
    // Artık yanıt her iki durumda da AYNI; durumu yalnızca adresin SAHİBİ
    // kendisine giden postadan öğreniyor.
    const ayniYanit = {
      dogrulamaGerekli: true,
      mesaj: 'Hesabınızı kullanmaya başlamak için e-posta adresinize gönderilen '
        + 'bağlantıya tıklayın. Posta gelmediyse gereksiz (spam) klasörünü kontrol edin.',
    };

    const varMi = await prisma.user.findUnique({ where: { email } });
    if (varMi) {
      eposta.zatenKayitliGonder(email)
        .catch((h) => console.error('[POSTA] Bilgilendirme gönderilemedi:', h.message));
      guvenlikGunlugu('var olan adresle kayıt denemesi', req, `hesap=${adresiMaskele(email)}`);
      return res.status(201).json(ayniYanit);
    }

    // Şifreyi ASLA düz metin saklamıyoruz; bcrypt ile hash'liyoruz.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name, surname: surname || '', email, passwordHash,
        gender: gender || null, diet: diet || 'Normal',
        aydinlatmaOkunduAt: new Date(),
        acikRizaAt: new Date(),
        rizaSurumu: KVKK.SURUM,
        allergies: { create: allergies.map((a) => ({ name: kripto.sifrele(a) })) },
        diseases: { create: diseases.map((d) => ({ name: kripto.sifrele(d) })) },
      },
      include: { allergies: true, diseases: true },
    });

    // OTURUM BİLETİ VERİLMİYOR. Kullanıcı e-postasını doğrulayana kadar
    // içeri giremiyor; aksi hâlde doğrulama bir formaliteye dönerdi.
    const baglanti = await dogrulamaBiletiUret(user.id);
    eposta.dogrulamaGonder(email, baglanti, DOGRULAMA_SURESI_SAAT)
      .catch((h) => console.error('[POSTA] Doğrulama gönderilemedi:', h.message));

    res.status(201).json(ayniYanit);
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/register');
  }
});

app.post('/api/login', girisSinirlayici, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email || '' },
      include: { allergies: true, diseases: true },
    });
    // Güvenlik: "e-posta yok" ile "şifre yanlış" ayrımını dışarıya vermiyoruz.
    // HESAP KİLİDİ — şifre KONTROL EDİLMEDEN önce bakılıyor. Sonra bakılsaydı
    // kilitli hesapta bile şifre denemesi yapılabilir, kilit işe yaramazdı.
    if (user && kilitliMi(user.kilitBitisi)) {
      const kalanDk = Math.ceil((user.kilitBitisi - Date.now()) / 60000);
      guvenlikGunlugu('kilitli hesaba giriş denemesi', req,
        `hesap=${adresiMaskele(email)}`);
      return res.status(429).json({
        error: `Çok fazla hatalı deneme yapıldı. Bu hesap ${kalanDk} dakika sonra `
          + 'yeniden denenebilir. Şifrenizi hatırlamıyorsanız "Şifremi unuttum" '
          + 'bağlantısını kullanabilirsiniz.',
      });
    }

    const dogruMu = user ? await bcrypt.compare(password || '', user.passwordHash) : false;
    if (!dogruMu) {
      if (user) {
        // SAYAÇ HESABA BAĞLI. Hız sınırlayıcı IP başına çalışıyor; IP
        // değiştirebilen saldırgan onu aşabiliyordu. Bu sayaç aşılamaz.
        // Karar src/oturum.js içinde ve testlerle sabitlenmiş; burada
        // yalnızca uygulanıyor.
        const karar = kilitKarari(user.basarisizGiris);
        await prisma.user.update({
          where: { id: user.id },
          data: karar.kilitBitisi === undefined
            ? { basarisizGiris: karar.basarisizGiris }
            : karar,
        });
        if (karar.kilitBitisi) {
          guvenlikGunlugu('HESAP KİLİTLENDİ', req, `hesap=${adresiMaskele(email)}`);
        }
      }
      // Hesabın var olup olmadığı günlüğe YAZILIYOR (kullanıcıya değil):
      // "kayıtlı olmayan adreslere deneme" ile "kayıtlı hesaba şifre deneme"
      // farklı saldırılar ve ayırt edilmeleri gerekiyor.
      guvenlikGunlugu('giriş başarısız', req,
        `hesap=${adresiMaskele(email)} kayıtlı=${user ? 'evet' : 'hayır'}`);
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    // E-POSTA DOĞRULANMAMIŞSA İÇERİ ALINMIYOR.
    // Şifre doğru olduğu için burada "bu hesap var" bilgisini vermiş oluyoruz;
    // sakıncası yok, çünkü şifreyi bilen zaten hesabın sahibi ya da şifreyi ele
    // geçirmiş biri — ikisi de hesabın varlığını zaten biliyor.
    if (!user.ePostaDogrulandiAt) {
      return res.status(403).json({
        dogrulanmamis: true,
        error: 'E-posta adresiniz henüz doğrulanmadı. Kayıt sırasında gönderilen '
          + 'bağlantıya tıklayın ya da yeni bir bağlantı isteyin.',
      });
    }

    // Başarılı giriş: sayacı sıfırlıyor, son hareketi damgalıyor ve varsa
    // silme uyarısını kaldırıyor — kullanıcı döndüyse hesap kurtulmuş olur.
    //
    // DAMGA 2FA'DAN ÖNCE ATILIYOR, bilerek: şifresini doğru giren ama
    // doğrulayıcı uygulamasıyla uğraşan bir kullanıcı o sırada hesabı
    // silinecek diye telaşa düşmemeli. Şifreyi bilmek zaten hareket
    // sayılacak kadar güçlü bir işaret.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        basarisizGiris: 0,
        kilitBitisi: null,
        sonGirisAt: new Date(),
        silmeUyarisiAt: null,
      },
    });

    // Süpürme beklenmiyor: kullanıcının girişini yavaşlatmamalı.
    saklamaSuresiniUygula();

    // 2FA açıksa oturum bileti BURADA verilmiyor. Şifre doğru olsa bile
    // kullanıcı henüz içeri girmiş sayılmıyor; yalnızca ikinci aşamaya
    // geçme hakkı kazanıyor.
    if (user.totpEnabled) {
      return res.json({ ikinciAsama: true, geciciBilet: geciciBilet(user.id) });
    }

    const token = oturumBileti(user.id);
    res.json({ token, user: kullaniciyiDondur(user) });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/login');
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   İKİ AŞAMALI DOĞRULAMA
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Giriş ikinci aşaması: geçici bilet + doğrulayıcı kodu (ya da yedek kod).
 *
 * Hız sınırı giriş ucuyla aynı: 6 haneli kodu deneme yanılmayla bulmak
 * 1 000 000'da 1 ama sınırsız deneme hakkı olsaydı mümkün olurdu.
 */
app.post('/api/login/2fa', girisSinirlayici, async (req, res) => {
  try {
    const { geciciBilet: bilet, kod } = req.body;
    if (!bilet || !kod) return res.status(400).json({ error: 'Kod gerekli.' });

    let veri;
    try {
      veri = jwt.verify(bilet, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      return res.status(401).json({ error: 'Doğrulama süresi doldu. Lütfen tekrar giriş yapın.' });
    }
    if (veri.asama !== '2fa') return res.status(401).json({ error: 'Geçersiz bilet.' });

    const user = await prisma.user.findUnique({
      where: { id: veri.userId },
      include: { allergies: true, diseases: true },
    });
    if (!user || !user.totpEnabled) return res.status(401).json({ error: 'Geçersiz istek.' });

    if (!await ikinciAsamaDogru(user, kod)) {
      // Şifre DOĞRU girilmiş ama kod tutmuyor: şifrenin sızdığına işaret
      // olabileceği için ayrı kaydediliyor.
      guvenlikGunlugu('2FA kodu hatalı (şifre doğruydu)', req,
        `hesap=${adresiMaskele(user.email)}`);
      return res.status(401).json({ error: 'Kod hatalı.' });
    }

    const token = oturumBileti(user.id);
    res.json({ token, user: kullaniciyiDondur(user) });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/login/2fa');
  }
});

/**
 * Kurulumu başlatır: gizli anahtar üretir ve QR kodunu döndürür.
 * Anahtar kaydediliyor ama 2FA HENÜZ AÇILMIYOR — kullanıcı geçerli bir kod
 * girerek kurulumun çalıştığını kanıtlamadan açılsaydı, yanlış kurulumda
 * kendi hesabından kilitlenirdi.
 */
/* ──────────────────────────────────────────────────────────────────────────
   ŞİFRE SIFIRLAMA
   ──────────────────────────────────────────────────────────────────────────

   AKIŞ: kullanıcı e-postasını yazar -> posta kutusuna tek kullanımlık bağlantı
   gider -> bağlantıdan yeni şifre belirlenir.

   ÜÇ TASARIM KARARI:

   1. "BU E-POSTA KAYITLI DEĞİL" DENMİYOR. İstek ne olursa olsun aynı yanıt
      dönüyor. Aksi hâlde bu uç nokta, bir adresin sistemde kayıtlı olup
      olmadığını sorgulamaya yarardı; sağlık verisi tutan bir uygulamada
      "şu kişi buraya kayıtlı" bilgisi başlı başına ifşadır.

   2. 2FA AÇIKSA KOD DA İSTENİYOR. İstenmezse, posta kutusunu ele geçiren biri
      şifreyi sıfırlayıp içeri girebilirdi — yani 2FA'nın koruması posta
      kutusunun güvenliğine inerdi. Kod istenince saldırganın hem posta
      kutusuna hem telefona erişmesi gerekiyor.

   3. ŞİFRE DEĞİŞİNCE TÜM ESKİ OTURUMLAR KAPANIYOR (oturumlarGecersizAt).
      Hesabı ele geçiren biri varsa şifre sıfırlamak onu gerçekten dışarı
      atıyor; yoksa elindeki bilet süresi dolana kadar içeride kalırdı.
*/

// Bağlantının ömrü. Kısa: posta kutusu sonradan ele geçse eski bağlantı
// işe yaramasın. Uzun değil ama kullanıcının postayı açmasına yeter.
const SIFIRLAMA_SURESI_DK = 60;

// Doğrulama bileti daha uzun yaşıyor: kullanıcı kayıt postasını ertesi gün
// açabilir ve bu bilet tek başına hesaba erişim vermiyor, yalnızca adresin
// sahipliğini kanıtlıyor.
const DOGRULAMA_SURESI_SAAT = 24;

/** Eski ve işe yaramaz biletleri siler. Birikmelerinin anlamı yok. */
async function eskiBiletleriTemizle() {
  const simdi = new Date();
  try {
    await Promise.all([
      prisma.passwordReset.deleteMany({
        where: { OR: [{ expiresAt: { lt: simdi } }, { usedAt: { not: null } }] },
      }),
      prisma.emailVerification.deleteMany({
        where: { OR: [{ expiresAt: { lt: simdi } }, { usedAt: { not: null } }] },
      }),
    ]);
  } catch (e) {
    // Temizlik asıl işi engellememeli: başarısız olursa yalnızca günlüğe düşer.
    console.error('[TEMİZLİK] Eski biletler silinemedi:', e.message);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   SAKLAMA SÜRESİ DOLAN HESAPLARIN SİLİNMESİ
   ──────────────────────────────────────────────────────────────────────────

   Karar mantığı src/saklama.js içinde ve testlerle sabitlenmiş; burada
   yalnızca uygulanıyor.

   NİYE ZAMANLANMIŞ GÖREV DEĞİL: ücretsiz barındırma katmanlarında cron yok ve
   sırf bunun için ayrı bir servis kurmak bu ölçekte gereksiz. Süpürme, zaten
   çağrılan bir yoldan tetikleniyor ama GÜNDE EN FAZLA BİR KEZ çalışıyor —
   aksi hâlde her girişte tüm kullanıcı tablosu taranırdı.

   Hata durumunda sessizce geçiyor: temizlik, kullanıcının giriş yapmasını
   engellememeli.
*/
let sonSupurme = 0;

async function saklamaSuresiniUygula() {
  if (Date.now() - sonSupurme < 24 * 60 * 60 * 1000) return;
  sonSupurme = Date.now();
  try {
    const kullanicilar = await prisma.user.findMany({
      select: {
        id: true, email: true, createdAt: true,
        sonGirisAt: true, silmeUyarisiAt: true,
      },
    });
    const simdi = new Date();

    for (const u of kullanicilar) {
      /* eslint-disable no-await-in-loop */
      if (saklama.silinmeliMi(u, simdi)) {
        await prisma.$transaction([
          prisma.passwordReset.deleteMany({ where: { userId: u.id } }),
          prisma.emailVerification.deleteMany({ where: { userId: u.id } }),
          prisma.labResult.deleteMany({ where: { userId: u.id } }),
          prisma.diaryEntry.deleteMany({ where: { userId: u.id } }),
          prisma.diaryDay.deleteMany({ where: { userId: u.id } }),
          prisma.userAllergy.deleteMany({ where: { userId: u.id } }),
          prisma.userDisease.deleteMany({ where: { userId: u.id } }),
          prisma.user.delete({ where: { id: u.id } }),
        ]);
        // Kimlik günlüğe YAZILMIYOR, yalnızca maskeli adres.
        console.warn(`[SAKLAMA] Hareketsiz hesap silindi: ${adresiMaskele(u.email)}`);
      } else if (saklama.uyarilmaliMi(u, simdi)) {
        await prisma.user.update({
          where: { id: u.id },
          data: { silmeUyarisiAt: simdi },
        });
        eposta.silmeUyarisiGonder(u.email, saklama.UYARI_GUN_ONCE)
          .catch((h) => console.error('[POSTA] Silme uyarısı gönderilemedi:', h.message));
      }
    }
  } catch (e) {
    console.error('[SAKLAMA] Süpürme başarısız:', e.message);
  }
}

/** Doğrulama bileti üretir, özetini saklar, bağlantıyı döndürür. */
async function dogrulamaBiletiUret(userId) {
  await prisma.emailVerification.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  const bilet = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerification.create({
    data: {
      tokenOzeti: biletOzeti(bilet),
      userId,
      expiresAt: new Date(Date.now() + DOGRULAMA_SURESI_SAAT * 60 * 60 * 1000),
    },
  });
  return `${IZINLI_KOKEN}/eposta-dogrula?bilet=${bilet}`;
}

/* ──────────────────────────────────────────────────────────────────────────
   E-POSTA DOĞRULAMA
   ────────────────────────────────────────────────────────────────────────── */

app.post('/api/eposta/dogrula', girisSinirlayici, async (req, res) => {
  try {
    const { bilet } = req.body;
    if (!bilet) return res.status(400).json({ error: 'Doğrulama bileti gerekli.' });

    const kayit = await prisma.emailVerification.findUnique({
      where: { tokenOzeti: biletOzeti(String(bilet)) },
      include: { user: { include: { allergies: true, diseases: true } } },
    });

    // Yok / kullanılmış / süresi dolmuş -> hepsi AYNI mesaj.
    if (!kayit || kayit.usedAt || kayit.expiresAt < new Date()) {
      guvenlikGunlugu('geçersiz doğrulama bileti', req,
        kayit ? 'sebep=kullanılmış/süresi dolmuş' : 'sebep=bilet yok');
      return res.status(400).json({
        error: 'Bu doğrulama bağlantısı geçersiz ya da süresi dolmuş. '
          + 'Giriş ekranından yeni bir bağlantı isteyebilirsiniz.',
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: kayit.userId },
        data: { ePostaDogrulandiAt: new Date() },
      }),
      prisma.emailVerification.update({
        where: { id: kayit.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // DOĞRULAMADAN SONRA DOĞRUDAN İÇERİ ALINIYOR: kullanıcı az önce hem
    // şifreyi belirlemiş hem adresin kendisine ait olduğunu kanıtlamış.
    // Yeniden giriş istemek gereksiz bir adım olurdu.
    //
    // 2FA açıksa bu kısayol KAPALI: o kullanıcı ikinci aşamayı geçmeden
    // içeri giremez, yoksa doğrulama bağlantısı 2FA'yı atlatan bir yol olurdu.
    if (kayit.user.totpEnabled) {
      return res.json({ dogrulandi: true, ikinciAsamaGerekli: true });
    }
    const token = oturumBileti(kayit.userId);
    res.json({ dogrulandi: true, token, user: kullaniciyiDondur(kayit.user) });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/eposta/dogrula');
  }
});

app.post('/api/eposta/tekrar-gonder', sifirlamaSinirlayici, async (req, res) => {
  // Kayıt uç noktasıyla aynı mantık: adresin kayıtlı olup olmadığı,
  // doğrulanmış olup olmadığı dışarıdan anlaşılmamalı.
  const ayniYanit = {
    mesaj: 'Adres kayıtlı ve henüz doğrulanmamışsa, yeni bir doğrulama '
      + 'bağlantısı gönderildi.',
  };
  try {
    const adres = String(req.body.email || '').trim().toLowerCase();
    if (!adres) return res.status(400).json({ error: 'E-posta adresi gerekli.' });

    const user = await prisma.user.findUnique({ where: { email: adres } });
    if (user && !user.ePostaDogrulandiAt) {
      const baglanti = await dogrulamaBiletiUret(user.id);
      eposta.dogrulamaGonder(adres, baglanti, DOGRULAMA_SURESI_SAAT)
        .catch((h) => console.error('[POSTA] Doğrulama gönderilemedi:', h.message));
    }
    await eskiBiletleriTemizle();
    res.json(ayniYanit);
  } catch (hata) {
    console.error('[/api/eposta/tekrar-gonder]', hata);
    res.json(ayniYanit);
  }
});

app.post('/api/sifre/unuttum', sifirlamaSinirlayici, async (req, res) => {
  // YANIT HER DURUMDA AYNI (bkz. yukarıdaki 1. karar).
  const ayniYanit = {
    mesaj: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. '
      + 'Posta kutunuzu kontrol edin.',
  };
  try {
    const adres = String(req.body.email || '').trim().toLowerCase();
    if (!adres) return res.status(400).json({ error: 'E-posta adresi gerekli.' });

    const user = await prisma.user.findUnique({ where: { email: adres } });

    if (user) {
      // Önceki kullanılmamış biletler geçersiz kılınıyor: aynı anda birden
      // fazla geçerli bağlantı dolaşmasın.
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const bilet = crypto.randomBytes(32).toString('hex');
      await prisma.passwordReset.create({
        data: {
          tokenOzeti: biletOzeti(bilet),   // biletin kendisi SAKLANMIYOR
          userId: user.id,
          expiresAt: new Date(Date.now() + SIFIRLAMA_SURESI_DK * 60 * 1000),
        },
      });

      const baglanti = `${IZINLI_KOKEN}/sifre-yenile?bilet=${bilet}`;
      // GÖNDERİM BEKLENMİYOR. İki sebep: (a) SMTP yavaş, kullanıcıyı
      // bekletmenin anlamı yok; (b) kayıtlı adreste posta gönderimi sürer,
      // kayıtsızda sürmezdi — yanıt süresi adresin kayıtlı olup olmadığını
      // ele verirdi. Hata yalnızca günlüğe yazılıyor.
      eposta.sifirlamaGonder(adres, baglanti, SIFIRLAMA_SURESI_DK)
        .catch((h) => console.error('[POSTA] Gönderim başarısız:', h.message));
    }

    // Biriken işe yaramaz biletleri burada temizliyoruz: ayrı bir zamanlanmış
    // görev kurmak bu ölçekte gereksiz, ve bu uç nokta zaten seyrek çağrılıyor.
    await eskiBiletleriTemizle();
    res.json(ayniYanit);
  } catch (hata) {
    // Burada da ayrıntı sızdırmıyoruz; hata sunucu günlüğüne gidiyor.
    console.error('[/api/sifre/unuttum]', hata);
    res.json(ayniYanit);
  }
});

app.post('/api/sifre/yenile', girisSinirlayici, async (req, res) => {
  try {
    const { bilet, password, kod } = req.body;
    if (!bilet) return res.status(400).json({ error: 'Sıfırlama bileti gerekli.' });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı.' });
    }

    const kayit = await prisma.passwordReset.findUnique({
      where: { tokenOzeti: biletOzeti(String(bilet)) },
      include: { user: true },
    });

    // Yok / kullanılmış / süresi dolmuş -> hepsi AYNI mesaj. Hangisi olduğunu
    // söylemek, geçerli bilet aramaya yarayacak bilgi verirdi.
    const gecersiz = !kayit || kayit.usedAt || kayit.expiresAt < new Date();
    if (gecersiz) {
      guvenlikGunlugu('geçersiz şifre sıfırlama bileti', req,
        kayit ? 'sebep=kullanılmış/süresi dolmuş' : 'sebep=bilet yok');
      return res.status(400).json({
        error: 'Bu sıfırlama bağlantısı geçersiz ya da süresi dolmuş. Yeniden talep edin.',
      });
    }

    // 2FA açıksa kod şart (bkz. yukarıdaki 2. karar). Kod gelmediyse hata
    // değil, arayüze "kodu da sor" diyoruz.
    if (kayit.user.totpEnabled) {
      if (!kod) return res.status(200).json({ ikinciAsama: true });
      if (!await ikinciAsamaDogru(kayit.user, kod)) {
        return res.status(401).json({ error: 'Doğrulama kodu hatalı.' });
      }
    }

    const yeniOzet = await bcrypt.hash(String(password), 10);
    // Tek işlem: şifre değişiyor, bilet kullanılmış damgası yiyor, eski
    // oturumlar geçersiz kılınıyor. Biri olup biri olmazsa tutarsız kalırdı.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: kayit.userId },
        data: {
          passwordHash: yeniOzet,
          oturumlarGecersizAt: new Date(),
          // Sıfırlama bağlantısını açabilen kişi o posta kutusuna erişiyor
          // demektir; adresin sahipliği zaten kanıtlanmış oluyor. Ayrıca
          // doğrulama istemek kullanıcıyı boşuna bir adıma sokardı.
          ePostaDogrulandiAt: new Date(),
          // Kilidi de açıyoruz: şifresini unutup kilitlenen kullanıcı,
          // şifresini yenileyince beklemek zorunda kalmamalı.
          basarisizGiris: 0,
          kilitBitisi: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: kayit.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ mesaj: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/sifre/yenile');
  }
});

app.post('/api/2fa/baslat', girisGerekli, async (req, res) => {
  try {
    if (req.kullanici.totpEnabled) {
      return res.status(400).json({ error: 'İki aşamalı doğrulama zaten açık.' });
    }
    const secret = totp.yeniAnahtar();
    await prisma.user.update({
      where: { id: req.kullanici.id },
      data: { totpSecret: totp.sifrele(secret, TOTP_TEMEL) },   // diskte şifreli
    });

    // otpauth:// adresi doğrulayıcı uygulamaların anladığı standart biçim.
    const adres = totp.kurulumAdresi(req.kullanici.email, secret);
    const qr = await QRCode.toDataURL(adres, { margin: 1, width: 240 });

    // Anahtar ayrıca metin olarak da dönüyor: kamerası çalışmayan kullanıcı
    // elle girebilsin diye.
    res.json({ qr, anahtar: secret });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/2fa/baslat');
  }
});

/** Kurulumu tamamlar: kod doğruysa 2FA açılır ve yedek kodlar BİR KEZ gösterilir. */
app.post('/api/2fa/dogrula', girisGerekli, async (req, res) => {
  try {
    const { kod } = req.body;
    if (!req.kullanici.totpSecret) {
      return res.status(400).json({ error: 'Önce kurulumu başlatın.' });
    }
    const kurulumAnahtari = totp.coz(req.kullanici.totpSecret, TOTP_TEMEL);
    if (!totp.gecerliMi(String(kod || '').replace(/\s/g, ''), kurulumAnahtari)) {
      return res.status(400).json({ error: 'Kod hatalı. Telefonunuzdaki güncel kodu girin.' });
    }

    const kodlar = yedekKodUret();
    const ozetler = await Promise.all(kodlar.map((k) => bcrypt.hash(k, 10)));
    await prisma.user.update({
      where: { id: req.kullanici.id },
      data: { totpEnabled: true, totpYedekKodlari: ozetler },
    });

    // Yedek kodlar yalnızca BURADA düz metin olarak görünüyor; veritabanında
    // özetleri duruyor, yani sonradan bir daha gösterilemezler.
    res.json({ acildi: true, yedekKodlar: kodlar });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/2fa/dogrula');
  }
});

/** Kapatır. Şifre isteniyor: biletini ele geçiren biri korumayı kaldıramasın. */
app.post('/api/2fa/kapat', girisGerekli, async (req, res) => {
  try {
    const { password } = req.body || {};
    const dogruMu = password ? await bcrypt.compare(password, req.kullanici.passwordHash) : false;
    if (!dogruMu) return res.status(401).json({ error: 'Şifrenizi doğru girmeniz gerekiyor.' });

    await prisma.user.update({
      where: { id: req.kullanici.id },
      data: { totpEnabled: false, totpSecret: null, totpYedekKodlari: [] },
    });
    res.json({ kapatildi: true });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/2fa/kapat');
  }
});

app.get('/api/me', girisGerekli, (req, res) => {
  res.json(kullaniciyiDondur(req.kullanici));
});

app.put('/api/me', girisGerekli, async (req, res) => {
  try {
    const {
      name, surname, gender, diet, allergies, diseases, kcalGoal, waterGoalL,
    } = req.body;
    const id = req.kullanici.id;

    // Alerji/hastalık listeleri: eskisini silip yenisini yazıyoruz (en basit yol)
    if (Array.isArray(allergies)) {
      await prisma.userAllergy.deleteMany({ where: { userId: id } });
      await prisma.userAllergy.createMany({
        data: allergies.map((a) => ({ name: kripto.sifrele(a), userId: id })),
      });
    }
    if (Array.isArray(diseases)) {
      await prisma.userDisease.deleteMany({ where: { userId: id } });
      await prisma.userDisease.createMany({
        data: diseases.map((d) => ({ name: kripto.sifrele(d), userId: id })),
      });
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? undefined,
        surname: surname ?? undefined,
        gender: gender ?? undefined,
        diet: diet ?? undefined,
        // Hedefler: null GÖNDERİLEBİLİR (kullanıcı hedefini silmek isteyebilir),
        // o yüzden ?? undefined kalıbı burada kullanılmıyor. Alan hiç
        // gönderilmediyse undefined kalır ve Prisma dokunmaz.
        kcalGoal: kcalGoal === undefined ? undefined : (kcalGoal === null ? null : Number(kcalGoal)),
        waterGoalL: waterGoalL === undefined ? undefined : (waterGoalL === null ? null : Number(waterGoalL)),
      },
      include: { allergies: true, diseases: true },
    });
    res.json(kullaniciyiDondur(user));
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/me');
  }
});

// ---------------------------------------------------------------------------
// BESİNLER
// ---------------------------------------------------------------------------
/* ──────────────────────────────────────────────────────────────────────────
   KVKK — aydınlatma, açık rıza ve veri silme
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Metinleri arayüze verir. Giriş gerektirmez: aydınlatma yükümlülüğü
 * KVKK m.10 uyarınca "ilgili kişinin talebine veya herhangi bir onaya bağlı
 * olmaksızın" yerine getirilir — yani kayıt olmadan da okunabilmeli.
 */
app.get('/api/kvkk', (_req, res) => {
  res.json({
    surum: KVKK.SURUM,
    surumTarihi: KVKK.SURUM_TARIHI,
    aydinlatma: KVKK.AYDINLATMA,
    acikRiza: KVKK.ACIK_RIZA,
  });
});

/**
 * Mevcut kullanıcıdan onay alır.
 *
 * NİYE GEREKLİ: bu özellik eklenmeden önce kayıt olmuş kullanıcıların onay
 * kaydı yok. Onlardan geriye dönük "onay verdi" saymak KVKK'ya aykırı olurdu;
 * bunun yerine giriş yaptıklarında onay ekranı gösteriliyor.
 * Metin sürümü arttığında da aynı yol işliyor.
 */
app.post('/api/onay', girisGerekli, async (req, res) => {
  try {
    const { aydinlatmaOkundu, acikRiza } = req.body;
    if (aydinlatmaOkundu !== true) {
      return res.status(400).json({ error: 'Aydınlatma metnini okuyup anladığınızı beyan etmeniz gerekiyor.' });
    }
    if (acikRiza !== true) {
      return res.status(400).json({ error: 'Açık rıza verilmeden uygulama kullanılamıyor.' });
    }
    const user = await prisma.user.update({
      where: { id: req.kullanici.id },
      data: {
        aydinlatmaOkunduAt: new Date(),
        acikRizaAt: new Date(),
        rizaSurumu: KVKK.SURUM,
      },
      include: { allergies: true, diseases: true },
    });
    res.json({ user: kullaniciyiDondur(user) });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/onay');
  }
});

/**
 * Hesabı ve BÜTÜN kişisel verileri siler (KVKK m.11/e — silme hakkı;
 * aynı zamanda açık rızanın geri çekilmesinin karşılığı).
 *
 * Şifre tekrar soruluyor: tokenı ele geçiren birinin hesabı silebilmesi
 * kabul edilemez, ve işlem geri alınamaz.
 *
 * Silme sırası önemli: şemada cascade yok, bu yüzden önce çocuk kayıtlar
 * siliniyor. Hepsi TEK transaction içinde — yarıda kalıp "kullanıcı silindi
 * ama tahlilleri durdu" durumu oluşamaz.
 */
/* ──────────────────────────────────────────────────────────────────────────
   VERİLERİMİ İNDİR
   ──────────────────────────────────────────────────────────────────────────

   DAYANAĞI: KVKK m.11, ilgili kişinin "işlenip işlenmediğini öğrenme" ve
   "işlenmişse buna ilişkin bilgi talep etme" hakkı; GDPR m.15 (erişim hakkı) ve
   m.20 (veri taşınabilirliği).

   GDPR m.20 verinin "yapılandırılmış, yaygın olarak kullanılan ve makine
   tarafından okunabilir" bir biçimde verilmesini istiyor — JSON bu üç şartı
   karşılıyor.

   HESABI SİLMEKTEN FARKI VE NİYE İKİSİ BİRDEN GEREKLİ: silme hakkı veriyi
   ortadan kaldırıyor, erişim hakkı ne tutulduğunu gösteriyor. Yalnızca silme
   sunulsa kullanıcı "hakkımda ne var" sorusunu ancak her şeyi kaybederek
   cevaplayabilirdi.

   VERİ ÇÖZÜLEREK VERİLİYOR: dosya kullanıcının kendi verisi, kendi talebiyle,
   kimliği doğrulanmış oturumda iniyor. Şifreli hâliyle vermek hakkı kâğıt
   üzerinde karşılayıp işe yaramaz kılmak olurdu.

   ŞİFRE ÖZETİ VE 2FA ANAHTARI DAHİL EDİLMİYOR: ikisi de kullanıcı hakkında
   bilgi değil, kimlik doğrulama sırrı. Dosyaya konmaları, dosya başkasının
   eline geçtiğinde hesabı ele geçirmeye yarar.
*/
app.get('/api/me/verilerim', girisGerekli, async (req, res) => {
  try {
    const id = req.kullanici.id;
    const [tahliller, kalemler, gunler] = await Promise.all([
      prisma.labResult.findMany({ where: { userId: id }, orderBy: { testDate: 'desc' } }),
      prisma.diaryEntry.findMany({ where: { userId: id }, orderBy: { date: 'desc' } }),
      prisma.diaryDay.findMany({ where: { userId: id }, orderBy: { date: 'desc' } }),
    ]);

    const hazirKalemler = await kalemleriHazirla(kalemler);

    const paket = {
      aciklama: 'Besin Risk Analiz Sistemi — kişisel veri dökümü. Bu dosya '
        + 'hesabınızda saklanan tüm kişisel verileri içerir (KVKK m.11, '
        + 'GDPR m.15 ve m.20).',
      olusturulmaZamani: new Date().toISOString(),
      iceriginDisindaKalanlar: [
        'Şifrenizin bcrypt özeti — kimlik doğrulama sırrıdır, kişisel bilgi değildir.',
        'İki aşamalı doğrulama gizli anahtarı ve yedek kodlarınız — aynı sebeple.',
        'Besin değerleri tablosu — TürKomp kaynaklı genel veridir, size ait değildir.',
      ],
      hesap: {
        ad: req.kullanici.name,
        soyad: req.kullanici.surname,
        ePosta: req.kullanici.email,
        cinsiyet: req.kullanici.gender,
        diyetTercihi: req.kullanici.diet,
        gunlukKaloriHedefi: req.kullanici.kcalGoal,
        gunlukSuHedefiLitre: req.kullanici.waterGoalL,
        kayitTarihi: req.kullanici.createdAt,
        ikiAsamaliDogrulamaAcikMi: req.kullanici.totpEnabled,
      },
      kvkkOnaylari: {
        aydinlatmaOkunduAt: req.kullanici.aydinlatmaOkunduAt,
        acikRizaAt: req.kullanici.acikRizaAt,
        onaylananMetinSurumu: req.kullanici.rizaSurumu,
      },
      hastaliklar: cozVeDenetle(req.kullanici.diseases, 'hastalık', id),
      alerjiler: cozVeDenetle(req.kullanici.allergies, 'alerji', id),
      tahlilSonuclari: tahliller.map(tahliliCoz).map((t) => ({
        tarih: t.testDate,
        test: t.testName,
        deger: t.value,
        birim: t.unit,
        referansAlt: t.refLow,
        referansUst: t.refHigh,
        metinDeger: t.textValue,
        raporYorumu: t.pdfYorumu,
        raporAraligi: t.pdfAralik,
      })),
      gunlukTakipKalemleri: hazirKalemler.map((k) => ({
        tarih: k.date,
        ogun: k.mealType,
        ad: k.food ? k.food.name : (k.label || null),
        besinKaydiBulunamadi: k.besinKayipMi || undefined,
        gram: k.amount,
        kalori: k.kcal,
      })),
      gunlukTakipGunleri: gunler.map((g) => {
        const acik = gunKaydiniCoz(g);
        return { tarih: g.date, yakilanKalori: acik.burnedKcal, suLitre: acik.waterL };
      }),
    };

    const dosyaAdi = `besin-risk-analiz-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${dosyaAdi}"`);
    res.send(JSON.stringify(paket, null, 2));
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/me/verilerim');
  }
});

app.delete('/api/me', girisGerekli, async (req, res) => {
  try {
    const { password } = req.body || {};
    const dogruMu = password
      ? await bcrypt.compare(password, req.kullanici.passwordHash)
      : false;
    if (!dogruMu) {
      return res.status(401).json({ error: 'Hesabı silmek için şifrenizi doğru girmeniz gerekiyor.' });
    }

    const id = req.kullanici.id;
    await prisma.$transaction([
      // Veri tabanı basamağında onDelete: Cascade zaten var; buraya açıkça
      // yazılıyor çünkü silinmesi gereken verinin listesi koddan okunabilir
      // olmalı (KVKK m.7 / GDPR m.17 — silme yükümlülüğünün kapsamı).
      prisma.passwordReset.deleteMany({ where: { userId: id } }),
      prisma.emailVerification.deleteMany({ where: { userId: id } }),
      prisma.labResult.deleteMany({ where: { userId: id } }),
      prisma.diaryEntry.deleteMany({ where: { userId: id } }),
      prisma.diaryDay.deleteMany({ where: { userId: id } }),
      prisma.userAllergy.deleteMany({ where: { userId: id } }),
      prisma.userDisease.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ silindi: true });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/me');
  }
});

app.get('/api/foods', async (req, res) => {
  try {
    const { search = '', category, limit = '60' } = req.query;

    const where = {};
    if (search.trim()) {
      // mode: 'insensitive' -> büyük/küçük harf farkını yok sayar
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }
    if (category && category !== 'Tümü') where.category = category;

    const besinler = await prisma.food.findMany({
      where,
      take: Math.min(Number(limit) || 60, 200),
      orderBy: { name: 'asc' },
    });

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);

    const SIRA = { ALERJEN: 0, DIYET_DISI: 1, RISKLI: 2, DIKKAT: 3, UYGUN: 4 };
    const sonuc = besinler
      .map((b) => ({ ...b, analiz: riskHesapla(b, profil, kurallar) }))
      // Önce güvenli olanlar görünsün diye tersten sıralıyoruz: UYGUN -> ALERJEN
      .sort((a, b) => SIRA[b.analiz.seviye] - SIRA[a.analiz.seviye] || a.name.localeCompare(b.name, 'tr'));

    res.json({ count: sonuc.length, profilKullanildi: Boolean(req.kullanici), foods: sonuc });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/foods');
  }
});

app.get('/api/foods/:id', async (req, res) => {
  try {
    const besin = await prisma.food.findUnique({ where: { id: Number(req.params.id) } });
    if (!besin) return res.status(404).json({ error: 'Besin bulunamadı.' });

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);
    res.json({
      ...besin,
      analiz: riskHesapla(besin, profil, kurallar),
      // Risk seviyesinden BAĞIMSIZ, ayrı bir bilgi bloğu. Girişsiz kullanıcıda
      // ya da tahlili olmayanda null döner, kart o bölümü hiç çizmez.
      tahlil: await tahlilBulgulariGetir(besin, req.kullanici),
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/foods/:id');
  }
});

// Arayüzün ihtiyaç duyduğu listeler (kategoriler, hastalıklar, alerjenler)
app.get('/api/meta', async (_req, res) => {
  try {
    const kategoriler = await prisma.food.groupBy({ by: ['category'], _count: true });
    const kurallar = await kurallariGetir();
    res.json({
      categories: kategoriler
        .map((k) => ({ name: k.category, count: k._count }))
        .sort((a, b) => b.count - a.count),
      diseases: kurallar.hastaliklar.map((h) => ({
        key: h.key, name: h.name, icon: h.icon, note: h.note,
        evaluable: !h.degerlendirilemez,
      })),
      allergens: Object.entries(ALERJENLER).map(([key, name]) => ({ key, name })),
      diets: Object.keys(DIYETLER),
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/meta');
  }
});

// ---------------------------------------------------------------------------
// GÜNLÜK TAKİP
// ---------------------------------------------------------------------------
// Veri iki tabloda:
//   DiaryEntry -> öğüne eklenen tek tek kalemler (besin seçerek ya da serbest)
//   DiaryDay   -> öğüne bağlı olmayan günlük değerler (yakılan kalori, su)
//
// TARİH NEDEN METİN OLARAK GİDİP GELİYOR: istemci ile sunucu farklı saat
// diliminde olabilir ve `new Date()` ile kurulan bir zaman damgası günü
// kaydırabilir (23:30'da girilen kayıt ertesi güne düşebilir). Bu yüzden API
// yalnızca "YYYY-AA-GG" biçiminde GÜN alıyor ve veritabanına @db.Date olarak
// yazıyor; saat hiç işin içine girmiyor.

const GUN_KALIBI = /^\d{4}-\d{2}-\d{2}$/;
const OGUNLER = ['kahvalti', 'ogle', 'aksam', 'ara'];

/** "2026-10-03" -> Date (UTC gece yarısı). Geçersizse null. */
function gunuCoz(metin) {
  if (!GUN_KALIBI.test(metin || '')) return null;
  const d = new Date(`${metin}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> "2026-10-03" */
function gunuYaz(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * Şifreli kalem satırlarını arayüze hazır hâle getirir.
 *
 * ÜÇ ADIM: çöz -> besin kimliklerini topla -> besinleri TEK sorguda getir.
 * Besin kimliği şifreli olduğu için Prisma `include: { food: true }`
 * yapamıyor; bağ uygulama tarafında kuruluyor. Tek tek sorgulamak bir günde
 * 10 kalem için 10 sorgu demek olurdu (N+1), bu yüzden toplu getiriliyor.
 */
async function kalemleriHazirla(satirlar) {
  const cozulmus = satirlar.map(kalemiCoz);
  const kimlikler = gunluk.besinKimlikleri(cozulmus);
  if (!kimlikler.length) return gunluk.besinleriBagla(cozulmus, new Map());

  const besinler = await prisma.food.findMany({ where: { id: { in: kimlikler } } });
  return gunluk.besinleriBagla(cozulmus, new Map(besinler.map((b) => [b.id, b])));
}

// --- Bir günün tamamı ------------------------------------------------------
app.get('/api/diary/:gun', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const [kalemler, gunKaydi] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { userId: req.kullanici.id, date: gun },
        orderBy: { id: 'asc' },
      }),
      prisma.diaryDay.findUnique({
        where: { userId_date: { userId: req.kullanici.id, date: gun } },
      }),
    ]);

    const cozulmus = await kalemleriHazirla(kalemler);
    const gunDegerleri = gunKaydiniCoz(gunKaydi);
    const alinan = cozulmus.reduce((t, k) => t + k.kcal, 0);
    const yakilan = gunDegerleri.burnedKcal;

    res.json({
      gun: req.params.gun,
      kalemler: cozulmus.map(kalemiDondur),
      alinanKcal: Math.round(alinan),
      yakilanKcal: Math.round(yakilan),
      netKcal: Math.round(alinan - yakilan),
      suL: gunDegerleri.waterL,
      hedefler: {
        kcal: req.kullanici.kcalGoal,
        suL: req.kullanici.waterGoalL,
      },
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/:gun');
  }
});

// --- Öğüne kalem ekle ------------------------------------------------------
app.post('/api/diary/:gun/kalem', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const {
      mealType, foodId, amount, adet, label, kcal,
    } = req.body;
    if (!OGUNLER.includes(mealType)) {
      return res.status(400).json({ error: `Öğün şunlardan biri olmalı: ${OGUNLER.join(', ')}` });
    }

    let kayit;
    if (foodId) {
      // BESİN SEÇEREK: kaloriyi biz hesaplıyoruz, istemciye güvenmiyoruz.
      const besin = await prisma.food.findUnique({ where: { id: Number(foodId) } });
      if (!besin) return res.status(404).json({ error: 'Besin bulunamadı.' });
      // Miktar iki şekilde gelebilir: ADET (kaç porsiyon — arayüzün kullandığı)
      // ya da doğrudan GRAM. Adet verilmişse porsiyon gramıyla çarpıyoruz.
      let gram;
      if (Number(adet) > 0) {
        gram = besin.portionGrams * Number(adet);
      } else if (Number(amount) > 0) {
        gram = Number(amount);
      } else {
        gram = besin.portionGrams;
      }
      kayit = {
        foodRef: kripto.sayiSifrele(besin.id),
        amount: kripto.sayiSifrele(gram),
        label: null,
        // yuvarlanmıyor, bkz. kalemiDondur
        kcal: kripto.sayiSifrele((besin.kcal * gram) / 100),
      };
    } else {
      // SERBEST GİRİŞ
      const sayi = Number(kcal);
      if (!(sayi > 0)) return res.status(400).json({ error: 'Kalori sıfırdan büyük olmalı.' });
      kayit = {
        foodRef: null,
        amount: null,
        label: kripto.sifrele((label || '').trim() || 'Serbest giriş'),
        kcal: kripto.sayiSifrele(Math.round(sayi)),
      };
    }

    const olusan = await prisma.diaryEntry.create({
      data: { ...kayit, mealType, date: gun, userId: req.kullanici.id },
    });
    const [hazir] = await kalemleriHazirla([olusan]);
    res.status(201).json(kalemiDondur(hazir));
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/:gun/kalem');
  }
});

// --- Kalemin adedini değiştir ----------------------------------------------
// Yalnızca besin seçerek eklenen kalemler için: "2 dilim yerine 3 dilim".
//
// KALORİ YENİDEN HESAPLANMIYOR, ORANLANIYOR. Kayıttaki kalori giriş anında
// dondurulmuştu (geçmiş kaydı değişmesin diye); adet iki katına çıkınca o
// dondurulmuş değeri iki katına çıkarıyoruz. Besnin güncel değerinden yeniden
// hesaplasaydık, TürKomp verisi düzeltildiğinde dünkü kayıt da değişirdi.
app.put('/api/diary/kalem/:id', girisGerekli, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const yeniAdet = Number(req.body.adet);
    if (!(yeniAdet > 0)) return res.status(400).json({ error: 'Adet sıfırdan büyük olmalı.' });
    if (yeniAdet > 50) return res.status(400).json({ error: 'Adet en fazla 50 olabilir.' });

    const kalem = await prisma.diaryEntry.findFirst({
      where: { id, userId: req.kullanici.id },
    });
    if (!kalem) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    const [acik] = await kalemleriHazirla([kalem]);
    if (!acik.food || !acik.amount) {
      // Besin kaydı bulunamadıysa da buraya düşüyor: porsiyon gramını
      // bilmeden adet oranlanamaz.
      return res.status(400).json({ error: 'Serbest girişlerde adet değiştirilemez; silip yeniden ekleyin.' });
    }

    const eskiAdet = acik.amount / acik.food.portionGrams;
    const oran = yeniAdet / eskiAdet;

    const guncel = await prisma.diaryEntry.update({
      where: { id },
      data: {
        amount: kripto.sayiSifrele(acik.food.portionGrams * yeniAdet),
        // yuvarlanmıyor, bkz. kalemiDondur
        kcal: kripto.sayiSifrele(acik.kcal * oran),
      },
    });
    const [yeni] = await kalemleriHazirla([guncel]);
    res.json(kalemiDondur(yeni));
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/kalem/:id');
  }
});

// --- Kalem sil -------------------------------------------------------------
app.delete('/api/diary/kalem/:id', girisGerekli, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // Başkasının kaydını silmeyi engelle: userId koşulu deleteMany ile veriliyor.
    const sonuc = await prisma.diaryEntry.deleteMany({
      where: { id, userId: req.kullanici.id },
    });
    if (sonuc.count === 0) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json({ silindi: id });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/kalem/:id');
  }
});

// --- Günün yakılan kalorisi / suyu -----------------------------------------
app.put('/api/diary/:gun', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const { burnedKcal, waterL } = req.body;
    const veri = {};
    if (burnedKcal !== undefined) {
      veri.burnedKcal = kripto.sayiSifrele(Math.max(0, Number(burnedKcal) || 0));
    }
    if (waterL !== undefined) {
      veri.waterL = kripto.sayiSifrele(Math.max(0, Number(waterL) || 0));
    }

    const kayit = await prisma.diaryDay.upsert({
      where: { userId_date: { userId: req.kullanici.id, date: gun } },
      update: veri,
      create: { userId: req.kullanici.id, date: gun, ...veri },
    });
    const acikGun = gunKaydiniCoz(kayit);
    res.json({ gun: req.params.gun, yakilanKcal: acikGun.burnedKcal, suL: acikGun.waterL });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/:gun');
  }
});

// --- Takvim: bir ayın günlük özetleri --------------------------------------
// Takvimdeki her gün hücresinde üç halka var: alınan kalori, yakılan kalori, su.
// Bu uç nokta 31 ayrı istek atılmasın diye ayın tamamını tek seferde veriyor.
app.get('/api/diary/ay/:yilAy', girisGerekli, async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}$/.test(req.params.yilAy)) {
      return res.status(400).json({ error: 'Ay "YYYY-AA" biçiminde olmalı.' });
    }
    const [yil, ay] = req.params.yilAy.split('-').map(Number);
    const bas = new Date(Date.UTC(yil, ay - 1, 1));
    const son = new Date(Date.UTC(yil, ay, 1));

    const [kalemler, gunler] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { userId: req.kullanici.id, date: { gte: bas, lt: son } },
        select: { date: true, kcal: true },
      }),
      prisma.diaryDay.findMany({
        where: { userId: req.kullanici.id, date: { gte: bas, lt: son } },
      }),
    ]);

    const harita = new Map();
    const al = (d) => {
      const anahtar = gunuYaz(d);
      if (!harita.has(anahtar)) {
        harita.set(anahtar, { gun: anahtar, alinanKcal: 0, yakilanKcal: 0, suL: 0 });
      }
      return harita.get(anahtar);
    };
    kalemler.forEach((k) => { al(k.date).alinanKcal += (kripto.sayiCoz(k.kcal) || 0); });
    gunler.forEach((g) => {
      const o = al(g.date);
      const acik = gunKaydiniCoz(g);
      o.yakilanKcal = acik.burnedKcal;
      o.suL = acik.waterL;
    });

    res.json({
      ay: req.params.yilAy,
      gunler: [...harita.values()].sort((a, b) => a.gun.localeCompare(b.gun)),
      hedefler: { kcal: req.kullanici.kcalGoal, suL: req.kullanici.waterGoalL },
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/diary/ay/:yilAy');
  }
});

// ---------------------------------------------------------------------------
// TAHLİL SONUÇLARI
// ---------------------------------------------------------------------------
// İKİ AŞAMALI: önce PDF okunur ve sonuçlar KULLANICIYA GÖSTERİLİR, kullanıcı
// onaylayınca kaydedilir. Doğrudan kaydetmiyoruz çünkü ayrıştırıcı yanlış
// okuyabilir ve kullanıcı düzeltebilmeli. Bu adım aynı zamanda uygulamanın
// "teşhis koymadığının" da güvencesi: kaydedilen şey kullanıcının onayladığı
// kendi verisi.
//
// EŞİK NEREDEN GELİYOR: tamamen PDF'ten. Laboratuvarın kendi referans aralığı
// ve kendi kademe sınıflaması kullanılıyor; bizim koyduğumuz bir eşik yok.
// Gerekçe: kullanıcı kendi raporunda o aralığı görüyor.

const { tahlilAyristir, pdfYorumu } = require('./tahlil_ayristir');

// PDF ham gövde olarak geliyor (base64 şişirmesi ve ek paket olmasın diye).
// BOYUT SINIRI 3 MB.
//
// GEÇMİŞİ: 15 MB'tı, savunulacak gerekçesi yoktu. Önce 2 MB'a çekildi, sonra
// 3 MB'a çıkarıldı.
//
// NİYE 2 DEĞİL 3: elimizdeki e-Nabız raporları 0,17-0,18 MB, ama bu ölçü tek
// bir rapor biçiminden geliyor. Yıllara yayılmış çok sayıda test içeren bir
// rapor, gömülü yazı tipi taşıyan bir çıktı ya da başka bir laboratuvarın
// biçimi daha büyük olabilir. YANLIŞ TARAFA DÜŞMENİN BEDELİ ASİMETRİK:
// sınır fazla darsa meşru raporu olan kullanıcı dosyasını hiç yükleyemez
// (ve nedenini anlamaz); sınır biraz genişse kaybedilen şey yok, çünkü asıl
// korumalar boyut değil (aşağıya bakın). Bu yüzden pay bırakıldı.
//
// BOYUT ASIL KORUMA DEĞİL. Dosya boyutu ayrıştırmanın maliyetini söylemiyor:
// sıkıştırılmış küçük bir PDF binlerce sayfa açabilir. Gerçek korumalar
// src/tahlil_ayristir.js içinde: SAYFA SINIRI (40) ve ZAMAN AŞIMI (15 sn).
// Boyut sınırı yalnızca ağı ve belleği boşa harcamamak için kaba bir süzgeç.
const PDF_SINIRI = '3mb';
const pdfGovdesi = express.raw({ type: 'application/pdf', limit: PDF_SINIRI });

/** "03.06.2026" -> Date (UTC gece yarısı) */
function tarihiCoz(metin) {
  const m = String(metin || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

// --- 1. aşama: PDF'i oku, KAYDETME ----------------------------------------
app.post('/api/lab/oku', girisGerekli, pdfSinirlayici, pdfGovdesi, async (req, res) => {
  try {
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'PDF gövdesi boş. Content-Type: application/pdf olmalı.' });
    }
    const sonuc = await tahlilAyristir(req.body);
    const testler = sonuc.testler.map((t) => {
      const y = pdfYorumu(t);
      return {
        testName: t.ad,
        value: t.deger,
        valueOp: t.islec,
        textValue: t.metinDeger,
        unit: t.birim || null,
        refLow: t.refAlt,
        refHigh: t.refUst,
        pdfYorumu: y ? y.etiket : null,
        pdfAralik: y ? y.aralik : null,
        siniflar: t.siniflar,
      };
    });
    res.json({ tarih: sonuc.tarih, testler, uyarilar: sonuc.uyarilar });
  } catch (hata) {
    // pdfjs'in iç hata metni kullanıcıya bir şey anlatmıyor, ama dosya
    // yapısı hakkında bilgi sızdırabiliyor. Günlüğe yazılıyor, dışarı genel
    // mesaj gidiyor.
    console.error('[HATA] /api/lab/oku:', hata);
    // Sayfa sınırı ve zaman aşımı kullanıcının DÜZELTEBİLECEĞİ durumlar;
    // genel "okunamadı" mesajına gömülürse kullanıcı neyi deneyeceğini
    // bilemez. Bu iki mesaj dosya yapısı hakkında bilgi sızdırmıyor.
    const m = String(hata && hata.message);
    if (m.includes('sayfa okunabiliyor') || m.includes('zaman aşımına')) {
      return res.status(400).json({
        error: `${m} Yalnızca tahlil sonuçlarını içeren sayfaları ayırıp yüklemeyi deneyin.`,
      });
    }
    res.status(400).json({
      error: 'PDF okunamadı. Dosyanın e-Nabız tahlil raporu olduğundan ve bozuk olmadığından emin olun.',
    });
  }
});

// --- 2. aşama: kullanıcının onayladığını kaydet ----------------------------
app.post('/api/lab', girisGerekli, async (req, res) => {
  try {
    const { tarih, testler } = req.body;
    const testDate = tarihiCoz(tarih) || new Date();
    if (!Array.isArray(testler) || testler.length === 0) {
      return res.status(400).json({ error: 'Kaydedilecek test yok.' });
    }
    // Aynı tarihin önceki kaydı varsa değiştiriliyor: kullanıcı düzeltip
    // yeniden gönderdiğinde iki kopya kalmasın.
    await prisma.labResult.deleteMany({ where: { userId: req.kullanici.id, testDate } });
    await prisma.labResult.createMany({
      data: testler.map((t) => ({
        userId: req.kullanici.id,
        testDate,
        // Hepsi şifreli yazılıyor (KVKK 2018/10). userId ve testDate hariç —
        // sorgular onların üzerinden yürüyor.
        testName: kripto.sifrele(String(t.testName || '').slice(0, 120)),
        value: kripto.sayiSifrele(t.value),
        unit: kripto.sifrele(t.unit || null),
        valueOp: kripto.sifrele(t.valueOp || null),
        textValue: kripto.sifrele(t.textValue || null),
        refLow: kripto.sayiSifrele(t.refLow),
        refHigh: kripto.sayiSifrele(t.refHigh),
        pdfYorumu: kripto.sifrele(t.pdfYorumu || null),
        pdfAralik: kripto.sifrele(t.pdfAralik || null),
      })),
    });
    // SIRALAMA ARTIK BELLEKTE: testName şifreli olduğu için veritabanı
    // sıralaması anlamsız sonuç verirdi (şifreli metne göre alfabetik).
    const kayitli = (await prisma.labResult.findMany({
      where: { userId: req.kullanici.id, testDate },
    })).map(tahliliCoz).sort((a, b) => (a.testName || '').localeCompare(b.testName || '', 'tr'));
    res.status(201).json({ tarih, kaydedilen: kayitli.length, testler: kayitli });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/lab');
  }
});

// ---------------------------------------------------------------------------
// TAHLİLDEN BESİN ÖNERİSİ
// ---------------------------------------------------------------------------
// NE YAPIYOR: laboratuvarın "düşük" dediği bir değer için, veri tabanındaki
// o besin öğesinden en zengin besinleri PORSİYON başına sıralayıp gösteriyor.
//
// NE YAPMIYOR: teşhis koymuyor, "şunu ye" demiyor, hastalık profiline
// dokunmuyor. Cümle kuruluşu bilgi veriyor, talimat vermiyor.
//
// EŞLEŞTİRMENİN DAYANAĞI: her satır bir KANAMA noktası değil, tanım gereği
// bağ. Ferritin demir deposu proteinidir — WHO kılavuzunun adı birebir
// "use of ferritin concentrations to assess iron status". Yani "ferritin
// düşükse demir açısından zengin besinler" bağı bizim çıkarımımız değil,
// testin ne ölçtüğünün tanımı.
//
// EŞİK YOK: hangi değerin düşük olduğuna PDF karar veriyor. Buradaki tek iş
// "düşük" denen testi bir besin öğesine bağlamak.
//
// Kan yağları (LDL, HDL, trigliserid) BİLEREK listede yok: onlar yenen bir
// besin öğesi değil, vücudun ürettiği taşıyıcılar. Yağ kalitesi zaten
// kolesterol hastalık kurallarında ele alınıyor.
const TAHLIL_BESIN_ESLESMESI = [
  { desen: /ferritin/i,            alan: 'ironMg',       ad: 'demir',        birim: 'mg',
    not: 'Ferritin, vücudun demir deposunu taşıyan proteindir; WHO kılavuzu bu testi demir durumunu değerlendirmek için tanımlıyor.' },
  { desen: /^hgb$|hemoglobin/i,    alan: 'ironMg',       ad: 'demir',        birim: 'mg',
    not: 'Hemoglobin demir içeren bir proteindir.' },
  { desen: /demir \(serum\)|^demir$/i, alan: 'ironMg',   ad: 'demir',        birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /b12/i,                 alan: 'vitaminB12Ug', ad: 'B12 vitamini', birim: 'µg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /folat|folik/i,         alan: 'folateUg',     ad: 'folat',        birim: 'µg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /kalsiyum/i,            alan: 'calciumMg',    ad: 'kalsiyum',     birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /magnezyum/i,           alan: 'magnesiumMg',  ad: 'magnezyum',    birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /potasyum/i,            alan: 'potassiumMg',  ad: 'potasyum',     birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /çinko|zinc/i,          alan: 'zincMg',       ad: 'çinko',        birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
];

/**
 * Besin kartı için tahlil bulgusu.
 *
 * NE YAPAR: kullanıcının EN SON tahlilinde laboratuvarın aralığının ALTINDA
 * kalan değerleri alır, karşılık geldiği besin ögesini bu besinde arar ve
 * besnin veri tabanındaki SIRASINI söyler.
 *
 * NİYE SIRA, NİYE "iyi kaynak" DEĞİL: "bu besin demir açısından iyi bir
 * kaynaktır" demek için kaynaklı bir eşik gerekir ve elimizde yok. Sıra
 * uydurma değil, kendi veri tabanımız hakkında bir olgu: "ölçümü olan 142
 * besin içinde 5." İyi mi kötü mü olduğuna kullanıcı kendisi karar verir.
 *
 * NE YAPMAZ: risk seviyesini DEĞİŞTİRMEZ. Tahlil bir teşhis değil, profil
 * değişikliği hiç değil. Bu bilgi kartta ayrı bir bölümde, kendi başına durur.
 */
async function tahlilBulgulariGetir(besin, kullanici) {
  if (!kullanici) return null;

  const hepsi = (await prisma.labResult.findMany({
    where: { userId: kullanici.id },
    orderBy: { testDate: 'desc' },   // tarih şifresiz, sıralanabiliyor
  })).map(tahliliCoz);
  if (!hepsi.length) return null;

  // Yalnızca EN SON tahlil: eski bir sonuca göre bilgi vermek yanıltıcı olur.
  const sonTarih = hepsi[0].testDate.getTime();
  const dusukler = hepsi.filter(
    (t) => t.testDate.getTime() === sonTarih && t.pdfYorumu === 'düşük' && t.value !== null,
  );
  if (!dusukler.length) return null;

  const bulgular = [];
  // Ferritin ve hemoglobin ikisi de demire bakıyor; kartta demiri iki kez
  // yazmanın anlamı yok.
  const gorulen = new Set();

  for (const test of dusukler) {
    const esleme = TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(test.testName));
    if (!esleme || gorulen.has(esleme.alan)) continue;
    gorulen.add(esleme.alan);

    const ham = besin[esleme.alan];
    const porsiyonda = (ham === null || ham === undefined || !besin.portionGrams)
      ? null
      : (ham * besin.portionGrams) / 100;

    // Sıra YALNIZCA ölçümü olan besinler arasında. Ölçülmemiş besni "sıfır"
    // sayıp sona koymak, "ölçülmedi" ile "ölçüldü, sıfır çıktı"yı birbirine
    // karıştırmak olurdu — projede tekrar tekrar kaçındığımız hata.
    const olculenler = await prisma.food.findMany({
      where: { [esleme.alan]: { not: null }, portionGrams: { gt: 0 } },
      select: { portionGrams: true, [esleme.alan]: true },
    });
    const skorlar = olculenler.map((b) => (b[esleme.alan] * b.portionGrams) / 100);

    bulgular.push({
      test: test.testName,
      deger: test.value,
      birim: test.unit,
      refAlt: test.refLow,
      refUst: test.refHigh,
      besinOgesi: esleme.ad,
      besinOgesiBirimi: esleme.birim,
      eslesmeNotu: esleme.not,
      porsiyonda: porsiyonda === null ? null : Math.round(porsiyonda * 100) / 100,
      sira: porsiyonda === null ? null : skorlar.filter((x) => x > porsiyonda).length + 1,
      olculenSayisi: olculenler.length,
    });
  }

  if (!bulgular.length) return null;
  return { tarih: hepsi[0].testDate.toISOString().slice(0, 10), bulgular };
}

app.get('/api/lab/oneriler', girisGerekli, async (req, res) => {
  try {
    const hepsi = (await prisma.labResult.findMany({
      where: { userId: req.kullanici.id },
      orderBy: { testDate: 'desc' },
    })).map(tahliliCoz);
    if (!hepsi.length) return res.json({ tarih: null, oneriler: [] });

    // Yalnızca EN SON tahlil: eski bir sonuca göre öneri vermek yanıltıcı olur.
    const sonTarih = hepsi[0].testDate.getTime();
    const sonTahlil = hepsi.filter((t) => t.testDate.getTime() === sonTarih);

    // "düşük" yalnızca PDF'in kendi aralığından gelen etikettir.
    const dusukler = sonTahlil.filter((t) => t.pdfYorumu === 'düşük' && t.value !== null);

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);
    const besinler = await prisma.food.findMany();

    const oneriler = [];
    for (const test of dusukler) {
      const esleme = TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(test.testName));
      if (!esleme) continue;

      const sirali = besinler
        .filter((b) => b[esleme.alan] !== null && b[esleme.alan] !== undefined && b.portionGrams > 0)
        .map((b) => ({
          besin: b,
          porsiyonda: (b[esleme.alan] * b.portionGrams) / 100,
          analiz: riskHesapla(b, profil, kurallar),
        }))
        // Alerjen olanlar HİÇ gösterilmiyor: alerji mutlak bir sınır.
        // Diğerleri gösteriliyor ama seviyesiyle birlikte — gizlemek yerine söylemek.
        .filter((x) => x.analiz.seviye !== 'ALERJEN' && x.porsiyonda > 0)
        .sort((a, b) => b.porsiyonda - a.porsiyonda)
        .slice(0, 6);

      oneriler.push({
        test: test.testName,
        deger: test.value,
        birim: test.unit,
        refAlt: test.refLow,
        refUst: test.refHigh,
        besinOgesi: esleme.ad,
        besinOgesiBirimi: esleme.birim,
        eslesmeNotu: esleme.not,
        besinler: sirali.map((x) => ({
          id: x.besin.id,
          name: x.besin.name,
          icon: x.besin.icon,
          portionName: x.besin.portionName,
          miktar: Math.round(x.porsiyonda * 100) / 100,
          seviye: x.analiz.seviye,
        })),
      });
    }

    res.json({
      tarih: hepsi[0].testDate.toISOString().slice(0, 10),
      oneriler,
      // Eşlemesi olmayan düşük sonuçlar: kullanıcı "ferritin düşük ama bir şey
      // yazmamış" diye düşünmesin, neden olmadığını bilsin.
      eslesmeyen: dusukler
        .filter((t) => !TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(t.testName)))
        .map((t) => t.testName),
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/lab/oneriler');
  }
});

// --- Kayıtlı tahliller -----------------------------------------------------
app.get('/api/lab', girisGerekli, async (req, res) => {
  try {
    // testName şifreli olduğu için ona göre veritabanı sıralaması anlamsız;
    // çözdükten sonra bellekte sıralıyoruz.
    const hepsi = (await prisma.labResult.findMany({
      where: { userId: req.kullanici.id },
      orderBy: { testDate: 'desc' },
    })).map(tahliliCoz)
      .sort((a, b) => (b.testDate - a.testDate)
        || (a.testName || '').localeCompare(b.testName || '', 'tr'));
    // Tarihe göre grupla: arayüz "03.06.2026 tahlili" diye gösteriyor
    const gruplar = new Map();
    hepsi.forEach((t) => {
      const g = t.testDate.toISOString().slice(0, 10);
      if (!gruplar.has(g)) gruplar.set(g, []);
      gruplar.get(g).push(t);
    });
    res.json({
      tahliller: [...gruplar.entries()].map(([tarih, testler]) => ({
        tarih,
        testler,
        araliginDisinda: testler.filter(
          (t) => t.pdfYorumu && !['normal', 'Normal', 'Optimum', 'Risk yok'].includes(t.pdfYorumu),
        ).length,
      })),
    });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/lab');
  }
});

// --- Bir tahlil gününü sil -------------------------------------------------
app.delete('/api/lab/:tarih', girisGerekli, async (req, res) => {
  try {
    const d = new Date(`${req.params.tarih}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Tarih geçersiz.' });
    const sonuc = await prisma.labResult.deleteMany({
      where: { userId: req.kullanici.id, testDate: d },
    });
    res.json({ silinen: sonuc.count });
  } catch (hata) {
    sunucuHatasi(res, hata, '/api/lab/:tarih');
  }
});

app.get('/', (_req, res) => {
  res.json({
    mesaj: 'Besin Risk Analiz Sistemi API çalışıyor.',
    uyari: 'Bu sistem bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.',
    kaynak: 'TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0 (https://turkomp.tarimorman.gov.tr/)',
  });
});

// --- Hata ara katmanı ------------------------------------------------------
// EN SONDA OLMALI: Express hata ara katmanlarını tanımlanma sırasına göre
// çalıştırıyor, dört parametreli olduğu için hata yakalayıcı sayılıyor.
//
// Niye var: boyut sınırı aşıldığında hatayı body-parser uç noktaya girmeden
// fırlatıyor, yani uç noktadaki try/catch bunu hiç görmüyor. Karşılamazsak
// Express öntanımlı HTML sayfası dönüyor; arayüz onu JSON sanıp çözemiyor ve
// kullanıcı "beklenmeyen karakter" gibi anlamsız bir hata görüyor.
app.use((hata, _req, res, _next) => {
  if (hata && (hata.type === 'entity.too.large' || hata.status === 413)) {
    return res.status(413).json({
      error: `Dosya çok büyük. En fazla ${PDF_SINIRI.toUpperCase()} olabilir. `
        + 'e-Nabız tahlil raporları genelde 1 MB\'ın altındadır.',
    });
  }
  if (hata && (hata.type === 'entity.parse.failed' || hata.status === 400)) {
    return res.status(400).json({ error: 'İstek gövdesi okunamadı.' });
  }
  return sunucuHatasi(res, hata, 'ara katman');
});

app.listen(PORT, () => {
  console.log(`API çalışıyor: http://localhost:${PORT}`);
  // Posta yapılandırılmamışsa bunu BAŞLANGIÇTA söylemek gerekiyor. Aksi hâlde
  // yayına alındığında "şifremi unuttum" sessizce işlemez: kullanıcı ekranda
  // "bağlantı gönderildi" görür ama postası hiç gelmez.
  if (!eposta.yapilandirildiMi()) {
    console.warn(
      '[POSTA] Yapılandırılmamış (MAIL_KULLANICI / MAIL_SIFRE yok).\n'
      + '[POSTA] Şifre sıfırlama bağlantıları gönderilmeyecek, bu terminale yazılacak.\n'
      + '[POSTA] Yayına alırken .env.example dosyasındaki adımları uygulayın.',
    );
  }
});
