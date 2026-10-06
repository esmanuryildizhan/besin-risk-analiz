# Veri girişlerinin kaydı — hangi sayı nereden geldi?

Son güncelleme: 2 Ekim 2026

Bu belge **tek bir soruyu** cevaplamak için var: *"Bu değer nereden geliyor?"*

Besin değerlerinin tek kaynağı **TürKomp** (Ulusal Gıda Kompozisyon Veri Tabanı
v1.0, https://turkomp.tarimorman.gov.tr/). Her besnin TürKomp gıda kodu
`turkomp_besinler.csv` dosyasının `turkomp_url` sütununda yazılı — yani sıradan
bir besin değerinin izini sürmek için o sütuna bakmak yeterli.

Aşağıdakiler **istisnalar**: ya TürKomp'un hiç ölçmediği için dışarıdan giren
değerler, ya da girerken karar vermemiz gereken yerler. Bunlar bir dönem
`_kafein.py`, `_sanayi_urunleri.py`, `_doymamis_yag.py`, `_yeni_besinler.py`
betiklerinin içinde yazılıydı; betiklerin işi bitince içerikleri buraya alındı.

---

## 1. Kafein — TürKomp ölçmüyor, EFSA'dan girildi

TürKomp hiçbir besinde kafein raporlamıyor. Kafein iki kuralı doğrudan
etkiliyor: kansızlık (Pişkin 2022 — kafein non-hem demir emilimini düşürür) ve
reflü (Bucan 2025). Veri olmadığı için iki kural da hiç çalışmıyordu.

**Kaynak:** EFSA NDA Paneli (2015), *Scientific Opinion on the safety of
caffeine*, **Tablo 1, s.15**.

| Besin | mg/100 g | Tür | EFSA satırı |
|---|---|---|---|
| Kola | 10,8 | DOĞRUDAN | Cola beverages (caffeinated) 108 mg/L |
| Bitter çikolata | 52,5 | DOĞRUDAN | Dark chocolate 525 mg/kg |
| Sütlü çikolata | 11,1 | DOĞRUDAN | Chocolate bar 111 mg/kg |
| Siyah çay (kuru) | 2200 | ÇEVRİLMİŞ | Black tea 220 mg/L; **varsayım:** 2 g kuru çay → 200 mL |
| Hazır kahve (toz) | 4450 | ÇEVRİLMİŞ | Instant coffee 445 mg/L; **varsayım:** 2 g → 200 mL |
| Türk kahvesi (toz) | 1148,6 | ÇEVRİLMİŞ (2 varsayım) | Espresso 1340 mg/L; **varsayım:** 7 g → 60 mL |

Bu altı besnin `source` metnine EFSA atfı ekleniyor, yani sapma **besin
kartında görünüyor**. Bir test bunu denetliyor.

**Kalan besinlere 0 yazıldı.** Dayanak: EFSA'nın kendi listesi kafein taşıyan
bitkileri sayıyor (kahve ve kakao çekirdeği, çay yaprağı, guarana, kola cevizi).
Bunların dışında kafein fizik olarak yok, ölçüm gerekmiyor. Boş bırakmak
kullanıcıya gereksiz "veri eksik" uyarısı olarak dönerdi.

**Tek belgelenmiş boşluk:** Gofret (çikolata kaplı). Kakao içerdiği için kafein
taşıdığı kesin ama EFSA Tablo 1'de kakao kremalı gofrete karşılık gelen satır
yok. Saf çikolatanın değerini yazmak üst sınır olurdu ve kafein eşiği çok düşük
(1 mg/100 g) olduğundan üst sınır **yanlış uyarı** üretirdi. Hücre boş bırakıldı
ve gerekçe o besnin `source` metnine yazıldı.

**Bir hata ve düzeltmesi:** kafeinli bitki adlarını ararken "içinde geçiyor mu"
diye bakan sürüm, "do**mate**s" kelimesini yerba **mate** sanıyordu; Domates,
Kuru domates ve Domates salçası boş kalıyordu. Kelime sınırı eklendi.

---

## 2. Sanayi ürünleri — margarinde beklenmedik bulgu

Trans yağ kuralı veri tabanında yalnızca Eski kaşar ve Lüfer'de tetikleniyordu;
ikisi de hayvansal kaynak. Trans yağın literatürde riskli bulunduğu sınıf
(sanayide kısmen hidrojene edilmiş yağ taşıyan ürünler) veritabanında hiç
yoktu, yani kural kendi hedefini hiç görmemişti. Dört besin eklendi:

| Besin | TürKomp kodu |
|---|---|
| Margarin | 05.02.0007 |
| Bisküvi (petit beurre) | 06.02.0028 |
| Gofret (çikolata kaplı) | 10.02.0007 |
| Mısır cipsi | 12.02.0030 |

### Margarinin elaidik asidi 0,000 g — eksik veri değil, ölçülmüş sıfır

Şüphelenmek yerine mevzuata bakıldı: **Türk Gıda Kodeksi** trans yağı
perakendeye ve son tüketiciye sunulan gıdalarda **toplam yağın 100 gramında
2 gram** ile sınırlıyor (Resmî Gazete 7 Mayıs 2020, yürürlük 31 Aralık 2020) ve
**hayvansal yağlardaki doğal trans yağı kapsam dışı** bırakıyor.

Yani Türkiye'de sanayi kaynaklı trans yağ düzenlenmiş, hayvansal olan
düzenlenmemiş. Verideki desen tam olarak bu: margarin 0,000; eski kaşar 2,25;
lüfer 0,405. Kuralın yalnızca hayvansal kaynakta tetikleniyor olması veri
eksikliği değil, **ülkedeki gerçek durum** — ve bu, trans yağ kuralını
RİSKLİ'den DİKKAT'e indirme kararını bağımsız olarak destekliyor.

### Girilemeyen değerler (sayfalarda yok, uydurulmadı)

| Besin | Eksik |
|---|---|
| Margarin | şeker bileşenleri, sodyum |
| Bisküvi | doymuş yağ, trans yağ |
| Gofret | doymuş yağ, trans yağ, sodyum, kafein |
| Mısır cipsi | doymuş yağ, trans yağ, şeker, sodyum |

Cipste ve gofrette sodyumun olmaması özellikle can sıkıcı: hipertansiyon kuralı
bu iki besni değerlendiremiyor.

### Alerjen kararları — veriye dayandı, tahmine dayanmadı

- **Gofret → `milk`**: sayfada **laktoz 3,36 g** var, yani süt içeriği kanıtlı.
- **Bisküvi → `milk` YOK**: adı "petit beurre" (tereyağlı) olmasına rağmen
  sayfada **laktoz 0,00 g**. Adına göre alerjen yazmak tahmin olurdu.
- **Margarin → alerjen yok**: proteini 0,00 g, süt proteini yok. Soya/ayçiçeği
  gibi içerikler sayfada yazmıyor, uydurulmadı.
- **Mısır cipsi → alerjen yok**: mısır bazlı, gluten yok.

---

## 3. Doymamış yağ ölçümleri — tahmin neden bırakıldı

Doymamış yağ oranı eskiden `(yağ − doymuş) / yağ` ile **tahmin** ediliyordu. Bu
tahmin oranı fazla gösteriyor: paydadaki toplam yağ, yağ asidi olmayan kütleyi
(gliserol) de içeriyor; TürKomp bunun için her sayfada bir "Yağ Dönüşüm
Faktörü" yayımlıyor.

Oran kullanıcıya **olumlu bulgu** olarak gösterildiği için (bir İDDİA), artık
yalnızca ölçümden hesaplanıyor:

    (tekli doymamış + çoklu doymamış − trans) / (doymuş + tekli + çoklu)

Trans paydan düşülüyor çünkü **elaidik asit TürKomp'ta "toplam tekli doymamış"
İÇİNDE sayılıyor** — margarin sayfasında doğrulandı (16:1 + 18:1cis + 18:1trans
+ 20:1 = 17,152 = bildirilen tekli doymamış toplamı).

| Besin | TürKomp kodu | ölçülen oran | eski tahmin | fazla gösterme |
|---|---|---|---|---|
| Ayçiçek yağı | 05.02.0003 | %89,11 | %89,62 | +0,50 |
| Antep fıstığı | 09.01.0059 | %89,10 | %89,59 | +0,49 |
| Çam fıstığı | 07.02.0008 | %88,97 | %89,83 | +0,86 |
| Ceviz | 09.01.0010 | %87,17 | %90,08 | **+2,91** |
| Zeytinyağı (sızma) | 05.02.0010 | %83,38 | %84,14 | +0,76 |
| Kabak çekirdeği | 07.02.0009 | %80,71 | %81,71 | +1,00 |
| Tahin | 12.02.0026 | %78,16 | %79,17 | +1,01 |
| Margarin | 05.02.0007 | %70,58 | %72,82 | +2,24 |

**Pay neden kaldırıldı:** Bir ara tahmini kullanıp eşiğe "3 puan pay" eklemeyi
denedik. Payı `((doymuş+trans)/yağ) × (1/r − 1)` formülünden türetmiştik ve
r (= bildirilen yağ asitleri toplamı / toplam yağ) değerinin 0,92-0,956 bandında
kaldığını varsaymıştık. **Ceviz sayfasında r = 0,773 çıktı** ve fazla gösterme
2,91 puan oldu — payın kıl payı altında. O oranla payın 8,8 puan olması
gerekirdi. Payı veriden türetemediğimiz için tahmin tamamen kaldırıldı.

**Eşleştirme gıda koduyla yapıldı, adla değil.** Sebebi somut: Antep fıstığı
sayfası ilk yapıştırıldığında kod 09.02.0058 ("iç, kavrulmuş") çıktı ve o
sayfada yağ asidi dökümü hiç yoktu; bizim kaydımız ise 09.01.0059 ("iç,
kavlatılmamış, taze"). Adla eşleştirsek yanlış varyantın değerlerini
yazacaktık. Doğru sayfa sonradan geldi, doymuş yağı kayıtlıyla birebir aynıydı
(5,324).

---

## 4. Toplu besin girişleri — yapılan iki çevirim

44 besin TürKomp sayfalarından toplu olarak girildi. Değerler sayfadaki **ham
hâliyle** yazıldı; iki çevirim elle değil betikle yapıldı ki toplama hatası
olmasın:

    carbohydrates = TürKomp "Karbonhidrat" + TürKomp "Lif, toplam diyet"
    sugars        = Sakaroz + Glukoz + Fruktoz + Laktoz + Maltoz

Birinci satır projenin en kritik veri sözleşmesi: **TürKomp'un "Karbonhidrat"
satırı lifi İÇERMEZ.** 1 Ekim 2026'da dokuz besinde kütle dengesiyle
doğrulandı (`su + kül + protein + yağ + karbonhidrat + lif = 100`). Ayrıntı:
`claude/veri-ve-test-durumu.md`.

---

## Hâlâ dışarıdan veri bekleyen alanlar

| Alan | Durum |
|---|---|
| `glycemicIndex` | Hiçbir besinde yok. TürKomp ölçmüyor (ISO 26642 insan denemesi gerektiriyor). Girilecekse kaynak Atkinson 2021 Tablo 1 olur. |
| `epa` / `dha` | **Girildi (3 Ekim).** 12 deniz ürünü; ayrıntı aşağıda. |

Kalan tek boşluk glisemik indeks. Bu alana bağlı kurallar yazılı ve hazır;
veri girildiği an çalışmaya başlıyorlar. `risk_test.js` içindeki C26 testi bunu koşullu olarak denetliyor:
bir kural ancak dayandığı veri **tüm veritabanında** boşsa sessiz kalabiliyor,
veri girildiği an tetiklenmek zorunda.

---

## 5. EPA/DHA — 12 deniz ürünü (3 Ekim)

TürKomp balık sayfalarındaki `Yağ asidi 20:5 n-3 all-cis` (EPA) ve
`22:6 n-3 all-cis` (DHA) satırları girildi. Değerler sayfadaki ham hâliyle,
gram/100 g olarak yazıldı — çevrim yok.

Yazmadan önce her sayfa **dört ayrı alanla** doğrulandı: gıda kodu, kcal,
toplam doymuş yağ ve elaidik asit. On ikisi de kayıtlı değerlerle birebir
tuttu, yani sayfalar doğru besinlere ait.

| Besin | Kod | Besin | Kod |
|---|---|---|---|
| Alabalık | `04.01.0001` | Lüfer | `04.01.0012` |
| Hamsi | `04.01.0005` | Mezgit | `04.01.0013` |
| İstavrit | `04.01.0006` | Midye | `04.01.0014` |
| Kalkan | `04.01.0007` | Palamut | `04.01.0015` |
| Karides | `04.01.0008` | Ton balığı (konserve) | `04.02.0002` |
| Levrek | `04.01.0011` | Sardalya (konserve) | `04.02.0003` |

**Ton balığı (konserve) sayfasında 22:6 (DHA) satırı YOK.** Boş bırakıldı,
sıfır yazılmadı. Omega-3 kuralı iki değeri birden istediği için bu besin
bulgu almıyor — ölçülmemiş olan "yok" sayılmıyor.

Aynı sayfalar tekli/çoklu doymamış yağ toplamlarını da taşıdığı için
doymamış yağ ölçümü aynı anda 8 besinden 20 besne çıktı.
