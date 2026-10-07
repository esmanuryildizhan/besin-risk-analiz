# Besin Risk Analiz Sistemi

Besin Risk Analiz Sistemi, kullanıcının kronik rahatsızlıklarını, besin
alerjilerini ve kan tahlili sonuçlarını dikkate alarak besinleri değerlendiren
bir web uygulamasıdır. Her besin için UYGUN, DİKKAT, RİSKLİ, DİYET DIŞI veya
ALERJEN seviyelerinden biri hesaplanır; sonucun hangi eşik değerine ve hangi
kaynağa dayandığı kullanıcıya gösterilir.

## Yöntem

Değerlendirme, kural tabanlı bir motor üzerinden yapılmaktadır. Sistemde
11 hastalık için tanımlanmış **43 kural** ve bu kuralların dayandığı
**28 kaynak künyesi** bulunmaktadır.

Tüm eşik değerleri literatürdeki bilimsel yayınlardan ve ulusal/uluslararası
kılavuzlardan alınmıştır. Her kaynak künyesi, değerin bulunduğu sayfa veya
tablo numarasını içerir (örneğin "EFSA Journal 13(10):4254, özet s.1").
Kaynak bilgisi olmayan bir eşik değerinin sisteme eklenmesi, otomatik testler
tarafından engellenmektedir. Hiçbir kurala dayanak oluşturmayan ve hiçbir
gerekçede anılmayan kaynak künyeleri kaynakçada tutulmaz; bu denetim de
otomatik testlerle yapılmaktadır.

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
metni ve açık rıza mekanizması içermektedir. Kullanıcılar kendilerine ait tüm
veriyi profil ekranından indirebilmekte, hesaplarını ve verilerini aynı
ekrandan silebilmektedir.

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

Oluşturulan `.env` dosyasında en az iki değer tanımlanmalıdır:

```
DATABASE_URL="postgresql://kullanici:parola@localhost:5432/besin_risk"
JWT_SECRET="uzun-ve-rastgele-bir-dize"
```

Yayına alınırken sağlık verisi şifreleme anahtarı (`VERI_ANAHTARI`) ayrıca
tanımlanmalıdır. Tanımlanmadığı durumda anahtar `JWT_SECRET` üzerinden
türetilir; bu durumda `JWT_SECRET` değiştirildiğinde kayıtlı sağlık verisi
okunamaz hâle gelir. Şifre sıfırlama e-postası ve iki aşamalı doğrulama
anahtarına ilişkin değişkenler isteğe bağlıdır. Tüm değişkenlerin açıklaması
`.env.example` dosyasında yer almaktadır.

Bu dosya veri tabanı parolası ve şifreleme anahtarları içerdiği için sürüm
kontrolüne dâhil edilmemektedir.

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

## Güvenlik ve kişisel verilerin korunması

**Özel nitelikli kişisel verilerin şifrelenmesi.** Hastalık ve alerji
kayıtları, tahlil sonuçları ve günlük takip verileri veri tabanında AES-256-GCM
ile alan düzeyinde şifreli saklanır. Günlük takip kayıtlarında tüketilen
besnin kimliği de şifrelidir; bu nedenle besin tablosuyla veri tabanı
düzeyinde ilişki kurulmaz, ilişki uygulama katmanında kurulur. Şifreleme anahtarı veri tabanında değil
ortam değişkeninde tutulur. Bu yöntem, Kişisel Verileri Koruma Kurulu'nun
2018/10 sayılı kararında özel nitelikli kişisel veriler için öngörülen
"kriptografik yöntemlerle muhafaza" ve "anahtarların farklı ortamlarda
tutulması" ölçütlerini karşılamak üzere uygulanmıştır.

**E-posta doğrulama.** Kayıt sırasında verilen adrese doğrulama bağlantısı
gönderilir; adres doğrulanmadan giriş yapılamaz. Bu önlem olmadan, bir
kullanıcının başkasına ait bir adresle hesap açması ve şifre sıfırlama
bağlantısının doğrulanmamış bir adrese gönderilmesi mümkün olmaktaydı.

**Hesap sayımına karşı koruma.** Kayıt uç noktası, adresin sistemde kayıtlı
olup olmadığına bakmaksızın aynı yanıtı döndürür. Adres zaten kayıtlıysa durum
yalnızca adresin sahibine gönderilen bilgilendirme iletisiyle bildirilir.

**Hesap bazlı kilitleme.** Hız sınırları IP adresi başına uygulandığından, IP
değiştirebilen bir saldırgan tek bir hesabı denemeyi sürdürebilmekteydi. Buna
karşı hesaba bağlı bir deneme sayacı eklenmiştir; eşik aşıldığında hesap
geçici olarak kilitlenir. Kilit süreyle sınırlıdır: kalıcı kilitleme, bir
saldırganın hesapları kasten kilitleyerek sahiplerini dışarıda bırakmasına
imkân verirdi.

**İki aşamalı doğrulama.** Hesaplar RFC 6238 (TOTP) uyumlu doğrulayıcı
uygulamalarla korunabilir. Doğrulama kodu ağ üzerinden iletilmez; telefondaki
uygulama ile sunucu aynı gizli anahtardan bağımsız olarak kod üretir. Telefona
erişilemediği durumlar için tek kullanımlık yedek kodlar üretilir ve bu kodlar
bcrypt özeti olarak saklanır.

