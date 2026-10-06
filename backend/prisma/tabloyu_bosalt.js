// prisma/tabloyu_bosalt.js
//
// NE İŞE YARAR?
// Şemaya "boş olamaz" (zorunlu) yeni bir sütun eklediğimizde, tabloda zaten
// satır varsa Prisma migrate şu hatayı verir:
//
//   Added the required column `externalId` to the `Food` table without a
//   default value. There are 219 rows in this table.
//
// Haklı: var olan satırlara ne yazacağını bilemez. Bizim durumumuzda cevap
// kolay — Food tablosundaki her şey `data-import/foods_tr.csv` dosyasından
// üretiliyor, yani hiçbiri "kaybolacak veri" değil. Tabloyu boşaltıp migrate
// ediyor, sonra `npx prisma db seed` ile yeniden dolduruyoruz.
//
// KULLANICI HESAPLARINA DOKUNMAZ: User, UserAllergy, UserDisease, LabResult
// tabloları olduğu gibi kalır.
//
// Çalıştırma (backend klasöründe):  node prisma/tabloyu_bosalt.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Ham SQL kullanıyoruz: Prisma Client eski şemadan üretilmiş olabilir,
  // ham SQL bu uyumsuzluktan etkilenmez.
  const [{ count: besinSayisi }] = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "Food"'
  );

  let gunlukSayisi = 0;
  try {
    const [g] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "DiaryEntry"');
    gunlukSayisi = g.count;
  } catch {
    // Tablo henüz yoksa sorun değil
  }

  console.log(`Food tablosunda ${besinSayisi} besin var.`);
  console.log(`DiaryEntry tablosunda ${gunlukSayisi} günlük kaydı var.`);

  if (gunlukSayisi > 0) {
    console.log('');
    console.log('DUR: Günlük kayıtların var ve bunlar besinlere bağlı.');
    console.log('Bu kayıtlar senin gerçek verilerin; silmeden önce düşünmelisin.');
    console.log('Devam etmek istiyorsan bu dosyadaki kontrolü kaldır.');
    process.exitCode = 1;
    return;
  }

  // CASCADE: Food'a bağlı kayıtlar varsa onlar da temizlensin.
  // RESTART IDENTITY: id sayacı 1'den başlasın.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Food" RESTART IDENTITY CASCADE');
  console.log('');
  console.log('Food tablosu boşaltıldı. Kullanıcı hesaplarına dokunulmadı.');
  console.log('Sıradaki adımlar:');
  console.log('   npx prisma migrate dev --name kural_gerekceleri');
  console.log('   npx prisma db seed');
}

main()
  .catch((hata) => {
    console.error('HATA:', hata.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
