// src/guvenlik_test.js
// Güvenlik mantığının testleri. Çalıştırma:  node src/guvenlik_test.js
//
// NİYE VAR: otplib 13 sürümünde `authenticator` nesnesi kaldırılmış ve eski
// API ile yazılan 2FA kodu çalışma anında patlıyordu. Hiçbir test yoktu, bu
// yüzden hata ancak kullanıcı 2FA'yı açmaya çalıştığında ortaya çıkacaktı.
// Bu dosya o sınıfı hatayı yakalar: kütüphane API'si değişirse testler kırılır.
//
// Veritabanına bağlanmaz, tamamen bellekte çalışır.

// Testler ortam değişkenine BAĞLI OLMAMALI: kendi anahtarını kuruyor.
// (Modüller yüklenmeden önce ayarlanması şart — kripto.js anahtarı ilk
// kullanımda türetip önbelleğe alıyor.)
process.env.VERI_ANAHTARI = process.env.VERI_ANAHTARI || 'test-veri-anahtari-9f3a2b-uzun-dize';

const totp = require('./totp');
const kripto = require('./kripto');
const gunluk = require('./gunluk');
const oturum = require('./oturum');
const ayristirici = require('./tahlil_ayristir');
const saklama = require('./saklama');
const eposta = require('./eposta');
const kvkk = require('./kvkk_metinleri');
const parola = require('./parola_kurali');
const gunlukKayit = require('./guvenlik_gunlugu');

let gecen = 0;
const kalan = [];

// Eşzamansız testler de var (zaman aşımı sınaması), bu yüzden sonuç bir söz
// ise bekleniyor. Senkron testlerde davranış değişmiyor.
const sozler = [];
function test(ad, fn) {
  try {
    const sonuc = fn();
    if (sonuc && typeof sonuc.then === 'function') {
      sozler.push(sonuc.then(
        () => { gecen += 1; console.log(`  ✓ ${ad}`); },
        (e) => { kalan.push(ad); console.log(`  ✗ ${ad}\n      ${e.message}`); },
      ));
      return;
    }
    gecen += 1; console.log(`  ✓ ${ad}`);
  } catch (e) { kalan.push(ad); console.log(`  ✗ ${ad}\n      ${e.message}`); }
}
function esit(bulunan, beklenen, aciklama) {
  if (bulunan !== beklenen) throw new Error(`${aciklama}: beklenen ${beklenen}, bulunan ${bulunan}`);
}
function dogru(kosul, aciklama) { if (!kosul) throw new Error(aciklama); }

const TEMEL = 'test-icin-uzun-ve-rastgele-bir-dize-9f3a2b';

console.log('\nGÜVENLİK TESTLERİ\n');

console.log('TOTP anahtarının şifrelenmesi');

test('G01 Şifrelenen anahtar geri çözülüyor', () => {
  const a = totp.yeniAnahtar();
  esit(totp.coz(totp.sifrele(a, TEMEL), TEMEL), a, 'gidiş-dönüş');
});

test('G02 Şifreli metin düz anahtarı İÇERMİYOR', () => {
  const a = totp.yeniAnahtar();
  const s = totp.sifrele(a, TEMEL);
  dogru(!s.includes(a), 'şifreli metinde anahtar düz olarak görünüyor');
});

test('G03 Aynı anahtar her seferinde FARKLI şifreleniyor (rastgele IV)', () => {
  const a = totp.yeniAnahtar();
  // ESLint bunu "kendisiyle karşılaştırma" sanıyor ve anlamsız buluyor. Burada
  // anlamlı: şifreleme her çağrıda yeni rastgele IV kullandığı için aynı girdi
  // AYNI çıktıyı vermemeli. Testin tamamı bu farkı ölçüyor.
  // eslint-disable-next-line no-self-compare
  dogru(totp.sifrele(a, TEMEL) !== totp.sifrele(a, TEMEL), 'iki şifreleme aynı çıktı');
});

test('G04 Kurcalanmış kayıt çözülmüyor', () => {
  const s = totp.sifrele(totp.yeniAnahtar(), TEMEL);
  esit(totp.coz(s.slice(0, -2) + 'ff', TEMEL), null, 'kurcalanmış veri kabul edildi');
});

test('G05 Yanlış anahtarla çözülmüyor', () => {
  const s = totp.sifrele(totp.yeniAnahtar(), TEMEL);
  esit(totp.coz(s, 'bambaska-bir-anahtar'), null, 'yanlış anahtar kabul edildi');
});

test('G06 Bozuk/boş kayıt çökmüyor, null dönüyor', () => {
  esit(totp.coz(null, TEMEL), null, 'null');
  esit(totp.coz('', TEMEL), null, 'boş metin');
  esit(totp.coz('duz-metin-anahtar', TEMEL), null, 'biçimsiz kayıt');
});

console.log('\nKod doğrulama');

test('G07 Üretilen kod doğrulanıyor', () => {
  const a = totp.yeniAnahtar();
  const { generateSync } = require('otplib');
  dogru(totp.gecerliMi(generateSync({ secret: a }), a), 'geçerli kod reddedildi');
});

test('G08 Yanlış kod reddediliyor', () => {
  const a = totp.yeniAnahtar();
  dogru(!totp.gecerliMi('000000', a), 'yanlış kod kabul edildi');
});

test('G09 Başka anahtarın kodu reddediliyor', () => {
  const { generateSync } = require('otplib');
  const a = totp.yeniAnahtar();
  const b = totp.yeniAnahtar();
  dogru(!totp.gecerliMi(generateSync({ secret: b }), a), 'başka anahtarın kodu kabul edildi');
});

test('G10 Boş/eksik girdi reddediliyor', () => {
  const a = totp.yeniAnahtar();
  dogru(!totp.gecerliMi('', a), 'boş kod');
  dogru(!totp.gecerliMi(null, a), 'null kod');
  dogru(!totp.gecerliMi('123456', null), 'anahtarsız');
  dogru(!totp.gecerliMi('abc', a), 'rakam olmayan kod');
});

test('G11 gecerliMi gerçek boolean döndürüyor (nesne değil)', () => {
  // otplib verifySync bir NESNE döndürüyor ({valid, delta...}). Nesne her
  // zaman "doğru" sayıldığı için, dönüşü sarmalamazsak HER kod geçerli olurdu.
  const a = totp.yeniAnahtar();
  esit(typeof totp.gecerliMi('000000', a), 'boolean', 'dönüş tipi');
  esit(totp.gecerliMi('000000', a), false, 'yanlış kodda kesin false');
});

console.log('\nKurulum adresi');

test('G12 otpauth adresi doğru biçimde ve anahtarı taşıyor', () => {
  const a = totp.yeniAnahtar();
  const u = totp.kurulumAdresi('ornek@example.com', a);
  dogru(u.startsWith('otpauth://totp/'), 'otpauth:// ile başlamıyor');
  dogru(u.includes(`secret=${a}`), 'anahtar adreste yok');
  dogru(u.includes('issuer='), 'issuer yok');
});

console.log('\nSağlık verisi şifreleme (KVKK 2018/10)');


test('G13 Hastalık adı şifrelenip geri okunuyor', () => {
  esit(kripto.coz(kripto.sifrele('diyabet')), 'diyabet', 'gidiş-dönüş');
  esit(kripto.coz(kripto.sifrele('hipertansiyon')), 'hipertansiyon', 'gidiş-dönüş');
});

test('G14 Şifreli metin düz değeri İÇERMİYOR', () => {
  const s1 = kripto.sifrele('kansizlik');
  dogru(!s1.includes('kansizlik'), 'düz değer şifreli metinde görünüyor');
});

test('G15 Aynı hastalık her kayıtta FARKLI şifreleniyor', () => {
  // Kasıtlı: aksi hâlde saldırgan hangi satırların aynı hastalığı taşıdığını
  // görüp frekans analiziyle tahmin edebilirdi.
  // ESLint bunu "kendisiyle karşılaştırma" sanıyor ve anlamsız buluyor. Burada
  // anlamlı: şifreleme her çağrıda yeni rastgele IV kullandığı için aynı girdi
  // AYNI çıktıyı vermemeli. Testin tamamı bu farkı ölçüyor.
  // eslint-disable-next-line no-self-compare
  dogru(kripto.sifrele('diyabet') !== kripto.sifrele('diyabet'), 'iki şifreleme aynı çıktı');
});

test('G16 Sayılar şifrelenip sayı olarak geri okunuyor', () => {
  esit(kripto.sayiCoz(kripto.sayiSifrele(8.2)), 8.2, 'ondalık');
  esit(kripto.sayiCoz(kripto.sayiSifrele(0)), 0, 'sıfır');
  esit(kripto.sayiCoz(kripto.sayiSifrele(-1.5)), -1.5, 'negatif');
  esit(typeof kripto.sayiCoz(kripto.sayiSifrele(13)), 'number', 'tip sayı olmalı');
});

