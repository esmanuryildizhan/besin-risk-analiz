// prisma/hastalik_kurallari.js
//
// HASTALIK KURALLARI — projenin "beyni" burası.
//
// Kuralları koda gömmek yerine veri olarak tutuyoruz. Böylece yeni bir hastalık
// eklemek ya da bir eşiği değiştirmek için kod değiştirmek gerekmiyor; bu dosyayı
// güncelleyip `npx prisma db seed` demek yeterli.
//
// ===========================================================================
//  HER EŞİĞİN BİR KAYNAĞI VAR
// ===========================================================================
// Her kuralda iki alan zorunlu:
//   kaynak    -> aşağıdaki KAYNAKLAR tablosundaki künyenin anahtarı
//   kaynakNot -> o sayının makalede NEREDE geçtiği + bizim yaptığımız çevirim
//
// İki tür sayı var ve ikisini karıştırmamak kritik:
//   (a) DOĞRUDAN EŞİK  : makalede zaten "100 g'da şu kadar" diye yazan sayı.
//                        (Örn. FSA trafik ışığı sınırları.)
//   (b) ÇEVRİLMİŞ EŞİK : makalede GÜNLÜK sınır var, biz onu porsiyona böldük.
//                        Bölme işlemi bizim kararımız; kaynakNot'ta açıkça yazılı.
//
// Şu an kaynaksız TEK BİR eşik yok. İleride biri eklenirse kaynağı 'TAKDIR'
// yazılmalı; seed çalıştığında ekrana uyarı basılır. Uydurduğumuzu saklamıyoruz.
//
// ⚠️ Bu eşikler toplum geneline yönelik kılavuzlara dayanır, kişiye özel tıbbi
// tavsiye DEĞİLDİR. Hedefler kişiden kişiye, hastalığın evresine göre değişir.
//
// seviye: "RISKLI" | "DIKKAT" | "ONERILIR"   (ONERILIR = bu hastalık için faydalı)
// kritik: true -> bu değer besinde YOKSA "uygun" denmez, DİKKAT verilip not düşülür
// temel : "100g" | "porsiyon"
// sadeceBuyukPorsiyon: true -> kural yalnızca porsiyonu 100 g'dan büyük besinlerde
//                       çalışır (FSA kılavuzunun kendi kuralı, Annex 3 s.19)
// islec : ">" | ">=" | "<" | "<="
// kategoriler: kural sadece bu kategorilerdeki besinlere uygulanır (isteğe bağlı)

