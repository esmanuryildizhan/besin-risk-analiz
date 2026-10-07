# Hastalık kurallarının kaynakları

Bu dosya `prisma/hastalik_kurallari.js` dosyasından otomatik üretilir
(`node belge_uret.js`). Elle düzenleme — kuralı değiştirip yeniden üret.

Üretim tarihi: 2026-10-07

## Nasıl okunmalı

Her eşiğin yanında iki bilgi var:

- **Kaynak** — sayının geldiği makale/kılavuz.
- **Neden bu sayı** — sayının makalede nerede geçtiği ve, eğer makale GÜNLÜK bir
  sınır veriyorsa, onu porsiyona çevirirken yaptığımız varsayım.

Bu ayrım önemli: "100 g'da 22,5 g şeker" doğrudan kılavuzda yazan bir sayıdır.
"Porsiyonda 800 mg potasyum" ise günlük 2500 mg'ı 3 öğüne bölerek BİZİM
ürettiğimiz bir sayıdır. İkincisi tartışmaya açıktır ve öyle işaretlenmiştir.

Ayrıca bazı kurallarda **muafiyet** var: kural eşiği aşsa bile, başka bir
kaynağın açık önerisi yüzünden uyarı verilmiyor. Her muafiyetin gerekçesi
kuralın "Neden bu sayı" notunda yazılı.

---

## 🩸 Diyabet (Tip 1 / Tip 2)

Şeker, net karbonhidrat ve lif içeriğine göre değerlendirilir. Evert 2019 uzlaşı raporu "herkese uyan ideal bir karbonhidrat yüzdesi yoktur" diyor; bu yüzden aşağıdaki sınırlar bir yasak değil, porsiyonu ne kadar dikkatli tutmanız gerektiğinin göstergesidir. Doymuş yağ için ayrı kural yazmadık: Evert 2019 doymuş yağı tek besin üzerinden değil, günlük beslenmenin %10’u üzerinden sınırlıyor ve bunu kalp-damar riski başlığı altında ele alıyor — o kurallar "Yüksek kolesterol" bölümünde.

### 🔴 RİSKLİ — `şeker > 22,5 g` (100 g başına)

> 100 gramında {deger} g şeker var — "yüksek şekerli" sayılan 22,5 g sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🔴 RİSKLİ — `şeker > 27 g` (porsiyon başına)

> Bir porsiyonunda {deger} g şeker var — porsiyon başına yüksek sınırın (27 g) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — porsiyon başına "yüksek (kırmızı)" sınırı. Kılavuzun kendi kuralı gereği yalnızca porsiyonu 100 g’dan büyük besinlerde uygulanır.

**Muaf:** porsiyonu 100 g'dan küçük besinler (FSA Annex 3, s.19 kendi kuralı).

### 🔴 RİSKLİ — `net karbonhidrat ≥ 45 g` (porsiyon başına)

> Bir porsiyonunda {deger} g net karbonhidrat var — tek başına bir öğünlük karbonhidrat (yaklaşık 3 değişim).

**Kaynak:** Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.

**Neden bu sayı:** Amorim 2024, s.3: 1 karbonhidrat değişimi = 10-15 g; "45 g karbonhidrat içeren bir porsiyon" bir öğünlük örnek olarak veriliyor (3 değişim). ÇEVRİM: makalede "45 g riskli" yazmıyor; biz bunu "tek besinden bir öğünlük karbonhidrat" eşiği olarak kullandık.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🟡 DİKKAT — `glisemik yük ≥ 20` (porsiyon başına)

> Bir porsiyonunun glisemik yükü {deger} — Venn & Green sınıflamasında "yüksek" (20 ve üstü).

**Kaynak:** Venn BJ, Green TJ. Glycemic index and glycemic load: measurement issues and their effect on diet-disease relationships. Eur J Clin Nutr. 2007;61(Suppl 1):S122-S131.

**Neden bu sayı:** Venn & Green 2007, s.S125: glisemik yük sınıflaması — düşük ≤10, orta 10-20, YÜKSEK ≥20. Burada glisemik yük TAHMİN EDİLMİYOR, hesaplanıyor: glisemik indeks × porsiyondaki net karbonhidrat / 100. Glisemik indeks TürKomp’un ölçtüğü değer. ÇEVRİM YOK: eşik de (20), formül de doğrudan makaleden. MUAFİYET: Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları ve sebzeleri diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal başına ≥14 g) karşılayan besinlerde bu uyarı verilmiyor.

**Muaf:** lif yoğunluğu 1000 kcal başına 14 g ve üstü olan besinler.

### 🟡 DİKKAT — `net karbonhidrat ≥ 20 g` (porsiyon başına)

> Bir porsiyonunda {deger} g net karbonhidrat var — karbonhidrat sayımında bu miktardaki fark kan şekerinde dalgalanma yapabiliyor; porsiyonu küçük tutun.

**Kaynak:** Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.

