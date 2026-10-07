// src/tahlil_ayristir.js
//
// e-Nabız tahlil PDF'inden test sonuçlarını çıkarır.
//
// NEDEN KOORDİNATLA ÇALIŞIYOR
// PDF'i düz metne çevirip boşluklara göre ayırmak kırılgan: aynı e-Nabız
// çıktısının iki farklı düzeni var (ondalık virgül/nokta, referans "7-40" ya da
// "7 - 40", satırların tekrarlanması). pdfjs her metin parçasının X-Y
// koordinatını veriyor; sütunlar koordinattan okununca bu farklar önemsizleşiyor.
//
// Gözlenen düzen (03.06.2026 ve 04.06.2026 dosyaları):
//     x~121  test adı        x~328  sonuç
//     x~411  birim           x~494  referans aralığı
//     x~38   SOL KENAR -> düz yazı sınıflama satırı, üstteki teste aittir
//
// Sol kenardaki satır şöyle görünüyor ve referans sütunu BOŞ olan testlerin
// (glukoz, HDL, LDL, trigliserid) aralığı orada duruyor:
//     "Optimum: <100 mg/dL  Sınırda yüksek: 130-159 mg/dL  Yüksek: 160-189 ..."

// Birim SABİT LİSTEYLE tanınmıyor. İlk sürümde liste vardı ve 'mg/L' listede
// olmadığı için CRP'nin birimi birim sayılmayıp referans sütununa kaymıştı,
// referansı da o yüzden kayboluyordu. Yeni laboratuvarın yeni bir birimi
// listede olmayacağı için aynı hata tekrar ederdi.
// Kural: bir parça referans aralığına benzemiyorsa ve içinde harf varsa birimdir.
const REFERANS_BENZERI = /^[<>]?=?\s*-?[\d.,]+(\s*-\s*-?[\d.,]+)?\s*-?$/;
function birimMi(parca) {
  if (!parca) return false;
  if (REFERANS_BENZERI.test(parca)) return false;
  return /[A-Za-zÇĞİÖŞÜçğıöşü%^]/.test(parca);
}

// Etiket başına yapışan birimi ayıklarken kullanılıyor
const BIRIM_ORNEKLERI = ['mg/dL', 'mg/L', 'mmol/L', 'µg/L', 'μg/L', 'µg/dL', 'μg/dL',
  'g/dL', 'U/L', 'ng/L', 'mIU/L', 'KU/L', 'fL', 'pg', '%', '10^3/uL', '10^6/uL'];

// Sayfa başlığı/altlığı: test satırı değil
const ATLANACAK = [
  'T.C.SAĞLIK', 'Sağlık Bilgi', 'enabiz.gov.tr', 'Sayfa', 'Adı/Soyadı',
  'Doğum Tarihi', 'Sağlık Tesisi', 'Cinsiyet', 'Tahlil', 'Sonuç', 'Referans',
  'Birimi', 'Değeri', 'Tarih',
];

/* ──────────────────────────────────────────────────────────────────────────
   KİŞİSEL BİLGİ NÖBETÇİSİ
   ──────────────────────────────────────────────────────────────────────────

   Yukarıdaki ATLANACAK listesi, kişisel bilgi satırlarını ETİKETİNDEN tanıyıp
   atlıyor ("Adı/Soyadı", "Doğum Tarihi", "Cinsiyet", "Sağlık Tesisi").
   Elimizdeki e-Nabız raporlarında etiket ile değer aynı satırda olduğu için
   bu yeterli.

   AMA BU GÜVENCE DÜZENE BAĞLI. Farklı bir e-Nabız sürümü ya da özel bir
   laboratuvarın raporu adı etiketsiz bir başlık satırına koyarsa, o satır
   ATLANACAK'a yakalanmaz; sayı olmayan sonuçlar metinDeger olarak saklandığı
   için ad bir "test adı" gibi içeri girebilirdi.

   Bu yüzden ikinci bir savunma var: etikete değil İÇERİĞE bakıyor. Düzen
   değişse de çalışır.

   Nöbetçinin kapsamı kasıtlı olarak DAR. Geniş bir "isim gibi görünen her şeyi
   at" kuralı gerçek sonuçları da atardı ("Hafif hemolizli" gibi metin
   sonuçlar var). Yalnızca tahlil sonucu OLAMAYACAK biçimler reddediliyor.
*/