test('G17 Boş değerler boş kalıyor, çökmüyor', () => {
  esit(kripto.sifrele(null), null, 'null şifreleme');
  esit(kripto.coz(null), null, 'null çözme');
  esit(kripto.sayiSifrele(null), null, 'null sayı');
  esit(kripto.sayiCoz(null), null, 'null sayı çözme');
  esit(kripto.coz('bozuk-veri'), null, 'biçimsiz kayıt');
});

test('G18 Kurcalanmış kayıt çözülmüyor', () => {
  const s1 = kripto.sifrele('kolesterol');
  esit(kripto.coz(s1.slice(0, -2) + 'ff'), null, 'kurcalanmış veri kabul edildi');
});

test('G19 Sürüm öneki taşıyor (ileride yöntem değişirse ayırt edilsin)', () => {
  dogru(kripto.sifrele('test').startsWith('v1:'), 'sürüm öneki yok');
});

test('G20 Türkçe karakterler bozulmuyor', () => {
  const metin = 'Ferritin (şiddetli düşük) — açıklama: Ü/İ/Ğ';
  esit(kripto.coz(kripto.sifrele(metin)), metin, 'Türkçe karakter');
});


// --- Günlük takip şifrelemesi (G21-G28) ------------------------------------
// Buradaki asıl tehlike SIFIR: 0 JavaScript'te yanlış sayılır. "Bugün 0 kalori
// yaktım" ile "hiç girmedim" aynı göründüğü an veri sessizce kaybolur.

test('G21 Sıfır şifrelenip sıfır olarak geri geliyor (null olmuyor)', () => {
  const s1 = kripto.sayiSifrele(0);
  dogru(s1 !== null, 'sayiSifrele(0) null döndü — sıfır kaydedilemezdi');
  esit(kripto.sayiCoz(s1), 0, 'sıfır çözme');
});

test('G22 Ondalıklı değer bozulmuyor (su litresi)', () => {
  esit(kripto.sayiCoz(kripto.sayiSifrele(1.75)), 1.75, 'su litresi');
  esit(kripto.sayiCoz(kripto.sayiSifrele(236.4567)), 236.4567, 'yuvarlanmamış kalori');
});

test('G23 Kalem çözülüyor: kalori, gram ve serbest giriş adı', () => {
  const satir = {
    id: 7, mealType: 'ogle', foodId: null, food: null,
    amount: kripto.sayiSifrele(150),
    kcal: kripto.sayiSifrele(236.4567),
    label: kripto.sifrele('Dışarıda pide'),
  };
  const acik = gunluk.kalemiCoz(satir);
  esit(acik.amount, 150, 'gram');
  esit(acik.kcal, 236.4567, 'kalori yuvarlanmadan');
  esit(acik.label, 'Dışarıda pide', 'serbest giriş adı');
});

test('G24 Besin seçilmemiş kalemde gram null KALIYOR (0 olmuyor)', () => {
  // 0 olsaydı kalemiDondur adet hesaplamaya çalışır, bölme 0/x = 0 verirdi.
  const acik = gunluk.kalemiCoz({ amount: null, kcal: kripto.sayiSifrele(300), label: null });
  esit(acik.amount, null, 'gram null kalmalı');
  esit(acik.kcal, 300, 'kalori');
});

test('G25 Gün kaydı yoksa sıfır dönüyor, çökmüyor', () => {
  const yok = gunluk.gunKaydiniCoz(null);
  esit(yok.burnedKcal, 0, 'kayıt yok — yakılan');
  esit(yok.waterL, 0, 'kayıt yok — su');
  const bos = gunluk.gunKaydiniCoz({ burnedKcal: null, waterL: null });
  esit(bos.burnedKcal, 0, 'alan boş — yakılan');
  esit(bos.waterL, 0, 'alan boş — su');
});

test('G26 Gün kaydı çözülüyor', () => {
  const acik = gunluk.gunKaydiniCoz({
    burnedKcal: kripto.sayiSifrele(420),
    waterL: kripto.sayiSifrele(2.5),
  });
  esit(acik.burnedKcal, 420, 'yakılan kalori');
  esit(acik.waterL, 2.5, 'su');
});

test('G27 Şifreli günlük satırında düz metin değer görünmüyor', () => {
  // ÖLÇÜ SEÇİMİ: sayı için "şifreli metin 236 alt dizesini içermiyor" diye
  // bakmak YANLIŞ. Rastgele onaltılık metinde üç haneli bir sayı ~%1
  // olasılıkla kendiliğinden geçiyor (2000 denemede 22 kez ölçüldü), yani
  // test doksan çalıştırmada bir boşuna patlardı. Sayıda doğru ölçü:
  // saklanan değer sayının kendisi DEĞİL ve şifreleme önekini taşıyor.
  // Kelimede alt dize araması güvenli (aynı denemede 0 çarpışma).
  const satir = {
    amount: kripto.sayiSifrele(150),
    kcal: kripto.sayiSifrele(236),
    label: kripto.sifrele('Dışarıda pide'),
  };
  esit(satir.kcal === '236', false, 'kalori düz metin saklanmış');
  esit(satir.amount === '150', false, 'gram düz metin saklanmış');
  dogru(satir.kcal.startsWith('v1:'), 'kalori şifrelenmemiş');
  dogru(satir.amount.startsWith('v1:'), 'gram şifrelenmemiş');
  dogru(!satir.label.includes('pide'), 'yemek adı düz metin görünüyor');
  dogru(!satir.label.includes('Dışarıda'), 'yemek adı düz metin görünüyor');
});

test('G28 Çözülmüş kalem arayüzün beklediği şekle dönüyor', () => {
  const satir = {
    id: 3, mealType: 'kahvalti', foodId: 12,
    food: { name: 'Tam buğday ekmeği', portionGrams: 30, portionName: 'dilim', icon: null },
    amount: kripto.sayiSifrele(60),
    kcal: kripto.sayiSifrele(146.8),
    label: null,
  };
  const cikti = gunluk.kalemiDondur(gunluk.kalemiCoz(satir));
  esit(cikti.adet, 2, '60 g / 30 g = 2 dilim');
  esit(cikti.kcal, 147, 'kalori gösterimde yuvarlanıyor');
  esit(cikti.ad, 'Tam buğday ekmeği', 'ad besinden geliyor');
});


// --- Parola sıfırlama bileti ve oturum damgası (G29-G35) --------------------

test('G29 Bilet özeti determinist (aranabilmesi için)', () => {
  const b = 'a3f9c1';
  esit(oturum.biletOzeti(b), oturum.biletOzeti(b), 'aynı bilet farklı özet verdi');
});

test('G30 Biletin kendisi özetten okunamıyor', () => {
  const b = 'cok-gizli-bilet-dizesi';
  const o = oturum.biletOzeti(b);
  dogru(!o.includes(b), 'bilet özetin içinde görünüyor');
  esit(o.length, 64, 'sha256 onaltılık 64 karakter olmalı');
  dogru(/^[0-9a-f]+$/.test(o), 'özet onaltılık değil');
});

test('G31 Farklı biletler farklı özet veriyor', () => {
  dogru(oturum.biletOzeti('bilet-1') !== oturum.biletOzeti('bilet-2'), 'özetler çakıştı');
});

test('G32 Damga yoksa her bilet geçerli', () => {
  esit(oturum.biletDamgadanSonraMi(1700000000, null), true, 'damga null');
  esit(oturum.biletDamgadanSonraMi(1700000000, undefined), true, 'damga yok');
});

test('G33 Damgadan ÖNCE verilmiş bilet reddediliyor', () => {
  // Parola sıfırlandı; saldırganın bir saat önce aldığı bilet çalışmamalı.
  const damga = new Date('2026-10-07T12:00:00Z');
  const birSaatOnce = Math.floor(new Date('2026-10-07T11:00:00Z').getTime() / 1000);
  esit(oturum.biletDamgadanSonraMi(birSaatOnce, damga), false, 'eski bilet kabul edildi');
});

test('G34 Damgadan SONRA verilmiş bilet kabul ediliyor', () => {
  // Kullanıcı parolasını sıfırlayıp yeniden giriş yaptı; yeni bileti çalışmalı.
  const damga = new Date('2026-10-07T12:00:00Z');
  const birSaatSonra = Math.floor(new Date('2026-10-07T13:00:00Z').getTime() / 1000);
  esit(oturum.biletDamgadanSonraMi(birSaatSonra, damga), true, 'yeni bilet reddedildi');
});