**Neden bu sayı:** Amorim 2024, s.4: öğündeki karbonhidrat miktarı 20 g’ı aşan bir farkla yanlış sayıldığında öğün sonrası kan şekerinde belirgin dalgalanma oluyor (Smart ve ark. çalışmasına dayanarak). Eşik doğrudan bu sayıdan geliyor ve ölçtüğümüz şeyle aynı birimde: porsiyondaki karbonhidrat gramı. ÇEVRİM YOK. DESTEKLEYİCİ: Venn & Green 2007 (s.S125) glisemik yükü ≥20 "yüksek" sayıyor; glisemik yük = glisemik indeks × kullanılabilir karbonhidrat / 100 ve glisemik indeks en fazla ~100 olabileceği için, porsiyonu 20 g’ın ALTINDA kalan bir besnin glisemik yükü "yüksek" çıkamaz. Bu çıkarım tek yönlü: 20 g’ı geçmek glisemik yükün yüksek olduğunu KANITLAMAZ, yalnızca elenemediğini gösterir — bu yüzden seviye RİSKLİ değil DİKKAT ve besnin gerçek glisemik indeksi girildiğinde bu kural devre dışı kalıp yerini ölçülmüş glisemik yük kuralına bırakıyor. MUAFİYET: Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları ve sebzeleri diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal başına ≥14 g) karşılayan besinlerde bu uyarı verilmiyor.

**Muaf:** lif yoğunluğu 1000 kcal başına 14 g ve üstü olan besinler; glisemik indeksi ölçülmüş besinler (o zaman glisemik yük kuralı devreye girer).

### 🟡 DİKKAT — `şeker > 5 g` (100 g başına)

> 100 gramında {deger} g şeker var; "az şekerli" sınırının (5 g) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — "düşük (yeşil)" şeker sınırı 5 g/100 g. Bunun üstü artık az şekerli sayılmıyor. Ayrıca WHO eklenmiş şeker için günlük enerjinin %10’unun (koşullu olarak %5) altını öneriyor (Warshaw 2021, s.46).

### 🟡 DİKKAT — `sodyum > 600 mg` (100 g başına)

> 100 gramında {deger} mg sodyum var — FSA’ya göre "yüksek tuzlu" (1,5 g tuz) sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok. Tuz 1,5 g/100 g = sodyum 600 mg/100 g (tuz = sodyum × 2,5). Evert 2019 (s.743) ve Özer 2019 (Tablo 3, s.10): diyabetli bireyler için günlük sodyum hedefi genel nüfusla aynı, 2300 mg.

### 🟡 DİKKAT — kategori: Hazır Gıda

> Ultra-işlenmiş hazır gıda (NOVA Grup 4): şeker, yağ ve tuz içeriği markaya ve tarife göre çok değişir, etiketi kontrol edin.

**Kaynak:** Monteiro CA, Cannon G, Lawrence M, Louzada MLC, Machado PP. Ultra-processed foods, diet quality, and health using the NOVA classification system. FAO, Roma, 2019.

**Neden bu sayı:** FAO/NOVA sınıflaması, Grup 4 (ultra-işlenmiş gıdalar), s.13: hazır yemekler, nugget/köfte türü yeniden yapılandırılmış ürünler, paketli hamur işleri bu gruba girer; şeker, yağ ve tuz içerikleri markaya ve tarife göre büyük ölçüde değişir.

### 🟢 ÖNERİLİR — `lif yoğunluğu ≥ 14 g/1000 kcal` (100 g başına)

> Lif yoğunluğu yüksek (1000 kcal başına {deger} g); rehberin önerdiği 14 g sınırının üstünde.

**Kaynak:** Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.

**Neden bu sayı:** Evert 2019, s.736: "en az 1000 kcal başına 14 g lif". Çevrim yok — kuralı rehberdeki haliyle (kalori başına) uyguluyoruz. Mutlak gram yerine yoğunluk kullanmak, az kalorili sebzelerin haksız yere "lifsiz" görünmesini engelliyor.

---

## 🩸 İnsülin direnci / prediyabet

Evert 2019 uzlaşı raporu diyabet ve PREDİYABET için aynı beslenme ilkelerini veriyor; bu yüzden kurallar diyabetle aynı kaynaklara dayanıyor.

### 🔴 RİSKLİ — `şeker > 22,5 g` (100 g başına)

> 100 gramında {deger} g şeker var — "yüksek şekerli" sınırın üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🔴 RİSKLİ — `net karbonhidrat ≥ 45 g` (porsiyon başına)

> Bir porsiyonunda {deger} g net karbonhidrat var — tek başına bir öğünlük karbonhidrat.

**Kaynak:** Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.

**Neden bu sayı:** Amorim 2024, s.3 (45 g = yaklaşık 3 karbonhidrat değişimi = bir öğünlük). ÇEVRİM bize ait.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🟡 DİKKAT — `glisemik yük ≥ 20` (porsiyon başına)

> Bir porsiyonunun glisemik yükü {deger} — Venn & Green sınıflamasında "yüksek" (20 ve üstü).

**Kaynak:** Venn BJ, Green TJ. Glycemic index and glycemic load: measurement issues and their effect on diet-disease relationships. Eur J Clin Nutr. 2007;61(Suppl 1):S122-S131.

**Neden bu sayı:** Venn & Green 2007, s.S125: glisemik yük sınıflaması — düşük ≤10, orta 10-20, YÜKSEK ≥20. Burada glisemik yük TAHMİN EDİLMİYOR, hesaplanıyor: glisemik indeks × porsiyondaki net karbonhidrat / 100. Glisemik indeks TürKomp’un ölçtüğü değer. ÇEVRİM YOK: eşik de (20), formül de doğrudan makaleden. MUAFİYET: Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları ve sebzeleri diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal başına ≥14 g) karşılayan besinlerde bu uyarı verilmiyor.

**Muaf:** lif yoğunluğu 1000 kcal başına 14 g ve üstü olan besinler.

### 🟡 DİKKAT — `net karbonhidrat ≥ 20 g` (porsiyon başına)

