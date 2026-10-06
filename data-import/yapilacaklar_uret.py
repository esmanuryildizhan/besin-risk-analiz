# -*- coding: utf-8 -*-
"""Tek kaynak (TürKomp) düzeninde geriye ne kaldı? YAPILACAKLAR.md üretir."""
import csv
from collections import defaultdict

# backend/src/risk.js: "kritik" işaretli bir kuralın besin değeri boşsa motor
# besni UYGUN sayamaz, otomatik DİKKAT'e çeker. Gerçekten kritik olanlar:
KRITIK = {
    "sugars":        ("Sakaroz + Glukoz + Fruktoz + Laktoz + Maltoz toplamı", "Diyabet, İnsülin direnci"),
    "saturatedFat":  ("Yağ asitleri, toplam doymuş",                          "Yüksek kolesterol"),
    "sodiumMg":      ("Sodyum, Na  (Tuz satırı DEĞİL)",                       "Hipertansiyon, Böbrek"),
    "carbohydrates": ("Karbonhidrat",                                          "Diyabet, İnsülin direnci"),
}
# Eksikse besin yanlış değerlendirilmez; sadece olası bir FAYDA görünmez.
IKINCIL = {
    "fiber":        ("Lif, toplam diyet",        "Diyabet/kolesterolde lif faydası"),
    "vitaminCMg":   ("C vitamini",               "Kansızlık — demir emilimini artırır"),
    "transFat":     ("Yağ asidi 18:1 n-9 trans (elaidik asit)", "Kolesterol"),
    "potassiumMg":  ("Potasyum, K",              "Hipertansiyon, Böbrek"),
    "phosphorusMg": ("Fosfor, P",                "Böbrek"),
    "calciumMg":    ("Kalsiyum, Ca",             "Kansızlık — demir emilimini kısar"),
    "ironMg":       ("Demir, Fe",                "Kansızlık"),
}
KISA = {"sugars": "şeker", "saturatedFat": "doymuş yağ", "sodiumMg": "sodyum",
        "carbohydrates": "karbonhidrat", "fiber": "lif", "vitaminCMg": "C vit",
        "transFat": "trans", "potassiumMg": "potasyum", "phosphorusMg": "fosfor",
        "calciumMg": "kalsiyum", "ironMg": "demir"}

ham = [r for r in csv.DictReader(open("turkomp_besinler.csv", encoding="utf-8-sig"))
       if (r.get("ad") or "").strip()]

# Boşluk sayımı İŞLENMİŞ çıktıya göre yapılır: turkomp_birlestir.py'nin
# aritmetik ve üst-sınır kuralları bazı hücreleri kendiliğinden dolduruyor,
# onları "eksik" saymak boşuna iş çıkarır. Ad eşlemesi için gıda kodunu
# kullanıyoruz, çünkü bazı adlar birleştirme sırasında netleştiriliyor
# (Börülce -> Börülce (çiğ) gibi).
islenmis = {}
for r in csv.DictReader(open("foods_tr.csv", encoding="utf-8")):
    kod = (r.get("externalId") or "").split(":")[-1]
    islenmis[kod] = r
for r in ham:
    isl = islenmis.get((r.get("kimlik") or "").strip())
    if isl:
        for a in list(KRITIK) + list(IKINCIL):
            if (isl.get(a) or "").strip():
                r[a] = isl[a]

def _sayi(x):
    try:
        return float((x or "").strip().replace(",", "."))
    except ValueError:
        return None

eksik = defaultdict(list)
besin_eksik = defaultdict(list)
for r in ham:
    # Aritmetik olarak belirli hücreler "eksik" değildir: karbonhidrat 0 ise
    # lif ve şeker 0'dır, yağ 0 ise doymuş ve trans yağ 0'dır. Birleştirme
    # betiği bunları zaten dolduruyor; listeye yazmak boşuna iş çıkarır.
    karb, yag = _sayi(r.get("carbohydrates")), _sayi(r.get("fat"))
    for s in list(KRITIK) + list(IKINCIL):
        if (r.get(s) or "").strip():
            continue
        if karb == 0 and s in ("fiber", "sugars"):
            continue
        if yag == 0 and s in ("saturatedFat", "transFat"):
            continue
        eksik[s].append(r["ad"].strip())
        besin_eksik[r["ad"].strip()].append(s)

kritik_besin = [r for r in ham
                if any(s in KRITIK for s in besin_eksik.get(r["ad"].strip(), []))]

