// prisma/veriyi_sifrele.js
//
// GÖÇ SONRASI KURTARMA BETİĞİ — bir kez çalıştırılır.
//
// NİYE GEREKLİ: şifreleme eklenirken sütun tipleri Float'tan String'e çevrildi.
// PostgreSQL bu dönüşümü sessizce yaptı; 236.45 sayısı "236.45" METNİ oldu.
// Veri kaybolmadı ama şifreli DEĞİL, ve uygulama artık o alanı şifreli
// beklediği için "v1:" öneki olmayan değeri çözemiyor ve boş sayıyor.
//
// Bu betik düz metin kalmış değerleri OLDUĞU YERDE şifreler.
//
// İKİ KEZ ÇALIŞTIRILABİLİR: "v1:" ile başlayan değerlere dokunmuyor. Yani
// yarısında kesilse kalan yerden devam edilebilir, zarar vermez.
//
// KURTARILAMAYAN TEK ŞEY: DiaryEntry.foodId sütunu göç sırasında DÜŞÜRÜLDÜ
// (migration.sql içinde "DROP COLUMN foodId"). Hangi kalemin hangi besne ait
// olduğu bilgisi veritabanında artık yok; bu betik onu geri getiremez.
// O kalemler kalorisini koruyor ama "Besin kaydı bulunamadı" diye görünecek.
//
// Çalıştırma (backend klasöründe):  node prisma/veriyi_sifrele.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const kripto = require('../src/kripto');

const prisma = new PrismaClient();

const sifreliMi = (d) => typeof d === 'string' && d.startsWith('v1:');

/** Düz metinse şifreler, zaten şifreliyse olduğu gibi bırakır. */
function gerekirseSifrele(deger) {
  if (deger === null || deger === undefined || deger === '') return { deger, degisti: false };
  if (sifreliMi(deger)) return { deger, degisti: false };
  return { deger: kripto.sifrele(String(deger)), degisti: true };
}

/** Bir kaydın verilen alanlarını şifreler; değişen alan varsa günceller. */
async function tabloyuSifrele(ad, kayitlar, alanlar, guncelle) {
  let degisen = 0;
  let dokunulmayan = 0;
  for (const k of kayitlar) {
    const veri = {};
    let varMi = false;
    for (const alan of alanlar) {
      const { deger, degisti } = gerekirseSifrele(k[alan]);
      if (degisti) { veri[alan] = deger; varMi = true; }
    }
    if (varMi) {
      /* eslint-disable no-await-in-loop */
      await guncelle(k.id, veri);
      degisen += 1;
    } else {
      dokunulmayan += 1;
    }
  }
  console.log(`  ${ad.padEnd(14)} ${String(degisen).padStart(4)} kayıt şifrelendi, `
    + `${dokunulmayan} kayıt zaten şifreliydi`);
  return degisen;
}

async function main() {
  if (!process.env.VERI_ANAHTARI && !process.env.JWT_SECRET) {
    throw new Error('VERI_ANAHTARI (ya da en azından JWT_SECRET) tanımlı değil. '
      + '.env dosyasını kontrol edin — anahtar olmadan şifreleme yapılamaz.');
  }
  console.log('\n=== DÜZ METİN KALMIŞ VERİ ŞİFRELENİYOR ===\n');
  let toplam = 0;

  toplam += await tabloyuSifrele(
    'Hastalıklar',
    await prisma.userDisease.findMany(),
    ['name'],
    (id, veri) => prisma.userDisease.update({ where: { id }, data: veri }),
  );

  toplam += await tabloyuSifrele(
    'Alerjiler',
    await prisma.userAllergy.findMany(),
    ['name'],
    (id, veri) => prisma.userAllergy.update({ where: { id }, data: veri }),
  );

  toplam += await tabloyuSifrele(
    'Tahliller',
    await prisma.labResult.findMany(),
    ['testName', 'value', 'unit', 'refLow', 'refHigh', 'valueOp', 'textValue',
      'pdfYorumu', 'pdfAralik'],
    (id, veri) => prisma.labResult.update({ where: { id }, data: veri }),
  );

  toplam += await tabloyuSifrele(
    'Günlük kalem',
    await prisma.diaryEntry.findMany(),
    ['kcal', 'amount', 'label', 'foodRef'],
    (id, veri) => prisma.diaryEntry.update({ where: { id }, data: veri }),
  );

  toplam += await tabloyuSifrele(
    'Günlük gün',
    await prisma.diaryDay.findMany(),
    ['burnedKcal', 'waterL'],
    (id, veri) => prisma.diaryDay.update({ where: { id }, data: veri }),
  );

  // Besin bağı kopmuş kalemleri BİLDİR, ama SİLME. Silme kararı kullanıcının:
  // kalori bilgisi hâlâ onun verisi ve biz onun adına atamayız.
  const bagsiz = await prisma.diaryEntry.count({ where: { foodRef: null } });

  console.log(`\n=== SONUÇ ===\n  ${toplam} kayıt şifrelendi.`);
  if (bagsiz > 0) {
    console.log(`\n  UYARI: ${bagsiz} günlük kaleminin besin bağı yok.`);
    console.log('  Sebebi: göç sırasında foodId sütunu düşürüldü, hangi besin');
    console.log('  olduğu bilgisi geri getirilemiyor. Bu kalemler kalorisini');
    console.log('  koruyor ama arayüzde "Besin kaydı bulunamadı" diye görünecek.');
    console.log('\n  Bunları silmek isterseniz:  node prisma/veriyi_sifrele.js --bagsizlari-sil');
  }
  console.log('');
}

async function bagsizlariSil() {
  const sonuc = await prisma.diaryEntry.deleteMany({ where: { foodRef: null } });
  console.log(`\n  ${sonuc.count} bağsız günlük kalemi silindi.`);
  const kalan = await prisma.diaryEntry.count();
  console.log(`  Kalan günlük kalemi: ${kalan}`);
  if (kalan === 0) {
    console.log('  Günlük kaydı kalmadığı için "npx prisma db seed" artık çalışabilir.\n');
  } else {
    console.log('');
  }
}

const islem = process.argv.includes('--bagsizlari-sil') ? bagsizlariSil : main;
islem()
  .catch((e) => { console.error('\nHATA:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