**Şifre sıfırlama.** Sıfırlama bağlantısı 60 dakika geçerlidir ve yalnızca bir
kez kullanılabilir. Bağlantının kendisi saklanmaz, yalnızca SHA-256 özeti
tutulur. İki aşamalı doğrulama açık hesaplarda sıfırlama için doğrulama kodu
da istenir; aksi hâlde e-posta hesabına erişen bir kişi iki aşamalı doğrulamayı
devre dışı bırakabilirdi. Şifre değiştirildiğinde o ana kadar verilmiş tüm
oturum biletleri geçersiz kılınır.

**Tahlil raporundaki kişisel bilgiler.** e-Nabız raporunda yer alan ad-soyad,
doğum tarihi, cinsiyet ve sağlık tesisi bilgileri okunmaz ve saklanmaz. Bu
satırlar hem etiketlerinden hem de içeriklerinden tanınarak ayıklanır; ikinci
denetim, rapor düzeninin değişmesi hâlinde de çalışır. Yüklenen PDF diske
yazılmaz, bellekte ayrıştırılıp bırakılır. Bu davranış sekiz test tarafından
sabitlenmiştir (T01-T08).

**Verilerin indirilebilmesi.** Kullanıcılar kendileri hakkında saklanan tüm
veriyi profil ekranından JSON biçiminde indirebilir. Bu, 6698 sayılı Kanun'un
11. maddesindeki bilgi talep etme hakkı ile Genel Veri Koruma Tüzüğü'nün
15. (erişim) ve 20. (veri taşınabilirliği) maddeleri kapsamında sağlanmıştır.
Dosyaya parola özeti ve iki aşamalı doğrulama anahtarı dâhil edilmez.

**PDF ayrıştırma sınırları.** Yüklenen dosya boyutu 3 MB, sayfa sayısı 40 ve
ayrıştırma süresi 15 saniye ile sınırlıdır. Boyut sınırı tek başına yeterli
bir ölçüt değildir; sıkıştırılmış küçük bir dosya çok sayıda sayfa
açabileceğinden, sayfa sayısı ve süre sınırları esas koruma olarak eklenmiştir.

**Diğer önlemler.** Parolalar bcrypt ile özetlenir. Giriş denemeleri,
PDF yüklemeleri ve şifre sıfırlama istekleri ayrı ayrı hız sınırlarına
tâbidir. Başarısız giriş ve doğrulama denemeleri, e-posta adresi maskelenerek
sunucu günlüğüne kaydedilir. HTTP güvenlik başlıkları helmet ile ayarlanır.

## Testler

```bash
cd backend
npm test
```

Projede **182 otomatik test** bulunmaktadır. Testler veri tabanına bağlanmaz,
tamamen bellek üzerinde çalışır. Besin değerleri testlerin içine yazılmaz,
`data-import/foods_tr.csv` dosyasından okunur; böylece veri değiştiğinde
testler de güncel veriyle çalışır.

**Risk motoru — 121 test** (`src/risk_test.js`): 61 nokta testi, veri
bütünlüğü testleri (A), kural meta-verisi testleri (B) ve motor mekaniği
testleri (C).

**Güvenlik — 61 test** (`src/guvenlik_test.js`): iki aşamalı doğrulama (G01-G12),
alan düzeyinde şifreleme (G13-G28), oturum ve şifre sıfırlama biletleri
(G29-G35), günlük takip kayıtlarının şifrelenmesi (G36-G42), hesap kilidi
(G43-G47), e-posta doğrulama biletleri (G48-G50), tahlil raporundaki kişisel
bilgilerin ayıklanması (T01-T08) ve PDF ayrıştırma sınırları (T09-T11).

Güvenlik testlerinin her biri, koruduğu mekanizma kasten devre dışı
bırakılarak sınanmıştır; böylece testin geçmesinin korumanın varlığına bağlı
olduğu doğrulanmıştır.

## Proje yapısı

```
backend/
  src/
    index.js               Express API (30 uç nokta)
    risk.js                Risk motoru
    kural_cevir.js         Veri tabanı satırı ile motor kuralı arasındaki çeviri
    tahlil_ayristir.js     e-Nabız PDF ayrıştırıcısı
    kripto.js              Alan düzeyinde şifreleme (AES-256-GCM)
    totp.js                İki aşamalı doğrulama (RFC 6238)
    oturum.js              Oturum ve şifre sıfırlama biletleri
    gunluk.js              Günlük takip kayıtlarının çözümü ve biçimlendirmesi
    eposta.js              Şifre sıfırlama e-postası
    kvkk_metinleri.js      Aydınlatma ve açık rıza metinleri
    risk_test.js           121 test
    guvenlik_test.js       61 test
  prisma/
    schema.prisma          Veri tabanı şeması (10 model)
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
  screens/                 Ekranlar (giriş, kayıt, besinler, günlük, tahlil,
                           profil, şifre sıfırlama)
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
