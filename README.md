# Besin Risk Analiz Sistemi

Kişinin hastalıklarına, alerjilerine ve kan tahlili sonuçlarına göre besinleri
değerlendiren web uygulaması. Bir besin açılınca "sizin için UYGUN / DİKKAT /
RİSKLİ" der ve **neden** öyle dediğini, hangi eşiğe ve hangi kaynağa
dayandığıyla birlikte yazar.

## Projenin kuralı

> Hiçbir sayı uydurulmaz. Her eşik gerçek bir kaynağa dayanır ve o kaynak
> kullanıcıya gösterilir. Bizim yaptığımız her çevrim "bize ait" diye
> etiketlenir.

Bu, projenin süsü değil mimarisi. Pratik sonuçları:

- **43 kural, 31 kaynak künyesi, kaynaksız eşik yok.** Bir test bunu denetliyor:
  kaynağı olmayan bir eşik eklenirse test patlar.
- Kaynak künyeleri **sayfa/tablo numarası** taşır, yalnızca "EFSA 2015" değil
  "EFSA Journal 13(10):4254, özet s.1".
- Veri eksikse kural **sessiz kalmaz, DİKKAT der.** Kritik bir besin değeri
  boş olan besin UYGUN sayılamaz.
- Çıkarımın hangi **yönünün** sağlam olduğu her yerde ayrıca yazılı. Örnek:
  TürKomp toplam trans yağı değil yalnızca elaidik asidi ölçüyor, yani
  değerimiz bir **alt sınır** — kuralın tetiklenmesi haklı, sessiz kalması
  "temiz" demek değil. Kural bu yüzden RİSKLİ değil DİKKAT veriyor.

Kuralların tam listesi ve dayanakları: [`KURAL_KAYNAKLARI.md`](KURAL_KAYNAKLARI.md)
(`backend/prisma/belge_uret.js` üretiyor, elle düzenlenmez).

## Ekranlar

| Ekran | Ne yapar |
|---|---|
| **Besinler** | Besin arama, risk seviyesi, besin kartında gerekçeler ve kaynaklar |
| **Günlük Takip** | Alınan/yakılan kalori, net kalori, su; takvimden geçmiş günler; porsiyon adedi |
| **Tahlil Sonuçlarım** | e-Nabız PDF'i yükle → değerleri oku → onayla → kaydet; tarihler arası karşılaştırma |
| **Profil** | Hastalıklar, alerjiler, diyet tercihi, günlük hedefler |

Tahlilde düşük çıkan bir değer varsa, ilgili besin ögesi besin kartında ayrı bir
**"Tahlilinize göre"** bölümünde görünür. Bu bölüm risk seviyesini
**değiştirmez** ve teşhis koymaz.

## Veri kaynağı

