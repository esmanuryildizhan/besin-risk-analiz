// src/index.js — Besin Risk Analiz Sistemi API'si
//
// Çalıştırma (backend klasöründe):  node src/index.js
// Adres: http://localhost:3001
//
// UÇ NOKTALAR (endpoint)
//   POST /api/register        kayıt ol
//   POST /api/login           giriş yap -> token döner
//   GET  /api/me              profilimi getir            (token gerekir)
//   PUT  /api/me              profilimi güncelle         (token gerekir)
//   GET  /api/foods           besin ara/listele          (token isteğe bağlı)
//   GET  /api/foods/:id       tek besin + tam analiz     (token isteğe bağlı)
//   GET  /api/meta            kategoriler, hastalıklar, alerjenler
//   GET  /api/diary/:gun      bir günün tamamı          (token gerekir)
//   POST /api/diary/:gun/kalem  öğüne kalem ekle        (token gerekir)
//   PUT  /api/diary/kalem/:id   kalemin adedini değiştir  (token gerekir)
//   DELETE /api/diary/kalem/:id kalem sil               (token gerekir)
//   PUT  /api/diary/:gun      yakılan kalori / su       (token gerekir)
//   GET  /api/diary/ay/:yilAy takvim için ay özeti      (token gerekir)
//   POST /api/lab/oku         PDF'i oku, KAYDETME        (token gerekir)
//   POST /api/lab             onaylananı kaydet          (token gerekir)
//   GET  /api/lab             kayıtlı tahliller          (token gerekir)
//   GET  /api/lab/oneriler    düşük değerler için besin  (token gerekir)
//   DELETE /api/lab/:tarih    bir tahlil gününü sil      (token gerekir)
//
// Token gönderilirse besinler kullanıcının hastalık/alerji profiline göre
// analiz edilir; gönderilmezse genel bilgi döner.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const { riskHesapla } = require('./risk');
const {
  HASTALIK_ALERJEN, ALERJENLER, DIYETLER, ETIKET_ADI, KAYNAKLAR,
} = require('../prisma/hastalik_kurallari');
// Çeviri ortak dosyada: denetim araçları da aynısını kullanıyor (bkz. kural_cevir.js).
const { kuraliCoz } = require('./kural_cevir');
const KVKK = require('./kvkk_metinleri');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('HATA: .env dosyasında JWT_SECRET yok. Örnek:\n  JWT_SECRET="gizli-bir-cumle-yaz"');
  process.exit(1);
}

app.use(cors());           // React (3000) başka porttan istek atacağı için gerekli
app.use(express.json());   // gelen JSON gövdeyi otomatik çözer

// ---------------------------------------------------------------------------
// KURALLAR: veritabanından bir kez okunup bellekte tutulur (her istekte sorgu atmayalım)
// ---------------------------------------------------------------------------

// ÖNBELLEK NEDEN SÜRESİZ DEĞİL — 1 Ekim 2026.
// Eskiden `if (kurallarOnbellek) return kurallarOnbellek;` yazıyordu, yani
// kurallar sunucu ömrü boyunca bir kez okunuyordu. Somut sonuç: trans yağ
// kuralını RİSKLİ'den DİKKAT'e çevirdik, `prisma db seed` çalıştırdık, ama
// uygulama lüferi RİSKLİ göstermeye devam etti — çalışan sunucu hâlâ eski
// kuralları tutuyordu. Kuralı kodda değiştirip veritabanına yazmak yetmiyor,
// bir de sunucuyu yeniden başlatmak gerekiyordu; bunu hatırlamak zorunda
// kalmak hata kaynağı.
// 42 kuralı 6 hastalıkla okumak yerel PostgreSQL'de milisaniyenin altında, yani
// burada önbellek zaten performans için değil, aynı istek içindeki tekrarlı
// çağrıları toplamak için var. Kısa bir ömür ikisini de çözüyor: seed'den sonra
// en fazla bu kadar bekliyoruz, kendiliğinden tazeleniyor.
const ONBELLEK_OMRU_MS = 5000;
let kurallarOnbellek = null;
let kurallarOnbellekZamani = 0;

async function kurallariGetir() {
  if (kurallarOnbellek && (Date.now() - kurallarOnbellekZamani) < ONBELLEK_OMRU_MS) {
    return kurallarOnbellek;
  }
  const hastaliklar = await prisma.disease.findMany({
    include: { rules: { orderBy: { sortOrder: 'asc' } } },
  });
  kurallarOnbellek = {
    hastaliklar: hastaliklar.map((h) => ({
      key: h.key,
      name: h.name,
      icon: h.icon,
      note: h.note,
      degerlendirilemez: !h.evaluable,
      // Tek tek elle eşlemiyoruz: KURAL_ALANLARI tablosu üzerinden dönüyoruz.
      // Eskiden elle yazılıyordu ve muafiyet alanları atlanmıştı; sonuç olarak
      // API'den gelen kurallar testlerdeki kurallardan farklıydı.
      rules: h.rules.map(kuraliCoz),
    })),
    hastalikAlerjen: HASTALIK_ALERJEN,
    alerjenler: ALERJENLER,
    diyetler: DIYETLER,
    etiketAdi: ETIKET_ADI,
    kaynakca: KAYNAKLAR,
  };
  kurallarOnbellekZamani = Date.now();
  // Çalışan sunucunun HANGİ kurallarla çalıştığı görünür olsun: sessiz bayat
  // önbellek bu projede bir kere canlı hatayla sonuçlandı.
  const kuralSayisi = kurallarOnbellek.hastaliklar
    .reduce((t, h) => t + (h.rules || []).length, 0);
  console.log(`Kurallar veritabanından okundu: ${kurallarOnbellek.hastaliklar.length} hastalık, ${kuralSayisi} kural`);
  return kurallarOnbellek;
}

