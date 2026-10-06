"""
TürKomp besinlerini uygulamanın okuduğu CSV'ye dönüştürür
=========================================================

NE YAPAR?
    1. `turkomp_besinler.csv` (TürKomp sitesinden elle girilen Türk besinleri)
       okunur; doldurulmuş satırlar alınır, boş bırakılanlar atlanır.
    2. Tutarlılık kontrollerinden geçirilir, boş hücrelerden aritmetikle
       doldurulabilenler doldurulur.
    3. `foods_tr.csv` yazılır. Veritabanına yüklenen dosya budur
       (backend klasöründe `npx prisma db seed`).

TEK KAYNAK: TÜRKOMP
    Besin değerlerinin tek kaynağı TürKomp. Proje bir dönem ikinci bir yabancı
    veri tabanıyla da çalıştı; 1-2 Ekim 2026'da tamamen çıkarıldı. Sebebi: iki
    kaynağın karışması "bu sayı nereden geliyor" sorusunu cevaplamayı
    zorlaştırıyordu ve projenin bütün amacı o soruyu cevaplayabilmek.
    TürKomp'un ölçmediği birkaç değer (kafein, doymamış yağ dağılımı) dışarıdan
    geliyor ve o besinlerin `source` metnine ayrıca yazılıyor, yani kullanıcı
    sapmayı besin kartında görüyor.

NEDEN ELLE GİRİYORUZ?
    TürKomp verilerini toplu dosya olarak sadece ticari lisansla veriyorlar.
    Akademik/ticari olmayan kullanım için siteden bakıp kaynak göstermek yeterli
    (Gıda ve Yem Kontrol Merkez Araştırma Enstitüsü'nün 21.09.2026 tarihli
    e-posta cevabı). Bu yüzden ihtiyacımız olan besinleri siteden tek tek
    okuyup `turkomp_besinler.csv` dosyasına yazıyoruz.

ZORUNLU ATIF
    Uygulamada ve raporda şu ibare ve tıklanabilir bağlantı bulunmak ZORUNDA:
    "TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı, versiyon 1.0,
     https://turkomp.tarimorman.gov.tr/"
    (Arayüzde besin detayında ve alt bilgide gösteriliyor.)

KULLANIM
    python turkomp_birlestir.py
"""

import csv
import re
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

TURKOMP_DOSYASI = "turkomp_besinler.csv"
CIKTI = "foods_tr.csv"

TURKOMP_KAYNAK = "TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0 (https://turkomp.tarimorman.gov.tr/)"

# seed.js bu sütun adlarını bekliyor
CIKTI_SUTUNLARI = [
    "externalId", "name", "nameEn", "category", "icon", "portionName", "portionGrams",
    "allergens", "traces", "dietTags", "source",
    "kcal", "proteins", "carbohydrates", "sugars", "fiber", "fat", "saturatedFat",
    "transFat",
    # TürKomp'un "Yağ asitleri, toplam tekli/çoklu doymamış" satırları.
    # Doymamış yağ oranını TAHMİN etmek yerine ÖLÇÜMDEN hesaplamak için.
    "monounsaturatedFat", "polyunsaturatedFat",
    # TürKomp "Yağ asidi 20:5 n-3" (EPA) ve "22:6 n-3" (DHA), gram/100 g.
    "epa", "dha",
    "cholesterolMg", "sodiumMg", "potassiumMg", "calciumMg", "ironMg",
    "magnesiumMg", "phosphorusMg", "zincMg", "vitaminCMg", "vitaminD_ug",
    "vitaminK_ug", "folate_ug", "vitaminB12_ug", "caffeineMg",
    # TürKomp'un "Glisemik İndeks" (GI) satırı.
    # Diyabet kuralında gerçek glisemik yükü hesaplamak için kullanılıyor.
    "glycemicIndex",
]

# Adı belirsiz kalan kayıtlar. Kullanıcı "karides" arayınca "Karides" ve
# "Karides (pişmiş)" diye iki kart görüyor ve aradaki farkı anlamıyor.
# TürKomp bu besinleri bir hazırlama notu olmadan listeliyor; kompozisyon
# tablolarında bu "çiğ" demektir.
# Kabak çekirdeğinde TürKomp'un kendi etiketini ("kuru") kullanıyoruz.
TURKOMP_AD_DUZELT = {
    "Börülce":          "Börülce (çiğ)",
    "Karides":          "Karides (çiğ)",
    "Levrek":           "Levrek (çiğ)",
    "Midye":            "Midye (çiğ)",
    "Kestane":          "Kestane (çiğ)",
    "Kabak çekirdeği":  "Kabak çekirdeği (kuru)",
}