Besin değerlerinin tek kaynağı **[TürKomp](https://turkomp.tarimorman.gov.tr/)**
(Ulusal Gıda Kompozisyon Veri Tabanı). **155 besin, tamamı TürKomp.**
Her besnin TürKomp gıda kodu `data-import/turkomp_besinler.csv` içinde saklı;
uygulamada besin kartında kaynak ve bağlantı gösteriliyor.

TürKomp'un ölçmediği ve dışarıdan giren tek değer **kafein**
(EFSA NDA Paneli 2015, Tablo 1, s.15). Gerekçesi ve her bir sayının nereden
geldiği: `data-import/VERI_GIRISLERI.md`.

### Bilinen veri boşlukları

Dürüstlük gereği burada duruyor; hiçbiri uydurularak kapatılmadı:

- **Glisemik indeks hiçbir besinde yok.** Motor hazır (glisemik yük hesabı
  yazılı), veri bekliyor. O yüzden diyabet tarafında net karbonhidrat üst sınır
  olarak kullanılıyor.
- **Trans yağ = elaidik asit**, yani alt sınır (yukarıda anlatıldı).
- **51 besinde kritik bir değer boş** (şeker 32, doymuş yağ 27, sodyum 12).
  Çoğu TürKomp’ta hiç ölçülmemiş — veri girerek kapanmaz.
- **Doymamış yağ ölçümü 155 besnin 20’sinde var.** Ölçümü olmayan besin
  muafiyet almıyor; oran tahmin edilmiyor.

Bir kuralın "veri bekliyor" olması testlerde körleştirilmiyor: C26 testi bir
kuralı ancak dayandığı veri **tüm veri tabanında** boşsa muaf tutuyor. Veri
girildiği an kural tetiklenmek zorunda, yoksa test patlıyor.

## Kurulum

Gerekenler: **Node.js 18+**, **PostgreSQL**.

```bash
git clone <depo-adresi>
cd besin-risk-analiz
```

### 1. Backend

```bash
cd backend
npm install
```

`backend/.env` dosyasını oluştur (depoya girmez):

```
DATABASE_URL="postgresql://kullanici:parola@localhost:5432/besin_risk"
JWT_SECRET="uzun-ve-rastgele-bir-dize"
```

Veritabanını kur ve doldur:

```bash
npx prisma migrate dev
npx prisma db seed
npm start            # http://localhost:3001
```

`db seed`, `data-import/foods_tr.csv` dosyasındaki besinleri ve
`backend/prisma/hastalik_kurallari.js` içindeki kuralları veritabanına yazar.

### 2. Arayüz

Yeni bir terminalde, proje kökünde:

```bash
npm install
npm start            # http://localhost:3000
```

API adresi mutlak (`localhost:3001`) ve CORS açık, yani arayüz başka bir porta
düşse de çalışır.

## Testler

```bash
cd backend
npm test             # node src/risk_test.js
```

**121 test.** Veritabanına bağlanmaz, tamamen bellekte çalışır. Besin değerleri
testlere elle yazılmaz, `data-import/foods_tr.csv` dosyasından okunur — veri
değişirse test de değişir, sessizce kaymaz.

Gruplar: 61 nokta testi, A (veri bütünlüğü), B (kural künyeleri), C (motor
mekaniği). Ayrıntı: `claude/test-mimarisi.md`.

## Teknolojiler

**Backend:** Node.js, Express 5, PostgreSQL, Prisma 5.22 (bilerek sabitlendi),
pdfjs-dist 4.10 (e-Nabız PDF ayrıştırma), bcryptjs, jsonwebtoken
**Arayüz:** React 18, Tailwind CSS, lucide-react
**Veri hazırlama:** Python (yalnızca standart kütüphane)

## Proje yapısı

```
backend/
  src/
    index.js            # Express API (22 uç nokta)
    risk.js             # Risk motoru — kuralları besne uygular
    kural_cevir.js      # Veritabanı satırı <-> motor kuralı çevirisi (tek yer)
    tahlil_ayristir.js  # e-Nabız PDF'ini koordinat tabanlı okur
    risk_test.js        # 121 test
  prisma/
    schema.prisma       # 9 model
    hastalik_kurallari.js  # Kurallar ve kaynak künyeleri — verinin kendisi
    seed.js             # CSV + kurallar -> veritabanı
    belge_uret.js       # KURAL_KAYNAKLARI.md üretir
    kural_denetle.js    # Veritabanı kuralları dosyayla uyuşuyor mu (salt okunur)
    besin_denetle.js    # Tek bir besni her hastalık için değerlendirir
data-import/
  turkomp_besinler.csv  # Ham TürKomp verisi (gıda kodlarıyla)
  turkomp_birlestir.py  # Ana betik -> foods_tr.csv
  bos_hucre_doldur.py   # Yapıştırılan sayfalardan BOŞ hücreleri doldurur
  yapilacaklar_uret.py  # YAPILACAKLAR.md üretir
  foods_tr.csv          # Uygulamanın okuduğu besin tablosu
src/
  App.js                # Kök: oturum, yönlendirme, KVKK onay kapısı (61 satır)
  api.js                # Backend ile konuşan tek dosya
  components/
    ortak.js            # Modal, SecimKutusu, HataKutusu, risk stilleri
    Sidebar.js
  screens/
    LoginScreen.js
    RegisterScreen.js
    BesinlerScreen.js   # arama, besin kartı, besin detayı
    DiaryScreen.js      # günlük kalori, su, takvim
    LabResultsScreen.js # PDF yükleme, karşılaştırma, öneriler
    ProfileScreen.js
  kvkk/
    KvkkBilesenleri.js  # aydınlatma/açık rıza arayüzü, hesap silme
```

## Mimari notu — kurallar veri, kod değil

Hastalık kuralları `hastalik_kurallari.js` içinde **veri** olarak duruyor,
oradan veritabanına yazılıyor, API önbelleğe alıyor, `risk.js` çalıştırıyor.
Yeni bir kural eklemek için motora dokunmak gerekmiyor — eşiği, seviyeyi ve
kaynağını yazmak yeterli.

Motorun bildiği türetilmiş değerler (`risk.js`): net karbonhidrat, 1000 kcal
başına lif, doymuş yağın enerjiye oranı, doymamış yağ oranı, glisemik yük,
EPA+DHA.

## Uyarı

Bu uygulama bilgilendirme amaçlıdır. **Tıbbi tanı veya tedavi yerine geçmez.**
Tahlil ekranı sonuçlarınızı laboratuvarınızın kendi referans aralığına göre
gösterir, teşhis koymaz ve hastalık profilinizi değiştirmez. Sağlık
sorunlarınız için hekiminize başvurun.
