// prisma/seed.js
// data-import/foods_tr.csv dosyasındaki besinleri PostgreSQL'e yükler.
// Çalıştırma (backend klasöründe):  npx prisma db seed
//
// Veri kaynağı: TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0
// https://turkomp.tarimorman.gov.tr/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { PrismaClient } = require('@prisma/client');
const { HASTALIKLAR, KURAL_ALANLARI } = require('./hastalik_kurallari');

const prisma = new PrismaClient();

// __dirname = bu dosyanın klasörü (backend/prisma)
const CSV_YOLU = path.join(__dirname, '..', '..', 'data-import', 'foods_tr.csv');
const PARTI_BOYUTU = 200;

// CSV'den gelen her şey metindir; doğru tiplere çeviriyoruz
/** Bir kural nesnesini veritabanı satırına çevirir (KURAL_ALANLARI tablosuna göre). */
const BOOL_ALANLAR = new Set(['critical', 'onlyLargePortion', 'exemptIfGlycemicLoadKnown']);
function kuralSatiri(k) {
  const satir = {};
  for (const [motorAnahtar, sutun] of Object.entries(KURAL_ALANLARI)) {
    const deger = k[motorAnahtar];
    if (sutun === 'categories') {
      satir[sutun] = deger || [];
    } else if (BOOL_ALANLAR.has(sutun)) {
      satir[sutun] = Boolean(deger);
    } else if (deger === undefined || deger === null) {
      // ANAHTARI HİÇ YAZMIYORUZ. Sebebi: `basis` sütunu "100g" varsayılanıyla
      // tanımlı ve null kabul etmiyor; açıkça null geçirmek Prisma'da
      // "Argument `basis` is missing" hatası veriyor. Anahtarı atlayınca
      // Prisma varsayılanı uyguluyor, null kabul eden sütunlarda da null
      // yazıyor. Yani tek kural: değer yoksa alanı hiç göndermiyoruz.
      continue;
    } else {
      satir[sutun] = deger;
    }
  }
  return satir;
}

const ondalik = (v) => (v === undefined || v === '' ? null : Number(v)); // "12.5" -> 12.5, "" -> null
const liste = (v) => (v ? v.split('|') : []); // "gluten|milk" -> ["gluten","milk"]

function satiriDonustur(s) {
  const kayit = {
    externalId: s.externalId,
    name: s.name,
    nameEn: s.nameEn,
    category: s.category,
    icon: s.icon || null,
    portionName: s.portionName,
    portionGrams: ondalik(s.portionGrams),
    kcal: ondalik(s.kcal),
    proteins: ondalik(s.proteins),
    carbohydrates: ondalik(s.carbohydrates),
    sugars: ondalik(s.sugars),
    glycemicIndex: ondalik(s.glycemicIndex),
    fiber: ondalik(s.fiber),
    fat: ondalik(s.fat),
    saturatedFat: ondalik(s.saturatedFat),
    transFat: ondalik(s.transFat),
    monounsaturatedFat: ondalik(s.monounsaturatedFat),
    polyunsaturatedFat: ondalik(s.polyunsaturatedFat),
    epa: ondalik(s.epa),
    dha: ondalik(s.dha),
    cholesterolMg: ondalik(s.cholesterolMg),
    sodiumMg: ondalik(s.sodiumMg),
    potassiumMg: ondalik(s.potassiumMg),
    calciumMg: ondalik(s.calciumMg),
    ironMg: ondalik(s.ironMg),
    magnesiumMg: ondalik(s.magnesiumMg),
    phosphorusMg: ondalik(s.phosphorusMg),
    zincMg: ondalik(s.zincMg),
    vitaminCMg: ondalik(s.vitaminCMg),
    caffeineMg: ondalik(s.caffeineMg),
    vitaminDUg: ondalik(s.vitaminD_ug),
    vitaminKUg: ondalik(s.vitaminK_ug),
    folateUg: ondalik(s.folate_ug),
    vitaminB12Ug: ondalik(s.vitaminB12_ug),
    allergens: liste(s.allergens),
    traces: liste(s.traces),
    dietTags: liste(s.dietTags),
    source: s.source || 'TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0 (https://turkomp.tarimorman.gov.tr/)',
  };

  // Sağlık verisi: zorunlu alanlardan biri bozuksa sessizce geçme, hata ver
  if (!kayit.externalId) throw new Error(`${s.name}: externalId boş`);
  for (const alan of ['kcal', 'proteins', 'carbohydrates', 'fat', 'portionGrams']) {
    if (kayit[alan] === null || Number.isNaN(kayit[alan])) {
      throw new Error(`${s.name}: '${alan}' değeri geçersiz -> "${s[alan]}"`);
    }
  }
  return kayit;
}