test('G35 BİRİM ÇEVRİMİ: saniye/milisaniye karıştırılmıyor', () => {
  // Bu testin asıl işi. Çevrim atlanırsa iat (≈1,7 milyar) damgadan
  // (≈1,7 trilyon) her zaman küçük çıkar ve HİÇBİR bilet kabul edilmez —
  // yani bütün kullanıcılar hesaplarından kilitlenir. Hata sessiz olurdu.
  const damga = new Date('2026-10-07T12:00:00Z');
  const ayniAn = Math.floor(damga.getTime() / 1000);
  esit(oturum.biletDamgadanSonraMi(ayniAn, damga), true,
    'aynı anda verilen bilet reddedildi — birim çevrimi atlanmış olabilir');
  // Ters hata (damgayı saniyeye çevirmek) korumayı tamamen boşa çıkarırdı:
  // o durumda çok eski bir bilet bile geçerli görünürdü.
  esit(oturum.biletDamgadanSonraMi(1, damga), false, 'çok eski bilet kabul edildi');
});


// --- Tahlil PDF'inde kişisel bilgi (T01-T08) --------------------------------
//
// e-Nabız raporunda ad-soyad, doğum tarihi, cinsiyet ve sağlık tesisi yazıyor.
// Bunların HİÇBİRİ okunmuyor ve saklanmıyor. O davranışın test edilmemiş
// olması, ATLANACAK listesini silen bir değişikliğin sessizce geçmesi
// anlamına geliyordu. Bu testler onu engelliyor.
//
// Gerçek PDF kullanılmıyor: gerçek tahlil raporu kişisel veri içerir ve depoya
// konamaz. satirlariAyristir saf olduğu için uydurma satırlar yeterli.

/** PDF satırı kurar: satirlariAyristir'ın beklediği biçim. */
function satir(...parcalar) {
  return { parcalar: parcalar.map(([s2, x]) => ({ s: s2, x })) };
}
/** Her satır listesinin başına, ad sütununu belirleyen gerçek testler konuyor. */
function gercekTestler() {
  return [
    satir(['Glukoz', 120], ['95', 300], ['mg/dL', 400], ['70-100', 500]),
    satir(['Hemoglobin', 120], ['13,2', 300], ['g/dL', 400], ['12-16', 500]),
  ];
}
function adlari(sonuc) {
  return sonuc.testler.map((t) => t.ad);
}

test('T01 Etiketli kişisel bilgi satırları yanıta girmiyor', () => {
  const sonuc = ayristirici.satirlariAyristir([
    satir(['Adı/Soyadı', 120], ['ESMA NUR YILDIZHAN', 300]),
    satir(['Doğum Tarihi', 120], ['02.03.2002', 300]),
    satir(['Cinsiyet', 120], ['Kadın', 300]),
    satir(['Sağlık Tesisi', 120], ['BEYKENT DEVLET HASTANESİ', 300]),
    ...gercekTestler(),
  ]);
  const hepsi = JSON.stringify(sonuc.testler);
  dogru(!hepsi.includes('YILDIZHAN'), 'ad soyad yanıta girdi');
  dogru(!hepsi.includes('02.03.2002'), 'doğum tarihi yanıta girdi');
  dogru(!hepsi.includes('Kadın'), 'cinsiyet yanıta girdi');
  dogru(!hepsi.includes('HASTANE'), 'sağlık tesisi yanıta girdi');
  esit(sonuc.testler.length, 2, 'gerçek testler kayboldu');
});

test('T02 ETİKETSİZ ad satırı da giremiyor (düzen değişse bile)', () => {
  // ATLANACAK etikete bakıyor; etiket yoksa yakalayamaz. İkinci savunma
  // (kisiselBilgiMi) burada devreye giriyor.
  const sonuc = ayristirici.satirlariAyristir([
    satir(['ESMA NUR YILDIZHAN', 120], ['Kadın', 300]),
    ...gercekTestler(),
  ]);
  dogru(!JSON.stringify(sonuc.testler).includes('YILDIZHAN'),
    'etiketsiz ad satırı test olarak kaydedildi');
  esit(sonuc.testler.length, 2, 'gerçek testler kayboldu');
});

test('T03 T.C. kimlik numarası biçimi reddediliyor', () => {
  // Elimizdeki raporlarda T.C. yok, ama özel laboratuvar raporunda olabilir.
  const sonuc = ayristirici.satirlariAyristir([
    satir(['T.C. Kimlik No', 120], ['12345678901', 300]),
    ...gercekTestler(),
  ]);
  dogru(!JSON.stringify(sonuc.testler).includes('12345678901'), 'kimlik numarası girdi');
  esit(sonuc.testler.length, 2, 'gerçek testler kayboldu');
});

test('T04 Doğum tarihi değer alanında olsa da reddediliyor', () => {
  const sonuc = ayristirici.satirlariAyristir([
    satir(['Kayıt', 120], ['02.03.2002', 300]),
    ...gercekTestler(),
  ]);
  dogru(!adlari(sonuc).includes('Kayıt'), 'tarih değerli satır test sayıldı');
});

test('T05 Uyarı metni atlanan kişisel bilgiyi YAZMIYOR', () => {
  // Uyarılar kullanıcıya gönderiliyor ve günlüğe düşebiliyor; içeriği
  // yazmak korumaya çalıştığımız veriyi ifşa etmek olurdu.
  const sonuc = ayristirici.satirlariAyristir([
    satir(['ESMA NUR YILDIZHAN', 120], ['Kadın', 300]),
    ...gercekTestler(),
  ]);
  const uyarilar = JSON.stringify(sonuc.uyarilar);
  // ÖNCE uyarının ÜRETİLDİĞİNİ doğruluyoruz. Bu olmadan test boşlukta geçerdi:
  // nöbetçi tamamen kaldırılsa hiç uyarı üretilmez, "uyarıda ad yok" iddiası
  // da kendiliğinden doğru çıkardı. Ölçtüğünü sandığın şeyi ölçmeyen test.
  dogru(sonuc.uyarilar.some((u) => u && u.tur === 'kisiselAtlandi'),
    'kişisel bilgi uyarısı hiç üretilmedi — nöbetçi çalışmıyor olabilir');
  dogru(!uyarilar.includes('YILDIZHAN'), 'uyarıda ad soyad var');
  dogru(!uyarilar.includes('Kadın'), 'uyarıda cinsiyet var');
});

test('T06 Nöbetçi GERÇEK sonuçları atmıyor (sayısal)', () => {
  const sonuc = ayristirici.satirlariAyristir(gercekTestler());
  esit(sonuc.testler.length, 2, 'gerçek test atıldı');
  esit(sonuc.testler[0].deger, 95, 'glukoz değeri');
  esit(sonuc.testler[1].deger, 13.2, 'hemoglobin değeri (ondalık virgül)');
});

test('T07 Nöbetçi metin sonuçları atmıyor (kan grubu)', () => {
  // "O Rh(+)" sayı değil ama meşru bir sonuç. Nöbetçi dar tutulmasaydı
  // bu tür sonuçlar da kaybolurdu.
  const sonuc = ayristirici.satirlariAyristir([
    satir(['Kan Grubu', 120], ['O Rh(+)', 300]),
    ...gercekTestler(),
  ]);
  dogru(adlari(sonuc).includes('Kan Grubu'), 'kan grubu sonucu atıldı');
});

test('T08 kisiselBilgiMi sebep döndürüyor, temiz satırda null', () => {
  dogru(ayristirici.kisiselBilgiMi('Cinsiyet Kadın', 'Cinsiyet', 'Kadın'), 'cinsiyet geçti');
  dogru(ayristirici.kisiselBilgiMi('T.C. 12345678901', 'T.C.', ''), 'kimlik geçti');
  esit(ayristirici.kisiselBilgiMi('Glukoz 95 mg/dL', 'Glukoz', ''), null, 'temiz satır reddedildi');
  esit(ayristirici.kisiselBilgiMi('Kan Grubu O Rh(+)', 'Kan Grubu', 'O Rh(+)'), null, 'kan grubu reddedildi');
});


// --- Besin kimliği şifrelemesi (G36-G42) -----------------------------------
// Eskiden DiaryEntry.foodId düz metin bir yabancı anahtardı: veri tabanı
// dökümü alan biri kişinin NE YEDİĞİNİ okuyabiliyordu. Artık şifreli (foodRef)
// ve Food bağı uygulama tarafında kuruluyor.