// ===========================================================================
//  KAYNAKÇA
// ===========================================================================
const KAYNAKLAR = {
  FSA2016: {
    kisa: 'FSA/DH 2016',
    kunye: 'Department of Health, Food Standards Agency. Guide to creating a front of pack (FoP) '
      + 'nutrition label for pre-packed products sold through retail outlets. Kasım 2016.',
    not: 'Renk kodu ölçütleri: Annex 3, Tablo 2, s.19. Tuz = sodyum × 2,5 (s.13, dipnot 5).',
  },
  EVERT2019: {
    kisa: 'Evert ve ark. 2019',
    kunye: 'Evert AB, Dennison M, Gardner CD ve ark. Nutrition Therapy for Adults With Diabetes '
      + 'or Prediabetes: A Consensus Report. Diabetes Care. 2019;42(5):731-754.',
    not: 'Amerikan Diyabet Derneği uzlaşı raporu.',
  },
  FRANZ2017: {
    kisa: 'Franz ve ark. 2017',
    kunye: 'Franz MJ, MacLeod J, Evert A ve ark. Academy of Nutrition and Dietetics Nutrition '
      + 'Practice Guideline for Type 1 and Type 2 Diabetes in Adults. J Acad Nutr Diet. 2017;117(10):1659-1679.',
  },
  WARSHAW2021: {
    kisa: 'Warshaw & Edelman 2021',
    kunye: 'Warshaw H, Edelman SV. Practical Strategies to Help Reduce Added Sugars Consumption '
      + 'to Support Glycemic and Weight Management Goals. Clin Diabetes. 2021;39(1):45-53.',
  },
  AMORIM2024: {
    kisa: 'Amorim ve ark. 2024',
    kunye: 'Amorim D, Miranda F, Santos A ve ark. Assessing Carbohydrate Counting Accuracy: '
      + 'Current Limitations and Future Directions. Nutrients. 2024;16(14):2183.',
  },
  ATKINSON2021: {
    kisa: 'Atkinson ve ark. 2021',
    kunye: 'Atkinson FS, Brand-Miller JC, Foster-Powell K, Buyken AE, Goletzke J. International '
      + 'tables of glycemic index and glycemic load values 2021: a systematic review. '
      + 'Am J Clin Nutr. 2021;114(5):1625-1632. doi:10.1093/ajcn/nqab233',
  },
  VENN2007: {
    kisa: 'Venn & Green 2007',
    kunye: 'Venn BJ, Green TJ. Glycemic index and glycemic load: measurement issues and their '
      + 'effect on diet-disease relationships. Eur J Clin Nutr. 2007;61(Suppl 1):S122-S131.',
  },
  OZER2019: {
    kisa: 'Özer 2019',
    kunye: 'Özer E. Diyabette Tıbbi Beslenme Tedavisinin Uygulanması ve Diyetisyenin '
      + 'Sorumlulukları. Bes Diy Derg. 2019;47(Özel Sayı):5-14.',
  },
  SACKS2001: {
    kisa: 'Sacks ve ark. 2001',
    kunye: 'Sacks FM, Svetkey LP, Vollmer WM ve ark. Effects on Blood Pressure of Reduced Dietary '
      + 'Sodium and the Dietary Approaches to Stop Hypertension (DASH) Diet. N Engl J Med. 2001;344(1):3-10.',
  },
  APPEL2006: {
    kisa: 'Appel ve ark. 2006',
    kunye: 'Appel LJ, Brands MW, Daniels SR ve ark. Dietary Approaches to Prevent and Treat '
      + 'Hypertension: A Scientific Statement From the American Heart Association. Hypertension. 2006;47(2):296-308.',
  },
  SALMAN2024: {
    kisa: 'Salman ve ark. 2024',
    kunye: 'Salman E, Kadota A, Miura K. Global guidelines recommendations for dietary sodium '
      + 'and potassium intake. Hypertens Res. 2024;47:1620-1626.',
    not: 'Tablo 1 (sodyum) ve Tablo 2 (potasyum): dünya genelindeki rehberlerin karşılaştırması.',
  },
  ABURTO2013: {
    kisa: 'Aburto ve ark. 2013',
    kunye: 'Aburto NJ, Hanson S, Gutierrez H ve ark. Effect of increased potassium intake on '
      + 'cardiovascular risk factors and disease: systematic review and meta-analyses. BMJ. 2013;346:f1378.',
  },
  JOHNSON2023: {
    kisa: 'Johnson ve ark. 2023',
    kunye: 'Johnson SA, Kirkpatrick CF, Miller NH ve ark. Saturated Fat Intake and the Prevention '
      + 'and Management of Cardiovascular Disease in Adults: An Academy of Nutrition and Dietetics '
      + 'Evidence-Based Nutrition Practice Guideline. J Acad Nutr Diet. 2023.',
  },
  UAUY2009: {
    kisa: 'WHO / Uauy ve ark. 2009',
    kunye: 'Uauy R, Aro A, Clarke R ve ark. WHO Scientific Update on trans fatty acids: summary '
      + 'and conclusions. Eur J Clin Nutr. 2009;63:S68-S75.',
  },
  EU116_2010: {
    kisa: 'AB Tüzüğü 116/2010',
    kunye: 'Commission Regulation (EU) No 116/2010 of 9 February 2010 amending Regulation (EC) '
      + 'No 1924/2006 of the European Parliament and of the Council with regard to the list of '
      + 'nutrition claims. Ek (Annex).',
    not: 'Beslenme beyanı ölçütleri, doğrudan alıntı: "SOURCE OF OMEGA-3 FATTY ACIDS — the '
      + 'product contains at least 0,3 g alpha-linolenic acid per 100 g and per 100 kcal, or at '
      + 'least 40 mg of the sum of eicosapentaenoic acid and docosahexaenoic acid per 100 g and '
      + 'per 100 kcal." Yüksek beyanı için aynı sayılar 0,6 g ve 80 mg. '
      + 'DİKKAT: tüzük "per 100 g AND per 100 kcal" diyor, yani İKİ koşul birlikte. '
      + 'Motor bunu epaDhaMgMin ile uyguluyor (iki değerin küçüğü).',
  },
  EFSA2010_DRV: {
    kisa: 'EFSA 2010 (DRV)',
    kunye: 'EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on '
      + 'Dietary Reference Values for fats. EFSA Journal. 2010;8(3):1461.',
    not: 'Yetişkinler için EPA+DHA yeterli alım düzeyi 250 mg/gün. EFSA kendi duyurusunda bu '
      + 'sayıyı şöyle gerekçelendiriyor: "250 mg a day is an adequate intake for the maintenance '
      + 'of general cardiovascular health among healthy adults and children." '
      + 'ŞEFFAFLIK NOTU: 250 mg sayısını EFSA’nın kendi duyurusundan doğruladım, DRV '
      + 'görüşünün sayfa numarasını kontrol ETMEDİM. Bu yüzden bu kaynak eşik kaynağı değil, '
      + 'yalnızca DESTEKLEYİCİ bağlam olarak kullanılıyor; eşik AB Tüzüğü 116/2010’dan geliyor.',
  },
  DESOUZA2015: {
    kisa: 'de Souza ve ark. 2015',
    kunye: 'de Souza RJ, Mente A, Maroleanu A ve ark. Intake of saturated and trans unsaturated '
      + 'fatty acids and risk of all cause mortality, cardiovascular disease, and type 2 diabetes: '
      + 'systematic review and meta-analysis of observational studies. BMJ. 2015;351:h3978. '
      + 'doi:10.1136/bmj.h3978',
    not: 'İleriye dönük kohortları trans yağın KAYNAĞINA göre ayırıyor. Sanayi kaynaklı: toplam '
      + 'kalp hastalığı RR 1,42 (%95 GA 1,05-1,92; p=0,02), kalp hastalığından ölüm RR 1,18 '
      + '(1,04-1,33; p=0,009) — ikisi de anlamlı. Hayvansal (geviş getiren) kaynaklı: toplam kalp '
      + 'hastalığı RR 0,93 (0,73-1,18; p=0,55), ölüm RR 1,01 (0,71-1,43; p=0,95) — ikisi de '
      + 'anlamsız. Hayvansal trans yağın göstergesi trans-palmitoleik asit tip 2 diyabetle TERS '
      + 'ilişkili: RR 0,58 (0,46-0,74).',
  },
  WHO2023TFA: {
    kisa: 'WHO 2023',
    kunye: 'World Health Organization. Saturated fatty acid and trans-fatty acid intake for adults '
      + 'and children: WHO guideline. Cenevre: WHO; 2023.',
    not: 'Öneri 1 (güçlü): trans yağ alımı toplam enerjinin %1’ine düşürülmeli. Kapsam konusunda '
      + 'açık: "TFA, geviş getirenlerden mi geldiği yoksa sanayide mi üretildiğine bakılmaksızın '
      + 'trans konfigürasyonunda çift bağ taşıyan tüm yağ asitlerini kapsar." Ayrıca: sanayide '
      + 'üretilmiş TFA’yı yüksek düzeyde içeren besinlerden büyük ölçüde kaçınılmalı.',
  },
  SOLIMAN2018: {
    kisa: 'Soliman 2018',
    kunye: 'Soliman GA. Dietary Cholesterol and the Lack of Evidence in Cardiovascular Disease. '
      + 'Nutrients. 2018;10(6):780.',
  },
  EFSA2015: {
    kisa: 'EFSA 2015',
    kunye: 'EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on '
      + 'Dietary Reference Values for iron. EFSA Journal. 2015;13(10):4254.',
  },
  PISKIN2022: {
    kisa: 'Pişkin ve ark. 2022',
    kunye: 'Piskin E, Cianciosi D, Gulec S, Tomas M, Capanoglu E. Iron Absorption: Factors, '
      + 'Limitations, and Improvement Methods. ACS Omega. 2022;7:20441-20456.',
  },
  BETO2004: {
    kisa: 'Beto & Bansal 2004',
    kunye: 'Beto JA, Bansal VK. Medical Nutrition Therapy in Chronic Kidney Failure: Integrating '
      + 'Clinical Practice Guidelines. J Am Diet Assoc. 2004;104(3):404-409.',
    not: 'Tablo 3, s.406: böbrek yetmezliğinin evresine göre günlük protein/sodyum/potasyum/fosfor hedefleri.',
  },
  CUPISTI2018: {
    kisa: 'Cupisti ve ark. 2018',
    kunye: 'Cupisti A, Kovesdy CP, D’Alessandro C, Kalantar-Zadeh K. Dietary Approach to '
      + 'Recurrent or Chronic Hyperkalaemia in Patients with Decreased Kidney Function. Nutrients. 2018;10(3):261.',
  },
  VERVLOET2017: {
    kisa: 'Vervloet ve ark. 2017',
    kunye: 'Vervloet MG, Sezer S, Massy ZA ve ark. The role of phosphate in kidney disease. '
      + 'Nat Rev Nephrol. 2017;13:27-38.',
  },
  YILDIZ2008: {
    kisa: 'Yıldız 2008 (T.C. Sağlık Bakanlığı)',
    kunye: 'Yıldız E. Kronik Böbrek Yetmezliği ve Beslenme. T.C. Sağlık Bakanlığı Yayın No: 728, Ankara, 2008.',
  },
  CODEX118: {
    kisa: 'Codex Standard 118-1979',
    kunye: 'Codex Alimentarius Commission. Codex Standard 118-1979 (rev. 2008), Foods for Special '
      + 'Dietary Use for Persons Intolerant to Gluten. Aktaran: Guennouni M ve ark. '
      + 'J Consum Prot Food Saf. 2022;17:137-144.',
  },
  BUCAN2025: {
    kisa: 'Bucan ve ark. 2025',
    kunye: 'Bucan JI, Braut T, Krsek A, Sotosek V, Baticic L. Updates in Gastroesophageal Reflux '
      + 'Disease Management: From Proton Pump Inhibitors to Dietary and Lifestyle Modifications. '
      + 'Gastrointest Disord. 2025;7:33.',
    not: 'Amerikan Gastroenteroloji Koleji (ACG) 2022 kılavuzunun önerisini aktarır.',
  },
  MONTEIRO2019: {
    kisa: 'Monteiro ve ark. 2019 (FAO)',
    kunye: 'Monteiro CA, Cannon G, Lawrence M, Louzada MLC, Machado PP. Ultra-processed foods, '
      + 'diet quality, and health using the NOVA classification system. FAO, Roma, 2019.',
  },
  KANEKO2014: {
    kisa: 'Kaneko ve ark. 2014',
    kunye: 'Kaneko K, Aoyagi Y, Fukuuchi T, Inazawa K, Yamaoka N. Total Purine and Purine Base '
      + 'Content of Common Foodstuffs for Facilitating Nutritional Therapy for Gout and '
      + 'Hyperuricemia. Biol Pharm Bull. 2014;37(5):709-721.',
  },
  AFINOGENOVA2022: {
    kisa: 'Afinogenova ve ark. 2022',
    kunye: 'Afinogenova Y, Danve A, Neogi T. Update on Gout Management: what’s old and '
      + 'what’s new. Curr Opin Rheumatol. 2022;34(2):118-124.',
  },
  // Şu an bu kaynağı kullanan kural YOK. Yeni bir eşik eklerken makaleye
  // dayandıramıyorsan kaynağını 'TAKDIR' yaz; seed uyarı basar, belgede görünür.
  TAKDIR: {
    kisa: 'KAYNAKSIZ — bizim takdirimiz',
    kunye: 'Bu eşik hiçbir makaleye dayanmıyor; proje sahibinin kararı. '
      + 'Bir diyetisyen/hekim tarafından gözden geçirilmesi gerekir.',
  },
};