> Bir porsiyonunda {deger} g net karbonhidrat var; protein veya yağ içeren bir besinle birlikte tüketmek kan şekerinin yükselişini yavaşlatır.

**Kaynak:** Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.

**Neden bu sayı:** Amorim 2024, s.4: öğünde 20 g’ı aşan karbonhidrat farkı öğün sonrası kan şekerinde dalgalanma yaratıyor (Smart ve ark.). Eşik ölçtüğümüz şeyle aynı birimde, çevrim yok. DESTEKLEYİCİ: Venn & Green 2007 (s.S125) — 20 g’ın altındaki bir porsiyonun glisemik yükü "yüksek" çıkamaz; ama tersi geçerli değil, o yüzden seviye DİKKAT. Lif yoğunluğu ≥14 g/1000 kcal olan besinler muaf (Evert 2019, s.736).

**Muaf:** lif yoğunluğu 1000 kcal başına 14 g ve üstü olan besinler; glisemik indeksi ölçülmüş besinler (o zaman glisemik yük kuralı devreye girer).

### 🟡 DİKKAT — `şeker > 5 g` (100 g başına)

> 100 gramında {deger} g şeker var.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA "düşük şeker" sınırı 5 g/100 g (Annex 3, Tablo 2, s.19).

### 🟡 DİKKAT — kategori: Hazır Gıda

> Ultra-işlenmiş hazır gıda: içeriği markaya göre değişir, etiketi kontrol edin.

**Kaynak:** Monteiro CA, Cannon G, Lawrence M, Louzada MLC, Machado PP. Ultra-processed foods, diet quality, and health using the NOVA classification system. FAO, Roma, 2019.

**Neden bu sayı:** FAO/NOVA Grup 4, s.13.

### 🟢 ÖNERİLİR — `lif yoğunluğu ≥ 14 g/1000 kcal` (100 g başına)

> Lif yoğunluğu yüksek (1000 kcal başına {deger} g); rehberin önerdiği 14 g sınırının üstünde.

**Kaynak:** Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.

**Neden bu sayı:** Evert 2019, s.736: "en az 1000 kcal başına 14 g lif". Çevrim yok — kuralı rehberdeki haliyle (kalori başına) uyguluyoruz. Mutlak gram yerine yoğunluk kullanmak, az kalorili sebzelerin haksız yere "lifsiz" görünmesini engelliyor.

---

## 💓 Hipertansiyon (yüksek tansiyon)

Sodyum (tuz) ve potasyum dengesine göre değerlendirilir. DASH çalışmasında düşük sodyumlu DASH diyeti, yüksek sodyumlu tipik diyete göre sistolik tansiyonu hipertansiyonu olanlarda 11,5 mmHg düşürmüştü (Sacks 2001).

### 🔴 RİSKLİ — `sodyum > 600 mg` (100 g başına)

> 100 gramında {deger} mg sodyum var — FSA’ya göre "yüksek tuzlu" (1,5 g tuz) sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok. Tuz 1,5 g/100 g = sodyum 600 mg/100 g (tuz = sodyum × 2,5).

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🔴 RİSKLİ — `sodyum > 720 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg sodyum var — FSA’nın porsiyon başına yüksek sınırının (720 mg) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — porsiyon başına "yüksek (kırmızı)" sınırı. Kılavuzun kendi kuralı gereği yalnızca porsiyonu 100 g’dan büyük besinlerde uygulanır. Tuz 1,8 g/porsiyon = sodyum 720 mg/porsiyon.

**Muaf:** porsiyonu 100 g'dan küçük besinler (FSA Annex 3, s.19 kendi kuralı).

### 🟡 DİKKAT — `sodyum > 120 mg` (100 g başına)

> 100 gramında {deger} mg sodyum var; "az tuzlu" sayılan sınırın (120 mg) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — "düşük (yeşil)" sınırı 0,3 g tuz/100 g = 120 mg sodyum. Bunun üstü artık düşük sayılmıyor.

### 🟢 ÖNERİLİR — `potasyum ≥ 351 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg potasyum var; günlük 3510 mg hedefin onda birinden fazlası, tansiyon kontrolüne katkı sağlar.

**Kaynak:** Aburto NJ, Hanson S, Gutierrez H ve ark. Effect of increased potassium intake on cardiovascular risk factors and disease: systematic review and meta-analyses. BMJ. 2013;346:f1378.

**Neden bu sayı:** Aburto 2013 (BMJ 346:f1378): günde 90-120 mmol (3510-4680 mg) potasyum alımı hipertansiflerde sistolik tansiyonu 7,16 mmHg düşürüyor; fayda için en az 90 mmol (3510 mg/gün) gerekiyor. Aynı hedefi WHO da veriyor (Salman 2024, Tablo 2: 3,51 g/gün). ÇEVRİM: 3510 mg/gün hedefin %10’unu (351 mg) tek porsiyonda veren besini "potasyumdan zengin" saydık — %10 sınırı bizim kararımız.

---

## 🫀 Yüksek kolesterol (dislipidemi)

Doymuş yağ ve trans yağ içeriğine bakılır. Academy of Nutrition and Dietetics 2023 kılavuzunun en güçlü önerisi (GRADE 1B) doymuş yağı AZALTMAK değil, ÇOKLU DOYMAMIŞ yağla DEĞİŞTİRMEK; yani yağı tamamen kesmek yerine kaynağını değiştirmek. Besindeki kolesterol için kural yazmadık: Soliman 2018, besinle alınan kolesterolün kan kolesterolüne etkisine dair kanıtın yetersiz olduğunu gösteriyor.

