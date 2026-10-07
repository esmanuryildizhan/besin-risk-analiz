// src/risk_test.js
// Risk motorunun testleri. Çalıştırma:  node src/risk_test.js
//
// Neden test yazıyoruz? Bu bir sağlık uygulaması. Kurallarda bir değişiklik
// yaptığında "acaba bir şeyi bozdum mu?" diye tek tek elle denemek yerine bu
// dosyayı çalıştırıyorsun. Saniyeler içinde cevabını alıyorsun.
// (Veritabanına hiç bağlanmaz, tamamen bellekte çalışır.)

const { riskHesapla, SEVIYE_SIRASI, SEVIYE_ETIKET } = require('./risk');
const {
  HASTALIKLAR, HASTALIK_ALERJEN, ALERJENLER, DIYETLER, ETIKET_ADI, KURAL_ALANLARI,
  KAYNAKLAR,
} = require('../prisma/hastalik_kurallari');

const kurallar = {
  hastaliklar: HASTALIKLAR.map((h) => ({ ...h, rules: h.rules })),
  hastalikAlerjen: HASTALIK_ALERJEN,
  alerjenler: ALERJENLER,
  diyetler: DIYETLER,
  etiketAdi: ETIKET_ADI,
};

// --- Test verisi ---
//
// Besin değerlerini BURAYA ELLE YAZMIYORUZ. Bir zamanlar yazıyorduk ve şöyle
// bir sorun çıktı: TürKomp verisi eklenince veritabanındaki pırasanın demiri
// 2,1 mg'dan 0,63 mg'a düştü, ama testteki kopya 2,1'de kaldı. Test yeşil
// yanmaya devam etti, uygulama ise başka türlü davranıyordu. Yani test
// bizi koruyacağına yanlış güven veriyordu.
//
// Artık besinleri doğrudan `data-import/foods_tr.csv` dosyasından okuyoruz.
// Veri değişirse test de değişir; sessizce kaymaz.

const fs = require('fs');
const path = require('path');

const CSV_YOLU = path.join(__dirname, '..', '..', 'data-import', 'foods_tr.csv');

/** Tırnak içindeki virgülleri doğru ayıran küçük CSV okuyucu. */
function csvOku(yol) {
  const metin = fs.readFileSync(yol, 'utf8').replace(/^﻿/, '').trim();
  const satirlar = metin.split(/\r?\n/);
  const bol = (satir) => {
    const parcalar = [];
    let mevcut = '';
    let tirnakta = false;
    for (const karakter of satir) {
      if (karakter === '"') tirnakta = !tirnakta;
      else if (karakter === ',' && !tirnakta) { parcalar.push(mevcut); mevcut = ''; }
      else mevcut += karakter;
    }
    parcalar.push(mevcut);
    return parcalar;
  };
  const basliklar = bol(satirlar[0]);
  return satirlar.slice(1).map((satir) => {
    const parcalar = bol(satir);
    const kayit = {};
    basliklar.forEach((b, i) => { kayit[b] = parcalar[i]; });
    return kayit;
  });
}

const SAYISAL = [
  'portionGrams', 'kcal', 'proteins', 'carbohydrates', 'sugars', 'fiber', 'fat',
  'saturatedFat', 'transFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'epa', 'dha',
  'cholesterolMg', 'sodiumMg', 'potassiumMg',
  'calciumMg', 'ironMg', 'magnesiumMg', 'phosphorusMg', 'zincMg', 'vitaminCMg',
  'caffeineMg', 'glycemicIndex',
];

let besinler;
try {
  besinler = new Map(csvOku(CSV_YOLU).map((ham) => {
    // source da taşınıyor: besin kartında gösterilen kaynak/sınır etiketlerini
    // (kafein -> EFSA, trans yağ -> elaidik asit) testler denetliyor.
    const b = { name: ham.name, category: ham.category, source: ham.source || '' };
    SAYISAL.forEach((alan) => {
      const h = ham[alan];
      b[alan] = (h === '' || h === undefined) ? null : Number(h);
    });
    b.allergens = ham.allergens ? ham.allergens.split('|') : [];
    b.traces = ham.traces ? ham.traces.split('|') : [];
    b.dietTags = ham.dietTags ? ham.dietTags.split('|') : [];
    return [b.name, b];
  }));
} catch (hata) {
  console.error(`\nfoods_tr.csv okunamadı: ${hata.message}`);
  console.error('Önce data-import klasöründe: python turkomp_birlestir.py\n');
  process.exit(1);
}

/** Veritabanındaki besini adıyla getirir; yoksa testi anlamlı bir hatayla durdurur. */
function b(ad) {
  const besin = besinler.get(ad);
  if (!besin) {
    throw new Error(`"${ad}" foods_tr.csv içinde yok. Besin adı değişmiş olabilir.`);
  }
  return besin;
}

const pirasa = b('Pırasa');
const beyazEkmek = b('Beyaz ekmek');
const bal = b('Bal (çiçek)');
const yogurt = b('Yoğurt (tam yağlı)');
const tamBugdayEkmegi = b('Tam buğday ekmeği');
const makarna = b('Makarna (kuru)');
const pirinc = b('Pirinç');
const yumurta = b('Yumurta sarısı');
const hamsi = b('Hamsi');
const ispanak = b('Ispanak');
const mercimek = b('Kırmızı mercimek (kuru)');
const nohut = b('Nohut (haşlanmış)');
const sucuk = b('Sucuk');
const zeytinyagi = b('Zeytinyağı (sızma)');
const yaprakSarma = b('Zeytinyağlı yaprak sarma');
const peynirliBorek = b('Peynirli börek');
const ayva = b('Ayva');
const tereyagi = b('Tereyağı');
const sofraTuzu = b('Sofra tuzu');
const tozSeker = b('Toz şeker');
const yulaf = b('Yulaf');
const danaCigeri = b('Dana ciğeri');
const kuruFasulye = b('Kuru fasulye');
const portakal = b('Portakal');
const lavas = b('Lavaş');
const makarnaKuru = b('Makarna (kuru)');

// --- Basit test altyapısı ---
let gecen = 0;
let kalan = 0;

function test(baslik, fn) {
  try {
    fn();
    gecen++;
    console.log(`  ✓ ${baslik}`);
  } catch (hata) {
    kalan++;
    console.log(`  ✗ ${baslik}\n      ${hata.message}`);
  }
}

function esit(bulunan, beklenen, aciklama = '') {
  if (bulunan !== beklenen) {
    throw new Error(`${aciklama} beklenen "${beklenen}", bulunan "${bulunan}"`);
  }
}

function dogru(kosul, aciklama) {
  if (!kosul) throw new Error(aciklama);
}

console.log('\nRİSK MOTORU TESTLERİ\n');