// Cinsiyet: hiçbir tahlilin sonucu bu kelimeler değildir.
const CINSIYET_DEGERLERI = /^(erkek|kadın|kadin|male|female)$/i;

// 11 haneli sayı: T.C. kimlik numarası biçimi. Hiçbir tahlil değeri 11 haneli
// tam sayı değil, dolayısıyla bunu reddetmek hiçbir gerçek sonucu kaybetmez.
// Elimizdeki raporlarda T.C. yok ama özel laboratuvar raporunda olabilir.
const KIMLIK_BICIMI = /\b\d{11}\b/;

// Değer alanında tarih: doğum tarihi buraya düşebilir. Testin kendi tarihi
// satırın tamamından ayrıca okunuyor, o yüzden bunu atmak tarihi kaybettirmez.
const TARIH_BICIMI = /^\d{2}[./]\d{2}[./]\d{4}$/;

/**
 * Bu satır tahlil sonucu değil, kişisel bilgi mi?
 * Sebebi döndürüyor (günlüğe yazmak için), değilse null.
 */
function kisiselBilgiMi(butunSatir, ad, metinDeger) {
  if (KIMLIK_BICIMI.test(butunSatir)) return 'kimlik numarası biçimi';
  if (CINSIYET_DEGERLERI.test(String(metinDeger || '').trim())) return 'cinsiyet değeri';
  if (TARIH_BICIMI.test(String(metinDeger || '').trim())) return 'değer alanında tarih';
  if (CINSIYET_DEGERLERI.test(String(ad || '').trim())) return 'cinsiyet adı';
  return null;
}

// Bazı satırların adı "Tam Kan Sayımı (Hemogram) HGB" diye geliyor
const ONEKLER = ['Tam Kan Sayımı (Hemogram)', 'Tam Kan Sayımı'];

/** "12,5" | "12.5" | "< 0,5" -> { deger, islec } */
function degeriCoz(ham) {
  const m = String(ham).trim().match(/^([<>]=?)?\s*(-?[\d.,]+)$/);
  if (!m) return { deger: null, islec: null, metin: String(ham).trim() };
  const sayi = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(sayi)) return { deger: null, islec: null, metin: String(ham).trim() };
  return { deger: sayi, islec: m[1] || null, metin: null };
}

/** "10-291" | "10 - 291" | "< 40-" | "> 5,38-" -> { alt, ust } */
function referansiCoz(ham) {
  const t = String(ham).trim().replace(/-\s*$/, '').trim().replace(/,/g, '.');
  if (!t) return { alt: null, ust: null };
  let m = t.match(/^(-?[\d.]+)\s*-\s*(-?[\d.]+)$/);
  if (m) return { alt: Number(m[1]), ust: Number(m[2]) };
  m = t.match(/^<=?\s*(-?[\d.]+)$/);
  if (m) return { alt: null, ust: Number(m[1]) };
  m = t.match(/^>=?\s*(-?[\d.]+)$/);
  if (m) return { alt: Number(m[1]), ust: null };
  return { alt: null, ust: null };
}

const ETIKETLI = /([A-ZÇĞİÖŞÜa-zçğıöşü][^:<>]{2,45}?):\s*([<>]=?\s*[\d.,]+|[\d.,]+\s*-\s*[\d.,]+)/g;
const ARALIKLI = /([<>]=?\s*[\d.,]+|[\d.,]+\s*-\s*[\d.,]+)\s*(?:mg\/dL|%)\s+([A-ZÇĞİÖŞÜ][^<>\d:]{3,40}?)(?=\s+[<>\d]|\s*$)/g;
const BAS_ARALIK = /^\s*([\d.,]+\s*-\s*[\d.,]+)\s*\*?/;

function etiketiTemizle(e) {
  let s = String(e).trim().replace(/^[.*\s]+|[.*\s]+$/g, '');
  for (const b of BIRIM_ORNEKLERI) {
    if (s.toLowerCase().startsWith(b.toLowerCase())) s = s.slice(b.length).trim();
  }
  return s;
}

