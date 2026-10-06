# Veri hattı

Besin değerlerinin tek kaynağı **TürKomp** — Ulusal Gıda Kompozisyon Veri
Tabanı v1.0, https://turkomp.tarimorman.gov.tr/

> **Zorunlu atıf:** TürKomp verisi kullanıldığında uygulamada ve raporda bu
> ibare ve tıklanabilir bağlantı gösterilmek zorunda. Arayüzde besin detayında
> ve alt bilgide gösteriliyor.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `turkomp_besinler.csv` | **Kaynak veri.** TürKomp sitesinden elle girilen değerler. Her satırda besnin TürKomp gıda kodu da yazılı (`turkomp_url`). Elle düzenlenen tek dosya budur. |
| `turkomp_birlestir.py` | **Ana betik.** Kaynak veriyi kontrol eder, aritmetikle doldurulabilen boş hücreleri doldurur, `foods_tr.csv` üretir. |
| `foods_tr.csv` | **Üretilen çıktı.** Veritabanına yüklenen dosya. Elle düzenlenmez. |
| `VERI_GIRISLERI.md` | **Kayıt.** TürKomp'un ölçmediği için dışarıdan giren değerler (kafein, doymamış yağ dağılımı) ve giriş sırasında verilen kararlar — her biri kaynağıyla. |
| `YAPILACAKLAR.md` | Hangi besinde hangi kritik değer eksik. `yapilacaklar_uret.py` üretir; **depoya girmiyor**, yerelde çalışırken üretilir. |
| `bos_hucre_doldur.py` | Yapıştırılan TürKomp sayfalarından mevcut besinlerin **boş** hücrelerini doldurur. Dolu hücreye dokunmaz; kcal'i doğrulama için kullanır, tutmazsa yanlış gıda sayfasıdır ve o satıra dokunmadan uyarı basar. |
| `yapilacaklar_uret.py` | `YAPILACAKLAR.md` dosyasını üretir. |

## Yeni veri nasıl girilir?

1. TürKomp'ta besnin sayfasını aç. **Gıda kodunu da kopyala** — ad yetmez, aynı
   besnin çiğ/pişmiş/yöresel varyantları farklı değerler taşıyor ve bir kere
   yanlış varyant girilmişti (ayran 25 vs 37 kcal).
2. Yeni besinse `turkomp_besinler.csv` dosyasına satır ekle. Mevcut besnin boş
   hücresiyse `bos_hucre_doldur.py` kullan.
3. `python turkomp_birlestir.py` çalıştır.
4. `backend` klasöründe `npx prisma db seed`, sonra `node src/risk_test.js`.

## Bilinmesi gereken iki veri sözleşmesi

**TürKomp'un "Karbonhidrat" satırı lifi İÇERMEZ.** CSV'ye
`carbohydrates = Karbonhidrat + Lif` yazılıyor. Dokuz besinde kütle dengesiyle
doğrulandı: `su + kül + protein + yağ + karbonhidrat + lif = 100`.

**Şeker, bileşenlerin toplamıdır:**
`sugars = Sakaroz + Glukoz + Fruktoz + Laktoz + Maltoz`. Bu toplama betikler
yapıyor, elle yapılmıyor — toplama hatası riski kalmasın diye.

## Üçüncü parti paket gerekmiyor

Buradaki betikler yalnızca Python standart kütüphanesini kullanıyor
(`csv`, `re`, `os`, `sys`, `collections`). Sanal ortam kurmaya gerek yok,
düz `python turkomp_birlestir.py` çalışır.
