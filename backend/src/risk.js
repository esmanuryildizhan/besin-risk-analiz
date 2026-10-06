// src/risk.js
//
// RİSK MOTORU
// Bir besin + bir kullanıcı profili alır, "bu kişi bu besini yiyebilir mi?"
// sorusunu cevaplar.
//
// Temel prensipler:
//   1. Alerji her şeyin önünde gelir. Alerjen varsa sonuç ALERJEN'dir.
//   2. Olumlu ve olumsuz sonuçlar birbirini SİLMEZ. Pekmez kansızlık için
//      faydalı, diyabet için riskli olabilir; kullanıcı ikisini de görür.
//   3. Kartın rengini en ciddi bulgu belirler.
//   4. Veri yoksa "uygun" denmez, "değerlendirilemedi" denir.

// Hafiften ağıra doğru. En ağır bulgu kartın rengini belirler.
const SEVIYE_SIRASI = ['UYGUN', 'DIKKAT', 'RISKLI', 'DIYET_DISI', 'ALERJEN'];

const SEVIYE_ETIKET = {
  UYGUN: 'UYGUN',
  DIKKAT: 'DİKKAT',
  RISKLI: 'RİSKLİ',
  DIYET_DISI: 'DİYETİNİZE UYGUN DEĞİL',
  ALERJEN: 'ALERJEN',
};

function dahaCiddi(a, b) {
  return SEVIYE_SIRASI.indexOf(a) >= SEVIYE_SIRASI.indexOf(b) ? a : b;
}

/** a, b'den KESİN olarak daha ciddi mi? (eşitlikte false) */
function kesinDahaCiddi(a, b) {
  return SEVIYE_SIRASI.indexOf(a) > SEVIYE_SIRASI.indexOf(b);
}

function karsilastir(deger, islec, esik) {
  switch (islec) {
    case '>': return deger > esik;
    case '>=': return deger >= esik;
    case '<': return deger < esik;
    case '<=': return deger <= esik;
    default: throw new Error(`Bilinmeyen işleç: ${islec}`);
  }
}

/**
 * Veritabanında doğrudan bulunmayan, hesaplanan besin değerleri.
 * Hepsi "100 gram başına" döner; porsiyona çevirme aşağıda yapılır.
 * Oran cinsinden olanlar (yüzde vb.) porsiyona çevrilmez, TUR_ORAN'da listelidir.
 */