### 🟡 DİKKAT — `trans yağ ≥ 0,5 g` (porsiyon başına)

> Bir porsiyonunda en az {deger} g trans yağ var; WHO’nun günlük sınırının (≈2,2 g) dörtte birinden fazlası. Değer elaidik asit ölçümü olduğu için gerçek miktar daha yüksek olabilir.

**Kaynak:** World Health Organization. Saturated fatty acid and trans-fatty acid intake for adults and children: WHO guideline. Cenevre: WHO; 2023.

**Neden bu sayı:** WHO 2023 kılavuzu, Öneri 1 (güçlü öneri): trans yağ alımı toplam enerjinin %1’ine düşürülmeli; kılavuz kapsamın "geviş getirenlerden mi geldiği yoksa sanayide mi üretildiğine bakılmaksızın" tüm trans yağ asitleri olduğunu açıkça yazıyor. Aynı sınır WHO Bilimsel Güncellemesi’nde de var (Uauy 2009, s.S73). ÇEVRİM: 2000 kcal’lik bir günde %1 = 20 kcal ≈ 2,2 g trans yağ; tek porsiyonda 0,5 g bu günlük payın yaklaşık dörtte biri demek — bölme işlemi BİZE AİT. ÖLÇÜM UYARISI: TürKomp toplam trans yağı değil yalnızca ELAİDİK ASİDİ raporluyor, yani değerimiz ALT SINIR. Bu yüzden kuralın tetiklenmesi sağlam (elaidik asit 0,5 g’ı geçtiyse toplam trans yağ da geçmiştir), ama tetiklenmemesi besnin temiz olduğunu KANITLAMAZ. SEVİYE GEREKÇESİ: de Souza 2015 (BMJ 351:h3978) kalp hastalığı riskini yalnızca SANAYİ kaynaklı trans yağda buluyor (toplam kalp hastalığı RR 1,42; 1,05-1,92), hayvansal kaynaklıda bulamıyor (RR 0,93; 0,73-1,18). TürKomp’un tek sayısından kaynağı ayırt edemediğimiz için seviye RİSKLİ değil DİKKAT.

### 🔴 RİSKLİ — `doymuş yağ > 5 g` (100 g başına)

> 100 gramında {deger} g doymuş yağ var — "yüksek" sayılan 5 g sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok. MUAFİYET: Johnson 2023 kılavuzunda doymuş yağı azaltma önerisi zayıf (GRADE 2), doymamış yağla değiştirme önerisi güçlü (GRADE 1). Yağının en az %70’i doymamış olan besinler (zeytinyağı, ceviz, balık) kılavuzun tavsiye ettiği "değiştirme" seçeneğinin kendisi olduğu için en yüksek risk seviyesine çıkarılmıyor; yalnızca 1,5 g/100 g DİKKAT uyarısı alıyorlar. %70 sınırı bize ait.

**Muaf:** yağının %70'i ve fazlası doymamış olan besinler.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🔴 RİSKLİ — `doymuş yağ > 6 g` (porsiyon başına)

> Bir porsiyonunda {deger} g doymuş yağ var — porsiyon başına yüksek sınırın (6 g) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — porsiyon başına "yüksek (kırmızı)" sınırı. Kılavuzun kendi kuralı gereği yalnızca porsiyonu 100 g’dan büyük besinlerde uygulanır. Yağının %70’inden fazlası doymamış olan besinler muaf (bkz. üstteki kural).

**Muaf:** yağının %70'i ve fazlası doymamış olan besinler; porsiyonu 100 g'dan küçük besinler (FSA Annex 3, s.19 kendi kuralı).

### 🟡 DİKKAT — `doymuş yağ enerji oranı ≥ 10 %` (100 g başına)

> Kalorisinin %{deger}’i doymuş yağdan geliyor; rehberin günlük %10 hedefinin üstünde.

**Kaynak:** Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.

**Neden bu sayı:** Evert 2019, s.744 (ABD Beslenme Kılavuzu’na dayanarak): doymuş yağ günlük kalorinin %10’unun altında olmalı. ÇEVRİM: günlük oranı tek besine uyguladık — kalorisinin %10’undan fazlası doymuş yağdan gelen besin, bu hedefi tek başına zorlar. Kalorisi 50 kcal’ın altındaki besinlerde oran anlamsızlaştığı için hesaplanmıyor.

### 🟡 DİKKAT — `doymuş yağ > 1,5 g` (100 g başına)

> 100 gramında {deger} g doymuş yağ var; "az doymuş yağlı" sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — "düşük" doymuş yağ sınırı 1,5 g/100 g.

### 🟢 ÖNERİLİR — `epaDhaMgMin ≥ 40` (100 g başına)

> Omega-3 kaynağı: AB ölçütünün iki koşulunu da karşılıyor (düşük olan değer {deger} mg). Tüzük (116/2010) 100 g’da VE 100 kcal’de en az 40 mg EPA+DHA istiyor.

**Kaynak:** Commission Regulation (EU) No 116/2010 of 9 February 2010 amending Regulation (EC) No 1924/2006 of the European Parliament and of the Council with regard to the list of nutrition claims. Ek (Annex).