y = []
A = y.append
A("# Yapılacaklar — tek kaynak (TürKomp) düzeni\n")
A("`python yapilacaklar_uret.py` üretiyor, elle düzenleme.\n")
A(f"Veritabanı: **{len(ham)} besin, tamamı TürKomp.** USDA kaydı yok.\n")

A("\n## Önce iki kural\n")
A("**1. Doğru sayfayı aç.** TürKomp'ta aynı besnin birçok yöresel çeşidi var")
A("(\"Ayran, yayık, Bursa\" ile \"ayran, tam yağlı\" farklı gıdalar, farklı")
A("değerler). Aşağıdaki tabloda her besnin **gıda kodu** yazılı — arama kutusuna")
A("o kodu yazarsan doğru sayfaya gidersin. Başka bir çeşidi yapıştırırsan")
A("veritabanındaki besinle tutmaz.\n")
A("**2. Karbonhidrat ve lifi AYRI AYRI yaz, toplama sen uğraşma.**")
A("TürKomp'un \"Karbonhidrat\" satırı LİF HARİÇTİR:")
A("`su + kül + protein + yağ + karbonhidrat + lif = 100`. Dokuz besinde kütle")
A("dengesiyle doğrulandı (ayva, bamya, brokoli, pırasa, ıspanak, Türk kahvesi,")
A("siyah çay, kuru fasulye, nohut) — lif eklenince toplam tam 100,00 çıkıyor.")
A("Birleştirme betiği lifi kendisi ekliyor, sen iki satırı olduğu gibi ver.\n")
A("**3. Yağ asidi veya şeker satırı sayfada yoksa, boş bırak — uydurma.**")
A("TürKomp yağ asidi dağılımını sadece yağlı besinlerde, şeker dağılımını")
A("sadece bazı besinlerde ölçüyor. Betik iki güvenli üst sınır uyguluyor:")
A("toplam yağ 1,5 g'ın altındaysa doymuş yağ = toplam yağ (aşılamaz sınır),")
A("ve şeker karbonhidrattan fazla çıkarsa karbonhidrata kırpılıyor.\n")

A("\n## 1) Kritik eksikler — önceliğin bu\n")
A("Bu dört değerden biri boşsa risk motoru besni **UYGUN sayamıyor**, otomatik")
A("DİKKAT'e çekip \"değerlendirme eksik\" diyor. Bilmediğimiz bir şeye güvenli")
A("diyemeyeceğimiz için böyle tasarlandı.\n")
A("| Sütun | TürKomp sayfasında hangi satır | Boş | Etkilediği hastalık |")
A("|---|---|---|---|")
for s, (nereden, hastalik) in KRITIK.items():
    if eksik[s]:
        A(f"| `{s}` | {nereden} | {len(eksik[s])} | {hastalik} |")
A("")
A(f"**{len(kritik_besin)} besin etkileniyor.** Tam liste, gıda koduyla birlikte:\n")
A("| # | Bizdeki ad | TürKomp'taki ad | Gıda kodu | Gereken |")
A("|---|---|---|---|---|")
for i, r in enumerate(sorted(kritik_besin, key=lambda x: x["ad"]), 1):
    ad = r["ad"].strip()
    ss = [KISA[s] for s in besin_eksik[ad] if s in KRITIK]
    A(f"| {i} | {ad} | {r.get('turkomp_adi','').strip()} | `{r.get('turkomp_url','').strip()}` | {', '.join(ss)} |")
A("")

A("\n## 2) İkincil — acelesi yok\n")
A("Boş kalırsa besin yanlış değerlendirilmez, sadece olası bir **fayda**")
A("görünmez. Kritik liste bitmeden buraya girme.\n")
A("| Sütun | Boş | Ne kaybediyoruz |")
A("|---|---|---|")
for s, (nereden, hastalik) in IKINCIL.items():
    if eksik[s]:
        A(f"| `{s}` | {len(eksik[s])} | {hastalik} |")
A("")
A("Not: lif boşsa net karbonhidrat yine doğru hesaplanıyor (lif 0 sayılıyor),")
A("sadece \"lif açısından zengin\" faydası görünmüyor. Et, balık, süt ürünü ve")
A("yağlarda zaten lif yoktur; o sayfalarda lif satırı hiç olmaz, normal.\n")

open("YAPILACAKLAR.md", "w", encoding="utf-8").write("\n".join(y))
print(f"Kritik eksiği olan besin: {len(kritik_besin)}/{len(ham)}")
for s in KRITIK:
    if eksik[s]:
        print(f"   {s:16s} {len(eksik[s]):>3}")
