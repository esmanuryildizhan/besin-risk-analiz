// src/kvkk_metinleri.js
//
// KVKK aydınlatma metni ve açık rıza metni — TEK KAYNAK.
//
// NİYE BURADA (arayüzde değil): kullanıcının onayı veritabanına SÜRÜM
// numarasıyla kaydediliyor. Metin arayüzde dursaydı, metin değiştiğinde
// "kullanıcı tam olarak neye rıza verdi" sorusunun cevabı kaybolurdu.
//
// METİN DEĞİŞTİRİRSEN SÜRÜMÜ DE ARTIR. Sürüm artınca mevcut kullanıcılardan
// yeni onay isteniyor (index.js -> onayGerekliMi).
//
// ───────────────────────────────────────────────────────────────────────────
// ⚠ Bu metinler hukukçu tarafından yazılmamıştır; şablondur.
//
// ⚠ DEMO İBARESİ: metin şu an "demo ortamı, gerçek sağlık verisi girilmemeli"
//   diyor (bölüm 3 ve 9). Bu, güvenli varsayılan: demo olarak yayınlanan bir
//   uygulamada gerçek kişisel veri işlenmediği için KVKK yükümlülüğü doğmuyor
//   (KVKK m.28, GDPR m.2(2)(c) ile aynı mantık).
//
//   GERÇEK KULLANICI ALINACAKSA bu ibareler kaldırılmalı VE şunlar
//   tamamlanmalı: saklama/imha politikası, ihlal bildirimi süreci, VERBİS
//   değerlendirmesi, yurt dışı aktarım dayanağı (sunucu Türkiye dışında
//   olduğu için KVKK m.9 devreye giriyor). Ayrıntı:
//   claude/guvenlik-kararlari-ve-sizma-analizi.md
// ───────────────────────────────────────────────────────────────────────────
//
// BİÇİM NOTU: metinde kalın (**) vurgu KULLANILMIYOR — proje sahibinin
// tercihi. Yalnızca bölüm başlıkları ayrışıyor. Veri sorumlusu bilgisi
// metnin SONUNDA, kendi başlığı altında duruyor; bu KVKK m.10/a'nın
// "veri sorumlusunun kimliği" şartını karşılıyor, çünkü şart bilginin
// VERİLMESİDİR, en başta durması değil.
//
// NİYE HAZIR BİR METİN KOPYALANMADI: KVKK Kurulu'nun 18.02.2026 tarih ve
// 2026/347 sayılı ilke kararı, başka kurumların metinlerinin birebir
// kopyalanmasını ve "Kanun'un 5 ve 6'ncı maddeleri kapsamında" gibi muğlak
// ifadeleri aykırılık sayıyor.
//
// Aynı karar gereği aydınlatma ve açık rıza AYRI metinler; aydınlatma için
// "kabul ediyorum" değil "okudum ve anladım" beyanı alınıyor.

// SÜRÜM GEÇMİŞİ — bu sayı artınca TÜM kullanıcılardan yeniden rıza isteniyor
// (src/index.js, rizaYenilenmeliMi). Metnin zorunlu içeriği değişmedikçe
// artırılmaz; biçim düzeltmesi için artırmak kullanıcıyı boşuna yorar.
//   1.5 — veri sorumlusu bilgileri projeye taşındı (7 Ekim 2026): iletişim
//         adresi proje adresi oldu, veri sorumlusu adı "Besin Risk Analiz
//         Ekibi" yazıldı. Geliştiricinin kişisel adresi ve adı her
//         kullanıcıya görünüyordu. Ad konusundaki hukuki uyarı için
//         VERI_SORUMLUSU sabitinin başındaki nota bakın.
//   1.4 — saklama ve imha politikası eklendi (bölüm 5).
const SURUM = '1.5';
const SURUM_TARIHI = '7 Ekim 2026';

// Veri sorumlusunun iletişim adresi. KVKK m.10/a ve GDPR m.13(1)(a) bunu
// zorunlu kılıyor: kullanıcı haklarını kullanmak için başvuracak bir adres
// görmek zorunda.
//
// NİYE SABİT, NİYE ORTAM DEĞİŞKENİ DEĞİL: bu adres aydınlatma metninin
// parçası, yani değişmesi METNİN değişmesi demek — ve metin değişince
// SURUM artmalı, yoksa kullanıcılar artık geçerli olmayan bir sürüme rıza
// vermiş sayılır. Ortam değişkeninden okunsa, Render'da adresi değiştirmek
// metni sessizce değiştirir ve SURUM artışı atlanır. Kodda durunca değişiklik
// git'te görünüyor ve SURUM kararı mecburen önüne geliyor.
//
// Gönderen adresi (MAIL_GONDEREN) ayrı ve ortam değişkeni: o dağıtım ayarı,
// hukuki metnin parçası değil. İkisinin aynı adres olması beklenir ama
// zorunlu değil.
const ILETISIM = 'besinrisk@gmail.com';

