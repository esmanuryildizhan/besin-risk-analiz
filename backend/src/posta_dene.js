// src/posta_dene.js
//
// E-posta ayarlarını teşhis eder. "Posta gitmiyor" şikâyetini somut bir sebebe
// indirger: ayar mı yok, kimlik doğrulama mı reddedildi, port mu engelli.
//
// Çalıştırma (backend klasöründe):
//   node src/posta_dene.js                  -> yalnızca bağlantıyı sınar
//   node src/posta_dene.js adres@ornek.com  -> sınar ve deneme postası yollar
//
// ŞİFRE EKRANA YAZILMIYOR; yalnızca tanımlı olup olmadığı ve kaç karakter
// olduğu gösteriliyor (uygulama şifresi 16 hane olmalı — en sık hata bu).
require('dotenv').config();
const eposta = require('./eposta');

function baslik(m) { console.log(`\n${m}`); }

function ayarlariYaz() {
  const a = eposta.ayarlar();
  baslik('=== AYARLAR ===');
  console.log(`  SMTP sunucusu : ${a.sunucu}:${a.port}`);
  console.log(`  MAIL_KULLANICI: ${a.kullanici || 'TANIMLI DEĞİL'}`);
  console.log(`  MAIL_SIFRE    : ${a.sifreTanimliMi ? `tanımlı (${a.sifreUzunlugu} karakter)` : 'TANIMLI DEĞİL'}`);
  console.log(`  Gönderen      : ${a.gonderen || '(MAIL_KULLANICI kullanılacak)'}`);
  return a;
}

// Gmail'in döndürdüğü hata kodları teknik; her birini yapılacak işe çeviriyoruz.
function hatayiYorumla(h) {
  const kod = h.code || '';
  const mesaj = String(h.message || '');

  if (kod === 'EAUTH' || mesaj.includes('535') || mesaj.includes('Username and Password not accepted')) {
    return [
      'Gmail kullanıcı adı/şifre kombinasyonunu REDDETTİ.',
      '',
      'En sık üç sebep:',
      '  1. MAIL_SIFRE yerine hesabın NORMAL şifresi yazılmış.',
      '     Gmail normal şifreyle SMTP bağlantısı kabul etmiyor;',
      '     "uygulama şifresi" üretilmesi gerekiyor.',
      '  2. Uygulama şifresi boşluklu yapıştırılmış. Google onu',
      '     "abcd efgh ijkl mnop" diye gösteriyor; BOŞLUKSUZ yazılmalı',
      '     (16 karakter).',
      '  3. Hesapta iki adımlı doğrulama kapalı. Kapalıysa Google',
      '     uygulama şifresi üretmiyor.',
    ].join('\n');
  }
  if (kod === 'ETIMEDOUT' || kod === 'ESOCKET' || kod === 'ECONNECTION') {
    return [
      'Sunucuya hiç bağlanılamadı (kimlik doğrulamaya sıra gelmedi).',
      '',
      '  - Ağ/güvenlik duvarı 587 portunu engelliyor olabilir.',
      '  - Bazı kurumsal ve okul ağları SMTP çıkışını kapatıyor.',
      '  - MAIL_PORT=465 denenebilir (o portta şifreli bağlantı baştan kurulur).',
    ].join('\n');
  }
  if (mesaj.includes('ENOTFOUND') || kod === 'EDNS') {
    return 'Sunucu adı çözümlenemedi. MAIL_SUNUCU yazımını kontrol edin (smtp.gmail.com).';
  }
  return `Beklenmeyen hata. Tam metin:\n  ${mesaj}`;
}

async function main() {
  const a = ayarlariYaz();

  if (!eposta.yapilandirildiMi()) {
    baslik('=== SONUÇ: YAPILANDIRILMAMIŞ ===');
    console.log('  MAIL_KULLANICI ve/veya MAIL_SIFRE tanımlı değil, bu yüzden posta');
    console.log('  gönderilmiyor. Uygulama bu durumda çökmüyor: şifre sıfırlama');
    console.log('  bağlantısını sunucu terminaline yazıyor.');
    console.log('');
    console.log('  Gerçekten posta göndermek için backend/.env dosyasına ekleyin:');
    console.log('    MAIL_KULLANICI="hesabiniz@gmail.com"');
    console.log('    MAIL_SIFRE="16hanelikuygulamasifresi"');
    console.log('');
    console.log('  Uygulama şifresi nasıl alınır: .env.example dosyasında yazıyor.');
    console.log('');
    return;
  }

  if (a.sifreUzunlugu !== 16) {
    baslik('=== UYARI ===');
    console.log(`  MAIL_SIFRE ${a.sifreUzunlugu} karakter. Google'ın uygulama şifreleri`);
    console.log('  16 karakterdir. Boşluklu yapıştırılmış ya da normal hesap şifresi');
    console.log('  yazılmış olabilir. Yine de bağlantı denenecek.');
  }

  baslik('=== BAĞLANTI SINANIYOR ===');
  try {
    await eposta.baglantiyiDene();
    console.log('  Bağlantı ve kimlik doğrulama BAŞARILI.');
  } catch (h) {
    console.log('  BAŞARISIZ.\n');
    console.log(hatayiYorumla(h));
    console.log('');
    process.exit(1);
  }

  const alici = process.argv[2];
  if (!alici) {
    baslik('=== SONUÇ ===');
    console.log('  Ayarlar çalışıyor. Deneme postası yollamak için:');
    console.log('    node src/posta_dene.js kendi-adresiniz@ornek.com');
    console.log('');
    return;
  }

  baslik(`=== DENEME POSTASI GÖNDERİLİYOR: ${alici} ===`);
  try {
    await eposta.sifirlamaGonder(alici, 'http://localhost:3000/sifre-yenile?bilet=DENEME', 60);
    console.log('  Gönderildi. Gelen kutusunu ve gereksiz (spam) klasörünü kontrol edin.');
    console.log('  Not: bu bağlantı gerçek değil, yalnızca gönderimi sınamak için.');
    console.log('');
  } catch (h) {
    console.log('  Gönderim başarısız.\n');
    console.log(hatayiYorumla(h));
    console.log('');
    process.exit(1);
  }
}

main().catch((h) => { console.error('\nHATA:', h.message, '\n'); process.exit(1); });
