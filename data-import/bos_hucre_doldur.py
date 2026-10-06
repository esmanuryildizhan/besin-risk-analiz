# -*- coding: utf-8 -*-
"""Yapıştırılan TürKomp sayfalarından mevcut besinlerin boş hücrelerini doldurur.
Sadece BOŞ hücreyi yazar, dolu olanı değiştirmez. kcal'i doğrulama için kullanır:
tutmazsa yanlış gıda sayfası demektir, uyarı basar ve o satıra dokunmaz.
sugars = Sakaroz + Glukoz + Fruktoz + Laktoz + Maltoz (sayfadaki satırların toplamı)
"""
import csv

# ad: (gıda kodu, sayfadaki kcal, şeker bileşenleri | None, FASAT | None, elaidik | None)
V = {
 "Ayva":                      ("09.01.0006",  60, [0.14,3.26,4.68], None, None),
 "Aşure":                     ("12.02.0130",  87, None, None, None),
 "Balkabağı":                 ("08.01.0024",  41, [3.77,1.57,1.06], None, None),
 "Bamya":                     ("08.01.0003",  48, [0.14,0.67,1.05], None, None),
 "Biber salçası":             ("08.02.0043", 112, [0,0,0,0,0], None, None),
 "Börülce (çiğ)":             ("08.01.0011",  49, [0.03,0.54,0.51], None, None),
 "Ceviz":                     ("09.01.0010", 679, None, 6.432, 0.000),
 "Dereotu":                   ("08.01.0013",  46, [0.07,0.25,0.16], None, None),
 "Ebegümeci":                 ("08.01.0016",  49, [0.15,0.16,0.07], None, None),
 "Enginar":                   ("08.01.0017",  32, [0,1.00,1.72], None, None),
 "Eritme peyniri":            ("01.02.0024", 265, None, 15.267, None),
 "Kabak (sakız)":             ("08.01.0027",  18, [0.01,1.07,1.00], None, None),
 "Kazandibi":                 ("12.02.0138", 165, [16.10,0,0,2.98], None, None),
 "Kestane (çiğ)":             ("09.01.0025", 176, [3.21,1.56,1.31,0,2.41], None, None),
 "Keçiboynuzu":               ("09.02.0032", 293, [16.40,8.96,11.47,0,0.06], None, None),
 "Kuru domates":              ("08.02.0001", 210, [0.04,5.04,8.58], None, None),
 "Kuru dut":                  ("09.02.0015", 336, [0,18.95,19.25], None, None),
 "Kuru incir":                ("12.02.0082", 298, [0,27.81,24.99], None, None),
 "Kuru patlıcan":             ("08.02.0006", 263, [2.83,4.54,4.11,0,0.37], None, None),
 "Kuru soğan":                ("08.01.0066",  40, [0.63,2.52,2.52], None, None),
 "Kuru üzüm":                 ("09.02.0044", 312, [0.12,16.31,16.14], None, None),
 "Köfte (çiğ)":               ("03.02.0010", 193, None, 6.159, None),
 "Lokum":                     ("12.02.0143", 359, [24.95,20.92,20.41], None, None),
 "Maraş dondurması":          ("12.02.0118", 176, None, 2.030, 0.043),
 "Maydanoz":                  ("08.01.0045",  37, [0,0.57,0.21], None, None),
 "Nane":                      ("08.01.0047",  41, [0.04,0.17,0.08], None, None),
 "Nar":                       ("09.01.0039",  61, [0.01,4.21,4.08], None, None),
 "Pastırma":                  ("12.02.0065", 252, None, 5.990, 0.206),
 "Peynirli börek":            ("06.02.0040", 288, None, 4.218, None),
 "Pirinç":                    ("06.02.0003", 341, [0,0,0,0,0], None, None),
 "Roka":                      ("08.01.0057",  26, [0.02,0.15,0.08], None, None),
 "Sarımsak":                  ("08.01.0067", 129, [0.46,0.42,0.78], None, None),
 "Semizotu":                  ("08.01.0059",  22, [0.01,0.13,0.09], None, None),
 "Siyah zeytin (salamura)":   ("09.02.0053", 135, None, 1.699, 0.000),
 "Tahin helvası":             ("12.02.0124", 533, None, 4.430, 0.000),
 "Taze bakla":                ("08.01.0002",  47, [0,1.44,0.48], None, None),
 "Vişne":                     ("09.01.0065",  61, [0.02,8.14,4.68], None, None),
 "Yaban mersini":             ("09.01.0057",  44, [0.01,2.78,2.88], None, None),
 "Yeşil mercimek (kuru)":     ("07.02.0002", 299, [1.37,0.34,0.37], None, None),
 "Çam fıstığı":               ("07.02.0008", 675, [2.06,0.15,0.16], 6.781, 0.000),
 "İncir":                     ("09.01.0022",  70, [0,5.87,5.60], None, None),
}

yol = "turkomp_besinler.csv"
rows = list(csv.DictReader(open(yol, encoding="utf-8-sig")))
alanlar = list(rows[0].keys())
indeks = {r["ad"].strip(): r for r in rows if (r.get("ad") or "").strip()}

yazilan, uyari, atlanan = [], [], []
for ad, (kod, kcal, seker, fasat, trans) in V.items():
    r = indeks.get(ad)
    if r is None:
        uyari.append(f"{ad}: veritabanında böyle bir besin yok")
        continue
    if (r.get("turkomp_url") or "").strip() != kod:
        uyari.append(f"{ad}: gıda kodu tutmuyor (bizde {r.get('turkomp_url')}, sayfada {kod}) — DOKUNULMADI")
        continue
    try:
        bizdeki = float((r.get("kcal") or "").replace(",", "."))
    except ValueError:
        bizdeki = None
    if bizdeki is not None and abs(bizdeki - kcal) > 1:
        uyari.append(f"{ad}: kcal tutmuyor (bizde {bizdeki:.0f}, sayfada {kcal}) — DOKUNULMADI")
        continue

    for alan, deger in (("sugars", None if seker is None else round(sum(seker), 3)),
                        ("saturatedFat", fasat),
                        ("transFat", trans)):
        if deger is None:
            continue
        if (r.get(alan) or "").strip():
            atlanan.append(f"{ad}.{alan} zaten dolu ({r[alan]})")
        else:
            r[alan] = str(deger)
            yazilan.append(f"{ad}.{alan} = {deger}")

with open(yol, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=alanlar)
    w.writeheader()
    w.writerows(rows)

print(f"{len(yazilan)} hücre dolduruldu, {len(atlanan)} zaten doluydu.")
if uyari:
    print("\nUYARILAR:")
    for u in uyari:
        print("  !", u)