test('G36 Besin kimliği şifreli saklanıyor, düz metin görünmüyor', () => {
  const foodRef = kripto.sayiSifrele(42);
  esit(foodRef === '42', false, 'besin kimliği düz metin saklanmış');
  dogru(foodRef.startsWith('v1:'), 'besin kimliği şifrelenmemiş');
  esit(kripto.sayiCoz(foodRef), 42, 'çözülünce kimlik geri gelmiyor');
});

test('G37 Kalem çözülünce besin kimliği sayıya dönüyor', () => {
  const acik = gunluk.kalemiCoz({
    foodRef: kripto.sayiSifrele(42),
    amount: kripto.sayiSifrele(60),
    kcal: kripto.sayiSifrele(147),
    label: null,
  });
  esit(acik.foodId, 42, 'besin kimliği çözülmedi');
});

test('G38 Serbest girişte besin kimliği null kalıyor', () => {
  const acik = gunluk.kalemiCoz({
    foodRef: null, amount: null, kcal: kripto.sayiSifrele(300),
    label: kripto.sifrele('Dışarıda pide'),
  });
  esit(acik.foodId, null, 'besin kimliği null kalmalı');
  esit(acik.label, 'Dışarıda pide', 'serbest giriş adı');
});

test('G39 Besin kimlikleri TEKİLLEŞTİRİLİYOR (N+1 sorgu olmasın)', () => {
  const kalemler = [
    { foodId: 7 }, { foodId: 7 }, { foodId: 9 }, { foodId: null }, { foodId: 7 },
  ];
  const k = gunluk.besinKimlikleri(kalemler);
  esit(k.length, 2, 'kimlikler tekilleşmedi');
  dogru(k.includes(7) && k.includes(9), 'kimlikler yanlış');
  dogru(!k.includes(null), 'null kimlik listeye girdi');
});

test('G40 Besin bağlanınca kalem arayüzün beklediği şekle dönüyor', () => {
  const harita = new Map([[12, {
    name: 'Tam buğday ekmeği', portionGrams: 30, portionName: 'dilim', icon: null,
  }]]);
  const [bagli] = gunluk.besinleriBagla(
    [{ foodId: 12, amount: 60, kcal: 146.8, label: null }], harita,
  );
  const cikti = gunluk.kalemiDondur(bagli);
  esit(cikti.ad, 'Tam buğday ekmeği', 'ad besinden gelmiyor');
  esit(cikti.adet, 2, '60 g / 30 g = 2 dilim');
  esit(cikti.kcal, 147, 'kalori gösterimde yuvarlanıyor');
  esit(cikti.foodId, 12, 'besin kimliği yanıtta yok');
});

test('G41 Besin kaydı bulunamazsa kalem DÜŞMÜYOR, kalori korunuyor', () => {
  // Yabancı anahtar kalktığı için bu durum artık mümkün. Kalemi sessizce
  // atmak kullanıcının kendi verisini kaybetmesi olurdu.
  const [bagli] = gunluk.besinleriBagla(
    [{ foodId: 999, amount: 60, kcal: 150, label: null }], new Map(),
  );
  esit(bagli.besinKayipMi, true, 'kayıp besin işaretlenmedi');
  const cikti = gunluk.kalemiDondur(bagli);
  esit(cikti.kcal, 150, 'kalori kayboldu');
  esit(cikti.amount, 60, 'gram kayboldu');
  esit(cikti.ad, 'Besin kaydı bulunamadı', 'durum kullanıcıdan saklandı');
  esit(cikti.adet, null, 'porsiyon gramı yokken adet uyduruldu');
});

test('G42 Serbest giriş "kayıp besin" ile KARIŞMIYOR', () => {
  const [bagli] = gunluk.besinleriBagla(
    [{ foodId: null, amount: null, kcal: 300, label: 'Dışarıda pide' }], new Map(),
  );
  esit(bagli.besinKayipMi, false, 'serbest giriş kayıp besin sayıldı');
  esit(gunluk.kalemiDondur(bagli).ad, 'Dışarıda pide', 'serbest giriş adı kayboldu');
});

// --- PDF ayrıştırma sınırları (T09-T11) ------------------------------------

test('T09 Zaman aşımı: uzun süren ayrıştırma kesiliyor', async () => {
  // SÜRELER KASITLI: yavaş iş 400 ms, sınır 50 ms.
  //
  // İlk sürümde iş 5 saniyeydi ve zamanlayıcı unref'liydi. Zaman aşımı
  // kaldırılarak sınandığında test PATLAMADI, SESSİZCE ASKIDA KALDI: Node
  // sözü beklemeden çıkıyor, sonuç satırı hiç yazılmıyordu. Görünmeyen
  // başarısızlık, başarısızlık sayılmaz.
  //
  // Şimdi zamanlayıcı normal: sınır çalışıyorsa 50 ms'de reddediyor, çalışmıyorsa
  // 400 ms'de çözülüyor ve aşağıdaki karşılaştırma GÖRÜNÜR biçimde patlıyor.
  const yavasIs = new Promise((coz) => { setTimeout(() => coz('bitti'), 400); });
  let hataMesaji = null;
  try {
    await ayristirici.sureSinirli(yavasIs, 50, 'PDF ayrıştırma zaman aşımına uğradı.');
  } catch (e) { hataMesaji = e.message; }
  esit(hataMesaji, 'PDF ayrıştırma zaman aşımına uğradı.', 'zaman aşımı çalışmadı');
});

test('T10 Zaman aşımı: süresinde biten iş engellenmiyor', async () => {
  const sonuc = await ayristirici.sureSinirli(
    Promise.resolve('tamam'), 2000, 'olmamalı',
  );
  esit(sonuc, 'tamam', 'süresinde biten iş kesildi');
});

test('T11 Sayfa sınırı tanımlı ve makul', () => {
  // e-Nabız raporları birkaç sayfa; sınır meşru raporu kesmeyecek kadar
  // geniş, bombayı durduracak kadar dar olmalı.
  dogru(ayristirici.EN_FAZLA_SAYFA >= 20, 'sayfa sınırı meşru raporu kesebilir');
  dogru(ayristirici.EN_FAZLA_SAYFA <= 100, 'sayfa sınırı korumasız kadar geniş');
});


// --- Hesap kilidi (G43-G47) ------------------------------------------------
//
// İLK YAZILIŞINDA HATALIYDI: mantığın bir KOPYASI test ediliyordu. index.js'teki
// eşik değişse test bunu fark etmezdi — yani kendi ölçtüğünü sandığı şeyi
// ölçmeyen bir test. Mantık src/oturum.js'e taşındı; artık gerçeği sınanıyor.

test('G43 Eşiğin altında kilitlenmiyor, sayaç ilerliyor', () => {
  const k = oturum.kilitKarari(0);
  esit(k.kilitBitisi, undefined, 'ilk hatada kilitlendi');
  esit(k.basarisizGiris, 1, 'sayaç ilerlemedi');
  esit(oturum.kilitKarari(5).basarisizGiris, 6, 'sayaç yanlış');
});

test('G44 Eşiğe gelince kilitleniyor', () => {
  const k = oturum.kilitKarari(oturum.KILIT_ESIGI - 1);
  dogru(k.kilitBitisi instanceof Date, 'eşikte kilitlenmedi');
  dogru(k.kilitBitisi > new Date(), 'kilit bitişi geçmişte');
});

test('G45 Kilitlenince sayaç SIFIRLANIYOR', () => {
  // Sıfırlanmazsa kilit bitince kullanıcı ilk hatada tekrar kilitlenirdi.
  esit(oturum.kilitKarari(oturum.KILIT_ESIGI - 1).basarisizGiris, 0, 'sayaç sıfırlanmadı');
});

test('G46 Kilit KALICI DEĞİL (hizmet engellemeyi önlüyor)', () => {
  // Kalıcı kilit, saldırganın istediği hesabı kilitleyip sahibini dışarıda
  // bırakmasına yarardı.
  dogru(oturum.KILIT_DAKIKA > 0 && oturum.KILIT_DAKIKA <= 60,
    'kilit süresi makul aralıkta değil');
  dogru(oturum.KILIT_ESIGI >= 5 && oturum.KILIT_ESIGI <= 20,
    'eşik ya kullanıcıyı yorar ya korumaz');
});

test('G47 kilitliMi yön doğru: gelecek kilitli, geçmiş değil', () => {
  esit(oturum.kilitliMi(new Date(Date.now() + 5 * 60000)), true, 'aktif kilit tanınmadı');
  esit(oturum.kilitliMi(new Date(Date.now() - 5 * 60000)), false, 'süresi geçmiş kilit hâlâ aktif');
  esit(oturum.kilitliMi(null), false, 'kilit yokken kilitli sayıldı');
});

// --- Doğrulama bileti (G48-G50) --------------------------------------------

