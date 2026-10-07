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
// olduğu gösteriliyor (uygulama parolası 16 hane olmalı — en sık hata bu).
require('dotenv').config();
const eposta = require('./eposta');

function baslik(m) { console.log(`\n${m}`); }

function ayarlariYaz() {
  const a = eposta.ayarlar();
  const etiket = { brevo: 'Brevo HTTP API (443)', smtp: 'SMTP (587)', yok: 'YOK' };
  baslik('=== AYARLAR ===');
  console.log(`  Kullanılacak yol: ${etiket[a.yontem]}`);
  console.log(`  BREVO_API_KEY   : ${a.brevoAnahtariVar ? 'tanımlı' : 'tanımlı değil'}`);
  console.log(`  MAIL_KULLANICI  : ${a.kullanici || 'tanımlı değil'}`);
  console.log(`  MAIL_SIFRE      : ${a.sifreTanimliMi ? `tanımlı (${a.sifreUzunlugu} karakter)` : 'tanımlı değil'}`);
  console.log(`  SMTP sunucusu   : ${a.sunucu}:${a.port}`);
  console.log(`  Gönderen        : ${a.gonderen || 'TANIMLI DEĞİL'}`);
  return a;
}

// Gmail'in döndürdüğü hata kodları teknik; her birini yapılacak işe çeviriyoruz.
function hatayiYorumla(h) {
  const kod = h.code || '';
  const mesaj = String(h.message || '');

  if (kod === 'EAUTH' || mesaj.includes('535') || mesaj.includes('Username and Password not accepted')) {
    return [
      'Gmail kullanıcı adı/parola kombinasyonunu REDDETTİ.',
      '',
      'En sık üç sebep:',
      '  1. MAIL_SIFRE yerine hesabın NORMAL parolası yazılmış.',
      '     Gmail normal parolayla SMTP bağlantısı kabul etmiyor;',
      '     "uygulama parolası" üretilmesi gerekiyor.',
      '  2. Uygulama parolası boşluklu yapıştırılmış. Google onu',
      '     "abcd efgh ijkl mnop" diye gösteriyor; BOŞLUKSUZ yazılmalı',
      '     (16 karakter).',
      '  3. Hesapta iki adımlı doğrulama kapalı. Kapalıysa Google',
      '     uygulama parolası üretmiyor.',
    ].join('\n');
  }
  if (kod === 'ENETUNREACH' || mesaj.includes('ENETUNREACH')) {
    return [
      'Ağa ulaşılamadı — büyük ihtimalle IPv6 denendi ve ortamda IPv6 yok.',
      '',
      'Bu hata YAŞANDI ve düzeltildi (src/eposta.js): nodemailer sunucu adını',
      'hem IPv4 hem IPv6 olarak çözüp aralarından RASTGELE birini seçiyordu.',
      'Render konteynerinde IPv6 bağlantısı olmadığı için gönderimlerin yaklaşık',
      'yarısı patlıyordu — kalıcı değil, yazı-tura bir hata.',
      '',
      'Artık adres kendimiz IPv4\'e çözülüp öyle veriliyor. Bu hatayı yine',
      'görüyorsanız eposta.js içindeki ipv4Coz() çalışmıyor demektir.',
    ].join('\n');
  }
  if (kod === 'ETIMEDOUT' || kod === 'ESOCKET' || kod === 'ECONNECTION'
      || mesaj.includes('Connection timeout')) {
    return [
      'Sunucuya hiç bağlanılamadı (kimlik doğrulamaya sıra gelmedi).',
      '',
      'RENDER ÜCRETSİZ KATMANINDA BU KAÇINILMAZ. Render, Eylül 2025\'ten beri',
      'ücretsiz web servislerinde 25, 465 ve 587 numaralı SMTP portlarına giden',
      'trafiği tamamen engelliyor. Hiçbir SMTP ayarı bunu aşamaz.',
      '',
      'Çözüm: BREVO_API_KEY tanımla. Brevo 443 portundan HTTP ile gönderiyor,',
      'o port engellenmiyor. Ücretsiz katmanı günde 300 posta ve alan adı',
      'istemiyor; Gmail adresini "tek gönderen" olarak doğrulaman yeterli.',
      '',
      'Yerel ağda bu hatayı görüyorsan: okul/kurum ağı SMTP çıkışını kapatmış',
      'olabilir, ya da MAIL_PORT=465 denenebilir.',
    ].join('\n');
  }
  if (mesaj.startsWith('Brevo ')) {
    return [
      `Brevo isteği reddetti: ${mesaj}`,
      '',
      '  401 -> API anahtarı yanlış ya da iptal edilmiş.',
      '  400 + "sender" -> MAIL_GONDEREN adresi Brevo\'da doğrulanmamış.',
      '         Brevo panosunda Senders bölümünden adresi ekleyip gelen',
      '         doğrulama postasındaki bağlantıya tıklaman gerekiyor.',
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
    console.log('');
    console.log(`  EKSİK: ${eposta.eksikNe()}`);
    baslik('=== SONUÇ: YAPILANDIRILMAMIŞ ===');
    console.log('  MAIL_KULLANICI ve/veya MAIL_SIFRE tanımlı değil, bu yüzden posta');
    console.log('  gönderilmiyor. Uygulama bu durumda çökmüyor: parola sıfırlama');
    console.log('  bağlantısını sunucu terminaline yazıyor.');
    console.log('');
    console.log('  Gerçekten posta göndermek için backend/.env dosyasına EKLEYİN.');
    console.log('');
    console.log('  Render gibi SMTP portlarını engelleyen ortamlarda:');
    console.log('    BREVO_API_KEY="brevo-api-anahtariniz"');
    console.log('    MAIL_GONDEREN="dogrulanmis@gmail.com"');
    console.log('');
    console.log('  SMTP\'nin açık olduğu ortamlarda (yerel, kendi sunucun):');
    console.log('    MAIL_KULLANICI="hesabiniz@gmail.com"');
    console.log('    MAIL_SIFRE="16hanelikuygulamasifresi"');
    console.log('');
    console.log('  Uygulama parolası nasıl alınır: .env.example dosyasında yazıyor.');
    console.log('');
    return;
  }

  if (a.yontem === 'smtp' && a.sifreUzunlugu !== 16) {
    baslik('=== UYARI ===');
    console.log(`  MAIL_SIFRE ${a.sifreUzunlugu} karakter. Google'ın uygulama parolaları`);
    console.log('  16 karakterdir. Boşluklu yapıştırılmış ya da normal hesap parolası');
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