test('Sağlıklı kullanıcı için pırasa UYGUN', () => {
  const s = riskHesapla(pirasa, { allergies: [], diseases: [], diet: 'Normal' }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('Süt alerjisi olan için yoğurt ALERJEN', () => {
  const s = riskHesapla(yogurt, { allergies: ['milk'], diseases: [] }, kurallar);
  esit(s.seviye, 'ALERJEN');
  dogru(s.alerjiUyarilari.length === 1, 'Tam olarak bir alerji uyarısı olmalı');
});

test('Çölyak hastası için beyaz ekmek RİSKLİ', () => {
  const s = riskHesapla(beyazEkmek, { allergies: [], diseases: ['colyak'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.mesaj.includes('Gluten')), 'Gluten uyarısı olmalı');
});

test('Diyabetli için bal RİSKLİ (şeker %72)', () => {
  const s = riskHesapla(bal, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI');
});

test('Hipertansiyonlu için beyaz ekmek DİKKAT (100 g\'da 343 mg sodyum)', () => {
  const s = riskHesapla(beyazEkmek, { allergies: [], diseases: ['hipertansiyon'] }, kurallar);
  esit(s.seviye, 'DIKKAT');
});

test('Kansızlığı olan için mercimek demir faydası olarak işaretlenir', () => {
  // Bu test eskiden pırasa kullanıyordu ve elle yazılmış 2,1 mg demir değeriyle
  // geçiyordu. TürKomp verisi gelince pırasanın gerçek demiri 0,63 mg çıktı,
  // yani uygulamada demir faydası GÖRÜNMÜYORDU ama test yeşil yanıyordu.
  // Artık değerler CSV'den geliyor. Haşlanmış mercimek: porsiyonda 5 mg demir,
  // kalsiyumu düşük (19 mg), yani sadece olumlu bulgu bekliyoruz.
  const s = riskHesapla(mercimek, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  esit(s.seviye, 'UYGUN');
  dogru(s.faydalar.some((f) => f.nutrient === 'ironMg'), 'Demir faydası görünmeli');
});

test('Ispanak kansızlıkta hem faydalı hem dikkatli: demir yüksek ama kalsiyumu emilimi kısıyor', () => {
  // Projenin temel fikri bu: bir besin aynı hastalıkta hem olumlu hem olumsuz
  // bulgu verebilir. Ispanak 100 g'da 9,71 mg demir taşıyor (EFSA 2015 eşiği
  // 3,2 mg) ama aynı porsiyonda 143 mg kalsiyum var ve Pişkin 2022'ye göre
  // bu, aynı öğündeki demir emilimini %18-27 azaltıyor. İkisi birlikte
  // gösterilmeli; kart rengi daha ciddi olan bulgudan (DİKKAT) gelir.
  const s = riskHesapla(ispanak, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  dogru(s.faydalar.some((f) => f.nutrient === 'ironMg'), 'Demir faydası görünmeli');
  dogru(s.riskler.some((r) => r.nutrient === 'calciumMg'), 'Kalsiyum uyarısı görünmeli');
  esit(s.seviye, 'DIKKAT', 'Daha ciddi bulgu kartın rengini belirler:');
});

test('Kansızlıkta pırasa demir kaynağı SAYILMAZ (0,63 mg — eşiğin altında)', () => {
  // Halk arasında "pırasa kan yapar" denir; TürKomp ölçümü bunu desteklemiyor.
  // Testin işi burada doğruyu korumak, beklentiyi güzelleştirmek değil.
  const s = riskHesapla(pirasa, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  dogru(!s.faydalar.some((f) => f.nutrient === 'ironMg'),
    'Pırasa demir faydası göstermemeli — gerçek değeri 0,63 mg');
});

test('Hem kansızlık hem diyabet: bal hem faydalı hem riskli görünür', () => {
  const s = riskHesapla(bal, { allergies: [], diseases: ['kansizlik', 'diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI', 'En ciddi bulgu kartın rengini belirler:');
  dogru(s.riskler.length >= 1, 'Diyabet riski görünmeli');
  // Bal demirden zengin değil, ama olumlu/olumsuz ayrımının çalıştığını
  // gösteren asıl test aşağıdaki "yulaf" testi.
});

test('Eser alerjen, tam alerjenden hafif sayılır', () => {
  // Peynirli börekte yumurta ESER olarak var (gluten ve süt tam alerjen).
  // Yumurta alerjisi olan biri için bu DİKKAT, ALERJEN değil.
  const s = riskHesapla(peynirliBorek, { allergies: ['eggs'], diseases: [] }, kurallar);
  esit(s.seviye, 'DIKKAT');
});

test('Tam buğday ekmeği: diyabet ve kolesterolde lif faydası görünür', () => {
  const s = riskHesapla(tamBugdayEkmegi, { allergies: [], diseases: ['diyabet', 'kolesterol'] }, kurallar);
  dogru(s.faydalar.length >= 2, 'İki hastalık için de lif faydası görünmeli');
  dogru(!s.riskler.some((r) => r.nutrient === 'netCarbs'),
    '35 g dilimde 15 g net karbonhidrat var, eşiğin altında: karbonhidrat uyarısı olmamalı');
});

test('Kritik veri eksikse besin UYGUN sayılmaz, DİKKAT olur', () => {
  // Tam buğday ekmeğinin şeker ve doymuş yağ değerleri TürKomp'tan henüz
  // girilmedi. Bu ikisi "kritik" işaretli: bilmediğimiz bir şeye güvenli
  // diyemeyiz. Motor bu yüzden seviyeyi DİKKAT'e çekiyor ve sebebini yazıyor.
  const s = riskHesapla(tamBugdayEkmegi, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'DIKKAT');
  dogru(s.bilgiNotlari.length === 1, 'Eksik veri notu düşmeli');
  dogru(s.riskler.length === 0, 'Ortada gerçek bir risk bulgusu yok, sadece bilgi eksikliği var');
});

test('Baklagiller diyabette cezalandırılmaz (nohut, lif faydası var)', () => {
  const s = riskHesapla(nohut, { allergies: [], diseases: ['diyabet'] }, kurallar);
  // Porsiyonda 24 g net karbonhidrat var, yani 20 g eşiğinin ÜSTÜNDE.
  // Yine de uyarı almıyor: lif yoğunluğu 57 g/1000 kcal (eşik 14), yani
  // Evert 2019'un diyabette açıkça önerdiği "kuru baklagil" tanımına giriyor.
  dogru(!s.riskler.some((r) => r.nutrient === 'netCarbs'), 'Karbonhidrat uyarısı olmamalı');
  dogru(s.faydalar.some((f) => f.nutrient === 'fiberPer1000kcal'), 'Lif faydası görünmeli');
});

test('Lif muafiyeti sınırsız değil: lifi düşük, karbonhidratı yüksek besin uyarı alır', () => {
  // Pirincin lif yoğunluğu 10 g/1000 kcal, yani 14 eşiğinin altında: muaf değil.
  // 70 g kuru pirinçte 53 g net karbonhidrat var.
  const s = riskHesapla(pirinc, { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(s.riskler.some((r) => r.nutrient === 'netCarbs'), 'Karbonhidrat uyarısı olmalı');
});

test('FSA porsiyon kuralı: 100 g altı porsiyonda 100 g ölçütü yine de çalışır', () => {
  // Sucuk 30 g porsiyon: porsiyonda 291 mg sodyum (720 sınırının altında)
  // ama 100 g'da 971 mg (600 sınırının üstünde) -> yine de RİSKLİ olmalı.
  const s = riskHesapla(sucuk, { allergies: [], diseases: ['hipertansiyon'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  const bulgu = s.riskler.find((r) => r.nutrient === 'sodiumMg');
  dogru(bulgu.mesaj.includes('100 gram'), '100 g ölçütünden gelmeli, porsiyondan değil');
});

test('Her kuralın kaynağı ve gerekçesi bulguya taşınır', () => {
  const s = riskHesapla(bal, { allergies: [], diseases: ['diyabet'] }, kurallar);
  const bulgu = s.riskler[0];
  dogru(Boolean(bulgu.kaynak), 'Bulguda kaynak anahtarı olmalı');
  dogru(Boolean(bulgu.kaynakNot), 'Bulguda "bu sayı nereden geliyor" açıklaması olmalı');
});

// ---------------------------------------------------------------------------
// DOYMAMIŞ YAĞ ORANI — "gösterilen sayı" ile "verilen karar" ayrı.
//
// 2 Ekim 2026: bu oran eskiden (yağ - doymuş)/yağ ile tahmin ediliyordu ve
// kullanıcıya olumlu bulgu olarak gösteriliyordu ("Yağının %86'sı doymamış").
// Tahmin oranı FAZLA gösteriyor: paydadaki toplam yağ, yağ asidi olmayan
// kütleyi de içeriyor. Margarinde ölçümle doğrulandı — tahmin %72,82, ölçüm
// %70,58. Artık:
//   GÖSTERİLEN SAYI  -> yalnızca ölçümden (TürKomp'un MUFA/PUFA toplamları).
//                       Ölçüm yoksa hiçbir yüzde iddia edilmiyor.
//   VERİLEN KARAR    -> muafiyet, ölçüm yoksa tahminle de verilebiliyor ama
//                       eşiğe 3 puan pay eklenerek (fazla gösterme payda eriyor).
// ---------------------------------------------------------------------------

test('Zeytinyağı kolesterolde hem uyarı hem ÖLÇÜLEN olumlu bulgu alır', () => {
  // TürKomp 05.02.0010: doymuş 15,860 / tekli doymamış 68,669 / çoklu 10,908.
  //     (68,669 + 10,908) / (15,860 + 68,669 + 10,908) = %83,38
  // Kılavuzun en güçlü önerisi doymuş yağı doymamışla DEĞİŞTİRMEK olduğu için
  // zeytinyağını en yüksek risk seviyesinde göstermek o öneriyle çelişirdi.
  const s = riskHesapla(zeytinyagi, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  dogru(s.seviye !== 'RISKLI', `Zeytinyağı RİSKLİ olmamalı, seviye: ${s.seviye}`);
  dogru(s.riskler.length >= 1, 'Yine de bir uyarı görünmeli (doymuş yağ enerji payı)');
  const fayda = s.faydalar.find((f) => f.nutrient === 'unsaturatedFatPct');
  dogru(fayda, 'Ölçüm girildiğine göre olumlu bulgu da görünmeli');
  esit(fayda.deger, 83.38);
});

test('Ölçümü olmayan hiçbir besin doymamış yağ muafiyeti ALMIYOR', () => {
  // Bu test besin adına bağlı DEĞİL, bilerek: önce "Antep fıstığı RİSKLİ kalır"
  // diye yazmıştım ve o besnin ölçümü girilince kendi testim patladı. Korunması
  // gereken şey bir besnin durumu değil, ilkenin kendisi.
  //
  // İLKE: doymamış yağ muafiyeti yalnızca ÖLÇÜLEN orana verilir. Tahminle
  // vermeyi denedik ve bıraktık — payı veriden türetemedik (ceviz sayfasında
  // fazla gösterme 2,91 puan çıktı, koyduğumuz 3 puanlık payın kıl payı
  // altında; o oranla payın 8,8 puan olması gerekirdi).
  //
  // Yani: ölçümü olmayan ve 100 g'da 5 g'dan fazla doymuş yağ taşıyan bir
  // besin, tahmini oranı ne kadar yüksek olursa olsun muafiyet almaz.
  const kacanlar = [];
  [...besinler.values()].forEach((x) => {
    if (x.monounsaturatedFat !== null && x.polyunsaturatedFat !== null) return;
    if (x.saturatedFat === null || x.saturatedFat <= 5) return;
    const s = riskHesapla(x, { allergies: [], diseases: ['kolesterol'] }, kurallar);
    const kuralTetiklendi = s.riskler.some((r) => r.nutrient === 'saturatedFat');
    if (!kuralTetiklendi) kacanlar.push(x.name);
  });
  dogru(kacanlar.length === 0,
    `Ölçümü olmadan doymuş yağ kuralından muaf tutulan besin(ler): ${kacanlar.join(', ')}`);
});

test('Ölçülen doymamış yağ değeri varsa olumlu bulgu çıkıyor (margarin)', () => {
  // Margarin TürKomp'ta tekli (17,152) ve çoklu (22,566) doymamış toplamlarıyla
  // veriliyor; doymuş 16,552, trans 0. Ölçülen oran:
  //     (17,152 + 22,566 - 0) / (16,552 + 17,152 + 22,566) = %70,58
  const margarin = b('Margarin');
  const s = riskHesapla(margarin, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  const fayda = s.faydalar.find((f) => f.nutrient === 'unsaturatedFatPct');
  dogru(fayda, 'Ölçüm varken olumlu bulgu görünmeli');
  esit(fayda.deger, 70.58);
});

test('Ölçüm yoksa doymamış yağ yüzdesi İDDİA EDİLMİYOR', () => {
  // Bu testin koruduğu ilke: kullanıcıya gösterilen her yüzde bir ölçüme
  // dayanmalı. Ölçülen MUFA/PUFA'sı olmayan bir besin, muafiyeti tahminle
  // alabilir ama "yağının %X'i doymamış" diye bir sayı GÖSTEREMEZ.
  const iddiaEdenler = [];
  [...besinler.values()].forEach((x) => {
    const olcumVar = x.monounsaturatedFat !== null && x.polyunsaturatedFat !== null;
    if (olcumVar) return;
    const s = riskHesapla(x, { allergies: [], diseases: ['kolesterol'] }, kurallar);
    if (s.faydalar.some((f) => f.nutrient === 'unsaturatedFatPct')) iddiaEdenler.push(x.name);
  });
  dogru(iddiaEdenler.length === 0,
    `Ölçümü olmadan doymamış yağ yüzdesi gösteren besin(ler): ${iddiaEdenler.join(', ')}`);
});

test('Tereyağı muafiyet ALMIYOR, RİSKLİ kalıyor', () => {
  // Karşı örnek: tereyağının tahmini oranı ~%35, eşik+payın çok altında.
  // Muafiyet mekanizması "yağ olan her şeyi aklama" aracı değil.
  const s = riskHesapla(tereyagi, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'saturatedFat'),
    'Doymuş yağ kuralı tereyağında tetiklenmeli');
});

test('Reflüde hiçbir besin RİSKLİ işaretlenmez (ACG 2022: kanıt zayıf, kişiselleştirilmeli)', () => {
  const s = riskHesapla(zeytinyagi, { allergies: [], diseases: ['reflu'] }, kurallar);
  dogru(s.seviye !== 'RISKLI', 'Reflüde RİSKLİ seviyesi kullanılmamalı');
});

test('Hazır gıda kategorisi diyabette uyarı alır (eşiklerden sıyrılmasın)', () => {
  const s = riskHesapla(yaprakSarma, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'DIKKAT');
  dogru(s.riskler.some((r) => !r.nutrient), 'Uyarı besin değerinden değil kategoriden gelmeli');
});

test('Zeytinyağı diyabette yağ kuralına takılmaz (porsiyon 1 yemek kaşığı)', () => {
  const s = riskHesapla(zeytinyagi, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('IBS: değerlendirilemez, "uygun" denmez, bilgi notu düşer', () => {
  const s = riskHesapla(pirasa, { allergies: [], diseases: ['ibs'] }, kurallar);
  dogru(s.bilgiNotlari.length === 1, 'Bilgi notu olmalı');
  dogru(s.bilgiNotlari[0].mesaj.includes('FODMAP'), 'Not FODMAP açıklaması içermeli');
});

test('Eksik veri sessizce "sorun yok" sayılmaz', () => {
  const eksikBesin = { ...pirasa, sugars: null, fiber: null };
  const s = riskHesapla(eksikBesin, { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(s.bilgiNotlari.length === 1, 'Eksik veri notu düşmeli');
});

test('Diyabetli için makarna RİSKLİ (80 g kuru makarnada 60 g net karbonhidrat)', () => {
  const s = riskHesapla(makarna, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler[0].mesaj.includes('net karbonhidrat'), 'Karbonhidrat uyarısı olmalı');
});

test('Diyabetli için pirinç RİSKLİ (porsiyon başına çok yüksek karbonhidrat)', () => {
  const s = riskHesapla(pirinc, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI');
});

test('Diyabetli için pırasa hâlâ UYGUN (düşük karbonhidratlı sebze elenmemeli)', () => {
  const s = riskHesapla(pirasa, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('Vegan kullanıcı için yoğurt DİYET DIŞI (kart rengi değişir)', () => {
  const s = riskHesapla(yogurt, { allergies: [], diseases: [], diet: 'Vegan' }, kurallar);
  esit(s.seviye, 'DIYET_DISI');
  dogru(s.diyetUyarilari.length > 0, 'Vegan uyarısı olmalı');
});

test('Vejetaryen yumurta yiyebilir ama balık yiyemez', () => {
  const y = riskHesapla(yumurta, { allergies: [], diseases: [], diet: 'Vejetaryen' }, kurallar);
  esit(y.seviye, 'UYGUN', 'Yumurta vejetaryene uygun:');
  const s = riskHesapla(hamsi, { allergies: [], diseases: [], diet: 'Vejetaryen' }, kurallar);
  esit(s.seviye, 'DIYET_DISI', 'Balık vejetaryene uygun değil:');
});

test('Pesketaryen balık yiyebilir', () => {
  const s = riskHesapla(hamsi, { allergies: [], diseases: [], diet: 'Pesketaryen' }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('Vegan için bal da diyet dışı', () => {
  // Balın 'bal' diyet etiketi artık veride hazır geliyor; testte elle eklemiyoruz.
  dogru(bal.dietTags.includes('bal'), 'Bal verisinde "bal" diyet etiketi olmalı');
  const s = riskHesapla(bal, { allergies: [], diseases: [], diet: 'Vegan' }, kurallar);
  esit(s.seviye, 'DIYET_DISI');
});

test('Alerji, diyet uyarısından da ağır basar', () => {
  const s = riskHesapla(yogurt, { allergies: ['milk'], diseases: [], diet: 'Vegan' }, kurallar);
  esit(s.seviye, 'ALERJEN');
});

test('Alerji, hastalık riskinden daha ağır basar', () => {
  const s = riskHesapla(beyazEkmek, { allergies: ['gluten'], diseases: ['hipertansiyon'] }, kurallar);
  esit(s.seviye, 'ALERJEN');
});

test('Ölçülmemiş doymuş yağ, toplam yağ küçükse besni DİKKAT\'e çekmez', () => {
  // TürKomp yağ asidi dağılımını sadece yağlı besinlerde ölçüyor; ayvanın
  // sayfasında "doymuş yağ" satırı hiç yok. Ama toplam yağı 0,14 g olduğu için
  // doymuş yağı da en fazla 0,14 g olabilir — kolesterol kurallarının en alt
  // eşiği "100 g'da 1,5 g'dan fazla" olduğundan bunu aşması imkânsız.
  // Birleştirme betiği bu yüzden en kötü durumu (toplam yağ) yazıyor.
  esit(ayva.saturatedFat, ayva.fat, 'Doymuş yağ, toplam yağ üst sınırıyla dolmalı:');
  const s = riskHesapla(ayva, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  esit(s.seviye, 'UYGUN');
  dogru(!s.riskler.some((r) => r.nutrient === 'saturatedFat'), 'Doymuş yağ uyarısı olmamalı');
});

test('Tereyağı kolesterolde RİSKLİ (100 g\'da 54 g doymuş yağ)', () => {
  const s = riskHesapla(tereyagi, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'saturatedFat'), 'Doymuş yağ uyarısı olmalı');
});

test('Sofra tuzu hipertansiyonda RİSKLİ', () => {
  const s = riskHesapla(sofraTuzu, { allergies: [], diseases: ['hipertansiyon'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'sodiumMg'), 'Sodyum uyarısı olmalı');
});

test('Toz şeker diyabette RİSKLİ (neredeyse tamamı sakaroz)', () => {
  const s = riskHesapla(tozSeker, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'sugars'), 'Şeker uyarısı olmalı');
});

test('Yulaf diyabette cezalandırılmaz, lif faydası alır', () => {
  // Evert 2019 (s.736) tam taneli tahılları diyabette açıkça öneriyor.
  const s = riskHesapla(yulaf, { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'UYGUN');
  dogru(s.faydalar.some((f) => f.nutrient === 'fiberPer1000kcal'), 'Lif faydası görünmeli');
});

test('Kuru baklagil diyabette muaf (kuru fasulye)', () => {
  const s = riskHesapla(kuruFasulye, { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(!s.riskler.some((r) => r.nutrient === 'netCarbs'), 'Karbonhidrat uyarısı olmamalı');
  dogru(s.faydalar.some((f) => f.nutrient === 'fiberPer1000kcal'), 'Lif faydası görünmeli');
});

test('Dana ciğeri kansızlıkta demir kaynağı sayılır', () => {
  const s = riskHesapla(danaCigeri, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  dogru(s.faydalar.some((f) => f.nutrient === 'ironMg'), 'Demir faydası görünmeli');
});

test('C vitamini kansızlıkta olumlu bulgu verir (portakal)', () => {
  // Pişkin 2022: C vitamini, bitkisel kaynaklı demirin emilimini artırıyor.
  const s = riskHesapla(portakal, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  dogru(s.faydalar.some((f) => f.nutrient === 'vitaminCMg'), 'C vitamini faydası görünmeli');
});

// --- Glisemik yük ---
//
// TürKomp glisemik indeksi ölçüyor. Elimizde ölçüm varsa
// glisemik yükü HESAPLIYORUZ; yoksa net karbonhidratı üst sınır olarak
// kullanıyoruz. Aşağıdaki testler ikisinin birbirinin yerine çalıştığını,
// çift uyarı vermediğini ve ölçümün vekili ezdiğini doğruluyor.
//
// Not: veritabanındaki hiçbir besinde henüz glisemik indeks yok (TürKomp'ta
// ölçülü olanları girmemiz gerekiyor). Bu yüzden testler gerçek bir besnin
// üstüne indeks EKLEYEREK senaryo kuruyor — besin değerleri gerçek, sadece
// indeks senaryo gereği veriliyor.

test('Glisemik indeks yoksa net karbonhidrat üst sınır olarak çalışır', () => {
  dogru(lavas.glycemicIndex == null, 'Lavaşın glisemik indeksi henüz girilmemiş olmalı');
  const s = riskHesapla(lavas, { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(s.riskler.some((r) => r.nutrient === 'netCarbs'),
    'Porsiyonda 34 g net karbonhidrat var; indeks bilinmediği için uyarı net karbonhidrattan gelmeli');
});

test('Ölçülmüş düşük glisemik indeks, net karbonhidrat uyarısını kaldırır', () => {
  // Lavaşın porsiyonunda 34,5 g net karbonhidrat var — vekil kurala göre DİKKAT.
  // Ama glisemik indeksi 40 ise gerçek glisemik yük 13,8 olur; Venn & Green
  // sınıflamasında bu "orta", "yüksek" değil. Ölçüm tahmini ezer.
  const s = riskHesapla({ ...lavas, glycemicIndex: 40 },
    { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(!s.riskler.some((r) => r.nutrient === 'netCarbs'),
    'Gerçek glisemik yük biliniyorken vekil kural çalışmamalı');
  dogru(!s.riskler.some((r) => r.nutrient === 'glycemicLoad'),
    'Glisemik yük 13,8 — 20 eşiğinin altında, uyarı olmamalı');
});

test('Ölçülmüş yüksek glisemik indeks uyarıyı glisemik yükten verir, çift yazmaz', () => {
  // Aynı lavaş, indeks 70 -> glisemik yük 24,2 -> "yüksek".
  const s = riskHesapla({ ...lavas, glycemicIndex: 70 },
    { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'DIKKAT');
  dogru(s.riskler.some((r) => r.nutrient === 'glycemicLoad'), 'Uyarı glisemik yükten gelmeli');
  dogru(!s.riskler.some((r) => r.nutrient === 'netCarbs'),
    'Aynı şey iki kez uyarı vermemeli');
});

test('Bir öğünlük karbonhidrat kuralı glisemik indeksten bağımsız', () => {
  // 80 g kuru makarnada 59,5 g net karbonhidrat var. Bu kural glisemik yükle
  // değil, karbonhidrat sayımıyla ilgili (Amorim 2024: 45 g ~ 3 değişim),
  // o yüzden indeks bilinse de yerinde kalmalı.
  const s = riskHesapla({ ...makarnaKuru, glycemicIndex: 40 },
    { allergies: [], diseases: ['diyabet'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'netCarbs' && r.deger >= 45),
    'Öğünlük karbonhidrat uyarısı durmalı');
});

test('Kurallarda kullanılan her alan KURAL_ALANLARI tablosunda tanımlı', () => {
  // Bu test somut bir hatayı bir daha yaşamamak için var: muafLifYogunlugu ve
  // muafDoymamisOran bu dosyada tanımlıydı ama seed.js veritabanına yazmıyor,
  // index.js geri okumuyordu. Testler HASTALIKLAR'ı doğrudan okuduğu için
  // geçiyordu, API ise muafiyetsiz çalışıyordu. Yeni bir alan eklenip
  // tabloya yazılmazsa artık burada patlar.
  const tanimli = new Set(Object.keys(KURAL_ALANLARI));
  const kullanilan = new Set();
  HASTALIKLAR.forEach((h) => (h.rules || []).forEach((k) => {
    Object.keys(k).forEach((a) => kullanilan.add(a));
  }));
  const eksik = [...kullanilan].filter((a) => !tanimli.has(a));
  dogru(eksik.length === 0,
    `KURAL_ALANLARI'na eklenmemiş alan(lar): ${eksik.join(', ')} — schema.prisma'ya da sütun gerekiyor`);
});

test('Üst sınır argümanı tek yönlü çalışıyor: 20 g altı, indeks 100 olsa bile yüksek değil', () => {
  // Kuralın dayandığı mantığın kendisini test ediyoruz:
  //   glisemik yük = glisemik indeks x net karbonhidrat / 100  ve  indeks <= ~100
  //   => net karbonhidrat 20 g'ın altındaysa glisemik yük "yüksek" (>=20) ÇIKAMAZ.
  // Beyaz ekmeğin 35 g diliminde 17,5 g net karbonhidrat var. İndeksi mümkün olan
  // en yüksek değere (100) çeksek bile glisemik yük 17,5 kalır, eşiğin altında.
  // Bu yön sağlam. TERSİ sağlam DEĞİL: 20 g'ı geçmek glisemik yükün yüksek
  // olduğunu kanıtlamaz, sadece elenemediğini gösterir — net karbonhidrat kuralı
  // bu yüzden RİSKLİ değil DİKKAT veriyor ve kaynağı Amorim 2024 (karbonhidrat
  // miktarı), Venn & Green değil.
  const enKotuDurum = { ...beyazEkmek, glycemicIndex: 100 };
  const s = riskHesapla(enKotuDurum, { allergies: [], diseases: ['diyabet'] }, kurallar);
  dogru(!s.riskler.some((r) => r.nutrient === 'glycemicLoad'),
    '17,5 g net karbonhidratta glisemik yük 20 eşiğini aşamaz');
});

// ---------------------------------------------------------------------------
// KAFEİN — değerler TürKomp'ta YOK, EFSA 2015 Tablo 1'den dışarıdan girildi.
// ---------------------------------------------------------------------------

test('Siyah çay kansızlıkta kafein uyarısı veriyor', () => {
  // Kafein non-hem demir emilimini düşürüyor (Pişkin 2022). Değer TürKomp'ta
  // ölçülmediği için EFSA 2015 Tablo 1'den çevrildi: siyah çay 220 mg/L,
  // 2 g kuru çay -> 200 mL demleme varsayımıyla 2200 mg/100 g kuru çay.
  const siyahCay = b('Siyah çay (kuru)');
  dogru(siyahCay.caffeineMg > 0, 'Siyah çayın kafein değeri girilmiş olmalı');
  const s = riskHesapla(siyahCay, { allergies: [], diseases: ['kansizlik'] }, kurallar);
  dogru(s.riskler.some((r) => r.nutrient === 'caffeineMg'),
    'Kafein kuralı tetiklenmeli — veri girilmeden bu kural hiç çalışmıyordu');
});

test('Kola reflüde kafein uyarısı veriyor', () => {
  // Bucan 2025: kafeinli içecekler alt özofagus sfinkter basıncını düşürüyor.
  const kola = b('Kola');
  esit(kola.caffeineMg, 10.8); // EFSA 'Cola beverages (caffeinated)' 108 mg/L — DOĞRUDAN
  const s = riskHesapla(kola, { allergies: [], diseases: ['reflu'] }, kurallar);
  dogru(s.riskler.some((r) => r.nutrient === 'caffeineMg'),
    'Reflüde kafein uyarısı çıkmalı');
});

test('Domatesin kafeini sıfır — ad benzerliği yanlış değer üretmiyor', () => {
  // GERİLEME TESTİ: kafeinli bitki adlarını ararken "içinde geçiyor mu" diye
  // baktığımız sürüm "do-MATE-s" kelimesini yerba MATE sanıyor ve domatesin
  // kafein hücresini boş bırakıyordu. Boş kalması zararsız değil: kafein
  // kuralı kritik olmasa da hücre boş kaldıkça "veri eksik" kartı çıkıyor.
  ['Domates', 'Kuru domates', 'Domates salçası'].forEach((ad) => {
    esit(b(ad).caffeineMg, 0);
  });
});

test('Kafein hücresi yalnızca GEREKÇESİ YAZILMIŞ besinlerde boş', () => {
  // Kafein, bitkisel kaynağı olmayan besinlerde ölçüm gerektirmiyor: sıfır
  // olduğunu biliyoruz. Bu yüzden boş bırakmak yerine 0 yazıyoruz; boş kalan
  // bir hücre kullanıcıya gereksiz "veri eksik" uyarısı olarak dönüyor.
  //
  // Tek istisna: kakao/çikolata/çay gibi kafein TAŞIDIĞI KESİN ama miktarı
  // kaynaklandıramadığımız besinler (örn. kakao kremalı gofret — EFSA 2015
  // Tablo 1'de karşılığı yok). Orada 0 yazmak yanlış olur, üst sınır yazmak da
  // yanlış olur (eşik 1 mg/100 g, üst sınır yanlış uyarı üretir).
  //
  // Bu testin kuralı: boş bir kafein hücresi ancak GEREKÇESİ kaynak metnine
  // yazılmışsa kabul edilir. Gerekçe verinin yanında durduğu için kullanıcı da
  // besin kartında okuyor. İzin verilen besinlerin listesini buraya kopyalamak
  // bilgiyi iki yerde yaşatmak olurdu — o desen bu projede muafiyet hatasını
  // doğurmuştu.
  const gerekcesiz = [...besinler.values()].filter(
    (x) => x.caffeineMg === null && !/Kafein değeri girilmedi/.test(x.source || ''));
  dogru(gerekcesiz.length === 0,
    `Kafeini gerekçesiz boş kalan besin(ler): ${gerekcesiz.map((x) => x.name).join(', ')}`);
});

// ---------------------------------------------------------------------------
// TRANS YAĞ — TürKomp toplam trans yağı ölçmüyor, yalnızca elaidik asidi.
// Değer ALT SINIR: tetiklenmesi sağlam, sessiz kalması temiz demek değil.
// ---------------------------------------------------------------------------

test('Hiçbir besin trans yağ yüzünden RİSKLİ olmuyor', () => {
  // Kuralın seviyesi bilerek DİKKAT: (1) TürKomp toplam trans yağı değil
  // elaidik asidi veriyor, yani değer ALT SINIR; (2) de Souza 2015 kalp
  // hastalığı riskini yalnızca SANAYİ kaynaklı trans yağda buluyor
  // (RR 1,42; 1,05-1,92), hayvansal kaynaklıda bulamıyor (RR 0,93; 0,73-1,18)
  // ve TürKomp'un tek sayısından kaynağı ayırt edemiyoruz.
  //
  // Bu test tek bir besne değil, TÜM veritabanına bakıyor: trans yağ hiçbir
  // yerde RİSKLİ üretmemeli. Önce "Eski kaşarda DİKKAT çıkmalı" diye
  // yazmıştım; o besin sonradan doymuş yağdan RİSKLİ alınca test kırıldı.
  // Korunması gereken şey bir besnin durumu değil, kuralın seviyesi.
  const riskliler = [];
  [...besinler.values()].forEach((x) => {
    const s = riskHesapla(x, { allergies: [], diseases: ['kolesterol'] }, kurallar);
    s.riskler.forEach((r) => {
      if (r.nutrient === 'transFat' && (r.seviye === 'RISKLI' || r.seviye === 'DIYET_DISI')) {
        riskliler.push(`${x.name} (${r.seviye})`);
      }
    });
  });
  dogru(riskliler.length === 0,
    `Trans yağ yüzünden RİSKLİ işaretlenen besin(ler): ${riskliler.join(', ')}`);
});

test('Balık kolesterolde RİSKLİ ise sebebi trans yağ DEĞİL, doymuş yağ', () => {
  // Lüfer kolesterolde RİSKLİ görünüyor ve bu DOĞRU: 150 g'lık porsiyonunda
  // 6,87 g doymuş yağ var, FSA türevi eşik porsiyonda 6 g.
  //
  // Doymamış yağ muafiyeti ona UYGULANMIYOR ve bu da ölçüm olmadan kesin
  // biliniyor: tahmini oranı %69,1 ve tahmin ÜST SINIR olduğu için gerçek oran
  // da %70'in altında. Tek yönlü çıkarım, sağlam taraf.
  //
  // Yasak olan şey farklı: balığı TRANS YAĞ yüzünden riskli göstermek.
  // Kural RİSKLİ iken uygulama tam bunu yapıyordu.
  const lufer = b('Lüfer (çiğ)');
  const s = riskHesapla(lufer, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  dogru(!s.riskler.some((r) => r.nutrient === 'transFat' && r.seviye === 'RISKLI'),
    'Balık trans yağ yüzünden RİSKLİ olmamalı');
  dogru(s.riskler.every((r) => r.seviye !== 'RISKLI' || r.nutrient === 'saturatedFat'),
    'RİSKLİ bulgusu varsa doymuş yağdan olmalı');
});

test('Daha ciddi bulgu, önce gelen hafif bulguyu DEĞİŞTİRİYOR', () => {
  // GERİLEME TESTİ — 2 Ekim 2026. Motor hastalık başına tek risk gösteriyor ve
  // "en ciddisini" seçmesi gerekiyordu. Kod şöyleydi:
  //     } else if (!enCiddiRisk || dahaCiddi(...) === kural.seviye) {
  //         if (!enCiddiRisk) enCiddiRisk = bulgu;   // <-- hiçbir şey yapmıyor
  //     }
  // Dış koşul doğru karar veriyor, iç if değiştirmeyi reddediyordu. Yani bir
  // risk kaydedildikten sonra DAHA CİDDİ bir risk sessizce düşüyordu —
  // seviyeyi olduğundan HAFİF gösteren bir hata.
  //
  // Gerekçe "kurallar dosyasında RISKLI'ler DIKKAT'ten önce yazılı" idi; o
  // varsayım trans yağ kuralı DİKKAT'e çevrilince çöktü. Eski kaşarda
  // kolesterolün 0. kuralı (trans yağ, DİKKAT) artık 1. kuraldan (doymuş yağ,
  // RİSKLİ) önce geliyor ve kaşar RİSKLİ yerine DİKKAT görünüyordu.
  const eskiKasar = b('Eski kaşar');
  const s = riskHesapla(eskiKasar, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  esit(s.seviye, 'RISKLI');
  dogru(s.riskler.some((r) => r.nutrient === 'saturatedFat' && r.seviye === 'RISKLI'),
    '100 g\'da 15,15 g doymuş yağ: RİSKLİ bulgusu görünmeli');
});

test('Trans yağ sayısı gösterilen her besin elaidik asit uyarısını taşıyor', () => {
  // TürKomp'tan OKUNAN trans yağ değeri gösteriliyorsa, o sayının toplam trans
  // yağ olmadığı kullanıcıya söylenmek zorunda.
  const eksik = [...besinler.values()].filter((x) =>
    x.transFat !== null && x.fat > 0 && !/elaidik/.test(x.source || ''));
  dogru(eksik.length === 0,
    `Elaidik asit uyarısı eksik besin(ler): ${eksik.map((x) => x.name).join(', ')}`);
});

test('Yağı sıfır olan besinler elaidik asit uyarısı ALMIYOR', () => {
  // Oradaki trans yağ sıfırı bizim aritmetiğimiz: "toplam yağ sıfırsa hiçbir
  // yağ asidi olamaz". Bu çıkarım TAM, alt sınır değil — belirsizlik uyarısı
  // yazmak kullanıcıya olmayan bir kuşku satmak olurdu.
  const yanlisUyarilan = [...besinler.values()].filter((x) =>
    x.fat === 0 && /elaidik/.test(x.source || ''));
  dogru(yanlisUyarilan.length === 0,
    `Gereksiz uyarı taşıyan besin(ler): ${yanlisUyarilan.map((x) => x.name).join(', ')}`);
});

test('Kafeini dışarıdan girilen besinler EFSA atfını taşıyor', () => {
  // Tek kaynak (TürKomp) ilkesinden bilinçli sapma. Sapma GÖRÜNÜR olmalı:
  // bu 6 besnin kartında kafein değerinin nereden geldiği yazıyor.
  ['Kola', 'Bitter çikolata', 'Sütlü çikolata',
    'Siyah çay (kuru)', 'Hazır kahve (toz)', 'Türk kahvesi (toz)'].forEach((ad) => {
    dogru(/EFSA/.test(b(ad).source), `${ad} kartında EFSA atfı yok`);
  });
});

// ---------------------------------------------------------------------------
// OMEGA-3 — AB Tüzüğü 116/2010'un "ve" bağlacı korunuyor mu?
// ---------------------------------------------------------------------------

test('Omega-3 kaynağı ölçütü İKİ koşulu birlikte istiyor', () => {
  // Tüzüğün sözü: "at least 40 mg of the sum of eicosapentaenoic acid and
  // docosahexaenoic acid per 100 g AND per 100 kcal".
  //
  // Bu testteki besinler GERÇEK DEĞİL, mekanizmayı sınamak için kurgulanmış.
  // Sebebi: tüzüğün "ve"sini iki ayrı kurala bölsek her biri tek başına
  // tetiklenir ve yüksek kalorili bir besin yalnızca 100 g ölçütünü geçtiği
  // için "omega-3 kaynağı" sayılırdı. Motor iki değerin KÜÇÜĞÜNÜ alıyor.
  const temel = {
    name: 'kurgu', category: 'Et-Balık', portionGrams: 100,
    allergens: [], traces: [], dietTags: [],
    fat: 5, saturatedFat: 1, carbohydrates: 0, sugars: 0, fiber: 0,
  };

  // 100 g'da 50 mg var (>=40 ✓) ama kalorisi yüksek: 100 kcal'de 10 mg (<40 ✗)
  const kaloriliBesin = { ...temel, epa: 0.030, dha: 0.020, kcal: 500 };
  const s1 = riskHesapla(kaloriliBesin, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  dogru(!s1.faydalar.some((f) => f.nutrient === 'epaDhaMgMin'),
    '100 kcal ölçütünü geçmeyen besin "omega-3 kaynağı" sayılmamalı');

  // 100 g'da 100 mg (>=40 ✓), 100 kcal'de 50 mg (>=40 ✓)
  const uygunBesin = { ...temel, epa: 0.060, dha: 0.040, kcal: 200 };
  const s2 = riskHesapla(uygunBesin, { allergies: [], diseases: ['kolesterol'] }, kurallar);
  const fayda = s2.faydalar.find((f) => f.nutrient === 'epaDhaMgMin');
  dogru(fayda, 'İki ölçütü de geçen besin "omega-3 kaynağı" sayılmalı');
  esit(fayda.deger, 50);   // küçük olan değer gösteriliyor
});

test('EPA/DHA verisi olmayan besin omega-3 faydası ALMIYOR', () => {
  // Hiçbir besne henüz EPA/DHA girilmedi; kural hazır, veri bekliyor.
  // Veri gelmeden fayda üretirse ölçmediğimiz bir şeyi iddia etmiş olurduk.
  const iddiaEdenler = [...besinler.values()].filter((x) => {
    if (x.epa !== null && x.dha !== null) return false;
    const s = riskHesapla(x, { allergies: [], diseases: ['kolesterol'] }, kurallar);
    return s.faydalar.some((f) => f.nutrient === 'epaDhaMgMin');
  });
  dogru(iddiaEdenler.length === 0,
    `EPA/DHA verisi olmadan omega-3 faydası alan besin(ler): ${iddiaEdenler.map((x) => x.name).join(', ')}`);
});

// ===========================================================================
// DERİN TARAMA — 2 Ekim 2026
// Buraya kadarki testler belirli besinleri ve belirli hataları sabitliyor.
// Aşağıdakiler farklı bir iş yapıyor: TÜM veriyi ve TÜM kuralları değişmezler
// üzerinden tarıyor. Amaç gözden kaçanı bulmak, o yüzden tek tek besin adı
// yazmıyorlar — yeni besin/kural eklendiğinde kendiliğinden kapsıyorlar.
// ===========================================================================

const TUM_BESINLER = [...besinler.values()];
const TUM_HASTALIKLAR = HASTALIKLAR.map((h) => h.key);

/** Birden fazla ihlali tek testte toplayıp okunur mesajla raporlar. */
function ihlalYok(ihlaller, baslik) {
  dogru(ihlaller.length === 0,
    `${baslik} — ${ihlaller.length} ihlal:\n      ${ihlaller.slice(0, 12).join('\n      ')}`
    + (ihlaller.length > 12 ? `\n      ... ve ${ihlaller.length - 12} tane daha` : ''));
}

// --- A) VERİ BÜTÜNLÜĞÜ ----------------------------------------------------

test('A01 Her besin adı benzersiz', () => {
  const sayac = new Map();
  TUM_BESINLER.forEach((x) => sayac.set(x.name, (sayac.get(x.name) || 0) + 1));
  ihlalYok([...sayac].filter(([, n]) => n > 1).map(([a, n]) => `${a} (${n} kez)`),
    'Aynı ad birden fazla besinde');
});

test('A02 Besin adlarında baştan/sondan boşluk veya çift boşluk yok', () => {
  // Ad eşleştirmesi bu projede kritik: ES_ADLAR ve KAFEINI_DISARIDAN gibi
  // tablolar ada göre çalışıyor, görünmez bir boşluk sessiz eşleşmeme yapar.
  ihlalYok(TUM_BESINLER
    .filter((x) => x.name !== x.name.trim() || /\s\s/.test(x.name))
    .map((x) => `"${x.name}"`), 'Adında fazla boşluk olan besin');
});

test('A03 Porsiyon gramı pozitif ve makul aralıkta', () => {
  // Gözlenen aralık 2 g (toz kahve/çay) - 330 g (kola). 500 g üstü bir porsiyon
  // büyük olasılıkla veri hatasıdır ve porsiyon bazlı kuralları saptırır.
  ihlalYok(TUM_BESINLER
    .filter((x) => !(x.portionGrams > 0 && x.portionGrams <= 500))
    .map((x) => `${x.name}: ${x.portionGrams} g`), 'Porsiyon gramı bozuk');
});

test('A04 Hiçbir besin değeri negatif değil', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => SAYISAL.forEach((alan) => {
    if (x[alan] !== null && x[alan] < 0) ihlal.push(`${x.name}.${alan} = ${x[alan]}`);
  }));
  ihlalYok(ihlal, 'Negatif besin değeri');
});

test('A05 Hiçbir sayısal alan NaN değil', () => {
  // CSV yükleyicide bir sütun adı değişirse Number(undefined) = NaN olur ve
  // NaN bütün karşılaştırmalarda false döner: kural sessizce hiç çalışmaz.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => SAYISAL.forEach((alan) => {
    if (typeof x[alan] === 'number' && Number.isNaN(x[alan])) ihlal.push(`${x.name}.${alan}`);
  }));
  ihlalYok(ihlal, 'NaN değer');
});

test('A06 Şeker karbonhidrattan büyük değil', () => {
  ihlalYok(TUM_BESINLER
    .filter((x) => x.sugars !== null && x.carbohydrates !== null
      && x.sugars > x.carbohydrates + 0.001)
    .map((x) => `${x.name}: şeker ${x.sugars} > karbonhidrat ${x.carbohydrates}`),
  'Şeker, karbonhidratı aşıyor');
});

test('A07 Lif karbonhidrattan büyük değil', () => {
  // CSV sözleşmesi: carbohydrates = TürKomp Karbonhidrat + Lif. Yani lif her
  // zaman karbonhidratın İÇİNDE. Aşarsa birleştirme hatası var demektir.
  ihlalYok(TUM_BESINLER
    .filter((x) => x.fiber !== null && x.carbohydrates !== null
      && x.fiber > x.carbohydrates + 0.001)
    .map((x) => `${x.name}: lif ${x.fiber} > karbonhidrat ${x.carbohydrates}`),
  'Lif, karbonhidratı aşıyor');
});

test('A08 Doymuş yağ toplam yağdan büyük değil', () => {
  ihlalYok(TUM_BESINLER
    .filter((x) => x.saturatedFat !== null && x.fat !== null
      && x.saturatedFat > x.fat + 0.001)
    .map((x) => `${x.name}: doymuş ${x.saturatedFat} > yağ ${x.fat}`),
  'Doymuş yağ, toplam yağı aşıyor');
});

test('A09 Trans yağ toplam yağdan büyük değil', () => {
  ihlalYok(TUM_BESINLER
    .filter((x) => x.transFat !== null && x.fat !== null && x.transFat > x.fat + 0.001)
    .map((x) => `${x.name}: trans ${x.transFat} > yağ ${x.fat}`),
  'Trans yağ, toplam yağı aşıyor');
});

test('A10 Doymuş + tekli + çoklu doymamış, toplam yağı aşmıyor', () => {
  // Üç yağ asidi toplamı toplam yağdan büyük olamaz; büyükse ya sayfa yanlış
  // okunmuş ya varyantlar karışmıştır.
  ihlalYok(TUM_BESINLER
    .filter((x) => x.saturatedFat !== null && x.monounsaturatedFat !== null
      && x.polyunsaturatedFat !== null && x.fat !== null
      && (x.saturatedFat + x.monounsaturatedFat + x.polyunsaturatedFat) > x.fat + 0.001)
    .map((x) => `${x.name}: ${(x.saturatedFat + x.monounsaturatedFat + x.polyunsaturatedFat).toFixed(2)} > yağ ${x.fat}`),
  'Yağ asitleri toplamı, toplam yağı aşıyor');
});

test('A11 EPA + DHA, çoklu doymamış yağı aşmıyor', () => {
  // EPA ve DHA çoklu doymamış yağ asitleridir, yani onun İÇİNDE sayılırlar.
  ihlalYok(TUM_BESINLER
    .filter((x) => x.epa !== null && x.dha !== null && x.polyunsaturatedFat !== null
      && (x.epa + x.dha) > x.polyunsaturatedFat + 0.001)
    .map((x) => `${x.name}: EPA+DHA ${(x.epa + x.dha).toFixed(3)} > çoklu doymamış ${x.polyunsaturatedFat}`),
  'EPA+DHA, çoklu doymamış yağı aşıyor');
});

test('A12 Kalori, makro besin öğeleriyle tutarlı', () => {
  // Atwater: 4 kcal/g protein, 4 kcal/g sindirilebilir karbonhidrat,
  // 9 kcal/g yağ, 2 kcal/g lif.
  // TOLERANS GEREKÇESİ: 155 besinde ölçülen medyan sapma %0,1, en büyük sapma
  // %12 ve o da 1 kcal'lik sofra tuzunda (yuvarlama gürültüsü). Bu yüzden
  // "%15 VEYA 3 kcal" toleransı veriden türetildi, uydurulmadı.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => {
    if ([x.proteins, x.carbohydrates, x.fat, x.kcal].some((v) => v === null)) return;
    if (!x.kcal) return;
    const lif = x.fiber || 0;
    const hesap = 4 * x.proteins + 4 * Math.max(0, x.carbohydrates - lif) + 9 * x.fat + 2 * lif;
    const fark = Math.abs(hesap - x.kcal);
    if (fark > 3 && (fark / x.kcal) > 0.15) {
      ihlal.push(`${x.name}: etiket ${x.kcal} kcal, makrolardan ${hesap.toFixed(0)} kcal`);
    }
  });
  ihlalYok(ihlal, 'Kalori makrolarla tutarsız');
});

test('A13 Her besnin kategorisi tanımlı listede', () => {
  // Liste bilerek elle yazılı: veriden türetsek test hiçbir şey denetlemez,
  // yazım hatasıyla eklenen yeni bir kategori ("Sebzeler") sessizce geçerdi.
  // Kategoriler kurallarda da kullanılıyor (kategori bazlı kurallar).
  const GECERLI = new Set(['Sebze', 'Meyve', 'Tahıl', 'Et-Balık', 'Süt Ürünleri',
    'Baklagil', 'Kuruyemiş', 'Yağ', 'Tatlı', 'İçecek', 'Sos & Baharat', 'Hazır Gıda']);
  ihlalYok(TUM_BESINLER.filter((x) => !GECERLI.has(x.category))
    .map((x) => `${x.name}: "${x.category}"`), 'Tanımsız kategori');
});

test('A14 Alerjen kodları ALERJENLER sözlüğünde tanımlı', () => {
  // Yazım hatalı bir alerjen kodu ("mılk") hiçbir kullanıcı alerjisiyle
  // eşleşmez ve uyarı sessizce hiç çıkmaz — tehlikeli yön.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => {
    [...(x.allergens || []), ...(x.traces || [])].forEach((a) => {
      if (!ALERJENLER[a]) ihlal.push(`${x.name}: "${a}"`);
    });
  });
  ihlalYok(ihlal, 'Tanımsız alerjen kodu');
});

test('A15 Diyet etiketleri ETIKET_ADI sözlüğünde tanımlı', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => (x.dietTags || []).forEach((e) => {
    if (!ETIKET_ADI[e]) ihlal.push(`${x.name}: "${e}"`);
  }));
  ihlalYok(ihlal, 'Tanımsız diyet etiketi');
});

test('A16 Her besin TürKomp atfını taşıyor', () => {
  // TürKomp verisi kullanıldığında atıf göstermek ZORUNLU (veri kullanım
  // şartı). Atıf besnin source alanından geliyor, yani boş kalamaz.
  ihlalYok(TUM_BESINLER
    .filter((x) => !/turkomp/i.test(x.source || ''))
    .map((x) => x.name), 'TürKomp atfı olmayan besin');
});

test('A17 Kalori pozitif', () => {
  ihlalYok(TUM_BESINLER.filter((x) => !(x.kcal > 0)).map((x) => `${x.name}: ${x.kcal}`),
    'Kalorisi sıfır/boş besin');
});

test('A18 Glisemik indeks makul aralıkta', () => {
  // Glisemik indeks glukoz=100 referansına göre tanımlı; 110 üstü bir değer
  // ölçüm değil veri hatasıdır.
  ihlalYok(TUM_BESINLER
    .filter((x) => x.glycemicIndex !== null && (x.glycemicIndex < 0 || x.glycemicIndex > 110))
    .map((x) => `${x.name}: ${x.glycemicIndex}`), 'Glisemik indeks aralık dışı');
});

// --- B) KURAL META-VERİSİ -------------------------------------------------
// Bu projenin sözü: "sonrasında bu verilerin nereden nasıl geldiğini hangi
// kurala dayandığını açıklamam gerekebilir". Aşağıdakiler o sözü kodla
// zorunlu kılıyor — kaynaksız ya da izi sürülemeyen kural eklenemez.

/** Tüm kuralları (hastalık anahtarı, sıra, kural) olarak düzleştirir. */
const TUM_KURALLAR = [];
HASTALIKLAR.forEach((h) => (h.rules || []).forEach((k, i) => {
  TUM_KURALLAR.push({ hastalik: h.key, sira: i, kural: k, yer: `${h.key}/${i}(${k.nutrient || 'kategori'})` });
}));

test('B01 Her kuralın kaynak anahtarı KAYNAKLAR tablosunda tanımlı', () => {
  // Yazım hatalı bir kaynak anahtarı ("JOHNSON2024") belge üreticisinde sessiz
  // bir boşluk bırakır: kural kaynaklı görünür ama künye yoktur.
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => !kural.kaynak || !KAYNAKLAR[kural.kaynak])
    .map(({ yer, kural }) => `${yer}: kaynak = ${kural.kaynak || '(yok)'}`),
  'Kaynak anahtarı tanımsız');
});

test('B02 Her kuralın kaynakNot\'u, kaynakta NEREDE geçtiğini söylüyor', () => {
  // Projenin sözü: "sonrasında bu verilerin nereden nasıl geldiğini hangi
  // kurala dayandığını açıklamam gerekebilir". Bunun için gereken şey bir
  // KONUM atfı: sayfa, tablo, ek, madde ya da öneri numarası.
  //
  // İLK HÂLİ YANLIŞTI: notun karakter sayısına bakıyordum (40'tan kısa olmasın).
  // "FAO/NOVA Grup 4, s.13." notu 22 karakter ve testi geçemiyordu — oysa
  // sayfayı veriyor, yani asıl şartı karşılıyor. Karakter saymak yanlış ölçü.
  const KONUM = /(s\.\s?\d|p\.\s?\d|sayfa|Tablo|Table|Annex|\bEk\b|Madde|Öneri|GRADE|bölüm|Grup|rev\.|doi)/i;
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => {
      const not = (kural.kaynakNot || '').trim();
      if (!not) return true;
      // Eşik bize aitse konum atfı beklenmez ama bunu açıkça yazması gerekir.
      if (/bize ait|takdir|KAYNAKSIZ/i.test(not)) return false;
      return !KONUM.test(not);
    })
    .map(({ yer, kural }) => `${yer}: "${(kural.kaynakNot || '(yok)').slice(0, 50)}"`),
  'kaynakNot kaynakta konum belirtmiyor');
});

test('B03 Çevrim yapılan her eşik bunu açıkça söylüyor', () => {
  // Projenin temel ilkesi: makalede "100 g'da şu kadar" diye yazan DOĞRUDAN
  // eşiklerle, günlük sınırı porsiyona bölerek bulduğumuz ÇEVRİLMİŞ eşikler
  // ayrı tutulmalı ve çevrimin bize ait olduğu yazılmalı.
  // Bu test şunu denetliyor: kaynakNot'ta "ÇEVRİM" kelimesi geçiyorsa ya
  // nasıl çevrildiği ya da çevrim olmadığı belirtilmiş olmalı.
  const ihlal = TUM_KURALLAR.filter(({ kural }) => {
    const not = kural.kaynakNot || '';
    if (!/ÇEVRİM/i.test(not)) return false;
    // Kabul edilen biçimler: "ÇEVRİM YOK", "ÇEVRİM: ...", "ÇEVRİM bize ait".
    // İLK HÂLİ YALNIZCA ilk ikisini kabul ediyordu ve "ÇEVRİM bize ait." yazan
    // geçerli bir notu ihlal sayıyordu — kalıp fazla darmış.
    return !/ÇEVRİM\s*(YOK|:)/i.test(not) && !/ÇEVRİM[^.]{0,40}bize ait/i.test(not);
  }).map(({ yer }) => yer);
  ihlalYok(ihlal, 'ÇEVRİM geçiyor ama açıklanmamış');
});

test('B04 Her kuralın kullanıcıya gösterilecek mesajı var', () => {
  ihlalYok(TUM_KURALLAR.filter(({ kural }) => !kural.message || kural.message.trim().length < 10)
    .map(({ yer }) => yer), 'Mesaj eksik');
});

test('B05 Kuralların kullandığı her besin öğesi gerçekten var', () => {
  // Bir kural var olmayan bir besin öğesine bakıyorsa degerAl her zaman null
  // döner: kural hiç tetiklenmez ve bunu kimse fark etmez. Yazım hatası
  // ("sodiumMG") bu şekilde sessizce ölür.
  const SUTUNLAR = new Set(SAYISAL);
  const TUREV_ANAHTARLARI = new Set(['netCarbs', 'fiberPer1000kcal', 'satFatEnergyPct',
    'glycemicLoad', 'epaDhaMgMin', 'unsaturatedFatPct']);
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => kural.nutrient
      && !SUTUNLAR.has(kural.nutrient) && !TUREV_ANAHTARLARI.has(kural.nutrient))
    .map(({ yer, kural }) => `${yer}: "${kural.nutrient}" ne CSV sütunu ne türev`),
  'Kuralda tanımsız besin öğesi');
});

test('B06 Eşik kuralının mesajı ölçülen değeri gösteriyor', () => {
  // Kullanıcı neden uyarıldığını sayıyla görmeli. Kafein kurallarında bu
  // eksikti (2 Ekim'de bu test bulup düzelttirdi): mesaj yalnızca "kafein
  // içeriyor" diyordu, 10,8 mg kola ile 2200 mg kuru çay aynı görünüyordu.
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => kural.nutrient && !(kural.message || '').includes('{deger}'))
    .map(({ yer }) => yer), 'Eşik kuralı değeri göstermiyor');
});

test('B07 Kategori kuralının mesajında doldurulacak değer yok', () => {
  // Kategori kuralında ölçülen bir sayı yoktur; {deger} kalırsa kullanıcı
  // ekranda ham "{deger}" metnini görür.
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => !kural.nutrient && (kural.message || '').includes('{deger}'))
    .map(({ yer }) => yer), 'Kategori kuralında {deger} var');
});

test('B08 Her kural ya bir besin öğesine ya bir kategoriye bakıyor', () => {
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => !kural.nutrient && !(kural.kategoriler || []).length)
    .map(({ yer }) => yer), 'Ne besin öğesi ne kategori');
});

test('B09 Eşikler sayı ve negatif değil', () => {
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => kural.nutrient
      && (typeof kural.value !== 'number' || Number.isNaN(kural.value) || kural.value < 0))
    .map(({ yer, kural }) => `${yer}: ${kural.value}`), 'Eşik bozuk');
});

test('B10 İşleç ve temel geçerli değerlerden', () => {
  const ihlal = [];
  TUM_KURALLAR.forEach(({ yer, kural }) => {
    if (kural.nutrient && !['>', '>=', '<', '<='].includes(kural.islec)) {
      ihlal.push(`${yer}: işleç "${kural.islec}"`);
    }
    if (kural.temel !== undefined && !['100g', 'porsiyon'].includes(kural.temel)) {
      ihlal.push(`${yer}: temel "${kural.temel}"`);
    }
  });
  ihlalYok(ihlal, 'İşleç/temel geçersiz');
});

test('B11 Seviyeler tanımlı kümeden', () => {
  const GECERLI = new Set(['DIKKAT', 'RISKLI', 'DIYET_DISI', 'ALERJEN', 'ONERILIR']);
  ihlalYok(TUM_KURALLAR.filter(({ kural }) => !GECERLI.has(kural.seviye))
    .map(({ yer, kural }) => `${yer}: "${kural.seviye}"`), 'Geçersiz seviye');
});

test('B12 Hastalık anahtarları benzersiz', () => {
  const sayac = new Map();
  HASTALIKLAR.forEach((h) => sayac.set(h.key, (sayac.get(h.key) || 0) + 1));
  ihlalYok([...sayac].filter(([, n]) => n > 1).map(([k]) => k), 'Tekrarlayan hastalık anahtarı');
});

test('B13 Kurallardaki kategoriler gerçekten var olan kategoriler', () => {
  // Kategori bazlı bir kural var olmayan kategoriye bakıyorsa hiçbir besne
  // uymaz ve kural ölü kalır.
  const varolan = new Set(TUM_BESINLER.map((x) => x.category));
  const ihlal = [];
  TUM_KURALLAR.forEach(({ yer, kural }) => (kural.kategoriler || []).forEach((kat) => {
    if (!varolan.has(kat)) ihlal.push(`${yer}: "${kat}" kategorisinde hiç besin yok`);
  }));
  ihlalYok(ihlal, 'Kuralda var olmayan kategori');
});

test('B14 Olumlu kurallarda muafiyet alanı yok', () => {
  // Muafiyet bir uyarıyı susturmak için var. ONERILIR (fayda) kuralında
  // muafiyet alanı bulunması, kuralın yanlış kopyalandığının işaretidir.
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => kural.seviye === 'ONERILIR'
      && (kural.muafLifYogunlugu || kural.muafDoymamisOran || kural.muafGlisemikYukBiliniyorsa))
    .map(({ yer }) => yer), 'Fayda kuralında muafiyet alanı');
});

test('B15 Kritik işaretli kurallar yalnızca gerçekten kritik öğelerde', () => {
  // kritik:true bir kuralın besin öğesi eksikse besin "güvenli" sayılamıyor ve
  // DİKKAT'e çekiliyor. Bu güçlü bir davranış; hangi öğelerde olduğu bilinçli
  // bir karar olmalı, dağılmamalı. Liste bilerek elle yazılı.
  // netCarbs listede çünkü karbonhidratın TÜREVİ (karbonhidrat - lif) ve
  // öğünlük karbonhidrat kuralının dayanağı; karbonhidrat verisi yoksa besne
  // "güvenli" demek olmaz. İlk yazdığımda listeye almamıştım ve test onu
  // "beklenmeyen" sayıp patladı — eksik olan kod değil, benim listemdi.
  const KRITIK_OLMASI_BEKLENEN = new Set(['sugars', 'saturatedFat', 'sodiumMg',
    'carbohydrates', 'netCarbs']);
  ihlalYok(TUM_KURALLAR
    .filter(({ kural }) => kural.kritik && !KRITIK_OLMASI_BEKLENEN.has(kural.nutrient))
    .map(({ yer }) => `${yer}: beklenmeyen kritik öğe`), 'Beklenmeyen kritik kural');
});

test('B16 Her kaynak künyesi ya bir kurala bağlı ya metinde anılıyor', () => {
  // Öksüz künye, kaynakçada duran ama hiçbir şeyi desteklemeyen kayıt demek.
  // Kaynakçayı okuyan "bu da kullanılmış" sanır; oysa hiçbir eşik ona
  // dayanmıyor. Bu yüzden öksüz künye bırakılmıyor, SİLİNİYOR.
  //
  // 7 Ekim 2026'da üç künye silindi: FRANZ2017 ve APPEL2006 (yerlerini
  // EVERT2019 ve SACKS2001 almıştı), ATKINSON2021 (glisemik indeks verisi
  // kararı henüz verilmedi — bekleyen karar kodda değil proje belgesinde
  // duruyor: claude/glisemik-indeks-karari.md).
  //
  // TEK İSTİSNA — TAKDIR: nöbetçi değer, "kaynaksız, bizim takdirimiz"
  // demek. Hiçbir GERÇEK kural buna bağlı değil ve bu iyi haber: kaynaksız
  // eşik yok. Silinmiyor çünkü işlevi "kullanılmak" değil, kaynaksızlığı
  // İFADE EDİLEBİLİR kılmak. Kaldırılsaydı, ileride takdire dayalı bir eşik
  // ekleyen kişinin dürüst bir etiketi kalmaz, gerçek bir kaynağı yanlış
  // yere gösterme ihtimali doğardı. Ayrıca test dosyasındaki kurgu kurallar
  // kaynak olarak bunu kullanıyor.
  const BEKLEYEN = new Set(['TAKDIR']);
  let prosa = '';
  HASTALIKLAR.forEach((h) => {
    prosa += ` ${h.note || ''}`;
    (h.rules || []).forEach((k) => { prosa += ` ${k.kaynakNot || ''} ${k.message || ''}`; });
  });
  Object.values(HASTALIK_ALERJEN).forEach((liste) => liste.forEach((k) => {
    prosa += ` ${k.kaynakNot || ''} ${k.message || ''}`;
  }));
  const kuralKaynaklari = new Set();
  TUM_KURALLAR.forEach(({ kural }) => kural.kaynak && kuralKaynaklari.add(kural.kaynak));
  Object.values(HASTALIK_ALERJEN).forEach((liste) => liste.forEach((k) => {
    if (k.kaynak) kuralKaynaklari.add(k.kaynak);
  }));

  // ÖLÇÜ DÜZELTİLDİ (7 Ekim 2026). Eskiden künyenin kısa adındaki ÜÇ
  // HARFTEN UZUN HERHANGİ BİR KELİMEYİ metinde arıyordu. Sorun: kısa adların
  // neredeyse hepsinde "ark." geçiyor ve "ark." metinde her yerde var. Yani
  // kısa adı "ve ark." içeren her künye KENDİLİĞİNDEN "anılmış" sayılıyordu —
  // test öksüz künye yakalayamıyordu. Uydurma bir öksüz künye eklenerek
  // sınandı ve gerçekten yakalamadığı görüldü.
  //
  // Yeni ölçü: dolgu kelimeleri ("ve", "ark.", "vd.") ve yılın kendisi
  // atılıyor, kalan BELİRTEÇ (yazar soyadı / kurum) metinde aranıyor; künyede
  // yıl varsa belirteç ile yılın AYNI CİVARDA (150 karakter) geçmesi
  // isteniyor. Böylece "EFSA" kelimesinin başka bir yerde geçmesi, EFSA'nın
  // 2010 künyesini anılmış saymıyor.
  //
  // Yeni ölçü mevcut 28 künyenin tamamına uygulandı: hiçbirini yanlışlıkla
  // öksüz göstermiyor. (Sıkılaştırmadan önce doğrulandı.)
  const DOLGU = new Set(['ve', 'ark', 'ark.', 'vd', 'vd.', 'the', 'and', 'ile']);
  const belirtecler = (kisa) => (kisa || '')
    .split(/[\s,()]+/)
    .map((x) => x.replace(/[.,;]+$/, ''))
    .filter((x) => x.length > 2 && !DOLGU.has(x.toLowerCase()) && !/^\d{4}$/.test(x));

  const oksuz = Object.entries(KAYNAKLAR).filter(([anahtar, v]) => {
    if (kuralKaynaklari.has(anahtar) || BEKLEYEN.has(anahtar)) return false;
    const bs = belirtecler(v.kisa);
    if (!bs.length) return true;   // ayırt edici kelimesi yok -> anılmış sayılamaz
    const yil = (String(v.kisa || '').match(/\d{4}/) || [''])[0];
    return !bs.some((p) => {
      if (!yil) return prosa.includes(p);
      const kacis = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`${kacis}[^]{0,150}?${yil}`).test(prosa);
    });
  }).map(([anahtar, v]) => `${anahtar} (${v.kisa})`);
  ihlalYok(oksuz, 'Hiçbir yerde anılmayan kaynak künyesi');
});

// --- C) MOTOR MEKANİĞİ ----------------------------------------------------
// Burada gerçek besinler yerine yer yer KURGU kural kümeleri kullanıyoruz.
// Sebebi: ölçekleme, sıralama, muafiyet gibi mekanizmaları gerçek veriyle
// sınamak dolaylı olur — veri değişince test anlamını yitirir. Kurgu kural
// kümesi mekanizmayı doğrudan sınar.

/** Tek kurallı kurgu bir kural kümesi üretir. */
function kurguKurallar(kural, hastalikEk = {}) {
  return {
    hastaliklar: [{ key: 'kurgu', name: 'Kurgu hastalık', rules: [kural], ...hastalikEk }],
    hastalikAlerjen: {},
    alerjenler: ALERJENLER,
    diyetler: DIYETLER,
    etiketAdi: ETIKET_ADI,
  };
}

const KURGU_PROFIL = { allergies: [], diseases: ['kurgu'], diet: 'Normal' };

test('C01 riskHesapla girdi besnini DEĞİŞTİRMİYOR', () => {
  // Motor besin nesnesine yazarsa, aynı besin iki kez değerlendirildiğinde
  // ikinci sonuç farklı çıkar ve API önbelleğinde kirli veri birikir.
  const besin = b('Ispanak');
  const oncesi = JSON.stringify(besin);
  riskHesapla(besin, { allergies: ['milk'], diseases: TUM_HASTALIKLAR, diet: 'Vegan' }, kurallar);
  esit(JSON.stringify(besin), oncesi);
});

test('C02 riskHesapla kurallar nesnesini DEĞİŞTİRMİYOR', () => {
  // Kurallar API'de önbellekte tutuluyor; motor onlara yazarsa sonraki her
  // istek bozulur.
  const oncesi = JSON.stringify(kurallar);
  riskHesapla(b('Bal (çiçek)'), { allergies: [], diseases: TUM_HASTALIKLAR }, kurallar);
  esit(JSON.stringify(kurallar), oncesi);
});

test('C03 Aynı girdi aynı sonucu veriyor', () => {
  const profil = { allergies: ['fish'], diseases: ['diyabet', 'kolesterol'], diet: 'Normal' };
  const a = riskHesapla(b('Hamsi'), profil, kurallar);
  const c = riskHesapla(b('Hamsi'), profil, kurallar);
  esit(JSON.stringify(a), JSON.stringify(c));
});

test('C04 Bilinmeyen hastalık anahtarı çökertmiyor', () => {
  const s = riskHesapla(b('Ispanak'), { allergies: [], diseases: ['boyle_bir_hastalik_yok'] }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('C05 Bilinmeyen alerjen anahtarı çökertmiyor', () => {
  const s = riskHesapla(b('Ispanak'), { allergies: ['uzaylı_proteini'], diseases: [] }, kurallar);
  esit(s.seviye, 'UYGUN');
});

test('C06 Boş profilde genel bilgi gösteriliyor', () => {
  const s = riskHesapla(b('Ispanak'), { allergies: [], diseases: [] }, kurallar);
  esit(s.seviye, 'UYGUN');
  dogru(/hastalık\/alerji seçili değil/.test(s.ozet), `Beklenmeyen özet: ${s.ozet}`);
});

test('C07 Alerjen her şeyin üstünde: en riskli besin bile ALERJEN oluyor', () => {
  // Prensip 1: "Alerji her şeyin önünde gelir."
  const sucukSonuc = riskHesapla(b('Sucuk'), { allergies: [], diseases: ['kolesterol'] }, kurallar);
  esit(sucukSonuc.seviye, 'RISKLI');   // önce riskli olduğunu doğrula
  const kasar = b('Kaşar peyniri');
  const s = riskHesapla(kasar, { allergies: ['milk'], diseases: ['kolesterol'] }, kurallar);
  esit(s.seviye, 'ALERJEN');
  dogru(/ALERJEN UYARISI/.test(s.ozet), 'Özet alerjen uyarısı olmalı');
});

test('C08 Eser alerjen DİKKAT veriyor, ALERJEN değil', () => {
  // Eser bulaşma kesin içerik değil; aynı seviyede göstermek kullanıcıyı
  // gerçek alerjenlere karşı duyarsızlaştırır.
  const kurgu = { ...b('Ispanak'), allergens: [], traces: ['milk'] };
  const s = riskHesapla(kurgu, { allergies: ['milk'], diseases: [] }, kurallar);
  esit(s.seviye, 'DIKKAT');
  dogru(/Eser miktarda/.test(s.alerjiUyarilari[0].mesaj), 'Eser uyarısı beklenir');
});

test('C09 Porsiyon bazlı kural gerçekten porsiyona ölçekleniyor', () => {
  // 100 g'da 10 g olan bir öğe, 30 g porsiyonda 3 g eder.
  const besin = {
    name: 'kurgu', category: 'Tatlı', portionGrams: 30, kcal: 400,
    allergens: [], traces: [], dietTags: [], sugars: 10,
  };
  const kuralKumesi = kurguKurallar({
    nutrient: 'sugars', islec: '>=', value: 3, temel: 'porsiyon', seviye: 'DIKKAT',
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger} g',
  });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  esit(s.riskler.length, 1);
  esit(s.riskler[0].deger, 3);          // 10 * 30/100
  dogru(s.riskler[0].mesaj === '3 g', `Mesaj: ${s.riskler[0].mesaj}`);
});

test('C10 Porsiyon gramı yoksa 100 g varsayılıyor', () => {
  const besin = {
    name: 'kurgu', category: 'Tatlı', portionGrams: null, kcal: 400,
    allergens: [], traces: [], dietTags: [], sugars: 7,
  };
  const kuralKumesi = kurguKurallar({
    nutrient: 'sugars', islec: '>=', value: 7, temel: 'porsiyon', seviye: 'DIKKAT',
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger} g',
  });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  esit(s.riskler.length, 1);
  esit(s.riskler[0].deger, 7);
});

test('C11 Oran cinsinden türevler porsiyona ölçeklenmiyor', () => {
  // satFatEnergyPct bir YÜZDE. Porsiyonu büyütmek yüzdeyi değiştirmez;
  // ölçeklenirse 300 g porsiyonda %45 yerine %135 gibi saçma değer çıkar.
  const besin = {
    name: 'kurgu', category: 'Yağ', portionGrams: 300, kcal: 200,
    allergens: [], traces: [], dietTags: [], saturatedFat: 10,
  };
  const beklenen = (10 * 9 / 200) * 100;   // %45
  const kuralKumesi = kurguKurallar({
    nutrient: 'satFatEnergyPct', islec: '>=', value: 10, temel: 'porsiyon', seviye: 'DIKKAT',
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger}',
  });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  esit(s.riskler[0].deger, Math.round(beklenen * 100) / 100);
  dogru(beklenen < 100, 'Yüzde 100 altında kalmalı');
});

test('C12 Kritik veri eksikse besin UYGUN sayılmıyor', () => {
  // Prensip 4: "Veri yoksa uygun denmez."
  const besin = {
    name: 'kurgu', category: 'Tatlı', portionGrams: 100, kcal: 400,
    allergens: [], traces: [], dietTags: [], sugars: null,
  };
  const kuralKumesi = kurguKurallar({
    nutrient: 'sugars', islec: '>=', value: 5, temel: '100g', seviye: 'RISKLI', kritik: true,
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger} g',
  });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  esit(s.seviye, 'DIKKAT');
  dogru(/SÖYLENEMEZ/.test(s.bilgiNotlari[0].mesaj), 'Kritik eksik notu beklenir');
});

test('C13 Kritik olmayan veri eksikse seviye yükselmiyor', () => {
  const besin = {
    name: 'kurgu', category: 'Tatlı', portionGrams: 100, kcal: 400,
    allergens: [], traces: [], dietTags: [], sugars: null,
  };
  const kuralKumesi = kurguKurallar({
    nutrient: 'sugars', islec: '>=', value: 5, temel: '100g', seviye: 'RISKLI',
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger} g',
  });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  esit(s.seviye, 'UYGUN');
  dogru(s.bilgiNotlari.length === 1, 'Yine de bilgi notu düşmeli');
});

test('C14 Değerlendirilemeyen hastalık "uygun" demiyor', () => {
  const besin = { ...b('Ispanak') };
  const kuralKumesi = kurguKurallar({
    nutrient: 'sugars', islec: '>=', value: 999, temel: '100g', seviye: 'RISKLI',
    kaynak: 'TAKDIR', kaynakNot: 'kurgu test kuralı, s.0', message: '{deger}',
  }, { degerlendirilemez: true, note: 'Bu hastalık için besin bazlı kural yazılamaz.' });
  const s = riskHesapla(besin, KURGU_PROFIL, kuralKumesi);
  dogru(s.bilgiNotlari.length >= 1, 'Değerlendirilemez hastalık bilgi notu düşürmeli');
});

test('C15 Diyet çakışması DİYET_DIŞI veriyor', () => {
  const s = riskHesapla(b('Sucuk'), { allergies: [], diseases: [], diet: 'Vegan' }, kurallar);
  esit(s.seviye, 'DIYET_DISI');
  dogru(s.diyetUyarilari.length === 1, 'Diyet uyarısı beklenir');
});

test('C16 Alerjen, diyet uyarısının da üstünde', () => {
  const s = riskHesapla(b('Sucuk'), { allergies: ['milk'], diseases: [], diet: 'Vegan' }, kurallar);
  // Sucukta milk alerjeni yoksa bu test anlamsız olur; önce onu doğrula
  if ((b('Sucuk').allergens || []).includes('milk')) {
    esit(s.seviye, 'ALERJEN');
  } else {
    esit(s.seviye, 'DIYET_DISI');
  }
});

test('C17 Seviye, seçili tüm hastalıkların en ciddisi', () => {
  TUM_BESINLER.slice(0, 40).forEach((x) => {
    const tek = TUM_HASTALIKLAR.map((h) => riskHesapla(x, { allergies: [], diseases: [h] }, kurallar).seviye);
    const hepsi = riskHesapla(x, { allergies: [], diseases: TUM_HASTALIKLAR }, kurallar).seviye;
    const enCiddi = tek.reduce((a, c) => (SEVIYE_SIRASI.indexOf(c) > SEVIYE_SIRASI.indexOf(a) ? c : a), 'UYGUN');
    esit(hepsi, enCiddi);
  });
});

test('C18 Aynı besin öğesinden tek risk bulgusu çıkıyor', () => {
  // Doymuş yağ hem 100 g hem porsiyon kuralından tetiklenebiliyor; ikisini
  // ayrı satır yapmak bilgi değil tekrar olurdu.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => TUM_HASTALIKLAR.forEach((h) => {
    const s = riskHesapla(x, { allergies: [], diseases: [h] }, kurallar);
    const sayac = new Map();
    s.riskler.forEach((r) => {
      if (!r.nutrient) return;   // kategori/alerjen bulguları hariç
      sayac.set(r.nutrient, (sayac.get(r.nutrient) || 0) + 1);
    });
    [...sayac].filter(([, n]) => n > 1)
      .forEach(([n, c]) => ihlal.push(`${x.name}/${h}: ${n} ${c} kez`));
  }));
  ihlalYok(ihlal, 'Aynı besin öğesinden birden fazla risk bulgusu');
});

test('C19 Risk bulguları ciddiden hafife sıralı', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => TUM_HASTALIKLAR.forEach((h) => {
    const s = riskHesapla(x, { allergies: [], diseases: [h] }, kurallar);
    for (let i = 1; i < s.riskler.length; i += 1) {
      const onceki = SEVIYE_SIRASI.indexOf(s.riskler[i - 1].seviye);
      const simdiki = SEVIYE_SIRASI.indexOf(s.riskler[i].seviye);
      if (simdiki > onceki) ihlal.push(`${x.name}/${h}: ${s.riskler[i - 1].seviye} sonra ${s.riskler[i].seviye}`);
    }
  }));
  ihlalYok(ihlal, 'Bulgu sırası bozuk');
});

test('C20 Aynı besin öğesinden tek fayda bulgusu çıkıyor', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => TUM_HASTALIKLAR.forEach((h) => {
    const s = riskHesapla(x, { allergies: [], diseases: [h] }, kurallar);
    const sayac = new Map();
    (s.faydalar || []).forEach((f) => {
      if (!f.nutrient) return;
      sayac.set(f.nutrient, (sayac.get(f.nutrient) || 0) + 1);
    });
    [...sayac].filter(([, n]) => n > 1)
      .forEach(([n, c]) => ihlal.push(`${x.name}/${h}: ${n} ${c} kez`));
  }));
  ihlalYok(ihlal, 'Aynı besin öğesinden birden fazla fayda bulgusu');
});

test('C21 Hiçbir mesajda doldurulmamış {deger} kalmıyor', () => {
  // Kullanıcı ekranda ham şablon metni görmemeli.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => {
    const s = riskHesapla(x, { allergies: ['milk', 'gluten', 'fish'], diseases: TUM_HASTALIKLAR, diet: 'Vegan' }, kurallar);
    const metinler = [s.ozet, ...s.riskler.map((r) => r.mesaj), ...s.faydalar.map((f) => f.mesaj),
      ...s.bilgiNotlari.map((n) => n.mesaj), ...s.alerjiUyarilari.map((a) => a.mesaj),
      ...s.diyetUyarilari];
    metinler.filter((m) => m && m.includes('{')).forEach((m) => ihlal.push(`${x.name}: ${m.slice(0, 60)}`));
  });
  ihlalYok(ihlal, 'Doldurulmamış şablon');
});

test('C22 Ondalık sayılar Türkçe virgülle gösteriliyor', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => {
    const s = riskHesapla(x, { allergies: [], diseases: TUM_HASTALIKLAR }, kurallar);
    [...s.riskler, ...s.faydalar].forEach((bulgu) => {
      // Mesajda "12.5" gibi nokta-ondalık varsa biçimlendirme atlanmış demektir
      if (/\d\.\d/.test(bulgu.mesaj)) ihlal.push(`${x.name}: ${bulgu.mesaj.slice(0, 60)}`);
    });
  });
  ihlalYok(ihlal, 'Nokta ondalık ayırıcı');
});

test('C23 Her sonuçta özet ve etiket dolu, seviyeyle tutarlı', () => {
  const ihlal = [];
  TUM_BESINLER.forEach((x) => {
    const s = riskHesapla(x, { allergies: [], diseases: TUM_HASTALIKLAR }, kurallar);
    if (!s.ozet || s.ozet.trim().length < 10) ihlal.push(`${x.name}: özet boş/kısa`);
    if (s.etiket !== SEVIYE_ETIKET[s.seviye]) ihlal.push(`${x.name}: etiket "${s.etiket}" seviye "${s.seviye}" ile uyuşmuyor`);
    if (!SEVIYE_SIRASI.includes(s.seviye)) ihlal.push(`${x.name}: geçersiz seviye "${s.seviye}"`);
  });
  ihlalYok(ihlal, 'Özet/etiket tutarsız');
});

test('C24 Tüm besin x tüm hastalık taraması hata vermiyor', () => {
  // 155 besin x 11 hastalık x 2 profil = kaba kuvvet tarama. Amacı bir
  // değişmezi sınamak değil, hiç çökme olmadığını garanti etmek.
  const ihlal = [];
  TUM_BESINLER.forEach((x) => TUM_HASTALIKLAR.forEach((h) => {
    [{ allergies: [], diseases: [h] },
      { allergies: ['milk', 'gluten'], diseases: [h], diet: 'Vegan' }].forEach((profil) => {
      try {
        riskHesapla(x, profil, kurallar);
      } catch (hata) {
        ihlal.push(`${x.name}/${h}: ${hata.message}`);
      }
    });
  }));
  ihlalYok(ihlal, 'Değerlendirme sırasında hata');
});

test('C25 Her hastalık en az bir besinde bulgu üretiyor (ölü kural yok)', () => {
  // Bir hastalığın hiçbir besinde hiçbir şey söylememesi, kurallarının eşiği
  // yanlış ya da baktığı veri hiç girilmemiş demektir.
  const sessiz = TUM_HASTALIKLAR.filter((h) => {
    const hastalik = HASTALIKLAR.find((x) => x.key === h);
    if (hastalik.degerlendirilemez) return false;   // bilerek kuralsız
    return !TUM_BESINLER.some((x) => {
      const s = riskHesapla(x, { allergies: [], diseases: [h] }, kurallar);
      return s.riskler.length > 0 || (s.faydalar || []).length > 0;
    });
  });
  ihlalYok(sessiz, 'Hiçbir besinde bulgu üretmeyen hastalık');
});

test('C26 Her kural en az bir besinde tetiklenebiliyor', () => {
  // Ölü kural avı: eşiği hiçbir besnin erişemeyeceği kadar yüksek ya da
  // baktığı sütun tamamen boşsa kural hiç çalışmaz ve bu sessizce olur.
  const tetiklenen = new Set();
  TUM_BESINLER.forEach((x) => TUM_HASTALIKLAR.forEach((h) => {
    const s = riskHesapla(x, { allergies: [], diseases: [h] }, kurallar);
    [...s.riskler, ...(s.faydalar || [])].forEach((bulgu) => {
      tetiklenen.add(`${h}|${bulgu.nutrient || 'kategori'}`);
    });
  }));
  // AYIRIM: bir kuralın hiç tetiklenmemesinin iki sebebi olabilir ve bunlar
  // çok farklı şeyler.
  //   (a) EŞİK YANLIŞ ya da baktığı öğe yazım hatalı -> GERÇEK HATA.
  //   (b) Gerekli veri hiçbir besne HENÜZ girilmedi -> bilinen, kabul edilmiş
  //       boşluk. Kural doğru, veri bekliyor.
  // Testi (b) için körleştirmek yerine koşullu yapıyoruz: kural ancak
  // dayandığı veri TÜM veritabanında boşsa muaf. Veri girildiği an kural
  // tetiklenmek ZORUNDA, yoksa test patlar. Yani boşluk kapanırken test
  // kendiliğinden dişlerini geri kazanıyor.
  //
  // Türetilmiş öğelerin hangi ham sütuna dayandığı:
  const DAYANDIGI_SUTUNLAR = {
    glycemicLoad: ['glycemicIndex'],          // ölçüm ISO 26642 insan denemesi; ertelendi
    epaDhaMgMin: ['epa', 'dha'],              // balık sayfaları bekleniyor
    unsaturatedFatPct: ['monounsaturatedFat', 'polyunsaturatedFat'],
    netCarbs: ['carbohydrates'],
    fiberPer1000kcal: ['fiber'],
    satFatEnergyPct: ['saturatedFat'],
  };

  /** Bu öğenin dayandığı veri en az bir besinde var mı? */
  const veriVar = (nutrient) => {
    const sutunlar = DAYANDIGI_SUTUNLAR[nutrient] || [nutrient];
    return sutunlar.every((sut) => TUM_BESINLER.some((x) => x[sut] !== null && x[sut] !== undefined));
  };

  const olu = TUM_KURALLAR
    .filter(({ hastalik, kural }) => !tetiklenen.has(`${hastalik}|${kural.nutrient || 'kategori'}`))
    .filter(({ kural }) => !kural.nutrient || veriVar(kural.nutrient))
    .map(({ yer }) => yer);

  ihlalYok(olu, 'Hiç tetiklenmeyen kural (verisi olduğu hâlde)');

  // Veri beklediği için sessiz kalan kurallar: bilgi olarak yazılıyor, hata değil.
  const veriBekleyen = TUM_KURALLAR
    .filter(({ hastalik, kural }) => kural.nutrient
      && !tetiklenen.has(`${hastalik}|${kural.nutrient}`) && !veriVar(kural.nutrient))
    .map(({ yer }) => yer);
  if (veriBekleyen.length > 0) {
    console.log(`      (bilgi) veri beklediği için henüz tetiklenmeyen kural: ${veriBekleyen.join(', ')}`);
  }
});

console.log(`\nSonuç: ${gecen} test geçti, ${kalan} test kaldı.\n`);
process.exit(kalan > 0 ? 1 : 0);