/**
 * Sol kenardaki düz yazı satırını sınıflamaya çevirir.
 * İki biçim var:
 *   "Optimum: <100 mg/dL ..."            -> ETİKET: ARALIK
 *   "74 - 109 * <70 mg/dL Hipoglisemi"   -> ARALIK ETİKET (ve başta asıl referans)
 */
function siniflamayiCoz(satir) {
  let s = String(satir).trim().replace(/-\s*$/, '').trim();
  let referans = null;
  const bas = s.match(BAS_ARALIK);
  if (bas) { referans = bas[1].replace(/\s/g, ''); s = s.slice(bas[0].length); }

  let siniflar = [];
  for (const m of s.matchAll(ETIKETLI)) {
    siniflar.push({ etiket: etiketiTemizle(m[1]), aralik: m[2].replace(/\s/g, '') });
  }
  if (siniflar.length < 2) {
    siniflar = [];
    for (const m of s.matchAll(ARALIKLI)) {
      siniflar.push({ etiket: etiketiTemizle(m[2]), aralik: m[1].replace(/\s/g, '') });
    }
  }
  return { referans, siniflar: siniflar.filter((x) => x.etiket) };
}

/** Bir değer, "150-199" / "<150" / ">=500" gibi bir aralığa düşüyor mu? */
function araligaUyuyorMu(deger, aralik) {
  const a = String(aralik).replace(/,/g, '.');
  let m = a.match(/^([\d.]+)-([\d.]+)$/);
  if (m) return deger >= Number(m[1]) && deger <= Number(m[2]);
  m = a.match(/^<(=?)([\d.]+)$/);
  if (m) return m[1] ? deger <= Number(m[2]) : deger < Number(m[2]);
  m = a.match(/^>(=?)([\d.]+)$/);
  if (m) return m[1] ? deger >= Number(m[2]) : deger > Number(m[2]);
  return false;
}

/** PDF tamponunu satır listesine çevirir: [{ y, parcalar: [{x, s}] }] */
/* ──────────────────────────────────────────────────────────────────────────
   AYRIŞTIRMA SINIRLARI
   ──────────────────────────────────────────────────────────────────────────

   BOYUT SINIRI YETERLİ KORUMA DEĞİL. Dosya boyutu, ayrıştırmanın ne kadar
   süreceğini söylemiyor: sıkıştırılmış birkaç yüz kilobaytlık bir PDF, binlerce
   sayfa ya da milyonlarca metin parçası açabilir ("PDF bombası"). Tersi de
   doğru: 4 MB'lık meşru bir rapor zararsızdır. Yani boyut sınırı yalnızca kaba
   bir ilk süzgeç; işin asıl korumaları bunlar.

   SAYFA SINIRI: e-Nabız tahlil raporları birkaç sayfa. 40 sayfa, meşru hiçbir
   raporu kesmeyecek kadar geniş, bir bombayı durduracak kadar dar.

   ZAMAN AŞIMI: sayfa sayısı makul olsa bile tek bir sayfa aşırı sayıda metin
   parçası içerebilir. Süre sınırı, ne şekilde gelirse gelsin işlemin sunucuyu
   meşgul etmesini kesiyor. Express'in kendi istek zaman aşımı bu işi yapmıyor:
   istek düşse de ayrıştırma döngüsü arka planda çalışmaya devam ederdi.
*/
const EN_FAZLA_SAYFA = 40;
const AYRISTIRMA_SURESI_MS = 15000;

/** Verilen sözü süre sınırına bağlar. Süre dolarsa hata fırlatır. */
function sureSinirli(soz, ms, mesaj) {
  let sayac;
  const zamanAsimi = new Promise((_c, red) => {
    sayac = setTimeout(() => red(new Error(mesaj)), ms);
  });
  // finally: süre dolmadan bitse de sayaç temizlenmeli, yoksa işlem
  // sayaç bitene kadar kapanmaz.
  return Promise.race([soz, zamanAsimi]).finally(() => clearTimeout(sayac));
}

