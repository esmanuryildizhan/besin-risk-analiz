// ---------------------------------------------------------------------------
// VERİTABANI KURALLAR DOSYASIYLA AYNI MI?
//
// Niye var: 1 Ekim 2026'da trans yağ kuralını RİSKLİ'den DİKKAT'e çevirdik,
// testler geçti, ama uygulama lüferi RİSKLİ göstermeye devam etti. Sorun
// kodda değildi — veritabanı eski kuralı tutuyordu. O gün bunu anlamak için
// terminal çıktısı tahmin etmek zorunda kaldık. Bir daha gerekmesin:
//
//     node prisma/kural_denetle.js
//
// Kurallar dosyasını (kaynak) veritabanıyla (uygulamanın gerçekte okuduğu yer)
// satır satır karşılaştırır ve farkı yazar. Hiçbir şeyi DEĞİŞTİRMEZ.
// ---------------------------------------------------------------------------
const { PrismaClient } = require('@prisma/client');
const { HASTALIKLAR, KURAL_ALANLARI } = require('./hastalik_kurallari');

const prisma = new PrismaClient();
const BOOL_SUTUNLAR = new Set(['critical', 'onlyLargePortion', 'exemptIfGlycemicLoadKnown']);

/** İki değeri "veritabanına yazılmış hâliyle" karşılaştırır. */
function ayniMi(sutun, dosyaDegeri, dbDegeri) {
  if (sutun === 'categories') {
    const a = dosyaDegeri || [];
    const b = dbDegeri || [];
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  if (BOOL_SUTUNLAR.has(sutun)) return Boolean(dosyaDegeri) === Boolean(dbDegeri);
  // Dosyada değer yoksa seed alanı hiç göndermiyor; sütunun varsayılanı kalıyor.
  if (dosyaDegeri === undefined || dosyaDegeri === null) {
    return sutun === 'basis' ? dbDegeri === '100g' : (dbDegeri === null || dbDegeri === undefined);
  }
  if (typeof dosyaDegeri === 'number') return Number(dbDegeri) === dosyaDegeri;
  return dbDegeri === dosyaDegeri;
}

function kisa(v) {
  if (v === undefined) return '(yok)';
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

async function main() {
  const dbHastaliklar = await prisma.disease.findMany({
    include: { rules: { orderBy: { sortOrder: 'asc' } } },
  });
  const dbHarita = new Map(dbHastaliklar.map((h) => [h.key, h]));

  const farklar = [];
  let kuralSayisi = 0;

  for (const dosyaH of HASTALIKLAR) {
    const dbH = dbHarita.get(dosyaH.key);
    if (!dbH) {
      farklar.push(`${dosyaH.key}: hastalık veritabanında YOK`);
      continue;
    }
    const dosyaKurallari = dosyaH.rules || [];
    if (dosyaKurallari.length !== dbH.rules.length) {
      farklar.push(`${dosyaH.key}: kural sayısı farklı — dosya ${dosyaKurallari.length}, veritabanı ${dbH.rules.length}`);
    }
    dosyaKurallari.forEach((dosyaK, i) => {
      kuralSayisi += 1;
      const dbK = dbH.rules[i];
      if (!dbK) return;
      for (const [motorAnahtar, sutun] of Object.entries(KURAL_ALANLARI)) {
        if (!ayniMi(sutun, dosyaK[motorAnahtar], dbK[sutun])) {
          farklar.push(
            `${dosyaH.key} / kural ${i} (${dosyaK.nutrient || '?'}) / ${motorAnahtar}:\n`
            + `      dosya       : ${kisa(dosyaK[motorAnahtar])}\n`
            + `      veritabanı  : ${kisa(dbK[sutun])}`,
          );
        }
      }
    });
  }

  const fazla = dbHastaliklar.filter((h) => !HASTALIKLAR.some((d) => d.key === h.key));
  fazla.forEach((h) => farklar.push(`${h.key}: veritabanında var ama kurallar dosyasında YOK`));

  console.log(`\nDosya: ${HASTALIKLAR.length} hastalık, ${kuralSayisi} kural`);
  console.log(`Veritabanı: ${dbHastaliklar.length} hastalık, ${dbHastaliklar.reduce((t, h) => t + h.rules.length, 0)} kural\n`);

  if (farklar.length === 0) {
    console.log('VERİTABANI GÜNCEL — kurallar dosyasıyla birebir aynı.\n');
  } else {
    console.log(`${farklar.length} FARK VAR. Veritabanı eski; "npx prisma db seed" çalıştırın.\n`);
    farklar.forEach((f) => console.log(`  - ${f}`));
    console.log();
  }

  // En sık sorulan kural ayrıca yazılıyor.
  const kol = dbHarita.get('kolesterol');
  const tf = kol && kol.rules.find((r) => r.nutrient === 'transFat');
  if (tf) {
    console.log(`Veritabanındaki trans yağ kuralı: seviye=${tf.level}, eşik=${tf.threshold} ${tf.basis}, kaynak=${tf.source}`);
    console.log(tf.level === 'DIKKAT'
      ? '  -> Doğru (DİKKAT). Uygulama hâlâ RİSKLİ gösteriyorsa sorun veritabanında değil.\n'
      : '  -> ESKİ KURAL. Seed çalışmamış.\n');
  }

  if (farklar.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