**Neden bu sayı:** AB Tüzüğü 116/2010, Ek: bir ürün "omega-3 kaynağı" sayılabilmek için 100 g’ında VE 100 kcal’inde en az 40 mg EPA+DHA taşımalı. Eşik DOĞRUDAN tüzükten, ÇEVRİM YOK. Tüzüğün "ve" bağlacı motorda epaDhaMgMin ile korunuyor: 100 g ve 100 kcal değerlerinin KÜÇÜĞÜ alınıyor, böylece tek eşik iki koşul demek oluyor. DESTEKLEYİCİ: EFSA 2010 DRV, yetişkinde EPA+DHA yeterli alım 250 mg/gün (genel kalp-damar sağlığının korunması için). NOT: Bu kural bir BESTEKİ MİKTAR beyanıdır — "bu besin anlamlı miktarda EPA+DHA taşıyor" der; "kolesterolü düşürür" demez.

### 🟢 ÖNERİLİR — `doymamış yağ oranı ≥ 70 %` (100 g başına)

> Yağının %{deger}’i doymamış yağ; kılavuzların en güçlü önerisi doymuş yağı bu tür yağlarla değiştirmek.

**Kaynak:** Johnson SA, Kirkpatrick CF, Miller NH ve ark. Saturated Fat Intake and the Prevention and Management of Cardiovascular Disease in Adults: An Academy of Nutrition and Dietetics Evidence-Based Nutrition Practice Guideline. J Acad Nutr Diet. 2023.

**Neden bu sayı:** Johnson 2023 (Academy of Nutrition and Dietetics kılavuzu), Tablo: "doymuş yağı ÇOKLU DOYMAMIŞ yağla değiştirin" önerisi GRADE 1 (güçlü); doymuş yağı sadece azaltma önerisi ise GRADE 2 (zayıf). Evert 2019 (s.744) da zeytinyağı ve kuruyemişteki tekli doymamış yağların kalp-damar risk göstergelerini iyileştirdiğini aktarıyor. ÇEVRİM: "yağının en az %70’i doymamış" sınırı bize ait; makalelerde böyle bir yüzde sınırı verilmiyor.

### 🟢 ÖNERİLİR — `lif yoğunluğu ≥ 14 g/1000 kcal` (100 g başına)

> Lif yoğunluğu yüksek (1000 kcal başına {deger} g); rehberin önerdiği 14 g sınırının üstünde.

**Kaynak:** Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.

**Neden bu sayı:** Evert 2019, s.736: "en az 1000 kcal başına 14 g lif". Çevrim yok — kuralı rehberdeki haliyle (kalori başına) uyguluyoruz. Mutlak gram yerine yoğunluk kullanmak, az kalorili sebzelerin haksız yere "lifsiz" görünmesini engelliyor.

---

## 🩸 Demir eksikliği (kansızlık)

Demir içeriğinin yanında demirin EMİLİMİNİ etkileyen öğelere de bakılır. Etin/balığın hem demiri %15-35 oranında emilirken, bitkisel demirin emilimi çoğu zaman %10’un altında kalır (Pişkin 2022).

### 🟢 ÖNERİLİR — `demir ≥ 3,2 mg` (porsiyon başına)

> Bir porsiyonu {deger} mg demir veriyor — günlük ihtiyacın (16 mg) beşte birinden fazlası.

**Kaynak:** EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for iron. EFSA Journal. 2015;13(10):4254.

**Neden bu sayı:** EFSA 2015 (EFSA Journal 13(10):4254, özet s.1): demir için günlük referans alım (PRI) premenopozal kadınlarda 16 mg, erkeklerde ve menopoz sonrası kadınlarda 11 mg. ÇEVRİM: 16 mg’ın %20’si = 3,2 mg. "%20’si zengin sayılır" kararı bize ait.

### 🟢 ÖNERİLİR — `demir ≥ 1,6 mg` (porsiyon başına)

> Bir porsiyonu {deger} mg demir veriyor; günlük ihtiyacın onda birinden fazlası.

**Kaynak:** EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for iron. EFSA Journal. 2015;13(10):4254.

**Neden bu sayı:** EFSA 2015 (EFSA Journal 13(10):4254, özet s.1): demir için günlük referans alım (PRI) premenopozal kadında 16 mg/gün. ÇEVRİM: bu değerin %10’unu (1,6 mg) "kayda değer demir kaynağı" sınırı saydık — %10 kararı BİZE AİT. NOT: aynı sayı kansizlik/0 kuralında da kullanılıyor; konum atfı iki kuralda ayrı ayrı yazılı ki tek bir kuralın notunu okuyan da kaynağı bulabilsin.

### 🟢 ÖNERİLİR — kategori: Et-Balık

> Hayvansal kaynak: içerdiği hem demiri, bitkisel demire göre çok daha iyi emilir.

**Kaynak:** Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.

**Neden bu sayı:** Pişkin 2022, s.20442: hem demiri yalnızca hayvansal ürünlerde bulunur, emilim oranı %15-35; etteki demirin %30-70’i hem formundadır. Bitkisel demirin emilimi çoğu zaman %10’un altındadır.

### 🟢 ÖNERİLİR — `C vitamini ≥ 40 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg C vitamini var; demirli besinlerle aynı öğünde yenirse demir emilimini artırır.

**Kaynak:** Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.

**Neden bu sayı:** Pişkin 2022, s.20449: öğün başına 42,5 mg ve 85 mg askorbik asitin demir emilimini artırdığı çalışmalar aktarılıyor; askorbik asit fitat ve polifenollerin engelleyici etkisini de kısmen geri çeviriyor. ÇEVRİM: çalışmalardaki en düşük etkili doz olan 42,5 mg’ı 40 mg’a yuvarladık.

### 🟡 DİKKAT — `kafein ≥ 1 mg` (100 g başına)