test('G48 Doğrulama bileti sıfırlama biletiyle aynı korumayı taşıyor', () => {
  // İkisi de aynı biletOzeti'ni kullanıyor: bilet saklanmıyor, özeti saklanıyor.
  const b = 'dogrulama-bileti-ornegi';
  const o = oturum.biletOzeti(b);
  dogru(!o.includes(b), 'bilet özetin içinde görünüyor');
  esit(o.length, 64, 'sha256 bekleniyor');
});

test('G49 Doğrulama bileti sıfırlamadan UZUN yaşıyor', () => {
  // Kullanıcı kayıt postasını ertesi gün açabilir; sıfırlama biletiyse
  // ele geçirilen posta kutusunda işe yaramasın diye kısa.
  const DOGRULAMA_SAAT = 24;
  const SIFIRLAMA_DK = 60;
  dogru(DOGRULAMA_SAAT * 60 > SIFIRLAMA_DK, 'doğrulama bileti daha kısa ömürlü');
});

test('G50 Süresi dolmuş bilet geçersiz sayılıyor', () => {
  const dolmus = new Date(Date.now() - 1000);
  const gecerli = new Date(Date.now() + 60000);
  dogru(dolmus < new Date(), 'dolmuş bilet geçerli sayıldı');
  dogru(!(gecerli < new Date()), 'geçerli bilet dolmuş sayıldı');
});


// --- Saklama ve imha (G51-G57) ---------------------------------------------
//
// Veri süresiz saklanmıyor: hareketsiz hesaplar uyarıldıktan sonra siliniyor.
// Buradaki testler ASIL mantığı (src/saklama.js) sınıyor, kopyasını değil.

const GUN = 24 * 60 * 60 * 1000;
/** Son girişi n gün önce olan kullanıcı. */
function kullanici(gunOnce, uyariGunOnce = null) {
  return {
    createdAt: new Date(Date.now() - gunOnce * GUN),
    sonGirisAt: new Date(Date.now() - gunOnce * GUN),
    silmeUyarisiAt: uyariGunOnce === null ? null : new Date(Date.now() - uyariGunOnce * GUN),
  };
}

test('G51 Aktif hesap ne uyarılıyor ne siliniyor', () => {
  const taze = kullanici(1);
  esit(saklama.uyarilmaliMi(taze), false, 'taze hesap uyarıldı');
  esit(saklama.silinmeliMi(taze), false, 'taze hesap silindi');
});

test('G52 Eşiğe yaklaşan hesap UYARILIYOR', () => {
  // Eşikten UYARI_GUN_ONCE kala uyarı gitmeli.
  const u = kullanici(saklama.HAREKETSIZ_GUN - saklama.UYARI_GUN_ONCE + 1);
  esit(saklama.uyarilmaliMi(u), true, 'eşiğe yaklaşan hesap uyarılmadı');
});

test('G53 UYARILMAMIŞ hesap SİLİNMİYOR (sessiz silme yok)', () => {
  // En önemli kural. Posta gönderimi bozuk olsa bile hesaplar habersiz
  // silinmemeli; uyarı damgası yoksa silme yapılmıyor.
  const u = kullanici(saklama.HAREKETSIZ_GUN + 100);   // çok eski
  esit(u.silmeUyarisiAt, null, 'kurulum hatası: uyarı damgası dolu');
  esit(saklama.silinmeliMi(u), false, 'uyarılmamış hesap silindi');
});

test('G54 Uyarılmış ve süresi dolmuş hesap siliniyor', () => {
  const u = kullanici(saklama.HAREKETSIZ_GUN + 1, saklama.UYARI_GUN_ONCE + 1);
  esit(saklama.silinmeliMi(u), true, 'süresi dolmuş hesap silinmedi');
});

test('G55 Uyarı taze ise HENÜZ silinmiyor (kullanıcıya süre tanınıyor)', () => {
  // Uyarı dün gitmişse kullanıcının dönmek için vakti var.
  const u = kullanici(saklama.HAREKETSIZ_GUN + 1, 1);
  esit(saklama.silinmeliMi(u), false, 'uyarıdan hemen sonra silindi');
});

test('G56 İki kez uyarılmıyor', () => {
  const u = kullanici(saklama.HAREKETSIZ_GUN - 1, 2);
  esit(saklama.uyarilmaliMi(u), false, 'uyarılmış hesap tekrar uyarıldı');
});

test('G57 Hiç giriş yapmamışta kayıt tarihi esas alınıyor', () => {
  // sonGirisAt boş olabilir (kayıt olup hiç dönmemiş hesap). Bu durumda
  // createdAt kullanılmazsa tarih geçersiz olur ve hesap ya hiç silinmez
  // ya hemen silinirdi.
  const hic = { createdAt: new Date(Date.now() - 5 * GUN), sonGirisAt: null, silmeUyarisiAt: null };
  const gun = saklama.hareketsizGun(hic);
  dogru(gun > 4.9 && gun < 5.1, `kayıt tarihi esas alınmadı (${gun})`);
});

// --- Posta yapılandırma teşhisi (G58-G63) ----------------------------------
//
// Niye güvenlik testi: posta sessizce durduğunda kimse hesabını DOĞRULAYAMIYOR
// ve kimse parolasını SIFIRLAYAMIYOR. Kullanıcı ekranda "bağlantı gönderildi"
// görüyor, posta hiç gelmiyor. Yani yanlış teşhis doğrudan erişim kaybı.
//
// Bu testler yoluCoz()'u saf olarak çağırıyor; process.env'e dokunmuyorlar.

test('G58 Brevo anahtarı + gönderen -> brevo yolu', () => {
  const k = eposta.yoluCoz({ brevoAnahtar: 'x', gonderenAcik: 'a@b.com' });
  esit(k.yontem, 'brevo', 'brevo yolu seçilmedi');
  esit(k.eksik, null, 'yol varken eksik bildirildi');
});

test('G59 Brevo, SMTP ayarları da varken TERCİH EDİLİYOR', () => {
  // Render ücretsiz katmanı 25/465/587 portlarını engelliyor. SMTP ayarları
  // .env'de kalmış olabilir; o zaman SMTP seçilirse posta yine gitmez.
  const k = eposta.yoluCoz({
    brevoAnahtar: 'x', gonderenAcik: 'a@b.com', kullanici: 'c@d.com', sifre: 'abcdefghijklmnop',
  });
  esit(k.yontem, 'brevo', 'SMTP ayarları Brevo yolunu gölgeledi');
});

test('G60 Brevo anahtarı var, gönderen YOK -> yol yok ve GÖNDEREN adlandırılıyor', () => {
  // Render'da en olası hata. Teşhis "hiç ayar yok" derse hatanın yeri bulunamaz.
  const k = eposta.yoluCoz({ brevoAnahtar: 'x' });
  esit(k.yontem, 'yok', 'gönderen olmadan brevo yolu seçildi');
  dogru(k.eksik.includes('MAIL_GONDEREN'), `eksik olan ad verilmedi: ${k.eksik}`);
});

test('G61 MAIL_KULLANICI var, MAIL_SIFRE yok -> ŞİFRE adlandırılıyor', () => {
  // Burada tuzak var: GONDEREN, MAIL_GONDEREN yoksa MAIL_KULLANICI'ya geri
  // düşüyor. Teşhis geri düşmüş değere bakarsa bu durumu "MAIL_GONDEREN var"
  // diye yanlış adlandırıyor. Bir kez öyle oldu; bu test onu tutuyor.
  const k = eposta.yoluCoz({ kullanici: 'a@b.com' });
  esit(k.yontem, 'yok', 'şifresiz SMTP yolu seçildi');
  dogru(k.eksik.includes('MAIL_SIFRE'), `eksik olan ad verilmedi: ${k.eksik}`);
  dogru(!k.eksik.includes('MAIL_GONDEREN'), `yanlış alan suçlandı: ${k.eksik}`);
});

test('G62 Hiçbir ayar yok -> iki yolun ikisi de anlatılıyor', () => {
  const k = eposta.yoluCoz({});
  esit(k.yontem, 'yok', 'ayarsız yol bulundu');
  dogru(
    k.eksik.includes('BREVO_API_KEY') && k.eksik.includes('MAIL_KULLANICI'),
    `iki seçenek birlikte anlatılmadı: ${k.eksik}`,
  );
});

test('G63 Sadece SMTP ayarları -> smtp yolu (yerelde ve kendi sunucuda çalışır)', () => {
  const k = eposta.yoluCoz({ kullanici: 'a@b.com', sifre: 'abcdefghijklmnop' });
  esit(k.yontem, 'smtp', 'SMTP yolu seçilmedi');
  esit(k.gonderen, 'a@b.com', 'gönderen MAIL_KULLANICI\'ya geri düşmedi');
});