// ---------------------------------------------------------------------------
// YARDIMCILAR
// ---------------------------------------------------------------------------

/** Token varsa kullanıcıyı bulur, yoksa null bırakır. İsteği engellemez. */
async function kullaniciyiCoz(req, _res, next) {
  req.kullanici = null;
  const baslik = req.headers.authorization || '';
  const token = baslik.startsWith('Bearer ') ? baslik.slice(7) : null;
  if (token) {
    try {
      const veri = jwt.verify(token, JWT_SECRET);
      req.kullanici = await prisma.user.findUnique({
        where: { id: veri.userId },
        include: { allergies: true, diseases: true },
      });
    } catch (e) {
      // geçersiz/süresi dolmuş token -> misafir gibi davran
    }
  }
  next();
}

/** Token ZORUNLU olan uç noktalar için. */
function girisGerekli(req, res, next) {
  if (!req.kullanici) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  next();
}

function profilCikar(user) {
  if (!user) return { allergies: [], diseases: [], diet: 'Normal' };
  return {
    allergies: user.allergies.map((a) => a.name),
    diseases: user.diseases.map((d) => d.name),
    diet: user.diet || 'Normal',
  };
}

function kullaniciyiDondur(user) {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    kcalGoal: user.kcalGoal,
    waterGoalL: user.waterGoalL,
    email: user.email,
    gender: user.gender,
    diet: user.diet,
    allergies: user.allergies ? user.allergies.map((a) => a.name) : [],
    diseases: user.diseases ? user.diseases.map((d) => d.name) : [],
    // Arayüz buna bakıp onay ekranını gösteriyor. Şifre özeti gibi hassas
    // alanlar burada YOK — bu fonksiyon "dışarı ne çıkar" kapısı.
    onayGerekli: onayGerekliMi(user),
    rizaSurumu: user.rizaSurumu || null,
  };
}

/**
 * Kullanıcıdan (yeniden) onay istenmeli mi?
 *
 * Üç durumda evet:
 *  - hiç onay vermemiş (bu özellik eklenmeden önce kayıt olmuş kullanıcılar),
 *  - iki beyandan biri eksik,
 *  - metinler değişip SURUM artmış (eski sürüme verilen rıza yeni metni
 *    kapsamaz; KVKK açık rızanın BELİRLİ bir konuya ilişkin olmasını istiyor).
 */
function onayGerekliMi(user) {
  if (!user) return false;
  if (!user.aydinlatmaOkunduAt || !user.acikRizaAt) return true;
  return user.rizaSurumu !== KVKK.SURUM;
}

app.use(kullaniciyiCoz);

// ---------------------------------------------------------------------------
// KİMLİK DOĞRULAMA
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  try {
    const {
      name, surname, email, password, gender, diet, allergies = [], diseases = [],
      aydinlatmaOkundu, acikRiza,
    } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur.' });
    }
    // KVKK: sağlık verisi özel nitelikli kişisel veridir ve bu uygulamada
    // işlemenin tek hukuki dayanağı açık rızadır. Rıza yoksa kayıt da yok.
    // Sunucu tarafında kontrol ediyoruz: arayüzdeki onay kutusu atlanabilir,
    // bu kontrol atlanamaz.
    if (aydinlatmaOkundu !== true) {
      return res.status(400).json({ error: 'Aydınlatma metnini okuyup anladığınızı beyan etmeniz gerekiyor.' });
    }
    if (acikRiza !== true) {
      return res.status(400).json({
        error: 'Sağlık verileriniz için açık rıza vermeden kayıt oluşturulamıyor. '
          + 'Bu uygulamanın tek işlevi hastalık ve tahlil bilgilerinize göre '
          + 'değerlendirme yapmak olduğu için, bu veriler olmadan çalışamıyor.',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    }
    const varMi = await prisma.user.findUnique({ where: { email } });
    if (varMi) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });

    // Şifreyi ASLA düz metin saklamıyoruz; bcrypt ile hash'liyoruz.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name, surname: surname || '', email, passwordHash,
        gender: gender || null, diet: diet || 'Normal',
        aydinlatmaOkunduAt: new Date(),
        acikRizaAt: new Date(),
        rizaSurumu: KVKK.SURUM,
        allergies: { create: allergies.map((a) => ({ name: a })) },
        diseases: { create: diseases.map((d) => ({ name: d })) },
      },
      include: { allergies: true, diseases: true },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: kullaniciyiDondur(user) });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email || '' },
      include: { allergies: true, diseases: true },
    });
    // Güvenlik: "e-posta yok" ile "şifre yanlış" ayrımını dışarıya vermiyoruz.
    const dogruMu = user ? await bcrypt.compare(password || '', user.passwordHash) : false;
    if (!dogruMu) return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: kullaniciyiDondur(user) });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

app.get('/api/me', girisGerekli, (req, res) => {
  res.json(kullaniciyiDondur(req.kullanici));
});

