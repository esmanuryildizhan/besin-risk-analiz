// ---------------------------------------------------------------------------
// BİR BESİN VERİTABANINDA NASIL DEĞERLENDİRİLİYOR?
//
// Kullanım (backend klasöründe):
//     node prisma/besin_denetle.js "Lüfer"
//     node prisma/besin_denetle.js "Lüfer" kolesterol
//
// API'nin yaptığı işin AYNISINI yapar: besni ve kuralları VERİTABANINDAN okur,
// risk motorunu çalıştırır, sonucu yazar. Çalışan sunucudan bağımsızdır, yani
// sunucu eski kodu/bayat önbelleği tutuyorsa fark buradan anlaşılır.
//
// Niye var: trans yağ kuralı DİKKAT'e çevrildikten ve veritabanına yazıldıktan
// sonra uygulama lüferi RİSKLİ göstermeye devam etti. Kurallar dosyası DİKKAT
// diyordu, veritabanı DİKKAT diyordu, ekran RİSKLİ diyordu. Arada kalan yeri
// görmek için bu araç yazıldı. Hiçbir şeyi DEĞİŞTİRMEZ.
// ---------------------------------------------------------------------------
const { PrismaClient } = require('@prisma/client');
const { riskHesapla } = require('../src/risk');
const { kuraliCoz } = require('../src/kural_cevir');
const {
  HASTALIK_ALERJEN, ALERJENLER, DIYETLER,
} = require('./hastalik_kurallari');

const prisma = new PrismaClient();

const arananAd = process.argv[2];
const istenenHastalik = process.argv[3];

if (!arananAd) {
  console.error('Kullanım: node prisma/besin_denetle.js "besin adı" [hastalik_anahtari]');
  process.exit(1);
}

function yaz(etiket, deger) {
  console.log(`   ${String(etiket).padEnd(18)} ${deger === null || deger === undefined ? '(boş)' : deger}`);
}

async function main() {
  const besinler = await prisma.food.findMany({
    where: { name: { contains: arananAd, mode: 'insensitive' } },
  });

  if (besinler.length === 0) {
    console.log(`\n"${arananAd}" adında besin veritabanında YOK.`);
    console.log('Besin tablosu seed edilmemiş olabilir: npx prisma db seed\n');
    return;
  }

  const dbHastaliklar = await prisma.disease.findMany({
    include: { rules: { orderBy: { sortOrder: 'asc' } } },
  });
  const kurallar = {
    hastaliklar: dbHastaliklar.map((h) => ({
      key: h.key, name: h.name, icon: h.icon, note: h.note,
      degerlendirilemez: !h.evaluable,
      rules: h.rules.map(kuraliCoz),
    })),
    hastalikAlerjen: HASTALIK_ALERJEN,
    alerjenler: ALERJENLER,
    diyetler: DIYETLER,
  };

  const hastalikAnahtarlari = istenenHastalik
    ? [istenenHastalik]
    : kurallar.hastaliklar.map((h) => h.key);

  for (const besin of besinler) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${besin.name}   (veritabanı id ${besin.id})`);
    console.log('='.repeat(70));
    console.log('\nVERİTABANINDAKİ DEĞERLER');
    yaz('porsiyon', `${besin.portionName || '?'} = ${besin.portionGrams} g`);
    ['kcal', 'fat', 'saturatedFat', 'transFat', 'carbohydrates', 'sugars',
      'fiber', 'sodiumMg', 'potassiumMg', 'caffeineMg', 'glycemicIndex']
      .forEach((a) => yaz(a, besin[a]));
    yaz('alerjenler', JSON.stringify(besin.allergens));
    console.log(`\n   kaynak: ${besin.source || '(boş)'}`);

    console.log('\nHASTALIK HASTALIK SONUÇ');
    for (const anahtar of hastalikAnahtarlari) {
      const s = riskHesapla(besin, { allergies: [], diseases: [anahtar] }, kurallar);
      const vurgu = (s.seviye === 'RISKLI' || s.seviye === 'DIYET_DISI') ? '   <<< RİSKLİ' : '';
      console.log(`   ${anahtar.padEnd(20)} ${s.seviye}${vurgu}`);
      // KATEGORİ KURALLARINDA nutrient/deger YOKTUR. Bunlar eşik kuralı değil:
      // "Et-Balık kategorisindeki besinler hem demiri taşır" gibi, besnin
      // kategorisine bakıp doğrudan bulgu üreten kurallar. Bu araç ilk yazıldığında
      // alanları koşulsuz basıyordu ve ekrana "ONERILIR | undefined = undefined"
      // diye düşüyordu — motorda sorun yoktu, gösterim yanlıştı.
      const bulguYaz = (tur, x) => {
        const sayi = (x.nutrient !== undefined && x.deger !== undefined)
          ? `${x.nutrient} = ${x.deger}`
          : '(kategori kuralı)';
        console.log(`        ${tur}: ${x.seviye} | ${sayi}`);
        if (x.mesaj) console.log(`                 ${x.mesaj}`);
      };
      s.riskler.forEach((r) => bulguYaz('risk ', r));
      (s.faydalar || []).forEach((f) => bulguYaz('fayda', f));
    }
  }
  console.log();
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