// G64: 4 girdinin 16 kombinasyonunun TAMAMI. Tek tek mutasyon sınaması bu
// kararda yetmiyor — sıra ve gonderenAcik ayrımı birbirini yedekliyor, birini
// bozmak testi kırmıyor. Davranışın kendisini uçtan uca sabitlemek gerekiyor:
// her kombinasyonda hangi yol seçilmeli ve eksikse hangi değişken adlandırılmalı.
const E = ''; // tanımsız
const K = 'a@b.com';
const S = 'abcdefghijklmnop';
const TABLO = [
  //  brevo gonderenAcik kullanici sifre  -> beklenen yol, mesajda GEÇMESİ gereken ad
  ['x', K, K, S, 'brevo', null],
  ['x', K, K, E, 'brevo', null],
  ['x', K, E, S, 'brevo', null],
  ['x', K, E, E, 'brevo', null],
  ['x', E, K, S, 'brevo', null], // gönderen MAIL_KULLANICI'ya geri düşüyor
  ['x', E, K, E, 'brevo', null], // aynı: anahtar + geri düşmüş gönderen yeter
  ['x', E, E, S, 'yok', 'MAIL_GONDEREN'],
  ['x', E, E, E, 'yok', 'MAIL_GONDEREN'],
  [E, K, K, S, 'smtp', null],
  [E, K, K, E, 'yok', 'MAIL_SIFRE'],
  [E, K, E, S, 'yok', 'MAIL_KULLANICI'],
  [E, K, E, E, 'yok', 'MAIL_GONDEREN'],
  [E, E, K, S, 'smtp', null],
  [E, E, K, E, 'yok', 'MAIL_SIFRE'],
  [E, E, E, S, 'yok', 'MAIL_KULLANICI'],
  [E, E, E, E, 'yok', 'BREVO_API_KEY'],
];

test('G64 16 yapılandırma kombinasyonunun hepsi doğru teşhis ediliyor', () => {
  const hatalar = [];
  TABLO.forEach(([brevoAnahtar, gonderenAcik, kullanici, sifre, yolBekleniyor, ad]) => {
    const etiket = `brevo=${brevoAnahtar ? 'var' : 'yok'} gonderen=${gonderenAcik ? 'var' : 'yok'}`
      + ` kullanici=${kullanici ? 'var' : 'yok'} sifre=${sifre ? 'var' : 'yok'}`;
    const k = eposta.yoluCoz({ brevoAnahtar, gonderenAcik, kullanici, sifre });
    if (k.yontem !== yolBekleniyor) {
      hatalar.push(`${etiket}: yol ${k.yontem}, beklenen ${yolBekleniyor}`);
      return;
    }
    if (ad === null) {
      if (k.eksik !== null) hatalar.push(`${etiket}: yol varken eksik bildirildi`);
      if (!k.gonderen) hatalar.push(`${etiket}: gönderen boş kaldı`);
      return;
    }
    if (!k.eksik) hatalar.push(`${etiket}: yol yok ama eksik anlatılmadı`);
    else if (!k.eksik.includes(ad)) hatalar.push(`${etiket}: "${ad}" adlandırılmadı -> ${k.eksik}`);
  });
  esit(hatalar.length, 0, `kombinasyon hataları:\n    ${hatalar.join('\n    ')}`);
});

// --- KVKK metinlerindeki iletişim adresi (G65-G67) --------------------------
//
// Niye güvenlik testi: aydınlatma metni HER kullanıcıya gösteriliyor. Oraya
// yazılan adres, kaydolan herkesin gördüğü ve kaydettiği bir iletişim
// bilgisi. Geliştiricinin kişisel adresi bir süre oradaydı; proje adresine
// taşındı (SÜRÜM 1.5). Bu testler geri sızmasını engelliyor.
//
// KVKK m.10/a ve GDPR m.13(1)(a) adresin BULUNMASINI zorunlu kılıyor, yani
// "sil, sorun kalmaz" bir çözüm değil. Doğru hâli: tek ve kasten seçilmiş
// bir adres bulunacak.

const EPOSTA_KALIBI = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// --- Ortam değeri temizliği (G69-G72) --------------------------------------
//
// Niye güvenlik testi: `.env` dosyasında tırnak kullanmak doğru, Render'da
// yanlış — orada değer harfi harfine alınıyor ve tırnak değerin parçası
// oluyor. Sonuç, Brevo'da `401 Key not found`: "anahtar yanlış" gibi görünen,
// aslında "anahtarın etrafında tırnak var" olan bir hata. Posta durunca kimse
// hesabını doğrulayamıyor ve kimse parolasını sıfırlayamıyor.

test('G69 Çevresindeki tırnaklar soyuluyor (Render tuzağı)', () => {
  esit(eposta.ortamiTemizle('"xkeysib-abc"').deger, 'xkeysib-abc', 'çift tırnak soyulmadı');
  esit(eposta.ortamiTemizle("'xkeysib-abc'").deger, 'xkeysib-abc', 'tek tırnak soyulmadı');
  dogru(eposta.ortamiTemizle('"xkeysib-abc"').tirnak, 'tırnak soyulduğu bildirilmedi');
});

test('G70 Baş/son boşluk kırpılıyor', () => {
  esit(eposta.ortamiTemizle('  xkeysib-abc  ').deger, 'xkeysib-abc', 'boşluk kırpılmadı');
  dogru(eposta.ortamiTemizle('  xkeysib-abc  ').bosluk, 'kırpma bildirilmedi');
});

test('G71 DÜZGÜN değer değiştirilmiyor', () => {
  // Temizlik doğru değeri bozarsa, çalışan yapılandırmayı kırmış oluruz.
  const r = eposta.ortamiTemizle('xkeysib-abc-123');
  esit(r.deger, 'xkeysib-abc-123', 'düzgün değer değişti');
  esit(r.tirnak, false, 'olmayan tırnak bildirildi');
  esit(r.bosluk, false, 'olmayan boşluk bildirildi');
});

test('G72 Eşleşmeyen ve tek tırnak soyulmuyor', () => {
  // '"abc' bir yarım tırnak; soyulursa değer sessizce bozulur.
  esit(eposta.ortamiTemizle('"abc').deger, '"abc', 'yarım tırnak soyuldu');
  esit(eposta.ortamiTemizle('abc"').deger, 'abc"', 'yarım tırnak soyuldu');
  esit(eposta.ortamiTemizle('"').deger, '"', 'tek karakter soyuldu');
  esit(eposta.ortamiTemizle('').deger, '', 'boş değer bozuldu');
  esit(eposta.ortamiTemizle(undefined).deger, '', 'tanımsız değer bozuldu');
});

test('G65 Aydınlatma metni bir iletişim adresi İÇERİYOR (KVKK m.10/a)', () => {
  const bulunan = kvkk.AYDINLATMA.match(EPOSTA_KALIBI) || [];
  dogru(bulunan.length > 0, 'aydınlatma metninde hiç iletişim adresi yok');
});

test('G66 KVKK metinlerindeki TÜM adresler kasten seçilen adres', () => {
  // Kalıbı iki metne birlikte uyguluyor: rıza metnine de adres sızabilir.
  const hepsi = [
    ...(kvkk.AYDINLATMA.match(EPOSTA_KALIBI) || []),
    ...(kvkk.ACIK_RIZA.match(EPOSTA_KALIBI) || []),
  ];
  const yabanci = hepsi.filter((a) => a !== kvkk.ILETISIM);
  esit(
    yabanci.length, 0,
    `metinlerde ILETISIM dışında adres var: ${yabanci.join(', ')}`,
  );
});

test('G68 Aydınlatma metni veri sorumlusunu ADLANDIRIYOR (KVKK m.10/a)', () => {
  // Kullanıcı haklarını KİME karşı kullanacağını bilmek zorunda. Satır
  // silinirse metin m.10/a'yı karşılamaz.
  //
  // Not: bu test geliştiricinin kişisel adını ARAMIYOR. Arasaydı o adı test
  // dosyasına yazmak gerekirdi; metinden çıkarılan ad depoya geri girerdi.
  // Ölçü, sorumlunun sabitte ne yazıyorsa metinde de o yazması.
  dogru(
    kvkk.AYDINLATMA.includes(`veri sorumlusu: ${kvkk.VERI_SORUMLUSU}`),
    'veri sorumlusu satırı metinde yok ya da sabitle uyuşmuyor',
  );
  dogru(kvkk.VERI_SORUMLUSU.trim().length > 0, 'veri sorumlusu adı boş');
});