// ===========================================================================
//  ORTAK KURAL PARÇALARI
// ===========================================================================
// FSA trafik ışığı sınırları birden çok hastalıkta aynen tekrar ettiği için
// tek yerden üretiyoruz; böylece bir yerde düzeltince her yerde düzeliyor.

const FSA_NOT_100G = 'FSA Annex 3, Tablo 2, s.19 — 100 g için "yüksek (kırmızı)" sınırı. Doğrudan eşik, çevrim yok.';
const FSA_NOT_PORS = 'FSA Annex 3, Tablo 2, s.19 — porsiyon başına "yüksek (kırmızı)" sınırı. '
  + 'Kılavuzun kendi kuralı gereği yalnızca porsiyonu 100 g’dan büyük besinlerde uygulanır.';

const fsaSodyum = (seviyeYuksek = 'RISKLI') => ([
  { nutrient: 'sodiumMg', islec: '>', value: 600, temel: '100g', seviye: seviyeYuksek, kritik: true,
    kaynak: 'FSA2016', kaynakNot: FSA_NOT_100G + ' Tuz 1,5 g/100 g = sodyum 600 mg/100 g (tuz = sodyum × 2,5).',
    message: '100 gramında {deger} mg sodyum var — FSA’ya göre "yüksek tuzlu" (1,5 g tuz) sınırının üstünde.' },
  { nutrient: 'sodiumMg', islec: '>', value: 720, temel: 'porsiyon', sadeceBuyukPorsiyon: true, seviye: seviyeYuksek,
    kaynak: 'FSA2016', kaynakNot: FSA_NOT_PORS + ' Tuz 1,8 g/porsiyon = sodyum 720 mg/porsiyon.',
    message: 'Bir porsiyonunda {deger} mg sodyum var — FSA’nın porsiyon başına yüksek sınırının (720 mg) üstünde.' },
  { nutrient: 'sodiumMg', islec: '>', value: 120, temel: '100g', seviye: 'DIKKAT',
    kaynak: 'FSA2016', kaynakNot: 'FSA Annex 3, Tablo 2, s.19 — "düşük (yeşil)" sınırı 0,3 g tuz/100 g = 120 mg sodyum. '
      + 'Bunun üstü artık düşük sayılmıyor.',
    message: '100 gramında {deger} mg sodyum var; "az tuzlu" sayılan sınırın (120 mg) üstünde.' },
]);

const LIF_KURALI = {
  nutrient: 'fiberPer1000kcal', islec: '>=', value: 14, temel: '100g', seviye: 'ONERILIR',
  kaynak: 'EVERT2019',
  kaynakNot: 'Evert 2019, s.736: "en az 1000 kcal başına 14 g lif". Çevrim yok — kuralı rehberdeki '
    + 'haliyle (kalori başına) uyguluyoruz. Mutlak gram yerine yoğunluk kullanmak, az kalorili '
    + 'sebzelerin haksız yere "lifsiz" görünmesini engelliyor.',
  message: 'Lif yoğunluğu yüksek (1000 kcal başına {deger} g); rehberin önerdiği 14 g sınırının üstünde.',
};

// ===========================================================================
//  HASTALIKLAR
// ===========================================================================
// ---------------------------------------------------------------------------
// KURAL ALANLARI — motor anahtarı  ->  veritabanı sütunu
// ---------------------------------------------------------------------------
// Bir kuralda kullanılan her alanın buraya yazılması ZORUNLU. Sebebi somut bir
// hata: muafLifYogunlugu ve muafDoymamisOran bu dosyada tanımlıydı ama seed.js
// veritabanına yazmıyor, index.js de geri okumuyordu. Testler HASTALIKLAR'ı
// doğrudan okuduğu için geçiyordu, ama API veritabanından okuduğu için
// muafiyetler kayboluyordu — yani uygulama testlerden FARKLI davranıyordu
// (baklagiller karbonhidrattan, zeytinyağı doymuş yağdan haksız uyarı alıyordu).
//
// Artık seed.js ve index.js bu tabloyu kullanıyor, risk_test.js de tablonun
// eksiksiz olduğunu kontrol ediyor. Yeni bir alan eklerken:
//   1) buraya satır ekle, 2) schema.prisma'ya sütun ekle, 3) migrate et.
// Adım atlanırsa test patlar.
const KURAL_ALANLARI = {
  nutrient:                    'nutrient',
  islec:                       'op',
  value:                       'threshold',
  kategoriler:                 'categories',
  temel:                       'basis',
  seviye:                      'level',
  message:                     'message',
  kritik:                      'critical',
  kaynak:                      'source',
  kaynakNot:                   'sourceNote',
  sadeceBuyukPorsiyon:         'onlyLargePortion',
  muafLifYogunlugu:            'exemptFiberDensity',
  muafDoymamisOran:            'exemptUnsaturatedPct',
  muafGlisemikYukBiliniyorsa:  'exemptIfGlycemicLoadKnown',
};

