# Besin Risk Analiz Sistemi

Besin Risk Analiz Sistemi, kullanıcının kronik rahatsızlıklarını, besin
alerjilerini ve kan tahlili sonuçlarını dikkate alarak besinleri değerlendiren
bir web uygulamasıdır. Her besin için UYGUN, DİKKAT, RİSKLİ, DİYET DIŞI veya
ALERJEN seviyelerinden biri hesaplanır; sonucun hangi eşik değerine ve hangi
kaynağa dayandığı kullanıcıya gösterilir.

## Yöntem

Değerlendirme, kural tabanlı bir motor üzerinden yapılmaktadır. Sistemde
11 hastalık için tanımlanmış **43 kural** ve bu kuralların dayandığı
**31 kaynak künyesi** bulunmaktadır.

Tüm eşik değerleri literatürdeki bilimsel yayınlardan ve ulusal/uluslararası
kılavuzlardan alınmıştır. Her kaynak künyesi, değerin bulunduğu sayfa veya
tablo numarasını içerir (örneğin "EFSA Journal 13(10):4254, özet s.1").
Kaynak bilgisi olmayan bir eşik değerinin sisteme eklenmesi, otomatik testler
tarafından engellenmektedir.

Kuralların tam listesi ve dayanakları [`KURAL_KAYNAKLARI.md`](KURAL_KAYNAKLARI.md)
dosyasında yer almaktadır. Bu dosya `backend/prisma/belge_uret.js` tarafından
üretilmektedir.

## Özellikler

| Ekran | İşlevi |
|---|---|
| **Besinler** | Besin arama, risk seviyesi gösterimi, besin kartında gerekçeler ve kaynaklar |
| **Günlük Takip** | Alınan ve yakılan kalori, net kalori, su tüketimi; takvim üzerinden geçmiş kayıtlara erişim; porsiyon adedi girişi |
| **Tahlil Sonuçlarım** | e-Nabız PDF raporunun yüklenmesi, değerlerin okunması, kullanıcı onayıyla kaydedilmesi ve tarihler arası karşılaştırma |
| **Profil** | Hastalık, alerji ve diyet tercihi yönetimi; günlük kalori ve su hedefleri |

Tahlil sonucunda laboratuvarın referans aralığının altında kalan bir değer
bulunması hâlinde, ilgili besin ögesi besin kartında ayrı bir bölümde
gösterilir. Bu bölüm risk seviyesini değiştirmez.

Uygulama, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma
metni ve açık rıza mekanizması içermektedir. Kullanıcılar hesaplarını ve tüm
verilerini profil ekranından silebilmektedir.

## Veri kaynağı