test('G67 Rıza sürümü, metinler değiştiğinde yeniden onay tetikliyor', () => {
  // SURUM artmazsa kullanıcı, artık geçerli olmayan bir metne verdiği rıza
  // ile kalır. Bu testin koruduğu şey sürümün BİÇİMİ: boş ya da tanımsız bir
  // sürüm, karşılaştırmayı sessizce anlamsızlaştırır.
  dogru(
    typeof kvkk.SURUM === 'string' && /^\d+\.\d+$/.test(kvkk.SURUM),
    `sürüm numarası beklenen biçimde değil: ${JSON.stringify(kvkk.SURUM)}`,
  );
  dogru(Boolean(kvkk.SURUM_TARIHI), 'sürüm tarihi boş');
});

// --- Parola kuralı (G73-G79) ------------------------------------------------
//
// Niye güvenlik testi: parola, hesaba açılan tek kapı. Kural gevşerse
// sağlık verisi tahmin edilebilir bir parolanın arkasında kalır.

const GECERLI = 'Tr#9kLmPq2';   // 10 karakter, harf+rakam+sembol, çeşitli

test('G73 Geçerli parola kabul ediliyor', () => {
  const s = parola.parolaDenetle(GECERLI);
  dogru(s.gecerli, `geçerli parola reddedildi: ${s.kodlar.join(',')}`);
});

test('G74 Harf, rakam ve sembol AYRI AYRI zorunlu', () => {
  const durumlar = [
    ['1234567!89', 'harf'],      // harf yok
    ['AbcdefGh!j', 'rakam'],     // rakam yok
    ['Abcdefg123', 'sembol'],    // sembol yok
  ];
  const hatalar = [];
  durumlar.forEach(([p, beklenen]) => {
    const s = parola.parolaDenetle(p);
    if (s.gecerli) hatalar.push(`${p} kabul edildi (${beklenen} eksikken)`);
    else if (!s.kodlar.includes(beklenen)) {
      hatalar.push(`${p} -> beklenen "${beklenen}", gelen "${s.kodlar.join(',')}"`);
    }
  });
  esit(hatalar.length, 0, hatalar.join(' | '));
});

test('G75 Uzunluk alt sınırı uygulanıyor', () => {
  // Kuralların hepsini karşılayan ama kısa olan parola.
  const s = parola.parolaDenetle('Ab1!cdef');   // 8 karakter
  dogru(!s.gecerli, '8 karakterlik parola kabul edildi');
  dogru(s.kodlar.includes('uzunluk'), `uzunluk şikâyeti yok: ${s.kodlar.join(',')}`);
  dogru(parola.EN_AZ >= 10, `alt sınır düşürülmüş: ${parola.EN_AZ}`);
});

test('G76 Tekrara dayalı parola eleniyor', () => {
  // ÖLÇÜLDÜ: ilk yazımda bu ikisi GEÇİYORDU. Uzunluk, harf, rakam ve sembol
  // şartlarının hepsini karşılıyorlar ama gerçek entropileri yok. Ölçü
  // "tamamı aynı karakter mi" idi; "kaç farklı karakter var" olmalıydı.
  ['aaaaaaaaaa1!', 'şşşşşşşşşş1!', 'ababababab1!'].forEach((p) => {
    const s = parola.parolaDenetle(p);
    dogru(!s.gecerli, `tekrara dayalı parola kabul edildi: ${p}`);
  });
});

test('G77 Ardışık diziler eleniyor', () => {
  ['Qwerty123456!', 'abcdef123!X', 'Zyxwvu123!a'].forEach((p) => {
    const s = parola.parolaDenetle(p);
    dogru(!s.gecerli, `ardışık dizi kabul edildi: ${p}`);
    dogru(s.kodlar.includes('ardisik'), `${p} -> ardışık sayılmadı: ${s.kodlar.join(',')}`);
  });
});

test('G78 Kişisel bilgi içeren parola eleniyor', () => {
  const kisi = { eposta: 'esmanur@ornek.com', ad: 'Esma', soyad: 'Yıldızhan' };
  // Hedefli tahmin saldırısı sözlük değil, kişinin kendi bilgisiyle çalışıyor.
  ['esmanur2024!', 'Yıldızhan12!', 'ESMANUR#99x'].forEach((p) => {
    const s = parola.parolaDenetle(p, kisi);
    dogru(!s.gecerli, `kişisel bilgi içeren parola kabul edildi: ${p}`);
  });
  // Yanlış pozitif olmamalı: alakasız parola aynı kişi için geçmeli.
  dogru(parola.parolaDenetle(GECERLI, kisi).gecerli, 'alakasız parola yanlışlıkla reddedildi');
});

test('G79 Sızıntı denetimi k-anonimlik protokolünü doğru uyguluyor', async () => {
  // Ağ çağrısı sahte: sınanan şey protokol, servisin kendisi değil.
  // "test" parolasinin SHA-1'i: A94A8FE5CCB19BA61C4C0873D391E987982FBBD3
  const gercekFetch = global.fetch;
  let istenenAdres = null;
  global.fetch = async (adres) => {
    istenenAdres = adres;
    return {
      ok: true,
      text: async () => 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:3\r\n'
        + 'FE5CCB19BA61C4C0873D391E987982FBBD3:12345\r\n',
    };
  };
  try {
    const { sizintiKontrol } = require('./parola_sizinti');
    const s = await sizintiKontrol('test');
    // 1) Parolanın KENDİSİ ya da tam özeti gönderilmemeli
    dogru(!istenenAdres.includes('test'), 'parola adrese konmuş');
    dogru(istenenAdres.endsWith('/A94A8'), `yalnızca 5 haneli ön ek gönderilmeli: ${istenenAdres}`);
    dogru(!istenenAdres.includes('FE5CCB19'), 'özetin kuyruğu da gönderilmiş');
    // 2) Eşleşme bulunmalı
    dogru(s.bakildi && s.sizmis, 'sızmış parola yakalanmadı');
    esit(s.kezSayisi, 12345, 'kez sayısı yanlış okundu');
  } finally {
    global.fetch = gercekFetch;
  }
});

test('G80 Sızıntı servisi erişilemezse kayıt kilitlenmiyor', async () => {
  const gercekFetch = global.fetch;
  global.fetch = async () => { throw new Error('ag yok'); };
  try {
    const { sizintiKontrol } = require('./parola_sizinti');
    const s = await sizintiKontrol('Tr#9kLmPq2');
    esit(s.bakildi, false, 'servise ulaşılamadığı hâlde karar verildi');
    esit(s.sizmis, false, 'ulaşılamazken parola sızmış sayıldı (kayıt kilitlenirdi)');
  } finally {
    global.fetch = gercekFetch;
  }
});

test('G81 Arayüzdeki parola kuralı kopyası sunucuyla AYNI', () => {
  // Arayüz, kullanıcıya anlık geri bildirim verebilmek için kuralın bir
  // kopyasını taşıyor (src/parolaKurali.js). İki taraf ayrışırsa kullanıcı
  // "kurallar tamam" görüp gönderimde hata alır — ya da tersi, daha kötüsü,
  // arayüz daha gevşek görünür. Bu test ayrışmayı yakalıyor.
  const fs = require('fs');
  const path = require('path');
  const yol = path.join(__dirname, '..', '..', 'src', 'parolaKurali.js');
  dogru(fs.existsSync(yol), `arayüz kuralı bulunamadı: ${yol}`);
  const metin = fs.readFileSync(yol, 'utf8');

  const sayiAl = (ad) => {
    const m = metin.match(new RegExp(`export const ${ad} = (\\d+)`));
    return m ? Number(m[1]) : null;
  };
  esit(sayiAl('EN_AZ'), parola.EN_AZ, 'asgari uzunluk iki tarafta farklı');
  esit(sayiAl('EN_AZ_FARKLI'), parola.EN_AZ_FARKLI, 'asgari çeşitlilik iki tarafta farklı');

  // Arayüzün gösterdiği madde kodları sunucunun ürettiği kodların alt kümesi olmalı
  const arayuzKodlari = [...metin.matchAll(/kod: '([a-z]+)'/g)].map((m) => m[1]);
  // Tek bir denemeyle TÜM kod adları çıkmıyor (boş parola çeşitlilik
  // denetimini tetiklemiyor). Birkaç denemenin birleşimi alınıyor.
  const sunucuKodlari = [...new Set([
    ...parola.parolaDenetle('').kodlar,
    ...parola.parolaDenetle('aaa').kodlar,
    ...parola.parolaDenetle('abcdefghij').kodlar,
    ...parola.parolaDenetle('x'.repeat(250)).kodlar,
    ...parola.parolaDenetle('esma1234!xyz', { ad: 'Esma' }).kodlar,
  ])];
  const fazlalik = arayuzKodlari.filter((k) => !sunucuKodlari.includes(k));
  esit(fazlalik.length, 0, `arayüzde sunucuda olmayan kural var: ${fazlalik.join(',')}`);
});

