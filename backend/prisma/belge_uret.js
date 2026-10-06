// prisma/belge_uret.js
//
// KURAL_KAYNAKLARI.md dosyasını hastalik_kurallari.js'ten üretir.
// Çalıştırma (backend/prisma klasöründe):  node belge_uret.js
//
// Neden otomatik? Çünkü bu belge projenin savunmasıdır: hangi eşik hangi
// makaleden geldi, hangi sayı bizim çevirimimiz. Elle tutulan bir belge
// kurallar değişince sessizce yanlışa düşer; üretilen belge düşemez.

const fs = require('fs');
const path = require('path');
const { HASTALIKLAR, KAYNAKLAR } = require('./hastalik_kurallari');

const ISLEC_ADI = { '>': '>', '>=': '≥', '<': '<', '<=': '≤' };
const SEVIYE_ADI = {
  RISKLI: '🔴 RİSKLİ', DIKKAT: '🟡 DİKKAT',
  ONERILIR: '🟢 ÖNERİLİR', DIYET_DISI: '⛔ DİYET DIŞI', ALERJEN: '⚠️ ALERJEN',
};
// Besin değeri anahtarlarının okunur adı + birimi
const ALAN = {
  sugars: ['şeker', 'g'], netCarbs: ['net karbonhidrat', 'g'],
  glycemicLoad: ['glisemik yük', ''], fiberPer1000kcal: ['lif yoğunluğu', 'g/1000 kcal'],
  saturatedFat: ['doymuş yağ', 'g'], transFat: ['trans yağ', 'g'],
  satFatEnergyPct: ['doymuş yağ enerji oranı', '%'],
  unsaturatedFatPct: ['doymamış yağ oranı', '%'],
  sodiumMg: ['sodyum', 'mg'], potassiumMg: ['potasyum', 'mg'],
  phosphorusMg: ['fosfor', 'mg'], calciumMg: ['kalsiyum', 'mg'],
  ironMg: ['demir', 'mg'], vitaminCMg: ['C vitamini', 'mg'],
  caffeineMg: ['kafein', 'mg'], fat: ['yağ', 'g'],
};

const sayi = (v) => String(v).replace('.', ',');

function kuralBasligi(k) {
  if (!k.nutrient) {
    return `${SEVIYE_ADI[k.seviye]} — kategori: ${(k.kategoriler || []).join(', ')}`;
  }
  const [ad, birim] = ALAN[k.nutrient] || [k.nutrient, ''];
  const temel = k.temel === 'porsiyon' ? 'porsiyon başına' : '100 g başına';
  const olcu = birim ? `${sayi(k.value)} ${birim}` : sayi(k.value);
  return `${SEVIYE_ADI[k.seviye]} — \`${ad} ${ISLEC_ADI[k.islec] || k.islec} ${olcu}\` (${temel})`;
}

const y = [];
const A = (t = '') => y.push(t);

A('# Hastalık kurallarının kaynakları');
A();
A('Bu dosya `prisma/hastalik_kurallari.js` dosyasından otomatik üretilir');
A('(`node belge_uret.js`). Elle düzenleme — kuralı değiştirip yeniden üret.');
A();
A(`Üretim tarihi: ${new Date().toISOString().slice(0, 10)}`);
A();
A('## Nasıl okunmalı');
A();
A('Her eşiğin yanında iki bilgi var:');
A();
A('- **Kaynak** — sayının geldiği makale/kılavuz.');
A('- **Neden bu sayı** — sayının makalede nerede geçtiği ve, eğer makale GÜNLÜK bir');
A('  sınır veriyorsa, onu porsiyona çevirirken yaptığımız varsayım.');
A();
A("Bu ayrım önemli: \"100 g'da 22,5 g şeker\" doğrudan kılavuzda yazan bir sayıdır.");
A('"Porsiyonda 800 mg potasyum" ise günlük 2500 mg\'ı 3 öğüne bölerek BİZİM');
A('ürettiğimiz bir sayıdır. İkincisi tartışmaya açıktır ve öyle işaretlenmiştir.');
A();
A('Ayrıca bazı kurallarda **muafiyet** var: kural eşiği aşsa bile, başka bir');
A('kaynağın açık önerisi yüzünden uyarı verilmiyor. Her muafiyetin gerekçesi');
A('kuralın "Neden bu sayı" notunda yazılı.');
A();