const TUREV = {
  // Lif kana karışmadığı için diyabette net karbonhidrat daha anlamlı.
  netCarbs: (b) =>
    b.carbohydrates === null || b.carbohydrates === undefined
      ? null
      : Math.max(0, b.carbohydrates - (b.fiber || 0)),

  // Lif yoğunluğu: 1000 kcal başına lif (g).
  // Evert 2019 rehberi lifi mutlak gram yerine kalori başına tanımlıyor,
  // böylece az kalorili sebzeler haksız yere "lifsiz" sayılmıyor.
  fiberPer1000kcal: (b) =>
    b.fiber === null || b.fiber === undefined || !b.kcal || b.kcal < 20
      ? null
      : (b.fiber / b.kcal) * 1000,

  // Doymuş yağdan gelen kalorinin toplam kaloriye oranı (%).
  // Rehberler doymuş yağı gram değil, "enerjinin yüzdesi" olarak sınırlıyor.
  satFatEnergyPct: (b) =>
    b.saturatedFat === null || b.saturatedFat === undefined || !b.kcal || b.kcal < 50
      ? null
      : ((b.saturatedFat * 9) / b.kcal) * 100,

  // GLİSEMİK YÜK — Venn & Green 2007, s.S125
  //   glisemik yük = glisemik indeks x kullanılabilir karbonhidrat / 100
  // Burada 100 g için hesaplanıyor; 'temel: porsiyon' olan kurallar bunu
  // porsiyona göre ölçekliyor (glisemik yük karbonhidratla doğrusal olduğu
  // için ölçekleme matematiksel olarak doğru).
  //
  // Glisemik indeks ölçülmemişse null döner ve motor eski yönteme düşer:
  // glisemik indeks en fazla 100 olabileceğinden net karbonhidratın kendisi
  // glisemik yük için bir ÜST SINIR'dır. Yani veri varsa gerçek değer, yoksa
  // güvenli taraftan tahmin — ikisi aynı kaynağa dayanıyor.
  glycemicLoad: (b) => {
    if (b.glycemicIndex === null || b.glycemicIndex === undefined) return null;
    const net = TUREV.netCarbs(b);
    if (net === null) return null;
    return (b.glycemicIndex * net) / 100;
  },

  // Yağın ne kadarı doymamış? (zeytinyağı ~%84, tereyağı ~%37)
  // Kılavuzların en güçlü önerisi doymuş yağı "azaltmak" değil, doymamışla
  // "değiştirmek" olduğu için bu oran tek başına bilgi veriyor.
  //
  // YALNIZCA ÖLÇÜMDEN HESAPLANIR. Ölçüm yoksa null döner ve kullanıcıya hiçbir
  // yüzde gösterilmez. Sebebi: bu değer kullanıcıya olumlu bulgu olarak
  // ("Yağının %X'i doymamış yağ") sunuluyor, yani bir İDDİA. Ölçmediğimiz bir
  // sayıyı iddia etmiyoruz. Muafiyet kararı da aynı ölçüme bağlı: tahminle
  // muafiyet verme denendi ve bırakıldı, gerekçe aşağıdaki blokta.
  //
  // Formül: TürKomp her sayfada üç toplam veriyor (doymuş / tekli doymamış /
  // çoklu doymamış) ve bunlar bildirilen tüm yağ asitlerini kapsıyor.
  // Elaidik asit TürKomp'ta "toplam tekli doymamış" İÇİNDE sayılıyor — margarin
  // sayfasında doğrulandı (16:1 + 18:1cis + 18:1trans + 20:1 = 17,152 = toplam
  // tekli doymamış). Trans yağ doymamış faydası sayılmayacağı için paydan
  // düşülüyor.
  // EPA + DHA — Komisyon Tüzüğü (AB) 116/2010'un "omega-3 kaynağı" ölçütünü
  // TEK SAYIYLA ifade ediyor.
  //
  // Tüzük İKİ koşulu BİRLİKTE istiyor: "en az 40 mg ... per 100 g AND per
  // 100 kcal". İki ayrı kural yazsak her biri tek başına tetiklenirdi ve
  // tüzüğün "ve"sini "veya"ya çevirmiş olurduk — yani yüksek kalorili bir
  // besin 100 g'da eşiği geçtiği için "omega-3 kaynağı" sayılırdı.
  // Bu yüzden iki değerin KÜÇÜĞÜNÜ döndürüyoruz: tek eşik (>= 40) o zaman
  // tam olarak "ikisi de >= 40" demek oluyor.
  epaDhaMgMin: (b) => {
    if (b.epa === null || b.epa === undefined) return null;
    if (b.dha === null || b.dha === undefined) return null;
    if (!b.kcal) return null;
    const mgYuzGram = (b.epa + b.dha) * 1000;          // TürKomp gram veriyor
    const mgYuzKcal = (mgYuzGram / b.kcal) * 100;
    return Math.min(mgYuzGram, mgYuzKcal);
  },

  unsaturatedFatPct: (b) => {
    const mufa = b.monounsaturatedFat;
    const pufa = b.polyunsaturatedFat;
    if (mufa === null || mufa === undefined) return null;
    if (pufa === null || pufa === undefined) return null;
    if (b.saturatedFat === null || b.saturatedFat === undefined) return null;
    const yagAsitleri = b.saturatedFat + mufa + pufa;
    if (yagAsitleri <= 0) return null;
    const trans = (b.transFat === null || b.transFat === undefined) ? 0 : b.transFat;
    return (Math.max(0, mufa + pufa - trans) / yagAsitleri) * 100;
  },
};