/** Hastalıkları ve kurallarını veritabanına yazar. */
async function hastaliklariYukle() {
  console.log('Hastalık kuralları yükleniyor...');
  // Kurallar tamamen bu dosyadan yönetilsin diye önce hepsini siliyoruz.
  // (DiseaseRule kayıtları Disease silinince otomatik siliniyor: onDelete Cascade)
  await prisma.disease.deleteMany();

  let kuralSayisi = 0;
  for (const h of HASTALIKLAR) {
    await prisma.disease.create({
      data: {
        key: h.key,
        name: h.name,
        icon: h.icon || null,
        note: h.note || null,
        evaluable: !h.degerlendirilemez,
        rules: {
          // Alanlar tek tek yazılmıyor: KURAL_ALANLARI tablosundan geçiyor.
          // Böylece hastalik_kurallari.js'e yeni bir alan eklendiğinde burayı
          // güncellemeyi unutmak mümkün değil (risk_test.js kontrol ediyor).
          create: h.rules.map((k, i) => ({ ...kuralSatiri(k), sortOrder: i })),
        },
      },
    });
    kuralSayisi += h.rules.length;
  }
  const kaynaklar = {};
  HASTALIKLAR.flatMap((h) => h.rules).forEach((k) => {
    kaynaklar[k.kaynak || 'YOK'] = (kaynaklar[k.kaynak || 'YOK'] || 0) + 1;
  });
  console.log(`   ${HASTALIKLAR.length} hastalık, ${kuralSayisi} kural yüklendi.`);
  console.log(`   Eşik kaynakları: ${Object.entries(kaynaklar).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  // Sağlık uygulamasında kaynaksız eşik sessizce geçmemeli: yüksek sesle söyle.
  const kaynaksiz = HASTALIKLAR.flatMap((h) => h.rules.map((k) => ({ h: h.name, k })))
    .filter(({ k }) => !k.kaynak || k.kaynak === 'TAKDIR');
  if (kaynaksiz.length > 0) {
    console.log(`   ⚠️  ${kaynaksiz.length} kural hâlâ kaynaksız (TAKDİR) — diyetisyen incelemesi gerekli:`);
    kaynaksiz.forEach(({ h, k }) => console.log(`        - ${h}: ${k.nutrient || k.kategoriler} ${k.islec || ''} ${k.value ?? ''}`));
  }
}

async function main() {
  if (!fs.existsSync(CSV_YOLU)) {
    throw new Error(`CSV bulunamadı: ${CSV_YOLU}\nÖnce data-import klasöründe: python turkomp_birlestir.py`);
  }

  // GÜNLÜK KAYDI VARSA BESİNLER YENİDEN YÜKLENMİYOR.
  //
  // Sebebi değişti: eskiden DiaryEntry.foodId bir yabancı anahtardı ve besinleri
  // silmek kayıtları bozardı. Artık besin kimliği şifreli (foodRef) ve yabancı
  // anahtar yok — ama tehlike kalktı değil, YER DEĞİŞTİRDİ: besinler silinip
  // yeniden eklenince otomatik kimlikler kaldığı yerden devam ediyor, yani eski
  // kayıtların foodRef'i artık var olmayan kimliklere işaret ediyor. Veri tabanı
  // bunu artık engelleyemediği için denetim buraya taşındı.
  const gunlukSayisi = await prisma.diaryEntry.count();
  if (gunlukSayisi > 0) {
    throw new Error(
      `${gunlukSayisi} günlük kaydı var; besin tablosu yeniden yüklenirse bu `
      + 'kayıtların besin bağları kopar.\n\n'
      + 'Durumu görmek için:   node prisma/durum_kontrol.js\n'
      + 'Kayıtlar gözden çıkarılabilirse sıfırdan kurmak için:\n'
      + '  npx prisma migrate reset\n'
      + '(bu komut veritabanını tamamen siler, göçleri yeniden uygular ve seed çalıştırır)',
    );
  }

  console.log('Eski besin kayıtları siliniyor...');
  await prisma.food.deleteMany();

  console.log(`CSV okunuyor: ${CSV_YOLU}`);
  const okuyucu = fs.createReadStream(CSV_YOLU).pipe(parse({ columns: true, bom: true }));

  let parti = [];
  let eklenen = 0;
  for await (const satir of okuyucu) {
    parti.push(satiriDonustur(satir));
    if (parti.length === PARTI_BOYUTU) {
      eklenen += (await prisma.food.createMany({ data: parti, skipDuplicates: true })).count;
      parti = [];
    }
  }
  if (parti.length > 0) {
    eklenen += (await prisma.food.createMany({ data: parti, skipDuplicates: true })).count;
  }

  console.log(`Bitti: ${eklenen} besin eklendi.`);

  // Kısa doğrulama
  const toplam = await prisma.food.count();
  const glutenli = await prisma.food.count({ where: { allergens: { has: 'gluten' } } });
  const sutlu = await prisma.food.count({ where: { allergens: { has: 'milk' } } });
  const kategoriler = await prisma.food.groupBy({ by: ['category'], _count: true });
  const kaynaklar = await prisma.food.groupBy({ by: ['source'], _count: true });
  console.log(`Veritabanında ${toplam} besin | gluten içeren: ${glutenli} | süt içeren: ${sutlu}`);
  kaynaklar.forEach((k) => console.log(`   ${String(k._count).padStart(4)}  ${k.source}`));
  kategoriler
    .sort((a, b) => b._count - a._count)
    .forEach((k) => console.log(`   ${String(k._count).padStart(4)}  ${k.category}`));

  await hastaliklariYukle();

  const ornek = await prisma.food.findFirst({ where: { name: 'Pırasa' } });
  if (ornek) {
    console.log(
      `Örnek -> ${ornek.icon} ${ornek.name}: ${ornek.kcal} kcal/100g, ` +
        `demir ${ornek.ironMg} mg, porsiyon: ${ornek.portionName} (${ornek.portionGrams} g)`
    );
  }
}

main()
  .catch((hata) => {
    console.error('SEED HATASI:', hata.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