Besin değerlerinin kaynağı **[TürKomp](https://turkomp.tarimorman.gov.tr/)**
(Ulusal Gıda Kompozisyon Veri Tabanı v1.0) olup, veri tabanında 155 besin yer
almaktadır. Her besnin TürKomp gıda kodu `data-import/turkomp_besinler.csv`
dosyasında saklanmakta, kaynak bilgisi ve bağlantısı uygulama arayüzünde
gösterilmektedir.

Kafein değerleri, TürKomp bu bileşeni raporlamadığı için EFSA NDA Paneli
(2015) *Scientific Opinion on the safety of caffeine* yayınının 15. sayfasında
yer alan 1 numaralı tablodan alınmıştır. Veri girişlerine ilişkin ayrıntılı
kayıt `data-import/VERI_GIRISLERI.md` dosyasında tutulmaktadır.

## Teknolojiler

**Sunucu tarafı:** Node.js, Express 5, PostgreSQL, Prisma 5.22, pdfjs-dist 4.10,
bcryptjs, jsonwebtoken

**İstemci tarafı:** React 18, Tailwind CSS, lucide-react

**Veri hazırlama:** Python (standart kütüphane)

## Kurulum

Gereksinimler: Node.js 18 veya üzeri, PostgreSQL.

```bash
git clone https://github.com/esmanuryildizhan/besin-risk-analiz.git
cd besin-risk-analiz
```

### 1. Sunucu tarafı

```bash
cd backend
npm install
```

Ortam değişkenleri için örnek dosya kopyalanır:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

Oluşturulan `.env` dosyasında iki değer tanımlanmalıdır:

```
DATABASE_URL="postgresql://kullanici:parola@localhost:5432/besin_risk"
JWT_SECRET="uzun-ve-rastgele-bir-dize"
```

Bu dosya veri tabanı parolası içerdiği için sürüm kontrolüne dâhil
edilmemektedir.

Veri tabanı şeması oluşturulur ve başlangıç verisi yüklenir:

```bash
npx prisma migrate dev
npx prisma db seed
npm start            # http://localhost:3001
```

`db seed` komutu, `data-import/foods_tr.csv` dosyasındaki besinleri ve
`backend/prisma/hastalik_kurallari.js` dosyasındaki kuralları veri tabanına
yazar.

### 2. İstemci tarafı

Proje kök dizininde, ayrı bir terminalde:

```bash
npm install
npm start            # http://localhost:3000
```

Arayüz, sunucuya `http://localhost:3001` adresi üzerinden erişir. Sunucu
yalnızca `http://localhost:3000` adresinden gelen isteklerini kabul eder.
Arayüz farklı bir portta çalıştırılacaksa `backend/.env` dosyasına
`FRONTEND_URL` değişkeni eklenmelidir.

## Testler

```bash
cd backend
npm test
```

Projede **121 otomatik test** bulunmaktadır. Testler veri tabanına bağlanmaz,
tamamen bellek üzerinde çalışır. Besin değerleri testlerin içine yazılmaz,
`data-import/foods_tr.csv` dosyasından okunur; böylece veri değiştiğinde
testler de güncel veriyle çalışır.

Testler dört grupta toplanmıştır: 61 nokta testi, veri bütünlüğü testleri (A),
kural meta-verisi testleri (B) ve motor mekaniği testleri (C).

## Proje yapısı

```
backend/
  src/
    index.js               Express API (22 uç nokta)
    risk.js                Risk motoru
    kural_cevir.js         Veri tabanı satırı ile motor kuralı arasındaki çeviri
    tahlil_ayristir.js     e-Nabız PDF ayrıştırıcısı
    kvkk_metinleri.js      Aydınlatma ve açık rıza metinleri
    risk_test.js           121 test
  prisma/
    schema.prisma          Veri tabanı şeması (9 model)
    hastalik_kurallari.js  Kurallar ve kaynak künyeleri
    seed.js                Başlangıç verisini yükler
    belge_uret.js          KURAL_KAYNAKLARI.md dosyasını üretir
    kural_denetle.js       Veri tabanı ile kural dosyasını karşılaştırır
    besin_denetle.js       Tek bir besni tüm hastalıklar için değerlendirir
data-import/
  turkomp_besinler.csv     Kaynak veri (TürKomp gıda kodlarıyla)
  turkomp_birlestir.py     Ana veri hazırlama betiği
  bos_hucre_doldur.py      TürKomp sayfalarından eksik değerleri tamamlar
  yapilacaklar_uret.py     Eksik veri listesini üretir
  foods_tr.csv             Uygulamanın kullandığı besin tablosu
src/
  App.js                   Oturum yönetimi ve yönlendirme
  api.js                   Sunucu iletişimi
  components/              Paylaşılan bileşenler ve sol menü
  screens/                 Ekranlar
  kvkk/                    KVKK aydınlatma, açık rıza ve hesap silme arayüzü
```

## Mimari

Hastalık kuralları koda gömülü değildir; `hastalik_kurallari.js` dosyasında
veri olarak tanımlanır, buradan veri tabanına aktarılır ve `risk.js` tarafından
çalıştırılır. Yeni bir kural eklenmesi için motorun değiştirilmesi gerekmez;
eşik değerinin, seviyenin ve kaynağın tanımlanması yeterlidir.

Motor, ham besin değerlerinin yanı sıra türetilmiş değerleri de hesaplar:
net karbonhidrat, 1000 kcal başına lif miktarı, doymuş yağın enerjiye oranı,
doymamış yağ oranı, glisemik yük ve EPA+DHA miktarı.

## Yasal uyarı

Bu uygulama bilgilendirme amaçlıdır ve tıbbi tanı veya tedavi yerine geçmez.
Tahlil ekranı, sonuçları yalnızca raporu düzenleyen laboratuvarın kendi
referans aralığına göre gösterir; teşhis koymaz. Sağlık sorunlarınız için
hekiminize başvurunuz.