async function pdfSatirlariHam(tampon) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const belge = await pdfjs.getDocument({
    data: new Uint8Array(tampon), useSystemFonts: true, isEvalSupported: false,
  }).promise;

  if (belge.numPages > EN_FAZLA_SAYFA) {
    await belge.destroy();
    throw new Error(
      `PDF ${belge.numPages} sayfa; en fazla ${EN_FAZLA_SAYFA} sayfa okunabiliyor.`,
    );
  }

  const hepsi = [];
  for (let n = 1; n <= belge.numPages; n += 1) {
    const sayfa = await belge.getPage(n);
    const icerik = await sayfa.getTextContent();
    const gruplar = new Map();
    for (const p of icerik.items) {
      if (!p.str || !p.str.trim()) continue;
      const y = Math.round(p.transform[5]);
      if (!gruplar.has(y)) gruplar.set(y, []);
      gruplar.get(y).push({ x: p.transform[4], s: p.str.trim() });
    }
    [...gruplar.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([y, parcalar]) => {
        hepsi.push({ y, sayfa: n, parcalar: parcalar.sort((a, b) => a.x - b.x) });
      });
  }
  await belge.destroy();
  return hepsi;
}

async function pdfSatirlari(tampon) {
  return sureSinirli(
    pdfSatirlariHam(tampon),
    AYRISTIRMA_SURESI_MS,
    'PDF ayrıştırma zaman aşımına uğradı.',
  );
}

/** Satırların ilk parçasının en sık görülen x'i = test adı sütunu */
function adSutununuBul(satirlar) {
  const sayac = new Map();
  satirlar.filter((r) => r.parcalar.length >= 3).forEach((r) => {
    const x = Math.round(r.parcalar[0].x);
    sayac.set(x, (sayac.get(x) || 0) + 1);
  });
  let enCok = null, enYuksek = 0;
  sayac.forEach((n, x) => { if (n > enYuksek) { enYuksek = n; enCok = x; } });
  return enCok === null ? 120 : enCok;
}

/**
 * PDF'ten çıkarılmış satırları tahlil listesine çevirir.
 *
 * NİYE AYRI FONKSİYON: tahlilAyristir pdfjs'e bağlı ve eşzamansız, bu yüzden
 * test edilebilmesi için gerçek bir PDF dosyası gerekiyordu. Gerçek bir tahlil
 * PDF'i de kişisel veri içerdiği için depoya konamaz. Ayrıştırma mantığı
 * burada saf ve eşzamanlı durduğu için uydurma satırlarla sınanabiliyor —
 * kişisel bilgi testleri (T01-T06) böyle yazıldı.
 *
 * satirlar biçimi: [{ parcalar: [{ s, x }, ...] }, ...]
 */