// ---------------------------------------------------------------------------
// DOYMAMIŞ YAĞ ORANI: NİYE TAHMİNE İZİN VERMİYORUZ
// ---------------------------------------------------------------------------
// 2 Ekim 2026, iki aşamalı bir karar. Önce oranı ölçüm yokken
// (yağ - doymuş - trans)/yağ ile tahmin edip, muafiyet eşiğine 3 puan "pay"
// ekleyerek güvenli tarafta kalmayı denedik. Payı şöyle türetmiştik:
//
//     tahmin - ölçüm = ((doymuş+trans)/yağ) x (1/r - 1)
//     r = bildirilen yağ asitleri toplamı / toplam yağ
//
// ve r'nin 0,92-0,956 bandında kaldığını varsaymıştık (margarin 0,924,
// zeytinyağı 0,954). O varsayım VERİYLE ÇÖKTÜ: ceviz sayfasında r = 0,773
// çıktı ve fazla gösterme 2,91 puan oldu — koyduğumuz 3 puanlık payın kıl payı
// altında. r = 0,773 ile payın 8,8 puan olması gerekirdi.
//
// (Cevizin r'si düşük çünkü TürKomp'un bildirdiği üç toplam, aynı sayfadaki
// tek tek yağ asitleriyle tutmuyor: toplamlar 50,13 g, tek tek toplanınca
// 60,16 g. Sayfada bu satırların minimumu 0,000 — ortalamalar gürültülü.
// Oran her iki hesapta da %87,17 çıkıyor, yani ORAN sağlam; ama r sağlam değil.)
//
// Yani payı veriden türetemiyoruz. Uydurulmuş bir paya dayanarak muafiyet
// vermek, bu projenin bütün kuralını çiğnemek olurdu. O yüzden tahmin tamamen
// kaldırıldı: doymamış yağ oranı YALNIZCA ölçümden geliyor; ölçüm yoksa ne
// yüzde gösteriliyor ne muafiyet veriliyor.
//
// Bunun maliyeti ölçüldü ve tek besin: Antep fıstığı (TürKomp 09.01.0059,
// "iç, taze"). Yapıştırılan kavrulmuş varyantın (09.02.0058) sayfasında yağ
// asidi dökümü hiç yok. O sayfa gelene kadar Antep fıstığı kolesterolde
// RİSKLİ görünüyor — ölçmediğimiz için muaf tutmuyoruz, bu güvenli yön.
// ---------------------------------------------------------------------------

// Bunlar zaten oran/yüzde; porsiyona göre büyütülmez.
// Bunlar zaten oran/yüzde ya da iki tabanın birleşimi; porsiyona göre
// büyütülmezler. epaDhaMgMin listede çünkü içinde bir "100 kcal başına" terimi
// var: porsiyona ölçeklemek o terimi anlamsız kılar.
const TUREV_ORAN = new Set(['fiberPer1000kcal', 'satFatEnergyPct', 'unsaturatedFatPct',
  'epaDhaMgMin']);

/** Kural 100 g üzerinden mi, porsiyon üzerinden mi değerlendirilecek? */
function degerAl(besin, nutrient, temel) {
  const yuzGram = TUREV[nutrient] ? TUREV[nutrient](besin) : besin[nutrient];
  if (yuzGram === null || yuzGram === undefined) return null;
  if (temel === 'porsiyon' && !TUREV_ORAN.has(nutrient)) {
    const gram = besin.portionGrams || 100;
    return (yuzGram * gram) / 100;
  }
  return yuzGram;
}

function mesajDoldur(sablon, deger) {
  const yuvarlanmis = deger >= 100 ? Math.round(deger) : Math.round(deger * 10) / 10;
  return sablon.replace('{deger}', String(yuvarlanmis).replace('.', ','));
}

/**
 * @param besin    Veritabanındaki Food kaydı
 * @param kullanici { allergies: ['milk'], diseases: ['diyabet'], diet: 'Normal' }
 * @param kurallar  { hastaliklar: [...], hastalikAlerjen: {...}, diyetler: {...} }
 */