# ---------------------------------------------------------------------------
# TÜRKOMP DIŞI DEĞERLER
# ---------------------------------------------------------------------------
# TürKomp kafein ölçmüyor. Kafein değerleri EFSA'nın kafein güvenliği
# görüşünden geliyor (bkz. VERI_GIRISLERI.md). Tek kaynak ilkesinden bilinçli bir
# sapma olduğu için SAPMA GÖRÜNÜR OLMALI: bu besinlerin kaynak metnine ek
# bir cümle yazıyoruz, böylece besin kartında da okunuyor.
KAFEIN_KAYNAK = ('Kafein değeri: EFSA NDA Paneli (2015), Scientific Opinion on the safety '
                 'of caffeine, Tablo 1 (TürKomp kafein ölçmüyor).')
# Kafein taşıyan bitkiler (EFSA 2015, s.2): kahve ve kakao çekirdeği, çay
# yaprağı, guarana, kola cevizi. Bir besnin adında bunlardan biri geçiyorsa
# kafeini "0" sayılmaz, değer girilmesi beklenir.
KAFEINLI_ANAHTARLAR = ('çay', 'kahve', 'çikolata', 'kakao', 'kola',
                       'guarana', 'mate', 'enerji içece')

# TRANS YAĞ — TürKomp toplam trans yağı ÖLÇMÜYOR, yalnızca elaidik asidi
# raporluyor. Elaidik asit toplam trans yağın bir bileşeni olduğu için bizim
# sayımız bir ALT SINIR: gerçek trans yağ bundan ancak daha yüksek olabilir.
# Sıfır yazması bile "trans yağ yok" demek değil, "elaidik asit yok" demek.
# Bu, kullanıcının bilmesi gereken bir sınır; o yüzden değeri olan her besnin
# kaynak metnine yazılıyor ve besin kartında okunuyor.
# (Kuralın seviyesi bu yüzden RİSKLİ değil DİKKAT — bkz. hastalik_kurallari.js)
TRANS_YAG_KAYNAK = ('Trans yağ değeri yalnızca elaidik asit ölçümüdür, toplam trans yağ '
                    'değildir; gerçek miktar daha yüksek olabilir (TürKomp toplam trans '
                    'yağı ölçmüyor).')

# KAFEİNİ VAR AMA MİKTARI BİLİNMİYOR — bilinçli boşluk.
# Bu besinler kakao/çikolata içeriyor, yani kafein taşıdıkları kesin; ama EFSA
# 2015 Tablo 1'de karşılık gelen bir satır YOK (tabloda çikolata bar ve bitter
# çikolata var, kakao kremalı gofret yok). Saf çikolatanın değerini yazmak
# ÜST SINIR olurdu ve burada üst sınır işe yaramıyor: kafein kuralları 1 mg/100 g
# gibi düşük bir eşikte tetikleniyor, yani üst sınır yazmak gerçekte eşiğin
# altında kalan bir besne yanlış uyarı bastırırdı. Yanlış yön.
# Sonuç: hücre boş kalıyor. Uyarı listesinde "çözülmemiş" olarak değil,
# "bilinen eksik" olarak görünsün diye burada duruyor.
# Değer -> besnin kaynak metnine eklenecek açıklama. Boşluğun gerekçesi VERİNİN
# YANINDA duruyor: hem besin kartında okunuyor, hem de risk_test.js "açıklaması
# olmayan boş kafein hücresi" kalmadığını denetleyebiliyor. Gerekçeyi teste
# liste olarak kopyalamak iki yerde yaşayan bilgi olurdu; o desen bu projede
# daha önce muafiyet hatasını doğurdu.
KAFEINI_BILINMEYEN = {
    'Gofret (çikolata kaplı)':
        'Kafein değeri girilmedi: kakao içerdiği için kafein taşıdığı kesin, ancak '
        'EFSA 2015 Tablo 1\'de kakao kremalı gofrete karşılık gelen satır yok. Saf '
        'çikolatanın değerini yazmak üst sınır olurdu ve kafein eşiği çok düşük '
        '(1 mg/100 g) olduğu için üst sınır yanlış uyarı üretirdi.',
}

