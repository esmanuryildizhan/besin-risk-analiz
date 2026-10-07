// prisma/durum_kontrol.js
//
// Göç sonrası veritabanının durumunu ölçer: hangi kayıtlar şifreli, hangileri
// göçten önce kalmış düz metin.
//
// KİŞİSEL VERİ BASMAZ. Yalnızca sayar ve "şifreli mi" diye bakar; hiçbir
// hastalık adı, tahlil değeri ya da yemek adı ekrana yazılmaz.
//
// Çalıştırma (backend klasöründe):  node prisma/durum_kontrol.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const sifreliMi = (d) => typeof d === 'string' && d.startsWith('v1:');

function satir(ad, toplam, sifreli) {
  const duz = toplam - sifreli;
  const durum = toplam === 0 ? '—' : (duz === 0 ? 'TAMAMI ŞİFRELİ' : `${duz} KAYIT DÜZ METİN`);
  console.log(`  ${ad.padEnd(26)} toplam ${String(toplam).padStart(4)} | şifreli ${String(sifreli).padStart(4)} | ${durum}`);
}

async function main() {
  console.log('\n=== VERİTABANI DURUMU ===\n');

  const besin = await prisma.food.count();
  console.log(`  Food (besin tablosu)       ${besin} kayıt`);
  console.log('');

  const hastaliklar = await prisma.userDisease.findMany({ select: { name: true } });
  satir('UserDisease.name', hastaliklar.length, hastaliklar.filter((x) => sifreliMi(x.name)).length);

  const alerjiler = await prisma.userAllergy.findMany({ select: { name: true } });
  satir('UserAllergy.name', alerjiler.length, alerjiler.filter((x) => sifreliMi(x.name)).length);

  const tahliller = await prisma.labResult.findMany({ select: { value: true } });
  satir('LabResult.value', tahliller.length, tahliller.filter((x) => sifreliMi(x.value)).length);

  const kalemler = await prisma.diaryEntry.findMany({
    select: { kcal: true, foodRef: true, label: true },
  });
  satir('DiaryEntry.kcal', kalemler.length, kalemler.filter((x) => sifreliMi(x.kcal)).length);
  const refVar = kalemler.filter((x) => x.foodRef !== null).length;
  console.log(`  ${'DiaryEntry.foodRef'.padEnd(26)} ${refVar}/${kalemler.length} kayıtta besin bağı var`
    + (refVar === 0 && kalemler.length > 0 ? '  <-- BAĞLAR KOPMUŞ' : ''));

  const gunler = await prisma.diaryDay.findMany({ select: { burnedKcal: true } });
  const gunSifreli = gunler.filter((x) => sifreliMi(x.burnedKcal)).length;
  const gunBos = gunler.filter((x) => x.burnedKcal === null).length;
  console.log(`  ${'DiaryDay.burnedKcal'.padEnd(26)} toplam ${gunler.length} | şifreli ${gunSifreli} | boş ${gunBos}`);

  const kullanici = await prisma.user.count();
  console.log(`\n  Kullanıcı sayısı: ${kullanici}`);

  const toplamDuz = hastaliklar.filter((x) => !sifreliMi(x.name)).length
    + alerjiler.filter((x) => !sifreliMi(x.name)).length
    + tahliller.filter((x) => !sifreliMi(x.value)).length
    + kalemler.filter((x) => !sifreliMi(x.kcal)).length;

  console.log('\n=== SONUÇ ===');
  if (toplamDuz === 0 && kalemler.length === 0) {
    console.log('  Temiz. Günlük kaydı yok, seed çalıştırılabilir.\n');
  } else if (toplamDuz === 0) {
    console.log('  Tüm veri şifreli. Sorun yok.\n');
  } else {
    console.log(`  ${toplamDuz} kayıt göçten önce kalmış DÜZ METİN. Bunlar çözülemez;`);
    console.log('  uygulama onları boş/sıfır olarak görür. Kurtarılamazlar.\n');
  }
}

main()
  .catch((e) => { console.error('HATA:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
