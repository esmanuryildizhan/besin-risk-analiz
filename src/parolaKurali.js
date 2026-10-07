// src/parolaKurali.js
//
// Parola kuralının ARAYÜZ kopyası — yalnızca anlık geri bildirim için.
//
// NİYE KOPYA VAR: arayüz ve sunucu ayrı derleniyor, arayüz backend/src
// altındaki modülü içe aktaramıyor. Kullanıcı yazarken hangi şartı
// karşıladığını görmezse, parolayı gönderip hata almak zorunda kalır.
//
// YETKİ SUNUCUDA: burası yalnızca gösterim. Sunucu her durumda kendi
// denetimini yapıyor (backend/src/parola_kurali.js); bu dosya atlansa bile
// geçersiz parola kabul edilmez.
//
// AYRIŞMA RİSKİ TESTE BAĞLI: backend/src/guvenlik_test.js içindeki G81,
// buradaki sayıların sunucudakilerle AYNI olduğunu doğruluyor. Biri
// değiştirilip diğeri unutulursa test patlıyor.

export const EN_AZ = 10;
export const EN_AZ_FARKLI = 5;

export const KURALLAR = [
  { kod: 'uzunluk',    metin: `En az ${EN_AZ} karakter`,       sina: (p) => p.length >= EN_AZ },
  { kod: 'harf',       metin: 'En az bir harf',                sina: (p) => /\p{L}/u.test(p) },
  { kod: 'rakam',      metin: 'En az bir rakam',               sina: (p) => /\p{Nd}/u.test(p) },
  { kod: 'sembol',     metin: 'En az bir sembol (! ? * - .)',  sina: (p) => /[^\p{L}\p{Nd}\s]/u.test(p) },
  { kod: 'cesitlilik', metin: `En az ${EN_AZ_FARKLI} farklı karakter`, sina: (p) => new Set(p).size >= EN_AZ_FARKLI },
];

/** Sunucunun ayrıca baktıkları (ardışık dizi, kişisel bilgi, sızıntı) burada
 *  sınanmıyor; onlar gönderimde hata olarak dönüyor. */
export function tumKurallarTamamMi(parola) {
  return KURALLAR.every((k) => k.sina(parola || ''));
}
