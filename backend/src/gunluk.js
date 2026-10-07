// Günlük takip kayıtlarının şifre çözme ve biçimlendirme katmanı.
//
// NEDEN AYRI DOSYA: index.js içindeyken test edilemiyordu, çünkü o dosya
// yüklenince sunucu ayağa kalkıyor. Burada durunca hem şifre çözme hem de
// adet/yuvarlama mantığı veritabanına bağlanmadan sınanabiliyor.
//
// SIFIR DİKKATİ: 0 JavaScript'te yanlış (falsy) sayılır. Kalori ya da su
// gerçekten 0 girilmiş olabileceği için sayiSifrele(0) null dönmemeli,
// sayiCoz de 0'ı null'dan ayırmalı. Testler bunu sabitliyor.
const kripto = require('./kripto');

// Şifreli bir kalem satırını açık hâle çevirir. Çözme TEK noktada yapılıyor;
// kalemiDondur çözülmüş satır bekler, kendisi çözmez.
//
// foodRef şifreli olduğu için besin bilgisi veri tabanı JOIN'i ile GELMİYOR;
// kimlik burada çözülüyor, besin kaydı sonra besinleriBagla ile ekleniyor.
function kalemiCoz(k) {
  return {
    ...k,
    foodId: kripto.sayiCoz(k.foodRef),
    amount: kripto.sayiCoz(k.amount),
    kcal: kripto.sayiCoz(k.kcal) || 0,
    label: kripto.coz(k.label),
  };
}

/**
 * Çözülmüş kalemlere besin kayıtlarını ekler.
 *
 * besinHaritasi: Map(besinId -> besin kaydı). Tek tek sorgu yerine toplu
 * sorgu yapılıyor; aksi hâlde bir günde 10 kalem 10 ayrı sorgu olurdu
 * (N+1 sorgu sorunu).
 *
 * Besin bulunamazsa kalem DÜŞMÜYOR: kalori ve gram kullanıcının kendi
 * verisi, besin kaydı eksik diye silinmesi veri kaybı olurdu.
 */
function besinleriBagla(kalemler, besinHaritasi) {
  return kalemler.map((k) => ({
    ...k,
    food: k.foodId ? (besinHaritasi.get(k.foodId) || null) : null,
    // Besin seçilmişti ama kaydı bulunamadı mı? kalemiDondur bunu ayırt
    // edebilsin diye işaretliyoruz: "besin yok" ile "serbest giriş" farklı.
    besinKayipMi: Boolean(k.foodId) && !besinHaritasi.get(k.foodId),
  }));
}

/** Çözülmüş kalemlerden benzersiz besin kimliklerini toplar. */
function besinKimlikleri(kalemler) {
  return [...new Set(kalemler.map((k) => k.foodId).filter((x) => x))];
}

// Gün kaydı hiç yoksa da, alanı boşsa da 0 dönüyor: arayüz iki durumu
// ayırt etmiyor, ikisinde de "girilmemiş" demek.
function gunKaydiniCoz(g) {
  return {
    burnedKcal: g ? (kripto.sayiCoz(g.burnedKcal) || 0) : 0,
    waterL: g ? (kripto.sayiCoz(g.waterL) || 0) : 0,
  };
}

/** Bir kalemi arayüzün beklediği şekle çevirir. ÇÖZÜLMÜŞ satır bekler. */
function kalemiDondur(k) {
  // ADET: kaç porsiyon yendiği. Veritabanında GRAM saklıyoruz (porsiyon tanımı
  // ileride düzeltilirse yenen miktar değişmesin diye), adet gösterim için
  // gramdan geri hesaplanıyor.
  let adet = null;
  if (k.food && k.food.portionGrams > 0 && k.amount) {
    adet = Math.round((k.amount / k.food.portionGrams) * 100) / 100;
  }
  return {
    id: k.id,
    mealType: k.mealType,
    // KALORİ VERİTABANINDA YUVARLANMADAN DURUYOR, burada yuvarlanıyor.
    // Sebebi: adet değiştikçe kalori oranlanıyor. Her adımda yuvarlasaydık
    // 1 -> 0,5 -> 1 gidip gelen bir kalem her turda birkaç kcal kayardı.
    kcal: Math.round(k.kcal),
    // Besin seçilerek eklendiyse adı besinden, serbest girişte label'dan gelir.
    // Besin seçilmişse adı besinden, serbest girişte label'dan. Besin
    // seçilmiş ama kaydı yoksa bunu saklamıyoruz: sessizce "Belirtilmemiş"
    // demek, kullanıcıya verisinin bozulduğunu göstermeden gizlemek olurdu.
    ad: (() => {
      if (k.food) return k.food.name;
      if (k.besinKayipMi) return 'Besin kaydı bulunamadı';
      return k.label || 'Belirtilmemiş';
    })(),
    foodId: k.foodId,
    amount: k.amount,
    adet,
    porsiyonAdi: k.food ? k.food.portionName : null,
    icon: k.food ? k.food.icon : null,
  };
}

module.exports = {
  kalemiCoz, gunKaydiniCoz, kalemiDondur, besinleriBagla, besinKimlikleri,
};