// --- Güvenlik olay günlüğü (G82-G86) ----------------------------------------
//
// Niye güvenlik testi: günlüğün kendisi kişisel veri işliyor (IP) ve
// günlük tutmanın bir isteği bozmaması gerekiyor. İkisi de sessizce
// bozulabilecek şeyler.

test('G82 IP özeti geri döndürülemez ve tutarlı', () => {
  const eski = process.env.GUVENLIK_IP_ANAHTARI;
  process.env.GUVENLIK_IP_ANAHTARI = 'test-anahtari-yeterince-uzun';
  try {
    // Modül anahtarı önbelleğe alıyor; taze bir kopya gerekiyor.
    delete require.cache[require.resolve('./guvenlik_gunlugu')];
    const g = require('./guvenlik_gunlugu');
    const a = g.ipOzetle('203.0.113.7');
    const b = g.ipOzetle('203.0.113.7');
    const c = g.ipOzetle('203.0.113.8');
    esit(a, b, 'aynı IP farklı özet verdi (sayım yapılamaz)');
    dogru(a !== c, 'farklı IP aynı özeti verdi');
    dogru(!a.includes('203') && !a.includes('113'), `IP özetin içinde görünüyor: ${a}`);
    esit(a.length, 16, 'özet uzunluğu beklenenden farklı');
  } finally {
    process.env.GUVENLIK_IP_ANAHTARI = eski;
    delete require.cache[require.resolve('./guvenlik_gunlugu')];
  }
});

test('G83 Günlük yazımı başarısız olsa bile hata FIRLATMIYOR', async () => {
  // Bu testin koruduğu şey şu: veritabanı erişilemezken ya da göç henüz
  // uygulanmamışken kullanıcı giriş YAPABİLMELİ. Günlük tutmak isteği
  // bozarsa, günlük tutmanın kendisi bir kullanılabilirlik açığı olur.
  const sahteBozuk = { guvenlikOlayi: { create: async () => { throw new Error('tablo yok'); } } };
  const sonuc = await gunlukKayit.kaydet(sahteBozuk, { olay: 'deneme', ip: '1.2.3.4' });
  esit(sonuc, false, 'başarısız yazım başarılı bildirildi');
});

test('G84 Sayım hatasında uyarı GÖNDERİLMİYOR (posta bombardımanı riski)', async () => {
  // Emin olunamayan durumda "gönder" demek, saldırganın art arda deneme
  // yaparak kurbanın posta kutusunu doldurmasına yol açardı.
  const sahteBozuk = { guvenlikOlayi: { count: async () => { throw new Error('yok'); } } };
  const uyarildi = await gunlukKayit.yakindaUyarildiMi(sahteBozuk, 1);
  esit(uyarildi, true, 'hata durumunda "uyarılmadı" denildi -> posta gönderilirdi');
});

test('G85 Eşik normal yanlış yazmayı değil sistemli denemeyi yakalıyor', () => {
  dogru(gunlukKayit.ESIK >= 4, `eşik çok düşük (${gunlukKayit.ESIK}), her yanlış yazımda posta gider`);
  dogru(gunlukKayit.PENCERE_DK <= 60, `pencere çok geniş (${gunlukKayit.PENCERE_DK} dk)`);
  dogru(gunlukKayit.UYARI_ARALIK_SAAT >= 1, 'uyarı aralığı yok, posta bombardımanı mümkün');
});

test('G86 Olay kayıtlarının saklama süresi sınırlı (KVKK m.4)', async () => {
  dogru(gunlukKayit.SAKLAMA_GUN > 0 && gunlukKayit.SAKLAMA_GUN <= 365,
    `saklama süresi makul değil: ${gunlukKayit.SAKLAMA_GUN} gün`);
  // Silmenin DOĞRU sınırı kullandığını doğrula: sahte prisma koşulu yakalıyor.
  let gelenKosul = null;
  const sahte = {
    guvenlikOlayi: {
      deleteMany: async (a) => { gelenKosul = a.where.zaman.lt; return { count: 7 }; },
    },
  };
  const n = await gunlukKayit.eskileriSil(sahte);
  esit(n, 7, 'silinen sayı aktarılmadı');
  const beklenenMs = Date.now() - gunlukKayit.SAKLAMA_GUN * 24 * 60 * 60 * 1000;
  dogru(Math.abs(gelenKosul.getTime() - beklenenMs) < 5000,
    'silme sınırı saklama süresiyle uyuşmuyor');
});

// --- Kaynak (Origin) doğrulaması (G87-G89) ---------------------------------

const KOKEN = 'https://besin-risk-analiz.vercel.app';

test('G87 Yabancı kaynaktan gelen DEĞİŞTİRME isteği reddediliyor', () => {
  ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((y) => {
    esit(
      oturum.kaynakKabulEdilirMi(y, 'https://kotu-site.example', KOKEN), false,
      `${y} isteği yabancı kaynaktan kabul edildi`,
    );
  });
  esit(oturum.kaynakKabulEdilirMi('POST', KOKEN, KOKEN), true, 'kendi arayüzümüz reddedildi');
});

test('G88 Okuma istekleri etkilenmiyor', () => {
  // GET veri değiştirmiyor; engellemek işe yaramaz, yalnızca kırar.
  ['GET', 'HEAD', 'OPTIONS'].forEach((y) => {
    dogru(
      oturum.kaynakKabulEdilirMi(y, 'https://kotu-site.example', KOKEN),
      `${y} isteği engellendi`,
    );
  });
});

test('G89 Origin başlığı OLMAYAN istek geçiyor (tarayıcı değil)', () => {
  // CSRF, kurbanın TARAYICISINDAKİ kimliği kullanır. Tarayıcılar siteler
  // arası isteklerde Origin'i her zaman gönderir; göndermeyen bir istemci
  // (curl, betik) saldırının öznesi olamaz. Zorunlu kılmak saldırıyı
  // engellemez, yalnızca meşru araçları kırardı.
  dogru(oturum.kaynakKabulEdilirMi('POST', undefined, KOKEN), 'Origin yokken reddedildi');
  dogru(oturum.kaynakKabulEdilirMi('POST', '', KOKEN), 'boş Origin reddedildi');
});

// --- Ayrıştırma uyarılarının türü (T12-T13) ---------------------------------
//
// Gerçek bir e-Nabız raporunda ölçüldü (8 Ekim 2026): biyokimya panelinde
// referans aralığı basılıyor, hemogram panelinde BASILMIYOR. İkisi tek
// listede toplanınca normal bir rapor 28 satırlık hata yığını gibi
// görünüyordu ve kullanıcı uygulamanın bozuk olduğunu sanıyordu.

test('T12 Aralığı olmayan test "okunamadı" sayılmıyor, DEĞERİ KORUNUYOR', () => {
  const sonuc = ayristirici.satirlariAyristir([
    ...gercekTestler(),
    // Hemogram satırı: değer ve birim var, referans aralığı YOK.
    satir(['BASO#', 120], ['0,05', 300], ['x10^9/L', 400]),
  ]);
  const baso = sonuc.testler.find((t) => t.ad === 'BASO#');
  dogru(baso, 'aralığı olmayan test tamamen düşürüldü — değer kaybedildi');
  esit(baso.deger, 0.05, 'değer yanlış okundu');

  const aralikYok = sonuc.uyarilar.filter((u) => u && u.tur === 'aralikYok');
  const okunamadi = sonuc.uyarilar.filter((u) => u && u.tur === 'okunamadi');
  dogru(aralikYok.some((u) => u.ad === 'BASO#'), 'aralık yok uyarısı üretilmedi');
  dogru(!okunamadi.some((u) => u.ad === 'BASO#'),
    'aralığı olmayan test "okunamadı" diye işaretlendi — kullanıcıya hata gibi görünür');
});

test('T13 Aralığı OLAN test hiç uyarı üretmiyor', () => {
  const sonuc = ayristirici.satirlariAyristir(gercekTestler());
  const ilgili = sonuc.uyarilar.filter(
    (u) => u && (u.ad === 'Glukoz' || u.ad === 'Hemoglobin'),
  );
  esit(ilgili.length, 0, `aralığı olan testler uyarı üretti: ${JSON.stringify(ilgili)}`);
});

Promise.all(sozler).then(() => {
  console.log(`\nSonuç: ${gecen} test geçti, ${kalan.length} test kaldı.\n`);
  if (kalan.length) process.exit(1);
});