> 100 g’ında {deger} mg kafein var; kafein ve beraberindeki polifenoller demir emilimini azaltır — demirli öğünlerden 1-2 saat ayrı tüketin.

**Kaynak:** Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.

**Neden bu sayı:** Pişkin 2022, s.20447: çay ve kahvedeki polifenoller demir emilimini doza bağlı olarak azaltıyor (50 mg polifenol %18, 200 mg %45). Kafeini burada "çay/kahve içeriyor" göstergesi olarak kullanıyoruz, çünkü veri tabanımızda polifenol değeri yok.

### 🟡 DİKKAT — `kalsiyum ≥ 100 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg kalsiyum var; aynı öğündeki demirin emilimini %18-27 azaltabilir.

**Kaynak:** Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.

**Neden bu sayı:** Pişkin 2022, s.20449: öğüne eklenen 100-200 mg kalsiyum demir emilimini %18-27 azaltıyor. Eşik doğrudan çalışmadaki en düşük etkili doz (100 mg/öğün).

---

## 🫘 Kronik böbrek hastalığı

Potasyum, fosfor ve sodyum içeriğine göre değerlendirilir. DİKKAT: hedef değerler hastalığın evresine ve kan değerlerinize göre çok değişir — erken evrede potasyum kısıtlaması genellikle GEREKMEZ (Cupisti 2018). Mutlaka hekiminize/diyetisyeninize danışın.

### 🔴 RİSKLİ — `potasyum ≥ 800 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg potasyum var — potasyum kısıtlaması olan bir hastada tek başına bir öğünlük pay.

**Kaynak:** Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.

**Neden bu sayı:** Beto & Bansal 2004, Tablo 3, s.406: hemodiyaliz hastasında günlük potasyum 2000-3000 mg. Cupisti 2018 (Tablo 1) da hiperkalemi eğilimi olanlarda <3000 mg/gün diyor. ÇEVRİM: günde 3 ana öğün varsayımıyla öğün başına pay ≈ 2500/3 ≈ 830 mg; 800 mg’a yuvarladık. Öğün sayısı varsayımı bize ait.

### 🟡 DİKKAT — `potasyum ≥ 400 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg potasyum var; potasyum kısıtlamanız varsa porsiyonu küçültün.

**Kaynak:** Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.

**Neden bu sayı:** Beto & Bansal 2004, Tablo 3, s.406 (2000-3000 mg/gün). ÇEVRİM: öğün payının yaklaşık yarısı. Kuru baklagiller, kuruyemiş, kurutulmuş meyve-sebze, patates, koyu yeşil yapraklılar, muz ve pekmez yüksek potasyumlu grupta sayılıyor (Yıldız 2008, s.11).

### 🔴 RİSKLİ — `fosfor ≥ 450 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg fosfor var — günlük 800-1000 mg sınırının yarısına yakın.

**Kaynak:** Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.

**Neden bu sayı:** Beto & Bansal 2004, Tablo 3, s.406: diyaliz hastasında günlük fosfor 800-1000 mg. Vervloet 2017 (s.34) bir çalışmada 800 mg/gün kısıtlama uygulandığını aktarıyor. ÇEVRİM: 900/3 ≈ 300 mg öğün payı; 450 mg bunun 1,5 katı.

### 🟡 DİKKAT — `fosfor ≥ 300 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg fosfor var; günlük payınızın üçte birine yakın.

**Kaynak:** Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.

**Neden bu sayı:** Beto & Bansal 2004, Tablo 3, s.406 (800-1000 mg/gün). ÇEVRİM: 3 öğüne bölündü ≈ 300 mg. Not: Vervloet 2017 (s.33-34) bitkisel fosforun (fitat formunda) hayvansal fosfora göre daha az emildiğini, en kötüsünün katkı maddesi olarak eklenen inorganik fosfat olduğunu belirtiyor — veri tabanımız bu ayrımı yapamıyor.

### 🔴 RİSKLİ — `sodyum > 600 mg` (100 g başına)

> 100 gramında {deger} mg sodyum var — FSA’ya göre "yüksek tuzlu" (1,5 g tuz) sınırının üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok. Tuz 1,5 g/100 g = sodyum 600 mg/100 g (tuz = sodyum × 2,5). Böbrek hastalığında günlük sodyum hedefi 2000 mg’dır (Beto & Bansal 2004, Tablo 3, s.406) — genel nüfus hedefinden daha sıkı.

**Kritik:** bu değer besinde ölçülmemişse besin "uygun" sayılmaz, DİKKAT verilir.

### 🔴 RİSKLİ — `sodyum > 720 mg` (porsiyon başına)

> Bir porsiyonunda {deger} mg sodyum var — FSA’nın porsiyon başına yüksek sınırının (720 mg) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — porsiyon başına "yüksek (kırmızı)" sınırı. Kılavuzun kendi kuralı gereği yalnızca porsiyonu 100 g’dan büyük besinlerde uygulanır. Tuz 1,8 g/porsiyon = sodyum 720 mg/porsiyon. Böbrek hastalığında günlük sodyum hedefi 2000 mg’dır (Beto & Bansal 2004, Tablo 3, s.406) — genel nüfus hedefinden daha sıkı.

**Muaf:** porsiyonu 100 g'dan küçük besinler (FSA Annex 3, s.19 kendi kuralı).

### 🟡 DİKKAT — `sodyum > 120 mg` (100 g başına)

> 100 gramında {deger} mg sodyum var; "az tuzlu" sayılan sınırın (120 mg) üstünde.

**Kaynak:** Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

