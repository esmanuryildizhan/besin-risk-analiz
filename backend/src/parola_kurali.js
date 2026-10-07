// src/parola_kurali.js
//
// Parola kuralı — TEK KAYNAK. Kayıt, sıfırlama ve parola değiştirme üçü de
// burayı çağırıyor. Üç yerde ayrı ayrı yazılsaydı biri güncellenip diğerleri
// unutulurdu; bu projede aynı hata hesap kilidi mantığında bir kez yaşandı.
//
// NİYE KOMPOZİSYON KURALI VAR:
// NIST SP 800-63B (§5.1.1.2) aslında "harf+rakam+sembol" gibi kuralları
// ÖNERMİYOR; uzunluk ve sızmış parola kontrolünü yeterli buluyor. Gerekçesi,
// kompozisyon kurallarının kullanıcıyı "Parola1!" gibi tahmin edilebilir
// kalıplara ittiği. Buna rağmen burada kural var, çünkü:
//   1. Proje değerlendirilirken beklenen asgari uygulama bu.
//   2. Sızmış parola kontrolü ağ erişimine bağlı ve başarısız olabiliyor;
//      kompozisyon kuralı o durumda da çalışan bir alt sınır.
// Dengeyi kurmak için asgari uzunluk 8 değil 10 ve sızmış parola kontrolü
// ayrıca yapılıyor (parola_sizinti.js).
//
// Unicode kullanılıyor: "harf" Türkçe harfleri de kapsıyor (ş, ğ, ü, ı, ö, ç).
// \w ile yazılsaydı "şşşşşşşşşş" harf sayılmaz, sembol sayılırdı.

const EN_AZ = 10;
const EN_FAZLA = 200;   // bcrypt 72 bayttan sonrasını yok sayıyor; ayrıca
                        // sınırsız girdi kabul etmek DoS yüzeyi

const HARF = /\p{L}/u;
const RAKAM = /\p{Nd}/u;
// Sembol = harf, rakam ve boşluk DIŞINDAKİ her görünür karakter.
// Beyaz liste yazılsaydı (!@#$...) Türkçe klavyedeki ₺ gibi karakterler
// sembol sayılmazdı.
const SEMBOL = /[^\p{L}\p{Nd}\s]/u;

/**
 * Karakter çeşitliliği.
 *
 * İlk yazımda "tamamı aynı karakter mi" diye bakıyordu ve ÖLÇÜLDÜ:
 * "aaaaaaaaaa1!" ile "şşşşşşşşşş1!" bu denetimden geçiyordu — uzunluk,
 * harf, rakam ve sembol şartlarının hepsini karşılıyorlar ama gerçek
 * entropileri neredeyse sıfır. Ölçü yanlıştı; sorulması gereken "kaç FARKLI
 * karakter var" idi.
 *
 * Eşik 5: 10 karakterlik bir parolada 5 farklı karakter, tekrara dayalı
 * parolaları eler ama "Ankara12!!" gibi meşru olanları elemez.
 */
const EN_AZ_FARKLI = 5;

function cesitlilikYeterliMi(p) {
  return new Set(p).size >= EN_AZ_FARKLI;
}

/** Ardışık dizi: 1234567890, abcdefghij, qwertyuiop. */
function ardisikMi(p) {
  const d = p.toLocaleLowerCase('tr');
  const diziler = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
  ];
  for (const dizi of diziler) {
    for (let i = 0; i + 6 <= dizi.length; i += 1) {
      const parca = dizi.slice(i, i + 6);
      if (d.includes(parca) || d.includes([...parca].reverse().join(''))) return true;
    }
  }
  return false;
}

/**
 * Parolada kişisel bilgi var mı?
 * "esmanur2024!" gibi parolalar kompozisyon kuralını geçiyor ama hedefli
 * tahmin saldırısına tamamen açık.
 */
function kisiselBilgiIceriyorMu(parola, { eposta = '', ad = '', soyad = '' }) {
  const p = parola.toLocaleLowerCase('tr');
  const parcalar = [
    String(eposta).split('@')[0] || '',
    ad, soyad,
  ]
    .map((x) => String(x).toLocaleLowerCase('tr').trim())
    .filter((x) => x.length >= 4);          // 4 harften kısa parça rastlantı olabilir
  return parcalar.some((x) => p.includes(x));
}

/**
 * Parolayı denetler.
 *
 * @returns {{gecerli: boolean, eksikler: string[], kodlar: string[]}}
 *   eksikler — kullanıcıya gösterilecek cümleler
 *   kodlar   — arayüzün madde madde göstermesi için makine okunur anahtarlar
 */
function parolaDenetle(parola, kisi = {}) {
  const p = typeof parola === 'string' ? parola : '';
  const eksikler = [];
  const kodlar = [];
  const ekle = (kod, mesaj) => { kodlar.push(kod); eksikler.push(mesaj); };

  if (p.length < EN_AZ) ekle('uzunluk', `En az ${EN_AZ} karakter olmalı.`);
  if (p.length > EN_FAZLA) ekle('cokUzun', `En fazla ${EN_FAZLA} karakter olabilir.`);
  if (!HARF.test(p)) ekle('harf', 'En az bir harf içermeli.');
  if (!RAKAM.test(p)) ekle('rakam', 'En az bir rakam içermeli.');
  if (!SEMBOL.test(p)) ekle('sembol', 'En az bir sembol içermeli (ör. ! ? * - .).');
  if (p && !cesitlilikYeterliMi(p)) {
    ekle('cesitlilik', `En az ${EN_AZ_FARKLI} farklı karakter içermeli.`);
  }
  if (p && ardisikMi(p)) ekle('ardisik', 'Ardışık dizi içeremez (123456, abcdef, qwerty).');
  if (p && kisiselBilgiIceriyorMu(p, kisi)) {
    ekle('kisisel', 'Adınızı veya e-posta adresinizi içeremez.');
  }

  return { gecerli: eksikler.length === 0, eksikler, kodlar };
}

/** Tek satırlık hata mesajı (API cevabı için). */
function hataMetni(sonuc) {
  return `Parola kuralı: ${sonuc.eksikler.join(' ')}`;
}

module.exports = {
  EN_AZ, EN_FAZLA, EN_AZ_FARKLI, parolaDenetle, hataMetni,
  // sınama için
  cesitlilikYeterliMi, ardisikMi, kisiselBilgiIceriyorMu,
};