const HASTALIKLAR = [
  {
    key: 'diyabet',
    name: 'Diyabet (Tip 1 / Tip 2)',
    icon: '🩸',
    note: 'Şeker, net karbonhidrat ve lif içeriğine göre değerlendirilir. Evert 2019 uzlaşı raporu '
      + '"herkese uyan ideal bir karbonhidrat yüzdesi yoktur" diyor; bu yüzden aşağıdaki sınırlar '
      + 'bir yasak değil, porsiyonu ne kadar dikkatli tutmanız gerektiğinin göstergesidir. '
      + 'Doymuş yağ için ayrı kural yazmadık: Evert 2019 doymuş yağı tek besin üzerinden değil, '
      + 'günlük beslenmenin %10’u üzerinden sınırlıyor ve bunu kalp-damar riski başlığı '
      + 'altında ele alıyor — o kurallar "Yüksek kolesterol" bölümünde.',
    rules: [
      { nutrient: 'sugars', islec: '>', value: 22.5, temel: '100g', seviye: 'RISKLI', kritik: true,
        kaynak: 'FSA2016', kaynakNot: FSA_NOT_100G,
        message: '100 gramında {deger} g şeker var — "yüksek şekerli" sayılan 22,5 g sınırının üstünde.' },

      { nutrient: 'sugars', islec: '>', value: 27, temel: 'porsiyon', sadeceBuyukPorsiyon: true, seviye: 'RISKLI',
        kaynak: 'FSA2016', kaynakNot: FSA_NOT_PORS,
        message: 'Bir porsiyonunda {deger} g şeker var — porsiyon başına yüksek sınırın (27 g) üstünde.' },

      // Şeker tek başına yetmez: makarnada, pilavda, unda şeker düşüktür ama nişasta
      // da kan şekerine döner. Bu yüzden PORSİYON başına net karbonhidrata bakıyoruz.
      { nutrient: 'netCarbs', islec: '>=', value: 45, temel: 'porsiyon', seviye: 'RISKLI', kritik: true,
        kaynak: 'AMORIM2024',
        kaynakNot: 'Amorim 2024, s.3: 1 karbonhidrat değişimi = 10-15 g; "45 g karbonhidrat içeren bir '
          + 'porsiyon" bir öğünlük örnek olarak veriliyor (3 değişim). ÇEVRİM: makalede "45 g riskli" '
          + 'yazmıyor; biz bunu "tek besinden bir öğünlük karbonhidrat" eşiği olarak kullandık.',
        message: 'Bir porsiyonunda {deger} g net karbonhidrat var — tek başına bir öğünlük karbonhidrat (yaklaşık 3 değişim).' },

      // Glisemik indeksi ÖLÇÜLMÜŞ besinlerde gerçek glisemik yük. Bu kural ile
      // aşağıdaki net karbonhidrat kuralı birbirinin yerine çalışır: hangisi
      // devreye girerse diğeri muaf olur (bkz. muafGlisemikYukBiliniyorsa).
      { nutrient: 'glycemicLoad', islec: '>=', value: 20, temel: 'porsiyon', seviye: 'DIKKAT',
        muafLifYogunlugu: 14,
        kaynak: 'VENN2007',
        kaynakNot: 'Venn & Green 2007, s.S125: glisemik yük sınıflaması — düşük ≤10, orta 10-20, '
          + 'YÜKSEK ≥20. Burada glisemik yük TAHMİN EDİLMİYOR, hesaplanıyor: '
          + 'glisemik indeks × porsiyondaki net karbonhidrat / 100. Glisemik indeks '
          + 'TürKomp\u2019un ölçtüğü değer. '
          + 'ÇEVRİM YOK: eşik de (20), formül de doğrudan makaleden. MUAFİYET: '
          + 'Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları ve sebzeleri '
          + 'diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal başına '
          + '≥14 g) karşılayan besinlerde bu uyarı verilmiyor.',
        message: 'Bir porsiyonunun glisemik yükü {deger} — Venn & Green sınıflamasında "yüksek" (20 ve üstü).' },

      // Bu kural KARBONHİDRAT MİKTARI kuralıdır, glisemik yük kuralı değil.
      // Birincil kaynağı Amorim 2024, çünkü o makale doğrudan bu kuralın ölçtüğü
      // şeyden (öğündeki karbonhidrat gramı) söz ediyor. Venn & Green yalnızca
      // destekleyici: 20 g'ın altındaki bir porsiyonun glisemik yükünün
      // "yüksek" ÇIKAMAYACAĞINI gösteriyor. Dikkat — bunun tersi doğru değil:
      // 20 g'ı geçmek glisemik yükün yüksek OLDUĞU anlamına gelmez, sadece
      // elenemediği anlamına gelir. O yüzden seviye DİKKAT, mesaj da glisemik
      // yük hakkında bir iddia kurmuyor.
      { nutrient: 'netCarbs', islec: '>=', value: 20, temel: 'porsiyon', seviye: 'DIKKAT',
        muafLifYogunlugu: 14,
        muafGlisemikYukBiliniyorsa: true,
        kaynak: 'AMORIM2024',
        kaynakNot: 'Amorim 2024, s.4: öğündeki karbonhidrat miktarı 20 g’ı aşan bir farkla '
          + 'yanlış sayıldığında öğün sonrası kan şekerinde belirgin dalgalanma oluyor '
          + '(Smart ve ark. çalışmasına dayanarak). Eşik doğrudan bu sayıdan geliyor ve '
          + 'ölçtüğümüz şeyle aynı birimde: porsiyondaki karbonhidrat gramı. ÇEVRİM YOK. '
          + 'DESTEKLEYİCİ: Venn & Green 2007 (s.S125) glisemik yükü ≥20 "yüksek" sayıyor; '
          + 'glisemik yük = glisemik indeks × kullanılabilir karbonhidrat / 100 ve glisemik '
          + 'indeks en fazla ~100 olabileceği için, porsiyonu 20 g’ın ALTINDA kalan bir '
          + 'besnin glisemik yükü "yüksek" çıkamaz. Bu çıkarım tek yönlü: 20 g’ı geçmek '
          + 'glisemik yükün yüksek olduğunu KANITLAMAZ, yalnızca elenemediğini gösterir — '
          + 'bu yüzden seviye RİSKLİ değil DİKKAT ve besnin gerçek glisemik indeksi '
          + 'girildiğinde bu kural devre dışı kalıp yerini ölçülmüş glisemik yük kuralına '
          + 'bırakıyor. MUAFİYET: Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları '
          + 've sebzeleri diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal '
          + 'başına ≥14 g) karşılayan besinlerde bu uyarı verilmiyor.',
        message: 'Bir porsiyonunda {deger} g net karbonhidrat var — karbonhidrat sayımında bu miktardaki fark kan şekerinde dalgalanma yapabiliyor; porsiyonu küçük tutun.' },

      { nutrient: 'sugars', islec: '>', value: 5, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'FSA2016', kaynakNot: 'FSA Annex 3, Tablo 2, s.19 — "düşük (yeşil)" şeker sınırı 5 g/100 g. '
          + 'Bunun üstü artık az şekerli sayılmıyor. Ayrıca WHO eklenmiş şeker için günlük enerjinin '
          + '%10’unun (koşullu olarak %5) altını öneriyor (Warshaw 2021, s.46).',
        message: '100 gramında {deger} g şeker var; "az şekerli" sınırının (5 g) üstünde.' },

      ...fsaSodyum('DIKKAT').slice(0, 1).map((k) => ({
        ...k, kritik: false,
        kaynakNot: k.kaynakNot + ' Evert 2019 (s.743) ve Özer 2019 (Tablo 3, s.10): diyabetli bireyler '
          + 'için günlük sodyum hedefi genel nüfusla aynı, 2300 mg.',
      })),

      { kategoriler: ['Hazır Gıda'], seviye: 'DIKKAT',
        kaynak: 'MONTEIRO2019',
        kaynakNot: 'FAO/NOVA sınıflaması, Grup 4 (ultra-işlenmiş gıdalar), s.13: hazır yemekler, '
          + 'nugget/köfte türü yeniden yapılandırılmış ürünler, paketli hamur işleri bu gruba girer; '
          + 'şeker, yağ ve tuz içerikleri markaya ve tarife göre büyük ölçüde değişir.',
        message: 'Ultra-işlenmiş hazır gıda (NOVA Grup 4): şeker, yağ ve tuz içeriği markaya ve tarife göre çok değişir, etiketi kontrol edin.' },

      LIF_KURALI,
    ],
  },

  {
    key: 'insulin_direnci',
    name: 'İnsülin direnci / prediyabet',
    icon: '🩸',
    note: 'Evert 2019 uzlaşı raporu diyabet ve PREDİYABET için aynı beslenme ilkelerini veriyor; '
      + 'bu yüzden kurallar diyabetle aynı kaynaklara dayanıyor.',
    rules: [
      { nutrient: 'sugars', islec: '>', value: 22.5, temel: '100g', seviye: 'RISKLI', kritik: true,
        kaynak: 'FSA2016', kaynakNot: FSA_NOT_100G,
        message: '100 gramında {deger} g şeker var — "yüksek şekerli" sınırın üstünde.' },
      { nutrient: 'netCarbs', islec: '>=', value: 45, temel: 'porsiyon', seviye: 'RISKLI', kritik: true,
        kaynak: 'AMORIM2024',
        kaynakNot: 'Amorim 2024, s.3 (45 g = yaklaşık 3 karbonhidrat değişimi = bir öğünlük). ÇEVRİM bize ait.',
        message: 'Bir porsiyonunda {deger} g net karbonhidrat var — tek başına bir öğünlük karbonhidrat.' },
      // Glisemik indeksi ÖLÇÜLMÜŞ besinlerde gerçek glisemik yük. Bu kural ile
      // aşağıdaki net karbonhidrat kuralı birbirinin yerine çalışır: hangisi
      // devreye girerse diğeri muaf olur (bkz. muafGlisemikYukBiliniyorsa).
      { nutrient: 'glycemicLoad', islec: '>=', value: 20, temel: 'porsiyon', seviye: 'DIKKAT',
        muafLifYogunlugu: 14,
        kaynak: 'VENN2007',
        kaynakNot: 'Venn & Green 2007, s.S125: glisemik yük sınıflaması — düşük ≤10, orta 10-20, '
          + 'YÜKSEK ≥20. Burada glisemik yük TAHMİN EDİLMİYOR, hesaplanıyor: '
          + 'glisemik indeks × porsiyondaki net karbonhidrat / 100. Glisemik indeks '
          + 'TürKomp\u2019un ölçtüğü değer. '
          + 'ÇEVRİM YOK: eşik de (20), formül de doğrudan makaleden. MUAFİYET: '
          + 'Evert 2019 (s.736) kuru baklagilleri, tam taneli tahılları ve sebzeleri '
          + 'diyabette açıkça öneriyor; rehberin kendi lif ölçütünü (1000 kcal başına '
          + '≥14 g) karşılayan besinlerde bu uyarı verilmiyor.',
        message: 'Bir porsiyonunun glisemik yükü {deger} — Venn & Green sınıflamasında "yüksek" (20 ve üstü).' },

      { nutrient: 'netCarbs', islec: '>=', value: 20, temel: 'porsiyon', seviye: 'DIKKAT',
        muafLifYogunlugu: 14,
        muafGlisemikYukBiliniyorsa: true,
        kaynak: 'AMORIM2024',
        kaynakNot: 'Amorim 2024, s.4: öğünde 20 g’ı aşan karbonhidrat farkı öğün sonrası kan '
          + 'şekerinde dalgalanma yaratıyor (Smart ve ark.). Eşik ölçtüğümüz şeyle aynı birimde, '
          + 'çevrim yok. DESTEKLEYİCİ: Venn & Green 2007 (s.S125) — 20 g’ın altındaki bir '
          + 'porsiyonun glisemik yükü "yüksek" çıkamaz; ama tersi geçerli değil, o yüzden seviye '
          + 'DİKKAT. Lif yoğunluğu ≥14 g/1000 kcal olan besinler muaf (Evert 2019, s.736).',
        message: 'Bir porsiyonunda {deger} g net karbonhidrat var; protein veya yağ içeren bir besinle birlikte tüketmek kan şekerinin yükselişini yavaşlatır.' },
      { nutrient: 'sugars', islec: '>', value: 5, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'FSA2016', kaynakNot: 'FSA "düşük şeker" sınırı 5 g/100 g (Annex 3, Tablo 2, s.19).',
        message: '100 gramında {deger} g şeker var.' },
      { kategoriler: ['Hazır Gıda'], seviye: 'DIKKAT',
        kaynak: 'MONTEIRO2019', kaynakNot: 'FAO/NOVA Grup 4, s.13.',
        message: 'Ultra-işlenmiş hazır gıda: içeriği markaya göre değişir, etiketi kontrol edin.' },
      LIF_KURALI,
    ],
  },

  {
    key: 'hipertansiyon',
    name: 'Hipertansiyon (yüksek tansiyon)',
    icon: '💓',
    note: 'Sodyum (tuz) ve potasyum dengesine göre değerlendirilir. DASH çalışmasında düşük sodyumlu '
      + 'DASH diyeti, yüksek sodyumlu tipik diyete göre sistolik tansiyonu hipertansiyonu olanlarda '
      + '11,5 mmHg düşürmüştü (Sacks 2001).',
    rules: [
      ...fsaSodyum('RISKLI'),
      { nutrient: 'potassiumMg', islec: '>=', value: 351, temel: 'porsiyon', seviye: 'ONERILIR',
        kaynak: 'ABURTO2013',
        kaynakNot: 'Aburto 2013 (BMJ 346:f1378): günde 90-120 mmol (3510-4680 mg) potasyum alımı '
          + 'hipertansiflerde sistolik tansiyonu 7,16 mmHg düşürüyor; fayda için en az 90 mmol '
          + '(3510 mg/gün) gerekiyor. Aynı hedefi WHO da veriyor (Salman 2024, Tablo 2: 3,51 g/gün). '
          + 'ÇEVRİM: 3510 mg/gün hedefin %10’unu (351 mg) tek porsiyonda veren besini '
          + '"potasyumdan zengin" saydık — %10 sınırı bizim kararımız.',
        message: 'Bir porsiyonunda {deger} mg potasyum var; günlük 3510 mg hedefin onda birinden fazlası, tansiyon kontrolüne katkı sağlar.' },
    ],
  },

  {
    key: 'kolesterol',
    name: 'Yüksek kolesterol (dislipidemi)',
    icon: '🫀',
    note: 'Doymuş yağ ve trans yağ içeriğine bakılır. Academy of Nutrition and Dietetics 2023 '
      + 'kılavuzunun en güçlü önerisi (GRADE 1B) doymuş yağı AZALTMAK değil, ÇOKLU DOYMAMIŞ yağla '
      + 'DEĞİŞTİRMEK; yani yağı tamamen kesmek yerine kaynağını değiştirmek. Besindeki kolesterol '
      + 'için kural yazmadık: Soliman 2018, besinle alınan kolesterolün kan kolesterolüne etkisine '
      + 'dair kanıtın yetersiz olduğunu gösteriyor.',
    rules: [
      // SEVİYE NEDEN RİSKLİ DEĞİL DİKKAT — 1 Ekim 2026 kararı.
      // İki ayrı belirsizlik üst üste biniyor:
      //
      // (1) ÖLÇÜM: TürKomp toplam trans yağı raporlamıyor, yalnızca ELAİDİK ASİDİ
      //     raporluyor. Elaidik asit toplam trans yağın bir parçası olduğu için
      //     elimizdeki sayı bir ALT SINIR. Çıkarım tek yönlü:
      //        elaidik asit >= 0,5 g  =>  toplam trans yağ >= 0,5 g   ✓ sağlam
      //        elaidik asit <  0,5 g  =>  toplam trans yağ <  0,5 g   ✗ sağlam DEĞİL
      //     Yani bu kuralın TETİKLENMESİ haklı; SESSİZ KALMASI besnin temiz
      //     olduğunu göstermez. (Glisemik yük kuralındaki üst sınır argümanının
      //     aynası.)
      //
      // (2) KAYNAK: de Souza 2015 kalp hastalığı sinyalinin SANAYİ kaynaklı trans
      //     yağa özgü olduğunu gösteriyor; hayvansal kaynaklı için anlamlı ilişki
      //     bulunamamış (sayılar KAYNAKLAR.DESOUZA2015 notunda). TürKomp'un verdiği
      //     tek sayıdan bir besnin trans yağının hangi kaynaktan geldiğini
      //     ANLAYAMIYORUZ.
      //
      // WHO 2023 sınırı koyarken kaynak ayrımı yapmıyor, bu yüzden eşiğin kendisi
      // yerinde duruyor ve kural kaldırılmadı. Ama iki belirsizlik üst üste
      // binerken "RİSKLİ" demek savunulabilir değil, "dikkat" demek savunulabilir.
      //
      // Somut sonuç: kural yalnızca Eski kaşar (0,675 g/porsiyon) ve
      // Lüfer (0,608 g/porsiyon) için tetikleniyor — ikisi de hayvansal kaynak.
      // RİSKLİ kalsaydı uygulama BALIĞI kolesterolde riskli gösteriyordu.
      { nutrient: 'transFat', islec: '>=', value: 0.5, temel: 'porsiyon', seviye: 'DIKKAT',
        kaynak: 'WHO2023TFA',
        kaynakNot: 'WHO 2023 kılavuzu, Öneri 1 (güçlü öneri): trans yağ alımı toplam enerjinin '
          + '%1’ine düşürülmeli; kılavuz kapsamın "geviş getirenlerden mi geldiği yoksa sanayide '
          + 'mi üretildiğine bakılmaksızın" tüm trans yağ asitleri olduğunu açıkça yazıyor. Aynı '
          + 'sınır WHO Bilimsel Güncellemesi’nde de var (Uauy 2009, s.S73). ÇEVRİM: 2000 kcal’lik '
          + 'bir günde %1 = 20 kcal ≈ 2,2 g trans yağ; tek porsiyonda 0,5 g bu günlük payın '
          + 'yaklaşık dörtte biri demek — bölme işlemi BİZE AİT. '
          + 'ÖLÇÜM UYARISI: TürKomp toplam trans yağı değil yalnızca ELAİDİK ASİDİ raporluyor, '
          + 'yani değerimiz ALT SINIR. Bu yüzden kuralın tetiklenmesi sağlam (elaidik asit 0,5 g’ı '
          + 'geçtiyse toplam trans yağ da geçmiştir), ama tetiklenmemesi besnin temiz olduğunu '
          + 'KANITLAMAZ. '
          + 'SEVİYE GEREKÇESİ: de Souza 2015 (BMJ 351:h3978) kalp hastalığı riskini yalnızca SANAYİ '
          + 'kaynaklı trans yağda buluyor (toplam kalp hastalığı RR 1,42; 1,05-1,92), hayvansal '
          + 'kaynaklıda bulamıyor (RR 0,93; 0,73-1,18). TürKomp’un tek sayısından kaynağı '
          + 'ayırt edemediğimiz için seviye RİSKLİ değil DİKKAT.',
        message: 'Bir porsiyonunda en az {deger} g trans yağ var; WHO’nun günlük sınırının (≈2,2 g) '
          + 'dörtte birinden fazlası. Değer elaidik asit ölçümü olduğu için gerçek miktar daha yüksek olabilir.' },

      { nutrient: 'saturatedFat', islec: '>', value: 5, temel: '100g', seviye: 'RISKLI', kritik: true,
        muafDoymamisOran: 70,
        kaynak: 'FSA2016',
        kaynakNot: FSA_NOT_100G + ' MUAFİYET: Johnson 2023 kılavuzunda doymuş yağı azaltma önerisi '
          + 'zayıf (GRADE 2), doymamış yağla değiştirme önerisi güçlü (GRADE 1). Yağının en az '
          + '%70’i doymamış olan besinler (zeytinyağı, ceviz, balık) kılavuzun tavsiye ettiği '
          + '"değiştirme" seçeneğinin kendisi olduğu için en yüksek risk seviyesine çıkarılmıyor; '
          + 'yalnızca 1,5 g/100 g DİKKAT uyarısı alıyorlar. %70 sınırı bize ait.',
        message: '100 gramında {deger} g doymuş yağ var — "yüksek" sayılan 5 g sınırının üstünde.' },

      { nutrient: 'saturatedFat', islec: '>', value: 6, temel: 'porsiyon', sadeceBuyukPorsiyon: true, seviye: 'RISKLI',
        muafDoymamisOran: 70,
        kaynak: 'FSA2016', kaynakNot: FSA_NOT_PORS + ' Yağının %70’inden fazlası doymamış olan besinler muaf (bkz. üstteki kural).',
        message: 'Bir porsiyonunda {deger} g doymuş yağ var — porsiyon başına yüksek sınırın (6 g) üstünde.' },

      { nutrient: 'satFatEnergyPct', islec: '>=', value: 10, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'EVERT2019',
        kaynakNot: 'Evert 2019, s.744 (ABD Beslenme Kılavuzu’na dayanarak): doymuş yağ günlük '
          + 'kalorinin %10’unun altında olmalı. ÇEVRİM: günlük oranı tek besine uyguladık — '
          + 'kalorisinin %10’undan fazlası doymuş yağdan gelen besin, bu hedefi tek başına zorlar. '
          + 'Kalorisi 50 kcal’ın altındaki besinlerde oran anlamsızlaştığı için hesaplanmıyor.',
        message: 'Kalorisinin %{deger}’i doymuş yağdan geliyor; rehberin günlük %10 hedefinin üstünde.' },

      { nutrient: 'saturatedFat', islec: '>', value: 1.5, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'FSA2016', kaynakNot: 'FSA Annex 3, Tablo 2, s.19 — "düşük" doymuş yağ sınırı 1,5 g/100 g.',
        message: '100 gramında {deger} g doymuş yağ var; "az doymuş yağlı" sınırının üstünde.' },

      // Yağlı besinleri sadece cezalandırmak yanıltıcı olur: kılavuzun EN GÜÇLÜ
      // önerisi yağı kesmek değil, doymuşu doymamışla değiştirmek. Zeytinyağı,
      // kuruyemiş, balık gibi besinler bu yüzden ayrıca olumlu bulgu alıyor.
      { nutrient: 'epaDhaMgMin', islec: '>=', value: 40, temel: '100g', seviye: 'ONERILIR',
        kaynak: 'EU116_2010',
        kaynakNot: 'AB Tüzüğü 116/2010, Ek: bir ürün "omega-3 kaynağı" sayılabilmek için '
          + '100 g’ında VE 100 kcal’inde en az 40 mg EPA+DHA taşımalı. Eşik DOĞRUDAN '
          + 'tüzükten, ÇEVRİM YOK. Tüzüğün "ve" bağlacı motorda epaDhaMgMin ile korunuyor: '
          + '100 g ve 100 kcal değerlerinin KÜÇÜĞÜ alınıyor, böylece tek eşik iki koşul demek '
          + 'oluyor. DESTEKLEYİCİ: EFSA 2010 DRV, yetişkinde EPA+DHA yeterli alım 250 mg/gün '
          + '(genel kalp-damar sağlığının korunması için). '
          + 'NOT: Bu kural bir BESTEKİ MİKTAR beyanıdır — "bu besin anlamlı miktarda EPA+DHA '
          + 'taşıyor" der; "kolesterolü düşürür" demez.',
        // MESAJ DİKKAT: {deger} burada epaDhaMgMin, yani 100 g ve 100 kcal
        // değerlerinin KÜÇÜĞÜ. Bir ara bu sayı "100 g’ında {deger} mg" diye
        // sunuluyordu ve YANLIŞTI: lüferin 100 gramında 2380 mg EPA+DHA var,
        // küçük olan değer (1107) 100 kcal başına düşen miktar. Sayının ne
        // olduğunu söylemeden göstermek, kafein mesajlarında düzelttiğimiz
        // hatanın aynısı olurdu.
        message: 'Omega-3 kaynağı: AB ölçütünün iki koşulunu da karşılıyor '
          + '(düşük olan değer {deger} mg). Tüzük (116/2010) 100 g’da VE 100 kcal’de '
          + 'en az 40 mg EPA+DHA istiyor.' },

      { nutrient: 'unsaturatedFatPct', islec: '>=', value: 70, temel: '100g', seviye: 'ONERILIR',
        kaynak: 'JOHNSON2023',
        kaynakNot: 'Johnson 2023 (Academy of Nutrition and Dietetics kılavuzu), Tablo: '
          + '"doymuş yağı ÇOKLU DOYMAMIŞ yağla değiştirin" önerisi GRADE 1 (güçlü); doymuş yağı '
          + 'sadece azaltma önerisi ise GRADE 2 (zayıf). Evert 2019 (s.744) da zeytinyağı ve '
          + 'kuruyemişteki tekli doymamış yağların kalp-damar risk göstergelerini iyileştirdiğini '
          + 'aktarıyor. ÇEVRİM: "yağının en az %70’i doymamış" sınırı bize ait; makalelerde '
          + 'böyle bir yüzde sınırı verilmiyor.',
        message: 'Yağının %{deger}’i doymamış yağ; kılavuzların en güçlü önerisi doymuş yağı bu tür yağlarla değiştirmek.' },

      LIF_KURALI,
    ],
  },

  {
    key: 'kansizlik',
    name: 'Demir eksikliği (kansızlık)',
    icon: '🩸',
    note: 'Demir içeriğinin yanında demirin EMİLİMİNİ etkileyen öğelere de bakılır. Etin/balığın '
      + 'hem demiri %15-35 oranında emilirken, bitkisel demirin emilimi çoğu zaman %10’un '
      + 'altında kalır (Pişkin 2022).',
    rules: [
      { nutrient: 'ironMg', islec: '>=', value: 3.2, temel: 'porsiyon', seviye: 'ONERILIR',
        kaynak: 'EFSA2015',
        kaynakNot: 'EFSA 2015 (EFSA Journal 13(10):4254, özet s.1): demir için günlük referans alım '
          + '(PRI) premenopozal kadınlarda 16 mg, erkeklerde ve menopoz sonrası kadınlarda 11 mg. '
          + 'ÇEVRİM: 16 mg’ın %20’si = 3,2 mg. "%20’si zengin sayılır" kararı bize ait.',
        message: 'Bir porsiyonu {deger} mg demir veriyor — günlük ihtiyacın (16 mg) beşte birinden fazlası.' },

      { nutrient: 'ironMg', islec: '>=', value: 1.6, temel: 'porsiyon', seviye: 'ONERILIR',
        kaynak: 'EFSA2015',
        kaynakNot: 'EFSA 2015 (EFSA Journal 13(10):4254, özet s.1): demir için günlük referans '
          + 'alım (PRI) premenopozal kadında 16 mg/gün. ÇEVRİM: bu değerin %10’unu (1,6 mg) '
          + '"kayda değer demir kaynağı" sınırı saydık — %10 kararı BİZE AİT. '
          + 'NOT: aynı sayı kansizlik/0 kuralında da kullanılıyor; konum atfı iki kuralda ayrı '
          + 'ayrı yazılı ki tek bir kuralın notunu okuyan da kaynağı bulabilsin.',
        message: 'Bir porsiyonu {deger} mg demir veriyor; günlük ihtiyacın onda birinden fazlası.' },

      { kategoriler: ['Et-Balık'], seviye: 'ONERILIR',
        kaynak: 'PISKIN2022',
        kaynakNot: 'Pişkin 2022, s.20442: hem demiri yalnızca hayvansal ürünlerde bulunur, emilim '
          + 'oranı %15-35; etteki demirin %30-70’i hem formundadır. Bitkisel demirin emilimi '
          + 'çoğu zaman %10’un altındadır.',
        message: 'Hayvansal kaynak: içerdiği hem demiri, bitkisel demire göre çok daha iyi emilir.' },

      { nutrient: 'vitaminCMg', islec: '>=', value: 40, temel: 'porsiyon', seviye: 'ONERILIR',
        kaynak: 'PISKIN2022',
        kaynakNot: 'Pişkin 2022, s.20449: öğün başına 42,5 mg ve 85 mg askorbik asitin demir emilimini '
          + 'artırdığı çalışmalar aktarılıyor; askorbik asit fitat ve polifenollerin engelleyici '
          + 'etkisini de kısmen geri çeviriyor. ÇEVRİM: çalışmalardaki en düşük etkili doz olan '
          + '42,5 mg’ı 40 mg’a yuvarladık.',
        message: 'Bir porsiyonunda {deger} mg C vitamini var; demirli besinlerle aynı öğünde yenirse demir emilimini artırır.' },

      { nutrient: 'caffeineMg', islec: '>=', value: 1, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'PISKIN2022',
        kaynakNot: 'Pişkin 2022, s.20447: çay ve kahvedeki polifenoller demir emilimini doza bağlı '
          + 'olarak azaltıyor (50 mg polifenol %18, 200 mg %45). Kafeini burada "çay/kahve içeriyor" '
          + 'göstergesi olarak kullanıyoruz, çünkü veri tabanımızda polifenol değeri yok.',
        message: '100 g\u2019ında {deger} mg kafein var; kafein ve beraberindeki polifenoller demir emilimini azaltır — demirli öğünlerden 1-2 saat ayrı tüketin.' },

      { nutrient: 'calciumMg', islec: '>=', value: 100, temel: 'porsiyon', seviye: 'DIKKAT',
        kaynak: 'PISKIN2022',
        kaynakNot: 'Pişkin 2022, s.20449: öğüne eklenen 100-200 mg kalsiyum demir emilimini %18-27 '
          + 'azaltıyor. Eşik doğrudan çalışmadaki en düşük etkili doz (100 mg/öğün).',
        message: 'Bir porsiyonunda {deger} mg kalsiyum var; aynı öğündeki demirin emilimini %18-27 azaltabilir.' },
    ],
  },

  {
    key: 'bobrek',
    name: 'Kronik böbrek hastalığı',
    icon: '🫘',
    note: 'Potasyum, fosfor ve sodyum içeriğine göre değerlendirilir. DİKKAT: hedef değerler '
      + 'hastalığın evresine ve kan değerlerinize göre çok değişir — erken evrede potasyum '
      + 'kısıtlaması genellikle GEREKMEZ (Cupisti 2018). Mutlaka hekiminize/diyetisyeninize danışın.',
    rules: [
      { nutrient: 'potassiumMg', islec: '>=', value: 800, temel: 'porsiyon', seviye: 'RISKLI',
        kaynak: 'BETO2004',
        kaynakNot: 'Beto & Bansal 2004, Tablo 3, s.406: hemodiyaliz hastasında günlük potasyum '
          + '2000-3000 mg. Cupisti 2018 (Tablo 1) da hiperkalemi eğilimi olanlarda <3000 mg/gün diyor. '
          + 'ÇEVRİM: günde 3 ana öğün varsayımıyla öğün başına pay ≈ 2500/3 ≈ 830 mg; 800 mg’a '
          + 'yuvarladık. Öğün sayısı varsayımı bize ait.',
        message: 'Bir porsiyonunda {deger} mg potasyum var — potasyum kısıtlaması olan bir hastada tek başına bir öğünlük pay.' },

      { nutrient: 'potassiumMg', islec: '>=', value: 400, temel: 'porsiyon', seviye: 'DIKKAT',
        kaynak: 'BETO2004',
        kaynakNot: 'Beto & Bansal 2004, Tablo 3, s.406 (2000-3000 mg/gün). ÇEVRİM: öğün payının '
          + 'yaklaşık yarısı. Kuru baklagiller, kuruyemiş, kurutulmuş meyve-sebze, patates, koyu '
          + 'yeşil yapraklılar, muz ve pekmez yüksek potasyumlu grupta sayılıyor (Yıldız 2008, s.11).',
        message: 'Bir porsiyonunda {deger} mg potasyum var; potasyum kısıtlamanız varsa porsiyonu küçültün.' },

      { nutrient: 'phosphorusMg', islec: '>=', value: 450, temel: 'porsiyon', seviye: 'RISKLI',
        kaynak: 'BETO2004',
        kaynakNot: 'Beto & Bansal 2004, Tablo 3, s.406: diyaliz hastasında günlük fosfor 800-1000 mg. '
          + 'Vervloet 2017 (s.34) bir çalışmada 800 mg/gün kısıtlama uygulandığını aktarıyor. '
          + 'ÇEVRİM: 900/3 ≈ 300 mg öğün payı; 450 mg bunun 1,5 katı.',
        message: 'Bir porsiyonunda {deger} mg fosfor var — günlük 800-1000 mg sınırının yarısına yakın.' },

      { nutrient: 'phosphorusMg', islec: '>=', value: 300, temel: 'porsiyon', seviye: 'DIKKAT',
        kaynak: 'BETO2004',
        kaynakNot: 'Beto & Bansal 2004, Tablo 3, s.406 (800-1000 mg/gün). ÇEVRİM: 3 öğüne bölündü ≈ 300 mg. '
          + 'Not: Vervloet 2017 (s.33-34) bitkisel fosforun (fitat formunda) hayvansal fosfora göre '
          + 'daha az emildiğini, en kötüsünün katkı maddesi olarak eklenen inorganik fosfat olduğunu '
          + 'belirtiyor — veri tabanımız bu ayrımı yapamıyor.',
        message: 'Bir porsiyonunda {deger} mg fosfor var; günlük payınızın üçte birine yakın.' },

      ...fsaSodyum('RISKLI').map((k) => ({
        ...k,
        kaynakNot: k.kaynakNot + ' Böbrek hastalığında günlük sodyum hedefi 2000 mg’dır '
          + '(Beto & Bansal 2004, Tablo 3, s.406) — genel nüfus hedefinden daha sıkı.',
      })),
    ],
  },

  {
    key: 'reflu',
    name: 'Reflü (GÖRH)',
    icon: '🔥',
    note: 'ÖNEMLİ: "Reflüyü tetikleyen besinler" listeleri büyük ölçüde anekdota dayanıyor, '
      + 'sağlam kanıtı yok (Bucan 2025, s.19). ACG 2022 kılavuzu herkese aynı yasağı koymak yerine '
      + 'KİŞİSELLEŞTİRİLMİŞ yaklaşım öneriyor: sadece sizde gerçekten şikâyet yapan besinleri '
      + 'kısıtlayın. Bu yüzden burada hiçbir besini "riskli" diye işaretlemiyoruz; yalnızca '
      + 'deneyerek test etmeniz için not düşüyoruz.',
    rules: [
      { nutrient: 'fat', islec: '>', value: 17.5, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'BUCAN2025',
        kaynakNot: 'Bucan 2025, s.3: yağdan zengin öğünler alt özofagus sfinkterinin gevşemesini '
          + 'tetikleyen etkenler arasında sayılıyor (mekanizma düzeyinde). Eşik olarak FSA’nın '
          + '"yüksek yağlı" sınırı 17,5 g/100 g kullanıldı (FSA Annex 3, Tablo 2, s.19). '
          + 'KANIT DÜZEYİ DÜŞÜK: ACG 2022 önerisi koşullu.',
        message: 'Yağ oranı yüksek ({deger} g/100 g); yağlı öğünler bazı kişilerde şikâyeti artırabilir — sizde artırıyor mu, deneyerek görün.' },

      { nutrient: 'caffeineMg', islec: '>=', value: 1, temel: '100g', seviye: 'DIKKAT',
        kaynak: 'BUCAN2025',
        kaynakNot: 'Bucan 2025, s.19: kafein geleneksel "tetikleyici" listesinde yer alıyor, ancak '
          + 'yazarlar bu listelerin sağlam kanıta değil anekdota dayandığını açıkça belirtiyor.',
        message: '100 g\u2019ında {deger} mg kafein var; klasik tetikleyici listelerinde geçer ama kanıtı zayıf — kendi tepkinizi gözlemleyin.' },
    ],
  },

  // NOT: "Kilo kontrolü" burada bilerek YOK.
  // Bu proje hastalıklara göre besin değerlendiriyor; kilo bir hastalık değil.
  // Ayrıca porsiyon başına kalori sınırı diye bir şey literatürde yok (kalori
  // ihtiyacı kişiye göre değişir) ve kullandığımız FSA kılavuzu kaloriyi
  // renklendirmeyi açıkça reddediyor (Annex 3, s.19: "colour coding ... should
  // not be applied to energy information"). Kaynaksız tek eşiğimiz buradaydı;
  // hastalığı kaldırınca kaynaksız kural da kalmadı.

  // --- Kararı besin değerine değil, alerjen listesine dayanan hastalıklar ---
  {
    key: 'colyak',
    name: 'Çölyak hastalığı',
    icon: '🌾',
    note: 'Gluten içeren besinler kesinlikle tüketilmemelidir. "Glutensiz" etiketi için uluslararası '
      + 'sınır 20 mg/kg (20 ppm) glutendir (Codex Standard 118-1979). Veri tabanımız ppm ölçümü '
      + 'içermez; yalnızca besinin tarifinde gluten olup olmadığına bakarız.',
    rules: [],
  },
  {
    key: 'laktoz_intoleransi',
    name: 'Laktoz intoleransı',
    icon: '🥛',
    note: 'Süt ürünleri sindirim şikâyeti yapabilir; laktozsuz ürünler genelde sorun çıkarmaz.',
    rules: [],
  },

  // --- Elimizdeki veriyle otomatik değerlendirilemeyen hastalıklar ---
  // Sağlık uygulamasında yanlış "güvenli" demek, hiçbir şey dememekten tehlikelidir.
  {
    key: 'ibs',
    name: 'IBS (hassas bağırsak)',
    icon: '🌀',
    note: 'IBS değerlendirmesi için besinlerin FODMAP içeriği gerekir. Bu bilgi '
      + 'TürKomp veri tabanında yok; bu yüzden otomatik değerlendirme yapmıyoruz.',
    degerlendirilemez: true,
    rules: [],
  },
  {
    key: 'gut',
    name: 'Gut (ürik asit)',
    icon: '🦶',
    note: 'Gut değerlendirmesi için besinin pürin içeriği (mg/100 g) gerekir. Kaneko 2014 bu değerleri '
      + 'ölçmüş ve sınıflamış (çok düşük <50, düşük 50-100, orta 100-200, yüksek 200-300, çok yüksek '
      + '>300 mg/100 g; günlük hedef <400 mg), ancak kullandığımız iki veri tabanında da pürin sütunu '
      + 'yok — bu yüzden hesap yapamıyoruz. Ayrıca Afinogenova 2022: gut’ta tek başına diyet '
      + 'değişikliği ürik asidi genellikle anlamlı düşürmüyor; ACR 2020 kılavuzu alkol, pürin ve '
      + 'yüksek früktozlu mısır şurubunu sınırlamayı KOŞULLU olarak öneriyor.',
    degerlendirilemez: true,
    rules: [],
  },
];

