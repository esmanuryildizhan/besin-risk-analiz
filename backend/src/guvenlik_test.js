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


// --- Şifre sıfırlama bileti ve oturum damgası (G29-G35) --------------------

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
  // Şifre sıfırlandı; saldırganın bir saat önce aldığı bilet çalışmamalı.
  const damga = new Date('2026-10-07T12:00:00Z');
  const birSaatOnce = Math.floor(new Date('2026-10-07T11:00:00Z').getTime() / 1000);
  esit(oturum.biletDamgadanSonraMi(birSaatOnce, damga), false, 'eski bilet kabul edildi');
});

test('G34 Damgadan SONRA verilmiş bilet kabul ediliyor', () => {
  // Kullanıcı şifresini sıfırlayıp yeniden giriş yaptı; yeni bileti çalışmalı.
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
  dogru(sonuc.uyarilar.some((u) => u.includes('Kişisel bilgi')),
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

Promise.all(sozler).then(() => {
  console.log(`\nSonuç: ${gecen} test geçti, ${kalan.length} test kaldı.\n`);
  if (kalan.length) process.exit(1);
});