KAFEINI_DISARIDAN = {
    'Kola', 'Bitter çikolata', 'Sütlü çikolata',
    'Siyah çay (kuru)', 'Hazır kahve (toz)', 'Türk kahvesi (toz)',
}

# Bir TürKomp satırının veritabanına girebilmesi için en az bunlar dolu olmalı
ZORUNLU = ["kcal", "proteins", "carbohydrates", "fat"]
# Bunlar boşsa besin yine eklenir ama hastalık değerlendirmesi eksik kalır (uyarı verilir)
ONEMLI = ["sugars", "fiber", "saturatedFat", "sodiumMg", "potassiumMg", "ironMg"]


def sayi(x):
    if x is None:
        return None
    x = str(x).strip().replace(",", ".")   # TürKomp virgüllü yazıyor olabilir: "12,5"
    if x in ("", "-", "eser", "iz"):
        return None
    try:
        return float(x)
    except ValueError:
        return "HATA"


def turkomp_satirini_donustur(r, uyarilar):
    ad = (r.get("ad") or "").strip()
    degerler = {}
    for sutun in CIKTI_SUTUNLARI:
        if sutun in r:
            degerler[sutun] = r[sutun]

    kayit = {
        "externalId": f"turkomp:{(r.get('kimlik') or '').strip()}",
        "name": ad,
        "nameEn": (r.get("turkomp_adi") or ad).strip(),
        "category": (r.get("kategori") or "Diğer").strip(),
        "icon": (r.get("ikon") or "").strip(),
        "portionName": (r.get("porsiyon_adi") or "100 g").strip(),
        "portionGrams": sayi(r.get("porsiyon_gram")) or 100,
        "allergens": (r.get("alerjenler") or "").strip(),
        "traces": (r.get("eser_alerjenler") or "").strip(),
        "dietTags": (r.get("diyet_etiketleri") or "").strip(),
        "source": (f"{TURKOMP_KAYNAK} | {KAFEIN_KAYNAK}"
                   if ad in KAFEINI_DISARIDAN else TURKOMP_KAYNAK),
    }

    for sutun in CIKTI_SUTUNLARI:
        if sutun in kayit:
            continue
        deger = sayi(r.get(sutun))
        if deger == "HATA":
            uyarilar.append(f"{ad}: '{sutun}' sayıya çevrilemedi -> \"{r.get(sutun)}\"")
            deger = None
        kayit[sutun] = "" if deger is None else round(deger, 3)

    # Trans yağ için bir SAYI gösteriyorsak, o sayının ne olduğunu da söylemek
    # zorundayız (elaidik asit, toplam değil). Boşsa eklenmiyor: gösterilen bir
    # sayı yok, açıklanacak bir şey de yok.
    #
    # SIRA ÖNEMLİ, TESADÜF DEĞİL: bu satır TürKomp'tan OKUNAN değerlere bakıyor.
    # aritmetik_sifirlari_doldur() daha SONRA çalışıyor; yağı sıfır olan besinlere
    # (bal, toz şeker, sofra tuzu, kola, pekmez, nar ekşisi, şalgam suyu) trans
    # yağ 0 yazıyor ve o besinler bu uyarıyı ALMIYOR — almamalı da. Çünkü oradaki
    # sıfır elaidik asit ölçümü değil, "toplam yağ sıfırsa hiçbir yağ asidi
    # olamaz" çıkarımı; bu çıkarım TAM, alt sınır değil. Uyarıyı onlara da
    # yazmak kullanıcıya yanlış bir belirsizlik satmak olurdu.
    # Bu ayrımı risk_test.js içindeki trans yağ testleri koruyor.
    if kayit.get("transFat") != "":
        kayit["source"] = f"{kayit['source']} | {TRANS_YAG_KAYNAK}"

    return kayit