**Neden bu sayı:** FSA Annex 3, Tablo 2, s.19 — "düşük (yeşil)" sınırı 0,3 g tuz/100 g = 120 mg sodyum. Bunun üstü artık düşük sayılmıyor. Böbrek hastalığında günlük sodyum hedefi 2000 mg’dır (Beto & Bansal 2004, Tablo 3, s.406) — genel nüfus hedefinden daha sıkı.

---

## 🔥 Reflü (GÖRH)

ÖNEMLİ: "Reflüyü tetikleyen besinler" listeleri büyük ölçüde anekdota dayanıyor, sağlam kanıtı yok (Bucan 2025, s.19). ACG 2022 kılavuzu herkese aynı yasağı koymak yerine KİŞİSELLEŞTİRİLMİŞ yaklaşım öneriyor: sadece sizde gerçekten şikâyet yapan besinleri kısıtlayın. Bu yüzden burada hiçbir besini "riskli" diye işaretlemiyoruz; yalnızca deneyerek test etmeniz için not düşüyoruz.

### 🟡 DİKKAT — `yağ > 17,5 g` (100 g başına)

> Yağ oranı yüksek ({deger} g/100 g); yağlı öğünler bazı kişilerde şikâyeti artırabilir — sizde artırıyor mu, deneyerek görün.

**Kaynak:** Bucan JI, Braut T, Krsek A, Sotosek V, Baticic L. Updates in Gastroesophageal Reflux Disease Management: From Proton Pump Inhibitors to Dietary and Lifestyle Modifications. Gastrointest Disord. 2025;7:33.

**Neden bu sayı:** Bucan 2025, s.3: yağdan zengin öğünler alt özofagus sfinkterinin gevşemesini tetikleyen etkenler arasında sayılıyor (mekanizma düzeyinde). Eşik olarak FSA’nın "yüksek yağlı" sınırı 17,5 g/100 g kullanıldı (FSA Annex 3, Tablo 2, s.19). KANIT DÜZEYİ DÜŞÜK: ACG 2022 önerisi koşullu.

### 🟡 DİKKAT — `kafein ≥ 1 mg` (100 g başına)

> 100 g’ında {deger} mg kafein var; klasik tetikleyici listelerinde geçer ama kanıtı zayıf — kendi tepkinizi gözlemleyin.

**Kaynak:** Bucan JI, Braut T, Krsek A, Sotosek V, Baticic L. Updates in Gastroesophageal Reflux Disease Management: From Proton Pump Inhibitors to Dietary and Lifestyle Modifications. Gastrointest Disord. 2025;7:33.

**Neden bu sayı:** Bucan 2025, s.19: kafein geleneksel "tetikleyici" listesinde yer alıyor, ancak yazarlar bu listelerin sağlam kanıta değil anekdota dayandığını açıkça belirtiyor.

---

## 🌾 Çölyak hastalığı

Gluten içeren besinler kesinlikle tüketilmemelidir. "Glutensiz" etiketi için uluslararası sınır 20 mg/kg (20 ppm) glutendir (Codex Standard 118-1979). Veri tabanımız ppm ölçümü içermez; yalnızca besinin tarifinde gluten olup olmadığına bakarız.

_Kural yok._

---

## 🥛 Laktoz intoleransı

Süt ürünleri sindirim şikâyeti yapabilir; laktozsuz ürünler genelde sorun çıkarmaz.

_Kural yok._

---

## 🌀 IBS (hassas bağırsak)

IBS değerlendirmesi için besinlerin FODMAP içeriği gerekir. Bu bilgi TürKomp veri tabanında yok; bu yüzden otomatik değerlendirme yapmıyoruz.

**Bu hastalık için besin bazlı kural YAZILMADI.** Sebebi yukarıdaki notta.

---

## 🦶 Gut (ürik asit)

Gut değerlendirmesi için besinin pürin içeriği (mg/100 g) gerekir. Kaneko 2014 bu değerleri ölçmüş ve sınıflamış (çok düşük <50, düşük 50-100, orta 100-200, yüksek 200-300, çok yüksek >300 mg/100 g; günlük hedef <400 mg), ancak kullandığımız iki veri tabanında da pürin sütunu yok — bu yüzden hesap yapamıyoruz. Ayrıca Afinogenova 2022: gut’ta tek başına diyet değişikliği ürik asidi genellikle anlamlı düşürmüyor; ACR 2020 kılavuzu alkol, pürin ve yüksek früktozlu mısır şurubunu sınırlamayı KOŞULLU olarak öneriyor.

**Bu hastalık için besin bazlı kural YAZILMADI.** Sebebi yukarıdaki notta.

---

## Kaynakça

**ABURTO2013** — Aburto NJ, Hanson S, Gutierrez H ve ark. Effect of increased potassium intake on cardiovascular risk factors and disease: systematic review and meta-analyses. BMJ. 2013;346:f1378.

<sub>Bu kaynağa dayanan kural sayısı: 1</sub>

**AFINOGENOVA2022** — Afinogenova Y, Danve A, Neogi T. Update on Gout Management: what’s old and what’s new. Curr Opin Rheumatol. 2022;34(2):118-124.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**AMORIM2024** — Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.

<sub>Bu kaynağa dayanan kural sayısı: 4</sub>

**BETO2004** — Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.

<sub>Bu kaynağa dayanan kural sayısı: 4</sub>

**BUCAN2025** — Bucan JI, Braut T, Krsek A, Sotosek V, Baticic L. Updates in Gastroesophageal Reflux Disease Management: From Proton Pump Inhibitors to Dietary and Lifestyle Modifications. Gastrointest Disord. 2025;7:33.