app.put('/api/me', girisGerekli, async (req, res) => {
  try {
    const {
      name, surname, gender, diet, allergies, diseases, kcalGoal, waterGoalL,
    } = req.body;
    const id = req.kullanici.id;

    // Alerji/hastalık listeleri: eskisini silip yenisini yazıyoruz (en basit yol)
    if (Array.isArray(allergies)) {
      await prisma.userAllergy.deleteMany({ where: { userId: id } });
      await prisma.userAllergy.createMany({ data: allergies.map((a) => ({ name: a, userId: id })) });
    }
    if (Array.isArray(diseases)) {
      await prisma.userDisease.deleteMany({ where: { userId: id } });
      await prisma.userDisease.createMany({ data: diseases.map((d) => ({ name: d, userId: id })) });
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? undefined,
        surname: surname ?? undefined,
        gender: gender ?? undefined,
        diet: diet ?? undefined,
        // Hedefler: null GÖNDERİLEBİLİR (kullanıcı hedefini silmek isteyebilir),
        // o yüzden ?? undefined kalıbı burada kullanılmıyor. Alan hiç
        // gönderilmediyse undefined kalır ve Prisma dokunmaz.
        kcalGoal: kcalGoal === undefined ? undefined : (kcalGoal === null ? null : Number(kcalGoal)),
        waterGoalL: waterGoalL === undefined ? undefined : (waterGoalL === null ? null : Number(waterGoalL)),
      },
      include: { allergies: true, diseases: true },
    });
    res.json(kullaniciyiDondur(user));
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// ---------------------------------------------------------------------------
// BESİNLER
// ---------------------------------------------------------------------------
/* ──────────────────────────────────────────────────────────────────────────
   KVKK — aydınlatma, açık rıza ve veri silme
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Metinleri arayüze verir. Giriş gerektirmez: aydınlatma yükümlülüğü
 * KVKK m.10 uyarınca "ilgili kişinin talebine veya herhangi bir onaya bağlı
 * olmaksızın" yerine getirilir — yani kayıt olmadan da okunabilmeli.
 */
app.get('/api/kvkk', (_req, res) => {
  res.json({
    surum: KVKK.SURUM,
    surumTarihi: KVKK.SURUM_TARIHI,
    aydinlatma: KVKK.AYDINLATMA,
    acikRiza: KVKK.ACIK_RIZA,
  });
});

/**
 * Mevcut kullanıcıdan onay alır.
 *
 * NİYE GEREKLİ: bu özellik eklenmeden önce kayıt olmuş kullanıcıların onay
 * kaydı yok. Onlardan geriye dönük "onay verdi" saymak KVKK'ya aykırı olurdu;
 * bunun yerine giriş yaptıklarında onay ekranı gösteriliyor.
 * Metin sürümü arttığında da aynı yol işliyor.
 */
app.post('/api/onay', girisGerekli, async (req, res) => {
  try {
    const { aydinlatmaOkundu, acikRiza } = req.body;
    if (aydinlatmaOkundu !== true) {
      return res.status(400).json({ error: 'Aydınlatma metnini okuyup anladığınızı beyan etmeniz gerekiyor.' });
    }
    if (acikRiza !== true) {
      return res.status(400).json({ error: 'Açık rıza verilmeden uygulama kullanılamıyor.' });
    }
    const user = await prisma.user.update({
      where: { id: req.kullanici.id },
      data: {
        aydinlatmaOkunduAt: new Date(),
        acikRizaAt: new Date(),
        rizaSurumu: KVKK.SURUM,
      },
      include: { allergies: true, diseases: true },
    });
    res.json({ user: kullaniciyiDondur(user) });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

/**
 * Hesabı ve BÜTÜN kişisel verileri siler (KVKK m.11/e — silme hakkı;
 * aynı zamanda açık rızanın geri çekilmesinin karşılığı).
 *
 * Şifre tekrar soruluyor: tokenı ele geçiren birinin hesabı silebilmesi
 * kabul edilemez, ve işlem geri alınamaz.
 *
 * Silme sırası önemli: şemada cascade yok, bu yüzden önce çocuk kayıtlar
 * siliniyor. Hepsi TEK transaction içinde — yarıda kalıp "kullanıcı silindi
 * ama tahlilleri durdu" durumu oluşamaz.
 */
app.delete('/api/me', girisGerekli, async (req, res) => {
  try {
    const { password } = req.body || {};
    const dogruMu = password
      ? await bcrypt.compare(password, req.kullanici.passwordHash)
      : false;
    if (!dogruMu) {
      return res.status(401).json({ error: 'Hesabı silmek için şifrenizi doğru girmeniz gerekiyor.' });
    }

    const id = req.kullanici.id;
    await prisma.$transaction([
      prisma.labResult.deleteMany({ where: { userId: id } }),
      prisma.diaryEntry.deleteMany({ where: { userId: id } }),
      prisma.diaryDay.deleteMany({ where: { userId: id } }),
      prisma.userAllergy.deleteMany({ where: { userId: id } }),
      prisma.userDisease.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ silindi: true });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

app.get('/api/foods', async (req, res) => {
  try {
    const { search = '', category, limit = '60' } = req.query;

    const where = {};
    if (search.trim()) {
      // mode: 'insensitive' -> büyük/küçük harf farkını yok sayar
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }
    if (category && category !== 'Tümü') where.category = category;

    const besinler = await prisma.food.findMany({
      where,
      take: Math.min(Number(limit) || 60, 200),
      orderBy: { name: 'asc' },
    });

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);

    const SIRA = { ALERJEN: 0, DIYET_DISI: 1, RISKLI: 2, DIKKAT: 3, UYGUN: 4 };
    const sonuc = besinler
      .map((b) => ({ ...b, analiz: riskHesapla(b, profil, kurallar) }))
      // Önce güvenli olanlar görünsün diye tersten sıralıyoruz: UYGUN -> ALERJEN
      .sort((a, b) => SIRA[b.analiz.seviye] - SIRA[a.analiz.seviye] || a.name.localeCompare(b.name, 'tr'));

    res.json({ count: sonuc.length, profilKullanildi: Boolean(req.kullanici), foods: sonuc });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

app.get('/api/foods/:id', async (req, res) => {
  try {
    const besin = await prisma.food.findUnique({ where: { id: Number(req.params.id) } });
    if (!besin) return res.status(404).json({ error: 'Besin bulunamadı.' });

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);
    res.json({
      ...besin,
      analiz: riskHesapla(besin, profil, kurallar),
      // Risk seviyesinden BAĞIMSIZ, ayrı bir bilgi bloğu. Girişsiz kullanıcıda
      // ya da tahlili olmayanda null döner, kart o bölümü hiç çizmez.
      tahlil: await tahlilBulgulariGetir(besin, req.kullanici),
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// Arayüzün ihtiyaç duyduğu listeler (kategoriler, hastalıklar, alerjenler)
app.get('/api/meta', async (_req, res) => {
  try {
    const kategoriler = await prisma.food.groupBy({ by: ['category'], _count: true });
    const kurallar = await kurallariGetir();
    res.json({
      categories: kategoriler
        .map((k) => ({ name: k.category, count: k._count }))
        .sort((a, b) => b.count - a.count),
      diseases: kurallar.hastaliklar.map((h) => ({
        key: h.key, name: h.name, icon: h.icon, note: h.note,
        evaluable: !h.degerlendirilemez,
      })),
      allergens: Object.entries(ALERJENLER).map(([key, name]) => ({ key, name })),
      diets: Object.keys(DIYETLER),
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// ---------------------------------------------------------------------------
// GÜNLÜK TAKİP
// ---------------------------------------------------------------------------
// Veri iki tabloda:
//   DiaryEntry -> öğüne eklenen tek tek kalemler (besin seçerek ya da serbest)
//   DiaryDay   -> öğüne bağlı olmayan günlük değerler (yakılan kalori, su)
//
// TARİH NEDEN METİN OLARAK GİDİP GELİYOR: istemci ile sunucu farklı saat
// diliminde olabilir ve `new Date()` ile kurulan bir zaman damgası günü
// kaydırabilir (23:30'da girilen kayıt ertesi güne düşebilir). Bu yüzden API
// yalnızca "YYYY-AA-GG" biçiminde GÜN alıyor ve veritabanına @db.Date olarak
// yazıyor; saat hiç işin içine girmiyor.

const GUN_KALIBI = /^\d{4}-\d{2}-\d{2}$/;
const OGUNLER = ['kahvalti', 'ogle', 'aksam', 'ara'];

/** "2026-10-03" -> Date (UTC gece yarısı). Geçersizse null. */
function gunuCoz(metin) {
  if (!GUN_KALIBI.test(metin || '')) return null;
  const d = new Date(`${metin}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> "2026-10-03" */
function gunuYaz(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Bir kalemi arayüzün beklediği şekle çevirir. */
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
    ad: k.food ? k.food.name : (k.label || 'Belirtilmemiş'),
    foodId: k.foodId,
    amount: k.amount,
    adet,
    porsiyonAdi: k.food ? k.food.portionName : null,
    icon: k.food ? k.food.icon : null,
  };
}

// --- Bir günün tamamı ------------------------------------------------------
app.get('/api/diary/:gun', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const [kalemler, gunKaydi] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { userId: req.kullanici.id, date: gun },
        include: { food: true },
        orderBy: { id: 'asc' },
      }),
      prisma.diaryDay.findUnique({
        where: { userId_date: { userId: req.kullanici.id, date: gun } },
      }),
    ]);

    const alinan = kalemler.reduce((t, k) => t + k.kcal, 0);
    const yakilan = gunKaydi ? gunKaydi.burnedKcal : 0;

    res.json({
      gun: req.params.gun,
      kalemler: kalemler.map(kalemiDondur),
      alinanKcal: Math.round(alinan),
      yakilanKcal: Math.round(yakilan),
      netKcal: Math.round(alinan - yakilan),
      suL: gunKaydi ? gunKaydi.waterL : 0,
      hedefler: {
        kcal: req.kullanici.kcalGoal,
        suL: req.kullanici.waterGoalL,
      },
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Öğüne kalem ekle ------------------------------------------------------
app.post('/api/diary/:gun/kalem', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const {
      mealType, foodId, amount, adet, label, kcal,
    } = req.body;
    if (!OGUNLER.includes(mealType)) {
      return res.status(400).json({ error: `Öğün şunlardan biri olmalı: ${OGUNLER.join(', ')}` });
    }

    let kayit;
    if (foodId) {
      // BESİN SEÇEREK: kaloriyi biz hesaplıyoruz, istemciye güvenmiyoruz.
      const besin = await prisma.food.findUnique({ where: { id: Number(foodId) } });
      if (!besin) return res.status(404).json({ error: 'Besin bulunamadı.' });
      // Miktar iki şekilde gelebilir: ADET (kaç porsiyon — arayüzün kullandığı)
      // ya da doğrudan GRAM. Adet verilmişse porsiyon gramıyla çarpıyoruz.
      let gram;
      if (Number(adet) > 0) {
        gram = besin.portionGrams * Number(adet);
      } else if (Number(amount) > 0) {
        gram = Number(amount);
      } else {
        gram = besin.portionGrams;
      }
      kayit = {
        foodId: besin.id,
        amount: gram,
        label: null,
        kcal: (besin.kcal * gram) / 100,   // yuvarlanmıyor, bkz. kalemiDondur
      };
    } else {
      // SERBEST GİRİŞ
      const sayi = Number(kcal);
      if (!(sayi > 0)) return res.status(400).json({ error: 'Kalori sıfırdan büyük olmalı.' });
      kayit = {
        foodId: null,
        amount: null,
        label: (label || '').trim() || 'Serbest giriş',
        kcal: Math.round(sayi),
      };
    }

    const olusan = await prisma.diaryEntry.create({
      data: { ...kayit, mealType, date: gun, userId: req.kullanici.id },
      include: { food: true },
    });
    res.status(201).json(kalemiDondur(olusan));
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Kalemin adedini değiştir ----------------------------------------------
// Yalnızca besin seçerek eklenen kalemler için: "2 dilim yerine 3 dilim".
//
// KALORİ YENİDEN HESAPLANMIYOR, ORANLANIYOR. Kayıttaki kalori giriş anında
// dondurulmuştu (geçmiş kaydı değişmesin diye); adet iki katına çıkınca o
// dondurulmuş değeri iki katına çıkarıyoruz. Besnin güncel değerinden yeniden
// hesaplasaydık, TürKomp verisi düzeltildiğinde dünkü kayıt da değişirdi.
app.put('/api/diary/kalem/:id', girisGerekli, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const yeniAdet = Number(req.body.adet);
    if (!(yeniAdet > 0)) return res.status(400).json({ error: 'Adet sıfırdan büyük olmalı.' });
    if (yeniAdet > 50) return res.status(400).json({ error: 'Adet en fazla 50 olabilir.' });

    const kalem = await prisma.diaryEntry.findFirst({
      where: { id, userId: req.kullanici.id },
      include: { food: true },
    });
    if (!kalem) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    if (!kalem.food || !kalem.amount) {
      return res.status(400).json({ error: 'Serbest girişlerde adet değiştirilemez; silip yeniden ekleyin.' });
    }

    const eskiAdet = kalem.amount / kalem.food.portionGrams;
    const oran = yeniAdet / eskiAdet;

    const guncel = await prisma.diaryEntry.update({
      where: { id },
      data: {
        amount: kalem.food.portionGrams * yeniAdet,
        kcal: kalem.kcal * oran,   // yuvarlanmıyor, bkz. kalemiDondur
      },
      include: { food: true },
    });
    res.json(kalemiDondur(guncel));
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Kalem sil -------------------------------------------------------------
app.delete('/api/diary/kalem/:id', girisGerekli, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // Başkasının kaydını silmeyi engelle: userId koşulu deleteMany ile veriliyor.
    const sonuc = await prisma.diaryEntry.deleteMany({
      where: { id, userId: req.kullanici.id },
    });
    if (sonuc.count === 0) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json({ silindi: id });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Günün yakılan kalorisi / suyu -----------------------------------------
app.put('/api/diary/:gun', girisGerekli, async (req, res) => {
  try {
    const gun = gunuCoz(req.params.gun);
    if (!gun) return res.status(400).json({ error: 'Tarih "YYYY-AA-GG" biçiminde olmalı.' });

    const { burnedKcal, waterL } = req.body;
    const veri = {};
    if (burnedKcal !== undefined) veri.burnedKcal = Math.max(0, Number(burnedKcal) || 0);
    if (waterL !== undefined) veri.waterL = Math.max(0, Number(waterL) || 0);

    const kayit = await prisma.diaryDay.upsert({
      where: { userId_date: { userId: req.kullanici.id, date: gun } },
      update: veri,
      create: { userId: req.kullanici.id, date: gun, ...veri },
    });
    res.json({ gun: req.params.gun, yakilanKcal: kayit.burnedKcal, suL: kayit.waterL });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Takvim: bir ayın günlük özetleri --------------------------------------
// Takvimdeki her gün hücresinde üç halka var: alınan kalori, yakılan kalori, su.
// Bu uç nokta 31 ayrı istek atılmasın diye ayın tamamını tek seferde veriyor.
app.get('/api/diary/ay/:yilAy', girisGerekli, async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}$/.test(req.params.yilAy)) {
      return res.status(400).json({ error: 'Ay "YYYY-AA" biçiminde olmalı.' });
    }
    const [yil, ay] = req.params.yilAy.split('-').map(Number);
    const bas = new Date(Date.UTC(yil, ay - 1, 1));
    const son = new Date(Date.UTC(yil, ay, 1));

    const [kalemler, gunler] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { userId: req.kullanici.id, date: { gte: bas, lt: son } },
        select: { date: true, kcal: true },
      }),
      prisma.diaryDay.findMany({
        where: { userId: req.kullanici.id, date: { gte: bas, lt: son } },
      }),
    ]);

    const harita = new Map();
    const al = (d) => {
      const anahtar = gunuYaz(d);
      if (!harita.has(anahtar)) {
        harita.set(anahtar, { gun: anahtar, alinanKcal: 0, yakilanKcal: 0, suL: 0 });
      }
      return harita.get(anahtar);
    };
    kalemler.forEach((k) => { al(k.date).alinanKcal += k.kcal; });
    gunler.forEach((g) => {
      const o = al(g.date);
      o.yakilanKcal = g.burnedKcal;
      o.suL = g.waterL;
    });

    res.json({
      ay: req.params.yilAy,
      gunler: [...harita.values()].sort((a, b) => a.gun.localeCompare(b.gun)),
      hedefler: { kcal: req.kullanici.kcalGoal, suL: req.kullanici.waterGoalL },
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// ---------------------------------------------------------------------------
// TAHLİL SONUÇLARI
// ---------------------------------------------------------------------------
// İKİ AŞAMALI: önce PDF okunur ve sonuçlar KULLANICIYA GÖSTERİLİR, kullanıcı
// onaylayınca kaydedilir. Doğrudan kaydetmiyoruz çünkü ayrıştırıcı yanlış
// okuyabilir ve kullanıcı düzeltebilmeli. Bu adım aynı zamanda uygulamanın
// "teşhis koymadığının" da güvencesi: kaydedilen şey kullanıcının onayladığı
// kendi verisi.
//
// EŞİK NEREDEN GELİYOR: tamamen PDF'ten. Laboratuvarın kendi referans aralığı
// ve kendi kademe sınıflaması kullanılıyor; bizim koyduğumuz bir eşik yok.
// Gerekçe: kullanıcı kendi raporunda o aralığı görüyor.

const { tahlilAyristir, pdfYorumu } = require('./tahlil_ayristir');

// PDF ham gövde olarak geliyor (base64 şişirmesi ve ek paket olmasın diye).
const pdfGovdesi = express.raw({ type: 'application/pdf', limit: '15mb' });

/** "03.06.2026" -> Date (UTC gece yarısı) */
function tarihiCoz(metin) {
  const m = String(metin || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

// --- 1. aşama: PDF'i oku, KAYDETME ----------------------------------------
app.post('/api/lab/oku', girisGerekli, pdfGovdesi, async (req, res) => {
  try {
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'PDF gövdesi boş. Content-Type: application/pdf olmalı.' });
    }
    const sonuc = await tahlilAyristir(req.body);
    const testler = sonuc.testler.map((t) => {
      const y = pdfYorumu(t);
      return {
        testName: t.ad,
        value: t.deger,
        valueOp: t.islec,
        textValue: t.metinDeger,
        unit: t.birim || null,
        refLow: t.refAlt,
        refHigh: t.refUst,
        pdfYorumu: y ? y.etiket : null,
        pdfAralik: y ? y.aralik : null,
        siniflar: t.siniflar,
      };
    });
    res.json({ tarih: sonuc.tarih, testler, uyarilar: sonuc.uyarilar });
  } catch (hata) {
    res.status(400).json({ error: `PDF okunamadı: ${hata.message}` });
  }
});

// --- 2. aşama: kullanıcının onayladığını kaydet ----------------------------
app.post('/api/lab', girisGerekli, async (req, res) => {
  try {
    const { tarih, testler } = req.body;
    const testDate = tarihiCoz(tarih) || new Date();
    if (!Array.isArray(testler) || testler.length === 0) {
      return res.status(400).json({ error: 'Kaydedilecek test yok.' });
    }
    // Aynı tarihin önceki kaydı varsa değiştiriliyor: kullanıcı düzeltip
    // yeniden gönderdiğinde iki kopya kalmasın.
    await prisma.labResult.deleteMany({ where: { userId: req.kullanici.id, testDate } });
    await prisma.labResult.createMany({
      data: testler.map((t) => ({
        userId: req.kullanici.id,
        testDate,
        testName: String(t.testName || '').slice(0, 120),
        value: t.value === null || t.value === undefined ? null : Number(t.value),
        valueOp: t.valueOp || null,
        textValue: t.textValue || null,
        unit: t.unit || null,
        refLow: t.refLow === null || t.refLow === undefined ? null : Number(t.refLow),
        refHigh: t.refHigh === null || t.refHigh === undefined ? null : Number(t.refHigh),
        pdfYorumu: t.pdfYorumu || null,
        pdfAralik: t.pdfAralik || null,
      })),
    });
    const kayitli = await prisma.labResult.findMany({
      where: { userId: req.kullanici.id, testDate }, orderBy: { testName: 'asc' },
    });
    res.status(201).json({ tarih, kaydedilen: kayitli.length, testler: kayitli });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// ---------------------------------------------------------------------------
// TAHLİLDEN BESİN ÖNERİSİ
// ---------------------------------------------------------------------------
// NE YAPIYOR: laboratuvarın "düşük" dediği bir değer için, veri tabanındaki
// o besin öğesinden en zengin besinleri PORSİYON başına sıralayıp gösteriyor.
//
// NE YAPMIYOR: teşhis koymuyor, "şunu ye" demiyor, hastalık profiline
// dokunmuyor. Cümle kuruluşu bilgi veriyor, talimat vermiyor.
//
// EŞLEŞTİRMENİN DAYANAĞI: her satır bir KANAMA noktası değil, tanım gereği
// bağ. Ferritin demir deposu proteinidir — WHO kılavuzunun adı birebir
// "use of ferritin concentrations to assess iron status". Yani "ferritin
// düşükse demir açısından zengin besinler" bağı bizim çıkarımımız değil,
// testin ne ölçtüğünün tanımı.
//
// EŞİK YOK: hangi değerin düşük olduğuna PDF karar veriyor. Buradaki tek iş
// "düşük" denen testi bir besin öğesine bağlamak.
//
// Kan yağları (LDL, HDL, trigliserid) BİLEREK listede yok: onlar yenen bir
// besin öğesi değil, vücudun ürettiği taşıyıcılar. Yağ kalitesi zaten
// kolesterol hastalık kurallarında ele alınıyor.
const TAHLIL_BESIN_ESLESMESI = [
  { desen: /ferritin/i,            alan: 'ironMg',       ad: 'demir',        birim: 'mg',
    not: 'Ferritin, vücudun demir deposunu taşıyan proteindir; WHO kılavuzu bu testi demir durumunu değerlendirmek için tanımlıyor.' },
  { desen: /^hgb$|hemoglobin/i,    alan: 'ironMg',       ad: 'demir',        birim: 'mg',
    not: 'Hemoglobin demir içeren bir proteindir.' },
  { desen: /demir \(serum\)|^demir$/i, alan: 'ironMg',   ad: 'demir',        birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /b12/i,                 alan: 'vitaminB12Ug', ad: 'B12 vitamini', birim: 'µg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /folat|folik/i,         alan: 'folateUg',     ad: 'folat',        birim: 'µg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /kalsiyum/i,            alan: 'calciumMg',    ad: 'kalsiyum',     birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /magnezyum/i,           alan: 'magnesiumMg',  ad: 'magnezyum',    birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /potasyum/i,            alan: 'potassiumMg',  ad: 'potasyum',     birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
  { desen: /çinko|zinc/i,          alan: 'zincMg',       ad: 'çinko',        birim: 'mg',
    not: 'Testin ölçtüğü öğenin kendisi.' },
];

/**
 * Besin kartı için tahlil bulgusu.
 *
 * NE YAPAR: kullanıcının EN SON tahlilinde laboratuvarın aralığının ALTINDA
 * kalan değerleri alır, karşılık geldiği besin ögesini bu besinde arar ve
 * besnin veri tabanındaki SIRASINI söyler.
 *
 * NİYE SIRA, NİYE "iyi kaynak" DEĞİL: "bu besin demir açısından iyi bir
 * kaynaktır" demek için kaynaklı bir eşik gerekir ve elimizde yok. Sıra
 * uydurma değil, kendi veri tabanımız hakkında bir olgu: "ölçümü olan 142
 * besin içinde 5." İyi mi kötü mü olduğuna kullanıcı kendisi karar verir.
 *
 * NE YAPMAZ: risk seviyesini DEĞİŞTİRMEZ. Tahlil bir teşhis değil, profil
 * değişikliği hiç değil. Bu bilgi kartta ayrı bir bölümde, kendi başına durur.
 */
async function tahlilBulgulariGetir(besin, kullanici) {
  if (!kullanici) return null;

  const hepsi = await prisma.labResult.findMany({
    where: { userId: kullanici.id },
    orderBy: { testDate: 'desc' },
  });
  if (!hepsi.length) return null;

  // Yalnızca EN SON tahlil: eski bir sonuca göre bilgi vermek yanıltıcı olur.
  const sonTarih = hepsi[0].testDate.getTime();
  const dusukler = hepsi.filter(
    (t) => t.testDate.getTime() === sonTarih && t.pdfYorumu === 'düşük' && t.value !== null,
  );
  if (!dusukler.length) return null;

  const bulgular = [];
  // Ferritin ve hemoglobin ikisi de demire bakıyor; kartta demiri iki kez
  // yazmanın anlamı yok.
  const gorulen = new Set();

  for (const test of dusukler) {
    const esleme = TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(test.testName));
    if (!esleme || gorulen.has(esleme.alan)) continue;
    gorulen.add(esleme.alan);

    const ham = besin[esleme.alan];
    const porsiyonda = (ham === null || ham === undefined || !besin.portionGrams)
      ? null
      : (ham * besin.portionGrams) / 100;

    // Sıra YALNIZCA ölçümü olan besinler arasında. Ölçülmemiş besni "sıfır"
    // sayıp sona koymak, "ölçülmedi" ile "ölçüldü, sıfır çıktı"yı birbirine
    // karıştırmak olurdu — projede tekrar tekrar kaçındığımız hata.
    const olculenler = await prisma.food.findMany({
      where: { [esleme.alan]: { not: null }, portionGrams: { gt: 0 } },
      select: { portionGrams: true, [esleme.alan]: true },
    });
    const skorlar = olculenler.map((b) => (b[esleme.alan] * b.portionGrams) / 100);

    bulgular.push({
      test: test.testName,
      deger: test.value,
      birim: test.unit,
      refAlt: test.refLow,
      refUst: test.refHigh,
      besinOgesi: esleme.ad,
      besinOgesiBirimi: esleme.birim,
      eslesmeNotu: esleme.not,
      porsiyonda: porsiyonda === null ? null : Math.round(porsiyonda * 100) / 100,
      sira: porsiyonda === null ? null : skorlar.filter((x) => x > porsiyonda).length + 1,
      olculenSayisi: olculenler.length,
    });
  }

  if (!bulgular.length) return null;
  return { tarih: hepsi[0].testDate.toISOString().slice(0, 10), bulgular };
}

app.get('/api/lab/oneriler', girisGerekli, async (req, res) => {
  try {
    const hepsi = await prisma.labResult.findMany({
      where: { userId: req.kullanici.id },
      orderBy: { testDate: 'desc' },
    });
    if (!hepsi.length) return res.json({ tarih: null, oneriler: [] });

    // Yalnızca EN SON tahlil: eski bir sonuca göre öneri vermek yanıltıcı olur.
    const sonTarih = hepsi[0].testDate.getTime();
    const sonTahlil = hepsi.filter((t) => t.testDate.getTime() === sonTarih);

    // "düşük" yalnızca PDF'in kendi aralığından gelen etikettir.
    const dusukler = sonTahlil.filter((t) => t.pdfYorumu === 'düşük' && t.value !== null);

    const kurallar = await kurallariGetir();
    const profil = profilCikar(req.kullanici);
    const besinler = await prisma.food.findMany();

    const oneriler = [];
    for (const test of dusukler) {
      const esleme = TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(test.testName));
      if (!esleme) continue;

      const sirali = besinler
        .filter((b) => b[esleme.alan] !== null && b[esleme.alan] !== undefined && b.portionGrams > 0)
        .map((b) => ({
          besin: b,
          porsiyonda: (b[esleme.alan] * b.portionGrams) / 100,
          analiz: riskHesapla(b, profil, kurallar),
        }))
        // Alerjen olanlar HİÇ gösterilmiyor: alerji mutlak bir sınır.
        // Diğerleri gösteriliyor ama seviyesiyle birlikte — gizlemek yerine söylemek.
        .filter((x) => x.analiz.seviye !== 'ALERJEN' && x.porsiyonda > 0)
        .sort((a, b) => b.porsiyonda - a.porsiyonda)
        .slice(0, 6);

      oneriler.push({
        test: test.testName,
        deger: test.value,
        birim: test.unit,
        refAlt: test.refLow,
        refUst: test.refHigh,
        besinOgesi: esleme.ad,
        besinOgesiBirimi: esleme.birim,
        eslesmeNotu: esleme.not,
        besinler: sirali.map((x) => ({
          id: x.besin.id,
          name: x.besin.name,
          icon: x.besin.icon,
          portionName: x.besin.portionName,
          miktar: Math.round(x.porsiyonda * 100) / 100,
          seviye: x.analiz.seviye,
        })),
      });
    }

    res.json({
      tarih: hepsi[0].testDate.toISOString().slice(0, 10),
      oneriler,
      // Eşlemesi olmayan düşük sonuçlar: kullanıcı "ferritin düşük ama bir şey
      // yazmamış" diye düşünmesin, neden olmadığını bilsin.
      eslesmeyen: dusukler
        .filter((t) => !TAHLIL_BESIN_ESLESMESI.find((e) => e.desen.test(t.testName)))
        .map((t) => t.testName),
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Kayıtlı tahliller -----------------------------------------------------
app.get('/api/lab', girisGerekli, async (req, res) => {
  try {
    const hepsi = await prisma.labResult.findMany({
      where: { userId: req.kullanici.id },
      orderBy: [{ testDate: 'desc' }, { testName: 'asc' }],
    });
    // Tarihe göre grupla: arayüz "03.06.2026 tahlili" diye gösteriyor
    const gruplar = new Map();
    hepsi.forEach((t) => {
      const g = t.testDate.toISOString().slice(0, 10);
      if (!gruplar.has(g)) gruplar.set(g, []);
      gruplar.get(g).push(t);
    });
    res.json({
      tahliller: [...gruplar.entries()].map(([tarih, testler]) => ({
        tarih,
        testler,
        araliginDisinda: testler.filter(
          (t) => t.pdfYorumu && !['normal', 'Normal', 'Optimum', 'Risk yok'].includes(t.pdfYorumu),
        ).length,
      })),
    });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

// --- Bir tahlil gününü sil -------------------------------------------------
app.delete('/api/lab/:tarih', girisGerekli, async (req, res) => {
  try {
    const d = new Date(`${req.params.tarih}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Tarih geçersiz.' });
    const sonuc = await prisma.labResult.deleteMany({
      where: { userId: req.kullanici.id, testDate: d },
    });
    res.json({ silinen: sonuc.count });
  } catch (hata) {
    res.status(500).json({ error: hata.message });
  }
});

app.get('/', (_req, res) => {
  res.json({
    mesaj: 'Besin Risk Analiz Sistemi API çalışıyor.',
    uyari: 'Bu sistem bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.',
    kaynak: 'TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0 (https://turkomp.tarimorman.gov.tr/)',
  });
});

app.listen(PORT, () => {
  console.log(`API çalışıyor: http://localhost:${PORT}`);
});