def aritmetik_sifirlari_doldur(kayit, uyarilar):
    """Boş hücrelerin bir kısmı aslında eksik veri değil, hesapla çıkan sıfır.

    Lif ve şeker karbonhidratın alt bileşenleridir. Toplam karbonhidrat 0 ise
    ikisi de 0'dır; bu bir varsayım değil, aritmetik. Aynı şekilde toplam yağ
    0 ise doymuş yağ ve trans yağ da 0'dır.

    Bu önemli, çünkü hücreyi boş bırakırsak risk motoru "bu besin için veri yok,
    değerlendirme eksik olabilir" uyarısı basıyor ve kullanıcı olmayan bir
    belirsizlik görüyor. TürKomp sayfalarında balık/et için lif satırı hiç
    yazmıyor; sebebi ölçülmemiş olması değil, sıfır olması.

    DİKKAT: tersi geçerli değil. Karbonhidrat 0'dan büyükse lifin kaç olduğunu
    bilemeyiz, orada boş bırakmaya devam ediyoruz.
    """
    def deger(alan):
        d = kayit.get(alan)
        return d if isinstance(d, (int, float)) else None

    def sifir_mi(alan):
        return deger(alan) == 0

    def ihmal_edilebilir(alan, sinir=0.5):
        d = deger(alan)
        return d is not None and d < sinir

    dolduruldu = []
    # Şeker ve lif, karbonhidratın alt bileşenleridir; ikisi de toplam
    # karbonhidrattan büyük olamaz. Karbonhidrat 0,5 g'ın altındaysa ikisinin
    # de üst sınırı 0,5 g demektir — diyabet eşikleri (porsiyonda 20-45 g)
    # yanında ihmal edilebilir. Bu bir ölçüm değil, ÜST SINIR; o yüzden 0
    # yazmak güvenli yönde bir yuvarlama.
    if sifir_mi("carbohydrates") or ihmal_edilebilir("carbohydrates"):
        for alt in ("fiber", "sugars"):
            if kayit.get(alt) in (None, ""):
                kayit[alt] = 0
                dolduruldu.append(alt)

    # ÜST SINIR: şeker, toplam karbonhidrattan fazla olamaz.
    # TürKomp'un kendi verisinde bazen fazla çıkıyor (ör. Kola: şeker 11,19 /
    # karbonhidrat 10,65; süt: 5,70 / 5,43). Sebebi ayrı ayrı ölçüp yuvarlamak.
    # Tanım gereği imkânsız olduğu için karbonhidrata kırpıyoruz.
    seker, karb = deger("sugars"), deger("carbohydrates")
    if seker is not None and karb is not None and seker > karb:
        kayit["sugars"] = round(karb, 3)
        dolduruldu.append(f"sugars (karbonhidrata kırpıldı: {seker} -> {karb})")

    # ÜST SINIR: doymuş yağ, toplam yağdan fazla olamaz.
    # TürKomp yağ asidi dağılımını yalnızca yağlı besinlerde ölçüyor; meyve ve
    # sebzelerde "Yağ asitleri, toplam doymuş" satırı hiç yok. Ama toplam yağ
    # 1,5 g'ın altındaysa doymuş yağ da en fazla 1,5 g olabilir ve kolesterol
    # kurallarının en alt eşiği "100 g'da 1,5 g'DAN FAZLA" olduğu için bu bir
    # uyarıyı asla tetikleyemez. O yüzden en kötü durumu (= toplam yağ)
    # yazıyoruz: ölçüm değil, AŞILAMAZ ÜST SINIR. Böylece motor "veri yok"
    # deyip besni boşuna DİKKAT'e çekmiyor, güvenlik yönünde de sapma olmuyor.
    yag = deger("fat")
    if yag is not None and yag <= 1.5:
        if kayit.get("saturatedFat") in (None, ""):
            kayit["saturatedFat"] = yag
            dolduruldu.append("saturatedFat (üst sınır = toplam yağ)")

    # KAFEİN: kafein doğada yalnızca belirli bitkilerde var. EFSA (2015,
    # Scientific Opinion on the safety of caffeine, s.2 ve s.14) beslenmedeki
    # kafein kaynaklarını tek tek sayıyor: kahve ve kakao çekirdeği, çay
    # yaprağı, guarana meyvesi, kola cevizi — yani kahve, çay, kolalı içecekler,
    # "enerji içecekleri" ve çikolata. Bunların dışındaki bir besinde kafein
    # bulunmaz; bu bir tahmin değil, kaynağın kendi listesi.
    #
    # Bu yüzden adında kafein taşıyan bir bitki GEÇMEYEN besinlere 0 yazıyoruz.
    # Adında geçip de değeri girilmemiş bir besin varsa 0 YAZMIYORUZ, uyarı
    # basıyoruz — yeni bir kahve/çay/çikolata eklenip kafeini unutulursa
    # sessizce "kafeinsiz" görünmesin diye.
    if kayit.get("caffeineMg") in (None, ""):
        # Anahtar kelime, bir sözcüğün BAŞINDA geçmeli. Düz "içinde geçiyor mu"
        # kontrolü yanlış alarm veriyordu: "domates" içinde "mate" var.
        ad_kucuk = kayit["name"].lower()
        if kayit["name"] in KAFEINI_BILINMEYEN:
            # Bilinen eksik: gerekçe kaynak metnine yazılıyor, uyarı basılmıyor.
            kayit["source"] = f"{kayit['source']} | {KAFEINI_BILINMEYEN[kayit['name']]}"
        elif any(re.search(r"(?<![a-zçğıiöşü])" + re.escape(a), ad_kucuk)
                 for a in KAFEINLI_ANAHTARLAR):
            uyarilar.append(f"{kayit['name']}: adı kafeinli bir bitkiyi çağrıştırıyor ama "
                            f"kafein değeri girilmemiş — EFSA Tablo 1'den girilmeli")
        else:
            kayit["caffeineMg"] = 0
            dolduruldu.append("caffeineMg (EFSA kaynak listesinde yok -> 0)")
    if sifir_mi("fat"):
        for alt in ("saturatedFat", "transFat"):
            if kayit.get(alt) in (None, ""):
                kayit[alt] = 0
                dolduruldu.append(alt)
    return dolduruldu