<sub>Bu kaynağa dayanan kural sayısı: 2</sub>

**CODEX118** — Codex Alimentarius Commission. Codex Standard 118-1979 (rev. 2008), Foods for Special Dietary Use for Persons Intolerant to Gluten. Aktaran: Guennouni M ve ark. J Consum Prot Food Saf. 2022;17:137-144.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**CUPISTI2018** — Cupisti A, Kovesdy CP, D’Alessandro C, Kalantar-Zadeh K. Dietary Approach to Recurrent or Chronic Hyperkalaemia in Patients with Decreased Kidney Function. Nutrients. 2018;10(3):261.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**DESOUZA2015** — de Souza RJ, Mente A, Maroleanu A ve ark. Intake of saturated and trans unsaturated fatty acids and risk of all cause mortality, cardiovascular disease, and type 2 diabetes: systematic review and meta-analysis of observational studies. BMJ. 2015;351:h3978. doi:10.1136/bmj.h3978

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**EFSA2010_DRV** — EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for fats. EFSA Journal. 2010;8(3):1461.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**EFSA2015** — EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for iron. EFSA Journal. 2015;13(10):4254.

<sub>Bu kaynağa dayanan kural sayısı: 2</sub>

**EU116_2010** — Commission Regulation (EU) No 116/2010 of 9 February 2010 amending Regulation (EC) No 1924/2006 of the European Parliament and of the Council with regard to the list of nutrition claims. Ek (Annex).

<sub>Bu kaynağa dayanan kural sayısı: 1</sub>

**EVERT2019** — Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.

<sub>Bu kaynağa dayanan kural sayısı: 4</sub>

**FSA2016** — Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) nutrition label for pre-packed products sold through retail outlets. Kasım 2016.

<sub>Bu kaynağa dayanan kural sayısı: 15</sub>

**JOHNSON2023** — Johnson SA, Kirkpatrick CF, Miller NH ve ark. Saturated Fat Intake and the Prevention and Management of Cardiovascular Disease in Adults: An Academy of Nutrition and Dietetics Evidence-Based Nutrition Practice Guideline. J Acad Nutr Diet. 2023.

<sub>Bu kaynağa dayanan kural sayısı: 1</sub>

**KANEKO2014** — Kaneko K, Aoyagi Y, Fukuuchi T, Inazawa K, Yamaoka N. Total Purine and Purine Base Content of Common Foodstuffs for Facilitating Nutritional Therapy for Gout and Hyperuricemia. Biol Pharm Bull. 2014;37(5):709-721.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**MONTEIRO2019** — Monteiro CA, Cannon G, Lawrence M, Louzada MLC, Machado PP. Ultra-processed foods, diet quality, and health using the NOVA classification system. FAO, Roma, 2019.

<sub>Bu kaynağa dayanan kural sayısı: 2</sub>

**OZER2019** — Özer E. Diyabette Tıbbi Beslenme Tedavisinin Uygulanması ve Diyetisyenin Sorumlulukları. Bes Diy Derg. 2019;47(Özel Sayı):5-14.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**PISKIN2022** — Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.

<sub>Bu kaynağa dayanan kural sayısı: 4</sub>

**SACKS2001** — Sacks FM, Svetkey LP, Vollmer WM ve ark. Effects on Blood Pressure of Reduced Dietary Sodium and the Dietary Approaches to Stop Hypertension (DASH) Diet. N Engl J Med. 2001;344(1):3-10.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**SALMAN2024** — Salman E, Kadota A, Miura K. Global guidelines recommendations for dietary sodium and potassium intake. Hypertens Res. 2024;47:1620-1626.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**SOLIMAN2018** — Soliman GA. Dietary Cholesterol and the Lack of Evidence in Cardiovascular Disease. Nutrients. 2018;10(6):780.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**TAKDIR** — Bu eşik hiçbir makaleye dayanmıyor; proje sahibinin kararı. Bir diyetisyen/hekim tarafından gözden geçirilmesi gerekir.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**UAUY2009** — Uauy R, Aro A, Clarke R ve ark. WHO Scientific Update on trans fatty acids: summary and conclusions. Eur J Clin Nutr. 2009;63:S68-S75.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**VENN2007** — Venn BJ, Green TJ. Glycemic index and glycemic load: measurement issues and their effect on diet-disease relationships. Eur J Clin Nutr. 2007;61(Suppl 1):S122-S131.

<sub>Bu kaynağa dayanan kural sayısı: 2</sub>

**VERVLOET2017** — Vervloet MG, Sezer S, Massy ZA ve ark. The role of phosphate in kidney disease. Nat Rev Nephrol. 2017;13:27-38.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**WARSHAW2021** — Warshaw H, Edelman SV. Practical Strategies to Help Reduce Added Sugars Consumption to Support Glycemic and Weight Management Goals. Clin Diabetes. 2021;39(1):45-53.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

**WHO2023TFA** — World Health Organization. Saturated fatty acid and trans-fatty acid intake for adults and children: WHO guideline. Cenevre: WHO; 2023.

<sub>Bu kaynağa dayanan kural sayısı: 1</sub>

**YILDIZ2008** — Yıldız E. Kronik Böbrek Yetmezliği ve Beslenme. T.C. Sağlık Bakanlığı Yayın No: 728, Ankara, 2008.

<sub>Bu kaynağa dayanan kural sayısı: 0</sub>

---

**Kaynaksız kural kalmadı.** Her eşik bir makaleye veya kılavuza dayanıyor.
