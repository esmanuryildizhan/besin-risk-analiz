// prisma/mevcut_kullanicilari_dogrula.js
//
// BİR KEZ ÇALIŞTIRILIR — e-posta doğrulama özelliği eklendiğinde.
//
// Sorun: doğrulama eklenmeden önce açılmış hesapların ePostaDogrulandiAt alanı
// boş. Kontrol devreye girdiği an bu kullanıcılar giriş yapamaz hâle gelir —
// kendi hataları olmadan kilitlenmiş olurlar.
//
// Bu betik, özellik eklenmeden ÖNCE var olan hesapları doğrulanmış sayar.
// Gerekçe: o hesaplar zaten kullanımdaydı ve adresleri sahipleri tarafından
// girilmişti; geriye dönük doğrulama istemek onları cezalandırmak olurdu.
//
// YENİ hesaplara dokunmuyor: yalnızca alanı BOŞ olanları dolduruyor ve bunu
// bir kez yapıyor. Özellik devreye girdikten sonra açılan hesaplar normal
// doğrulama akışından geçer.
//
// Çalıştırma (backend klasöründe):  node prisma/mevcut_kullanicilari_dogrula.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const dogrulanmamis = await prisma.user.count({ where: { ePostaDogrulandiAt: null } });

  if (dogrulanmamis === 0) {
    console.log('\n  Doğrulanmamış hesap yok. Yapılacak bir şey yok.\n');
    return;
  }

  const sonuc = await prisma.user.updateMany({
    where: { ePostaDogrulandiAt: null },
    data: { ePostaDogrulandiAt: new Date() },
  });

  console.log(`\n  ${sonuc.count} mevcut hesap doğrulanmış olarak işaretlendi.`);
  console.log('  Bu hesaplar giriş yapmaya devam edebilir.');
  console.log('  Bundan sonra açılan hesaplar e-posta doğrulamasından geçecek.\n');
}

main()
  .catch((e) => { console.error('\nHATA:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