def kontrol_et(kayit, uyarilar):
    """Bir kaydın veritabanına girebilecek kadar tam olup olmadığına bakar."""
    ad = kayit["name"]
    eksik = [z for z in ZORUNLU if kayit[z] == ""]
    if eksik:
        return False, f"{ad}: zorunlu değer(ler) boş ({', '.join(eksik)}) -> atlandı"

    kcal, pro, kar, yag = kayit["kcal"], kayit["proteins"], kayit["carbohydrates"], kayit["fat"]
    lif = kayit["fiber"] or 0
    seker = kayit["sugars"]
    doymus = kayit["saturatedFat"]

    if not (0 <= kcal <= 900):
        return False, f"{ad}: kalori 0-900 aralığı dışında ({kcal}) -> atlandı"
    if any(v != "" and not (0 <= v <= 100) for v in (pro, kar, yag, seker, doymus, lif)):
        return False, f"{ad}: bir besin değeri 0-100 g aralığı dışında -> atlandı"
    if pro + kar + yag > 105:
        return False, f"{ad}: makro toplamı 105 g'ı aşıyor -> atlandı"
    if seker != "" and seker > kar + 0.5:
        return False, f"{ad}: şeker karbonhidrattan fazla -> atlandı"
    if doymus != "" and doymus > yag + 0.5:
        return False, f"{ad}: doymuş yağ toplam yağdan fazla -> atlandı"

    # KARBONHİDRAT / LİF SÖZLEŞMESİ — 1 Ekim 2026'da kütle dengesiyle doğrulandı.
    #
    # TürKomp'un "Karbonhidrat" satırı LİF HARİÇTİR:
    #     su + kül + protein + yağ + karbonhidrat + LİF = 100
    # Dokuz besinde test edildi (ayva, bamya, brokoli, pırasa, ıspanak, Türk
    # kahvesi, siyah çay, kuru fasulye, nohut) ve lif eklenince toplam tam
    # 100,00 çıkıyor; lif eklenmezse %3-52 eksik kalıyor.
    #
    # Bu yüzden CSV'ye yazarken ÜZERİNE LİF EKLENİR:
    #     csv.carbohydrates = TürKomp.Karbonhidrat + TürKomp.Lif
    # Böylece sütun uluslararası "by difference" tanımıyla aynı anlama gelir ve
    # net karbonhidrat = carbohydrates - fiber doğru çıkar.
    #
    # Kalori hesabında lif ayrı katsayıyla (2 kcal/g) sayıldığı için
    # karbonhidrattan düşülüyor.
    #
    # NOT: 1 Ekim'de bu yorum bir ara "lif dahil" diye yanlış değiştirilmişti.
    # O çıkarım yalnızca lifi SIFIR olan iki besne (ayran, çökelek) bakılarak
    # yapılmıştı; lifi sıfır olduğunda iki model de aynı sonucu verdiği için
    # ayırt edici değildi. Düzeltildi.
    hesap = 4 * pro + 4 * max(0, kar - lif) + 9 * yag + 2 * lif
    if abs(kcal - hesap) > max(40, 0.3 * max(kcal, hesap)):
        uyarilar.append(f"{ad}: kalori makrolarla uyuşmuyor (tabloda {kcal:.0f}, hesap {hesap:.0f}) "
                        f"- değerleri bir daha kontrol et")

    bos = [o for o in ONEMLI if kayit[o] == ""]
    if bos:
        uyarilar.append(f"{ad}: {', '.join(bos)} boş; bu hastalık kurallarında "
                        f"\"veri yok\" olarak görünecek")
    return True, None