// Bazı hastalıklar doğrudan bir alerjeni yasaklar ya da sınırlar.
const HASTALIK_ALERJEN = {
  colyak: [{ alerjen: 'gluten', seviye: 'RISKLI',
    kaynak: 'CODEX118',
    kaynakNot: 'Codex Standard 118-1979 (rev. 2008): "glutensiz" beyanı için üst sınır 20 mg/kg. '
      + 'Gluten içeren tarifler bu sınırın kat kat üstündedir.',
    message: 'Gluten içeriyor; çölyak hastalığında tüketilmemelidir.' }],
  laktoz_intoleransi: [{ alerjen: 'milk', seviye: 'DIKKAT',
    message: 'Süt içeriyor; laktoz intoleransında şikâyet yapabilir.' }],
};

// Kullanıcının seçebileceği alerjenler (Food.allergens ile aynı anahtarlar)
const ALERJENLER = {
  gluten: 'Gluten',
  milk: 'Süt',
  eggs: 'Yumurta',
  peanuts: 'Yer fıstığı',
  nuts: 'Kuruyemiş (fındık, badem, ceviz...)',
  soybeans: 'Soya',
  fish: 'Balık',
  crustaceans: 'Kabuklu deniz ürünleri',
  molluscs: 'Yumuşakçalar (midye, kalamar)',
  sesame: 'Susam',
  celery: 'Kereviz',
  mustard: 'Hardal',
  lupin: 'Acı bakla',
  sulphites: 'Sülfitler',
};

// Diyet tercihleri. Kategoriye göre değil, besinin "diyet etiketi"ne göre:
//   et | balik | deniz | yumurta | sut | bal
// Neden? Yumurta "Et-Balık" kategorisinde ama vejetaryenler yumurta yiyebilir;
// bal bitkisel kaynaklı ama veganlar tüketmez.
const DIYETLER = {
  'Normal': { yasakEtiket: [] },
  'Vejetaryen': { yasakEtiket: ['et', 'balik', 'deniz'] },
  'Vegan': { yasakEtiket: ['et', 'balik', 'deniz', 'yumurta', 'sut', 'bal'] },
  'Pesketaryen': { yasakEtiket: ['et'] },
  'Helal': { yasakEtiket: [] }, // veri tabanında domuz ürünü ve alkol yok
};

const ETIKET_ADI = {
  et: 'et', balik: 'balık', deniz: 'deniz ürünü',
  yumurta: 'yumurta', sut: 'süt ürünü', bal: 'bal',
};

module.exports = {
  HASTALIKLAR, HASTALIK_ALERJEN, ALERJENLER, DIYETLER, ETIKET_ADI, KAYNAKLAR,
  KURAL_ALANLARI,
};