function riskHesapla(besin, kullanici, kurallar) {
  const alerjilerim = kullanici.allergies || [];
  const hastaliklarim = kullanici.diseases || [];
  const diyet = kullanici.diet || 'Normal';

  const besinAlerjenleri = besin.allergens || [];
  const besinEserleri = besin.traces || [];

  const sonuc = {
    seviye: 'UYGUN',
    etiket: SEVIYE_ETIKET.UYGUN,
    alerjiUyarilari: [],   // kullanıcının kendi alerjileri
    riskler: [],           // hastalıklara göre olumsuz bulgular
    faydalar: [],          // hastalıklara göre olumlu bulgular
    diyetUyarilari: [],
    bilgiNotlari: [],      // "şu hastalık için değerlendirilemedi", "veri eksik"
  };

  // --- 1) ALERJİ KONTROLÜ (her şeyden önce) ---
  for (const alerjen of alerjilerim) {
    if (besinAlerjenleri.includes(alerjen)) {
      sonuc.alerjiUyarilari.push({
        alerjen,
        seviye: 'ALERJEN',
        mesaj: `ALERJEN UYARISI: ${besin.name} ${alerjenAdi(alerjen, kurallar)} içeriyor. Tüketmeyiniz!`,
      });
      sonuc.seviye = dahaCiddi(sonuc.seviye, 'ALERJEN');
    } else if (besinEserleri.includes(alerjen)) {
      sonuc.alerjiUyarilari.push({
        alerjen,
        seviye: 'DIKKAT',
        mesaj: `Eser miktarda ${alerjenAdi(alerjen, kurallar)} bulunma riski var (üretim sırasında bulaşma).`,
      });
      sonuc.seviye = dahaCiddi(sonuc.seviye, 'DIKKAT');
    }
  }

  // --- 2) HASTALIK KURALLARI ---
  for (const hastalikKey of hastaliklarim) {
    const hastalik = kurallar.hastaliklar.find((h) => h.key === hastalikKey);
    if (!hastalik) continue;

    // 2a) Hastalığa bağlı alerjen yasakları (çölyak -> gluten gibi)
    const alerjenKurallari = (kurallar.hastalikAlerjen || {})[hastalikKey] || [];
    for (const k of alerjenKurallari) {
      if (besinAlerjenleri.includes(k.alerjen)) {
        sonuc.riskler.push({ hastalik: hastalik.name, seviye: k.seviye, mesaj: k.message });
        sonuc.seviye = dahaCiddi(sonuc.seviye, k.seviye);
      } else if (besinEserleri.includes(k.alerjen)) {
        sonuc.riskler.push({
          hastalik: hastalik.name,
          seviye: 'DIKKAT',
          mesaj: `Eser miktarda ${alerjenAdi(k.alerjen, kurallar)} bulunma riski var.`,
        });
        sonuc.seviye = dahaCiddi(sonuc.seviye, 'DIKKAT');
      }
    }

    // 2b) Otomatik değerlendirilemeyen hastalıklar
    if (hastalik.degerlendirilemez) {
      sonuc.bilgiNotlari.push({ hastalik: hastalik.name, mesaj: hastalik.note });
      continue;
    }

    // 2c) Besin değeri kuralları
    const buFaydalar = [];
    const eksikVeriler = [];
    let kritikEksik = false;
    // HASTALIK BAŞINA ARTIK TEK RİSK DEĞİL — 2 Ekim 2026 kararı.
    // Eskiden yalnızca "en ciddi" tek bulgu gösteriliyordu ve ikinci bir uyarı
    // varsa kullanıcı onu hiç görmüyordu: eski kaşar "doymuş yağ RİSKLİ"
    // gösteriyor, trans yağ DİKKAT'i gizli kalıyordu. Olumlu bulgular zaten
    // çoklu gösteriliyordu; risklerin tek olması tutarsızdı ve projenin temel
    // fikrine (bir besin aynı hastalıkta birden fazla şey söyleyebilir)
    // aykırıydı.
    //
    // Gürültüyü önlemek için BESİN ÖĞESİ başına tek bulgu tutuluyor: doymuş yağ
    // hem 100 g hem porsiyon kuralından tetiklenebiliyor, ikisini ayrı satır
    // yapmak bilgi değil tekrar olurdu. Aynı öğeden en ciddi olan kalıyor,
    // eşitlikte ilk (kurallar dosyası güçlüden zayıfa sıralı).
    const riskHaritasi = new Map();

    /** Bulguyu besin öğesi anahtarına göre kaydeder; daha ciddi olan kazanır. */
    const riskEkle = (anahtar, bulgu) => {
      const mevcut = riskHaritasi.get(anahtar);
      if (!mevcut || kesinDahaCiddi(bulgu.seviye, mevcut.seviye)) {
        riskHaritasi.set(anahtar, bulgu);
      }
    };

    for (const kural of hastalik.rules) {
      // Kural belirli kategoriler için yazıldıysa, diğer kategorilerde çalışmaz
      if (kural.kategoriler && !kural.kategoriler.includes(besin.category)) continue;

      // FSA kılavuzu (Annex 3, s.19): porsiyon başına kırmızı sınırlar YALNIZCA
      // porsiyonu 100 gramdan büyük ürünler için geçerlidir. 100 g'ın altındaki
      // porsiyonlarda sadece 100 g ölçütü kullanılır.
      if (kural.sadeceBuyukPorsiyon && (besin.portionGrams || 100) <= 100) continue;

      // Lif yoğunluğu muafiyeti: Evert 2019 (s.736) kuru baklagilleri, tam taneli
      // tahılları ve sebzeleri diyabette AÇIKÇA öneriyor. Bu besinler karbonhidrat
      // içerir ama lifleri sayesinde kan şekerini yavaş yükseltir. Karbonhidrat
      // uyarısının barbunyayı, mercimeği, yulafı cezalandırmaması için, rehberin
      // kendi lif ölçütünü (1000 kcal başına >= 14 g) karşılayan besinlerde bu
      // kuralı atlıyoruz.
      if (kural.muafLifYogunlugu) {
        const lifYogunlugu = degerAl(besin, 'fiberPer1000kcal', '100g');
        if (lifYogunlugu !== null && lifYogunlugu >= kural.muafLifYogunlugu) continue;
      }

      // Glisemik indeks muafiyeti: net karbonhidrat eşiği, glisemik yükü
      // ÖLÇMEDEN tahmin eden bir vekil (glisemik indeks en fazla 100 olabilir
      // varsayımıyla). Besnin gerçek glisemik indeksi elimizdeyse vekile
      // ihtiyaç kalmıyor; glisemik yükü doğrudan hesaplayan kural devreye
      // giriyor. İkisi birlikte çalışırsa aynı şey iki kez uyarı verir ve
      // düşük indeksli besinler (ör. baklagiller) haksız yere işaretlenir.
      if (kural.muafGlisemikYukBiliniyorsa) {
        const gl = degerAl(besin, 'glycemicLoad', '100g');
        if (gl !== null) continue;
      }

      // Doymamış yağ muafiyeti: Johnson 2023 kılavuzunda doymuş yağı AZALTMA
      // önerisi zayıf (GRADE 2), doymamış yağla DEĞİŞTİRME önerisi güçlü (GRADE 1).
      // Yağının büyük kısmı doymamış olan bir besin (zeytinyağı, ceviz, balık)
      // zaten kılavuzun tavsiye ettiği "değiştirme" seçeneğidir; onu en yüksek
      // risk seviyesinde göstermek, daha güçlü olan öneriyle çelişir.
      // Muafiyet YALNIZCA ÖLÇÜLEN orana veriliyor. Ölçüm yoksa muafiyet yok;
      // besin kuralın kendisine göre değerlendiriliyor. Tahminle muafiyet
      // denendi ve bırakıldı — gerekçe yukarıdaki blokta.
      if (kural.muafDoymamisOran) {
        const olculen = degerAl(besin, 'unsaturatedFatPct', '100g');
        if (olculen !== null && olculen >= kural.muafDoymamisOran) continue;
      }

      // Besin değeri olmayan, sadece kategoriye bakan kural (ör. "hazır gıda")
      if (!kural.nutrient) {
        const bulguK = {
          hastalik: hastalik.name, seviye: kural.seviye,
          mesaj: kural.message, kaynak: kural.kaynak || null,
          kaynakNot: kural.kaynakNot || null,
        };
        if (kural.seviye === 'ONERILIR') buFaydalar.push(bulguK);
        // Kategori kuralının besin öğesi yok; mesajı anahtar olarak kullanıyoruz
        // ki iki ayrı kategori kuralı birbirini ezmesin.
        else riskEkle(`kategori:${kural.message}`, bulguK);
        continue;
      }

      const deger = degerAl(besin, kural.nutrient, kural.temel);
      if (deger === null) {
        eksikVeriler.push(kural.nutrient);
        // Kritik bir değer eksikse besin "uygun" sayılamaz: bilmediğimiz şeye
        // güvenli diyemeyiz. Kullanıcıya açıkça "veri eksik" diyoruz.
        if (kural.kritik) kritikEksik = true;
        continue;
      }
      if (!karsilastir(deger, kural.islec, kural.value)) continue;

      const bulgu = {
        hastalik: hastalik.name,
        seviye: kural.seviye,
        mesaj: mesajDoldur(kural.message, deger),
        nutrient: kural.nutrient,
        deger: Math.round(deger * 100) / 100,
        kaynak: kural.kaynak || null,
        kaynakNot: kural.kaynakNot || null,
      };

      if (kural.seviye === 'ONERILIR') {
        // Aynı besin değeri için birden çok olumlu kural varsa (demir 4,2 ve 2,1)
        // sadece ilkini (daha güçlü olanı) al.
        if (!buFaydalar.some((f) => f.nutrient === kural.nutrient)) buFaydalar.push(bulgu);
      } else {
        // HATA GEÇMİŞİ — 2 Ekim 2026. Burada şöyle yazıyordu:
        //     } else if (!enCiddiRisk || dahaCiddi(...) === kural.seviye) {
        //         if (!enCiddiRisk) enCiddiRisk = bulgu;   // <-- hiçbir şey yapmıyor
        //     }
        // Dış koşul "yeni bulgu daha ciddi" diyordu, iç if ise değiştirmeyi
        // reddediyordu. Yani bir risk kaydedildikten sonra DAHA CİDDİ bir risk
        // sessizce düşüyordu — seviyeyi OLDUĞUNDAN HAFİF gösteren bir hata.
        // Gerekçesi "kurallar dosyasında RISKLI'ler DIKKAT'ten önce yazılıdır"
        // varsayımıydı; trans yağ kuralı DİKKAT'e çevrilince o varsayım çöktü
        // ve eski kaşar RİSKLİ yerine DİKKAT görünmeye başladı.
        riskEkle(kural.nutrient, bulgu);
      }
    }

    // Bulgular ciddiden hafife sıralanıyor: kullanıcı en önemlisini önce okusun.
    const buRiskler = [...riskHaritasi.values()]
      .sort((a, b) => SEVIYE_SIRASI.indexOf(b.seviye) - SEVIYE_SIRASI.indexOf(a.seviye));
    buRiskler.forEach((r) => {
      sonuc.riskler.push(r);
      sonuc.seviye = dahaCiddi(sonuc.seviye, r.seviye);
    });
    sonuc.faydalar.push(...buFaydalar);

    if (eksikVeriler.length > 0) {
      const benzersiz = [...new Set(eksikVeriler)];
      sonuc.bilgiNotlari.push({
        hastalik: hastalik.name,
        mesaj: kritikEksik
          ? `Bu besin için ${benzersiz.join(', ')} verisi yok; güvenli olduğu SÖYLENEMEZ, dikkatli olun.`
          : `Bu besin için ${benzersiz.join(', ')} verisi yok; değerlendirme eksik olabilir.`,
      });
      if (kritikEksik) sonuc.seviye = dahaCiddi(sonuc.seviye, 'DIKKAT');
    }
  }

  // --- 3) DİYET TERCİHİ ---
  // Kullanıcı vegan/vejetaryen seçtiyse, uygun olmayan besin kartı ayrı bir
  // renkte gösterilir. Bu bir sağlık riski değil ama kullanıcının tercihidir.
  const diyetKurali = (kurallar.diyetler || {})[diyet];
  const besinEtiketleri = besin.dietTags || [];
  if (diyetKurali && diyetKurali.yasakEtiket) {
    const carpisan = besinEtiketleri.filter((e) => diyetKurali.yasakEtiket.includes(e));
    if (carpisan.length > 0) {
      const adlar = carpisan.map((e) => (kurallar.etiketAdi || {})[e] || e).join(', ');
      sonuc.diyetUyarilari.push(`${diyet} beslenmeye uygun değil (${adlar} içeriyor).`);
      sonuc.seviye = dahaCiddi(sonuc.seviye, 'DIYET_DISI');
    }
  }

  sonuc.etiket = SEVIYE_ETIKET[sonuc.seviye];

  // Kısa özet: arayüzde kartın altında gösterilecek tek cümle
  if (sonuc.alerjiUyarilari.length > 0) {
    sonuc.ozet = sonuc.alerjiUyarilari[0].mesaj;
  } else if (sonuc.seviye === 'DIYET_DISI') {
    sonuc.ozet = sonuc.diyetUyarilari[0];
  } else if (sonuc.riskler.length > 0) {
    sonuc.ozet = sonuc.riskler[0].mesaj;
  } else if (sonuc.seviye === 'DIKKAT' && sonuc.bilgiNotlari.length > 0) {
    // Seviye sadece "veri eksik" olduğu için yükseldiyse özet de bunu söylemeli
    sonuc.ozet = sonuc.bilgiNotlari[0].mesaj;
  } else if (sonuc.faydalar.length > 0) {
    sonuc.ozet = sonuc.faydalar[0].mesaj;
  } else if (hastaliklarim.length === 0 && alerjilerim.length === 0) {
    sonuc.ozet = 'Profilinizde hastalık/alerji seçili değil; genel bilgi gösteriliyor.';
  } else {
    sonuc.ozet = 'Profilinize göre dikkat gerektiren bir durum bulunmadı.';
  }

  return sonuc;
}

function alerjenAdi(key, kurallar) {
  return (kurallar.alerjenler && kurallar.alerjenler[key]) || key;
}

module.exports = { riskHesapla, SEVIYE_SIRASI, SEVIYE_ETIKET, dahaCiddi };