def main():
    turkomp_kayitlari, uyarilar, atlanan, aritmetik = [], [], [], []

    if not os.path.exists(TURKOMP_DOSYASI):
        sys.exit(f"HATA: '{TURKOMP_DOSYASI}' yok. Besin verisi bu dosyada tutuluyor.")

    with open(TURKOMP_DOSYASI, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            # Hiç değer girilmemiş satırlar "henüz doldurmadım" demektir, sessizce atla
            if not any((r.get(z) or "").strip() for z in ZORUNLU):
                continue
            kayit = turkomp_satirini_donustur(r, uyarilar)
            for alan in aritmetik_sifirlari_doldur(kayit, uyarilar):
                aritmetik.append(f"{kayit['name']}: {alan}")
            tamam, sebep = kontrol_et(kayit, uyarilar)
            if tamam:
                turkomp_kayitlari.append(kayit)
            else:
                atlanan.append(sebep)

    print(f"TürKomp besinleri: {len(turkomp_kayitlari)} eklendi, {len(atlanan)} atlandı")
    if aritmetik:
        print(f"{len(aritmetik)} boş hücre aritmetikle dolduruldu "
              f"(karbonhidrat 0 -> lif/şeker 0; yağ 0 -> doymuş/trans 0)")

    # Adları netleştir (çiğ/pişmiş, demlenmiş/kuru ayrımı görünsün)
    duzeltilen = []
    for k in turkomp_kayitlari:
        yeni_ad = TURKOMP_AD_DUZELT.get(k["name"].strip())
        if yeni_ad:
            duzeltilen.append(f"{k['name']} -> {yeni_ad}")
            k["name"] = yeni_ad
    if duzeltilen:
        print(f"\n{len(duzeltilen)} besnin adı netleştirildi:")
        for d in duzeltilen:
            print("   -", d)

    # Aynı ad iki satırda olmamalı: arama sonucunda iki kart çıkar ve kullanıcı
    # hangisinin doğru olduğunu bilemez.
    adlar = [k["name"].strip().lower() for k in turkomp_kayitlari]
    tekrar_ad = sorted({a for a in adlar if adlar.count(a) > 1})
    if tekrar_ad:
        sys.exit(f"HATA: Aynı ad birden fazla satırda: {tekrar_ad}")

    kimlikler = [k["externalId"] for k in turkomp_kayitlari]
    tekrar = sorted({k for k in kimlikler if kimlikler.count(k) > 1})
    if tekrar:
        sys.exit(f"HATA: Aynı kimlik birden fazla kez var: {tekrar}")

    turkomp_kayitlari.sort(key=lambda k: (k["category"], k["name"]))
    with open(CIKTI, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CIKTI_SUTUNLARI, extrasaction="ignore")
        w.writeheader()
        w.writerows(turkomp_kayitlari)

    print(f"\n'{CIKTI}' yazıldı: {len(turkomp_kayitlari)} besin, tamamı TürKomp.")

    if atlanan:
        print("\nAtlanan satırlar:")
        for a in atlanan:
            print("   -", a)
    if uyarilar:
        print("\nUyarılar:")
        for u in uyarilar:
            print("   -", u)
    if turkomp_kayitlari:
        print(f"\nATIF HATIRLATMASI: TürKomp verisi kullanıldığında uygulamada ve raporda\n"
              f"  \"{TURKOMP_KAYNAK}\"\nibaresi ve tıklanabilir bağlantı gösterilmek zorunda.")


if __name__ == "__main__":
    main()