// --- Besin değeri bazlı kaynak sayımı ---
const kullanim = {};
HASTALIKLAR.flatMap((h) => h.rules || []).forEach((k) => {
  if (k.kaynak) kullanim[k.kaynak] = (kullanim[k.kaynak] || 0) + 1;
});

for (const h of HASTALIKLAR) {
  A('---');
  A();
  A(`## ${h.icon || ''} ${h.name}`.trim());
  A();
  if (h.note) { A(h.note); A(); }
  if (h.degerlendirilemez) {
    A('**Bu hastalık için besin bazlı kural YAZILMADI.** Sebebi yukarıdaki notta.');
    A();
    continue;
  }
  if (!h.rules || h.rules.length === 0) { A('_Kural yok._'); A(); continue; }

  for (const k of h.rules) {
    A(`### ${kuralBasligi(k)}`);
    A();
    A(`> ${k.message}`);
    A();
    const kay = KAYNAKLAR[k.kaynak];
    if (kay) {
      A(`**Kaynak:** ${kay.kunye}`);
    } else {
      A(`**Kaynak:** ⚠️ YOK (${k.kaynak || 'belirtilmemiş'}) — bu eşik hiçbir makaleye dayanmıyor.`);
    }
    A();
    if (k.kaynakNot) { A(`**Neden bu sayı:** ${k.kaynakNot}`); A(); }
    const muaf = [];
    if (k.muafLifYogunlugu) {
      muaf.push(`lif yoğunluğu 1000 kcal başına ${sayi(k.muafLifYogunlugu)} g ve üstü olan besinler`);
    }
    if (k.muafDoymamisOran) {
      muaf.push(`yağının %${sayi(k.muafDoymamisOran)}'i ve fazlası doymamış olan besinler`);
    }
    if (k.muafGlisemikYukBiliniyorsa) {
      muaf.push('glisemik indeksi ölçülmüş besinler (o zaman glisemik yük kuralı devreye girer)');
    }
    if (k.sadeceBuyukPorsiyon) {
      muaf.push("porsiyonu 100 g'dan küçük besinler (FSA Annex 3, s.19 kendi kuralı)");
    }
    if (muaf.length) { A(`**Muaf:** ${muaf.join('; ')}.`); A(); }
    if (k.kritik) {
      A('**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.');
      A();
    }
  }
}

A('---');
A();
A('## Kaynakça');
A();
const anahtarlar = Object.keys(KAYNAKLAR).sort();
for (const a of anahtarlar) {
  A(`**${a}** — ${KAYNAKLAR[a].kunye}`);
  A();
  A(`<sub>Bu kaynağa dayanan kural sayısı: ${kullanim[a] || 0}</sub>`);
  A();
}

const kaynaksiz = HASTALIKLAR.flatMap((h) => (h.rules || []).map((k) => ({ h: h.name, k })))
  .filter(({ k }) => !k.kaynak || k.kaynak === 'TAKDIR');
A('---');
A();
if (kaynaksiz.length === 0) {
  A('**Kaynaksız kural kalmadı.** Her eşik bir makaleye veya kılavuza dayanıyor.');
} else {
  A(`**⚠️ ${kaynaksiz.length} kural hâlâ kaynaksız:**`);
  A();
  kaynaksiz.forEach(({ h, k }) => A(`- ${h}: ${k.nutrient} ${k.islec} ${k.value}`));
}
A();

const cikti = path.join(__dirname, '..', '..', 'KURAL_KAYNAKLARI.md');
fs.writeFileSync(cikti, y.join('\n'), 'utf8');
const toplam = HASTALIKLAR.reduce((n, h) => n + (h.rules || []).length, 0);
console.log(`KURAL_KAYNAKLARI.md yazıldı: ${y.length} satır, ${toplam} kural, ${anahtarlar.length} kaynak`);
console.log(kaynaksiz.length === 0 ? 'Kaynaksız kural yok.' : `UYARI: ${kaynaksiz.length} kaynaksız kural var.`);