// Veri sorumlusunun adı.
//
// ⚠ AÇIK UYARI — GERÇEK KULLANICI ALINMADAN ÖNCE OKUNACAK:
// "Besin Risk Analiz Ekibi" hukuken bir KİŞİ DEĞİL. KVKK m.10/a ve GDPR
// m.13(1)(a) veri sorumlusunun KİMLİĞİNİ istiyor; bu ya bir gerçek kişi
// (ad soyad) ya da bir tüzel kişi (şirket, dernek, vakıf) olabilir. Kayıtlı
// olmayan bir ekip adı bu şartı KARŞILAMIYOR.
//
// Bu hâliyle bırakılmasının sebebi: ortam demo, gerçek kullanıcı yok ve
// proje sahibi kişisel adının her kullanıcıya görünmesini istemiyor. Demo
// aşamasında taşınabilir bir eksiklik.
//
// GERÇEK KULLANICI ALINIRSA buraya ya proje sahibinin adı soyadı ya da
// kurulacak tüzel kişinin unvanı yazılmalı ve SURUM artırılmalı. Aksi hâlde
// kullanıcı, haklarını kime karşı kullanacağını bilmiyor demektir.
const VERI_SORUMLUSU = 'Besin Risk Analiz Ekibi';

// ═══════════════════════════════════════════════════════════════════════════
// AYDINLATMA METNİ — bilgilendirme. Onay istenmez, beyan "okudum ve anladım".
// ═══════════════════════════════════════════════════════════════════════════
const AYDINLATMA = `
Besin Risk Analiz Sistemi'ni kullanırken paylaştığınız kişisel verilerin
nasıl işlendiği aşağıda açıklanmıştır. Bu metin 6698 sayılı Kişisel Verilerin
Korunması Kanunu'nun 10'uncu maddesi kapsamında hazırlanmıştır.

## 1. İşlenen Kişisel Verileriniz

- Kimlik ve iletişim: ad, soyad, e-posta adresi.
- Sağlık verisi (özel nitelikli kişisel veri): bildirdiğiniz kronik
  rahatsızlıklar, besin alerjileriniz ve yüklediğiniz kan tahlili
  raporundaki test sonuçları.
- Diğer: cinsiyet, diyet tercihi, günlük kalori ve su kayıtlarınız.

Şifreniz saklanmaz; yalnızca geri döndürülemeyen özeti tutulur.

## 2. İşleme Amaçları

Verileriniz yalnızca şu amaçlarla işlenir:

- Hesabınızın oluşturulması ve girişinizin sağlanması,
- Bildirdiğiniz hastalık ve alerjilere göre besinlerin sizin için risk
  düzeyinin hesaplanıp gerekçeleriyle gösterilmesi,
- Tahlil sonuçlarınızın, raporu düzenleyen laboratuvarın kendi referans
  aralığına göre gösterilmesi,
- Günlük kalori ve su kayıtlarınızın saklanıp size geri sunulması.

Verileriniz reklam, pazarlama veya profilleme amacıyla kullanılmaz; üçüncü
kişilere satılmaz veya devredilmez.

## 3. Kişisel Verilerinizin Aktarılması

Verileriniz, uygulamanın çalışabilmesi için aşağıdaki hizmet sağlayıcıların
sistemlerinde saklanır:

- Veritabanı: Neon (sunucu konumu: Frankfurt, Almanya),
- Uygulama sunucusu: Render (sunucu konumu: Frankfurt, Almanya),
- Arayüz dağıtımı: Vercel.

Sunucular Türkiye dışında bulunduğundan, verilerin saklanması 6698 sayılı
Kanun'un 9'uncu maddesi anlamında yurt dışına aktarım niteliğindedir. Bu
nedenle uygulama DEMO ORTAMI olarak sunulmaktadır ve gerçek sağlık verisi
girilmemesi gerekir (bkz. bölüm 8).

Bunun dışında, yetkili kamu kurum ve kuruluşlarının mevzuattan doğan talepleri
saklı kalmak üzere hiçbir kişi veya kuruma aktarılmaz. Verileriniz reklam ve
pazarlama amacıyla hiçbir üçüncü tarafa verilmez.

## 4. Toplama Yöntemi ve Hukuki Sebebi

Verileriniz tamamen elektronik ortamda, doğrudan sizin tarafınızdan kayıt ve
profil formları ile tahlil ekranından yüklediğiniz PDF aracılığıyla toplanır.
Uygulama başka hiçbir kaynaktan veri toplamaz.

Bu uygulamanın kullanımı zorunlu değildir. Bu nedenle sağlık verileriniz dâhil
tüm verileriniz yalnızca açık rızanıza dayanılarak işlenir (6698 sayılı Kanun
m.6/2).

## 5. Saklama Süresi ve İmha

Verileriniz süresiz saklanmaz. Saklama süresi, verinin işlenme amacına
bağlıdır: amaç, besinleri sizin sağlık profilinize göre değerlendirmektir ve
uygulamayı kullanmayı bıraktığınızda bu amaç ortadan kalkar.

Bu nedenle 180 gün boyunca giriş yapılmayan hesaplar, içindeki tüm verilerle
birlikte otomatik olarak silinir. Silme işleminden 14 gün önce e-posta
adresinize uyarı gönderilir; bu süre içinde giriş yapmanız hesabınızın
silinmesini önler.

Hesabınızı dilediğiniz an Profil ekranından kendiniz de silebilirsiniz. Her
iki durumda da hastalık ve alerji kayıtlarınız, tahlil sonuçlarınız, günlük
takip kayıtlarınız ve hesap bilgileriniz geri dönüşsüz biçimde silinir.

Yüklediğiniz tahlil raporu (PDF) hiçbir aşamada diske yazılmaz; yalnızca
bellekte okunur ve okunan değerlerden sizin onayladıklarınız kaydedilir.

## 6. Haklarınız

6698 sayılı Kanun'un 11'inci maddesi uyarınca; kişisel verinizin işlenip
işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve
amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü
kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini veya
yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini
isteme, münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç
doğmasına itiraz etme ve kanuna aykırı işleme sebebiyle zararınızın
giderilmesini talep etme haklarına sahipsiniz.

Taleplerinizi aşağıdaki e-posta adresine iletebilirsiniz. Ayrıca hesabınızı
ve tüm verilerinizi Profil ekranından kendiniz silebilirsiniz.

## 7. Önemli Uyarı

Uygulama girdiğiniz verileri otomatik olarak değerlendirir. Bu değerlendirme
tıbbi teşhis veya tedavi önerisi değildir ve hekim görüşünün yerine geçmez.
Sağlığınızla ilgili kararlar için hekiminize başvurunuz.

## 8. Demo Ortamı Uyarısı — Önemli

Bu uygulama bir öğrenme ve geliştirme projesidir ve demo ortamı olarak
sunulmaktadır. Gerçek sağlık verinizi girmeyiniz. Denemek için gerçek olmayan
hastalık, alerji ve tahlil bilgileri kullanınız.

Sebebi: sunucular Türkiye dışında bulunmakta ve bu proje bir kurumun değil tek
bir kişinin geliştirdiği kişisel bir çalışmadır. Gerçek sağlık verisi işlemek,
6698 sayılı Kanun kapsamında yurt dışına aktarım dayanağı, saklama ve imha
politikası ile veri ihlali bildirim süreci gibi yükümlülükler doğurur; bu
ortamda bunlar sağlanmamıştır.

Hesabınızı ve girdiğiniz tüm verileri profil ekranından dilediğiniz an
silebilirsiniz.

## 9. Veri Sorumlusu ve İletişim

Besin Risk Analiz Sistemi, İstanbul Beykent Üniversitesi'nde bir öğrenci
projesi olarak geliştirilmiştir. Üniversite bu proje bakımından veri
sorumlusu değildir.

Kanun kapsamında veri sorumlusu: ${VERI_SORUMLUSU}
İletişim: ${ILETISIM}
`.trim();

// ═══════════════════════════════════════════════════════════════════════════
// AÇIK RIZA METNİ — ayrı metin, ayrı başlık, ayrı ve açık seçim.
// ═══════════════════════════════════════════════════════════════════════════
const ACIK_RIZA = `
Aydınlatma metnini okuyup anladığımı beyan ederim.

Kronik rahatsızlıklarım, besin alerjilerim ve kan tahlili sonuçlarım özel
nitelikli kişisel verilerimdir. Bu verilerimin, aydınlatma metninde belirtilen
amaçlarla — besinlerin benim için risk düzeyinin hesaplanması ve kayıtlarımın
hesabım var olduğu sürece saklanması amacıyla — işlenmesine ve uygulamanın
barındırıldığı sağlayıcı sistemlerinde saklanmasına açık rızamla onay
veriyorum.

Rızamı dilediğim zaman geri çekebileceğimi ve geri çekmem hâlinde hesabımla
birlikte tüm verilerimin silineceğini biliyorum.
`.trim();

module.exports = {
  SURUM, SURUM_TARIHI, ILETISIM, VERI_SORUMLUSU, AYDINLATMA, ACIK_RIZA,
};