function satirlariAyristir(satirlar) {
  const adX = adSutununuBul(satirlar);
  const testler = [];
  const uyarilar = [];
  let tarih = null;

  for (const satir of satirlar) {
    const butun = satir.parcalar.map((p) => p.s).join(' ');
    const ilkX = Math.round(satir.parcalar[0].x);

    const t = butun.match(/\b(\d{2}\.\d{2}\.\d{4})\b/);
    if (t && !tarih) tarih = t[1];

    // SOL KENAR: üstteki testin sınıflama satırı.
    // Sınıflama bir satıra sığmayıp alt satıra taşabiliyor (LDL'de beş kademe
    // var ve sonuncusu "...Çok yüksek: >190" diye aşağı iniyordu; ilk sürümde
    // o kademe kayboluyordu). Bu yüzden ARDIŞIK sol kenar satırları aynı
    // metinmiş gibi birleştirilip yeniden çözümleniyor.
    if (ilkX < adX - 40 && /[<>]\s*\d|\d\s*-\s*\d/.test(butun)) {
      const son = testler[testler.length - 1];
      if (son) {
        son._siniflamaMetni = son._siniflamaMetni ? `${son._siniflamaMetni} ${butun}` : butun;
        const { referans, siniflar } = siniflamayiCoz(son._siniflamaMetni);
        if (referans && son.refAlt === null && son.refUst === null) {
          const r = referansiCoz(referans);
          son.refAlt = r.alt; son.refUst = r.ust;
        }
        if (siniflar.length) son.siniflar = siniflar;
      }
      continue;
    }

    if (ATLANACAK.some((a) => butun.includes(a))) continue;
    if (satir.parcalar.length < 2) continue;

    let ad = satir.parcalar[0].s;
    for (const o of ONEKLER) if (ad.startsWith(o)) ad = ad.slice(o.length).trim();
    ad = ad.replace(/^\d{2}\.\d{2}\.\d{4}\s*/, '').replace(/^\d{2}:\d{2}\s*/, '').trim();
    if (ad.length < 2) continue;

    // Kalan parçalar: değer / birim / referans — X'e değil İÇERİĞE göre ayrılıyor
    const kalan = satir.parcalar.slice(1).map((p) => p.s);
    const d = degeriCoz(kalan[0] || '');
    if (d.deger === null && !d.metin) continue;

    const birim = birimMi(kalan[1]) ? kalan[1] : '';
    const refHam = kalan.slice(birim ? 2 : 1).join(' ');
    const r = referansiCoz(refHam);

    // İKİNCİ SAVUNMA (bkz. kisiselBilgiMi). Etiket tanınmasa bile içerik
    // tahlil sonucu olamayacak biçimdeyse satır buraya kadar gelip burada
    // düşüyor; hiçbir zaman yanıta girmiyor, dolayısıyla saklanamıyor da.
    const kisisel = kisiselBilgiMi(butun, ad, d.metin);
    if (kisisel) {
      // Uyarı listesine İÇERİK YAZILMIYOR, yalnızca sebep: uyarılar kullanıcıya
      // gönderiliyor ve sunucu günlüğüne de düşebiliyor. "Atlanan satır:
      // ESMA NUR YILDIZHAN" yazmak, korumaya çalıştığımız veriyi ifşa etmek
      // olurdu.
      uyarilar.push(`Kişisel bilgi içerdiği değerlendirilen bir satır atlandı (${kisisel}).`);
      continue;
    }

    testler.push({
      ad,
      deger: d.deger,
      islec: d.islec,
      metinDeger: d.metin,          // "O Rh(+)" gibi sayı olmayan sonuçlar
      birim,
      refAlt: r.alt,
      refUst: r.ust,
      siniflar: [],
    });
  }

  // Tekrarları ayıkla (04.06 düzeninde her satır iki kez geliyor)
  const gorulen = new Set();
  const tekil = testler.filter((t) => {
    const anahtar = `${t.ad.toLowerCase()}|${t.deger}|${t.metinDeger}`;
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });

  tekil.forEach((t) => { delete t._siniflamaMetni; });

  tekil.forEach((t) => {
    if (t.deger === null && !t.metinDeger) uyarilar.push(`${t.ad}: sonuç okunamadı`);
    else if (t.refAlt === null && t.refUst === null && !t.siniflar.length && t.deger !== null) {
      uyarilar.push(`${t.ad}: referans aralığı bulunamadı`);
    }
  });

  return { tarih, testler: tekil, uyarilar };
}

/**
 * PDF tamponunu alır, tahlil listesi döndürür.
 * pdfjs'e bağlı tek kısım burada; mantık satirlariAyristir içinde.
 */
async function tahlilAyristir(tampon) {
  return satirlariAyristir(await pdfSatirlari(tampon));
}

/** PDF'teki aralığa göre yorum. Eşik TAMAMEN PDF'ten gelir, bizim eşiğimiz yok. */
function pdfYorumu(test) {
  if (test.deger === null) return null;
  if (test.siniflar && test.siniflar.length) {
    const bulunan = test.siniflar.find((s) => araligaUyuyorMu(test.deger, s.aralik));
    if (bulunan) return { tur: 'siniflama', etiket: bulunan.etiket, aralik: bulunan.aralik };
  }
  if (test.refAlt !== null && test.deger < test.refAlt) {
    return { tur: 'aralik', etiket: 'düşük', aralik: `${test.refAlt}-${test.refUst ?? ''}` };
  }
  if (test.refUst !== null && test.deger > test.refUst) {
    return { tur: 'aralik', etiket: 'yüksek', aralik: `${test.refAlt ?? ''}-${test.refUst}` };
  }
  if (test.refAlt !== null || test.refUst !== null) {
    return { tur: 'aralik', etiket: 'normal', aralik: `${test.refAlt ?? ''}-${test.refUst ?? ''}` };
  }
  return null;
}

module.exports = {
  tahlilAyristir, satirlariAyristir, kisiselBilgiMi, sureSinirli,
  EN_FAZLA_SAYFA,
  pdfYorumu, araligaUyuyorMu, referansiCoz, degeriCoz,
};
