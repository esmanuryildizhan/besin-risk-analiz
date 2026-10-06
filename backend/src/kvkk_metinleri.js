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
// ⚠ DOLDURULACAK 1 YER kaldı: [SAĞLAYICI ADI VE SUNUCU KONUMU].
//   Barındırma seçilince (Render/Neon gibi) doldurulacak.
// ⚠ Bu metinler hukukçu tarafından yazılmamıştır; şablondur.
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

const SURUM = '1.2';
const SURUM_TARIHI = '7 Ekim 2026';

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

Verileriniz, uygulamanın çalışabilmesi için barındırma ve veritabanı hizmeti
alınan [SAĞLAYICI ADI VE SUNUCU KONUMU] sistemlerinde saklanır. Bunun dışında,
yetkili kamu kurum ve kuruluşlarının mevzuattan doğan talepleri saklı kalmak
üzere hiçbir kişi veya kuruma aktarılmaz.

## 4. Toplama Yöntemi ve Hukuki Sebebi

Verileriniz tamamen elektronik ortamda, doğrudan sizin tarafınızdan kayıt ve
profil formları ile tahlil ekranından yüklediğiniz PDF aracılığıyla toplanır.
Uygulama başka hiçbir kaynaktan veri toplamaz.

Bu uygulamanın kullanımı zorunlu değildir. Bu nedenle sağlık verileriniz dâhil
tüm verileriniz yalnızca açık rızanıza dayanılarak işlenir (6698 sayılı Kanun
m.6/2). Verileriniz hesabınız var olduğu sürece saklanır; hesabınızı
sildiğinizde tüm kayıtlarınız geri dönüşsüz biçimde silinir.

## 5. Haklarınız

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

## 6. Önemli Uyarı

Uygulama girdiğiniz verileri otomatik olarak değerlendirir. Bu değerlendirme
tıbbi teşhis veya tedavi önerisi değildir ve hekim görüşünün yerine geçmez.
Sağlığınızla ilgili kararlar için hekiminize başvurunuz.

## 7. Veri Sorumlusu ve İletişim

Besin Risk Analiz Sistemi, İstanbul Beykent Üniversitesi öğrencisi Esma Nur
Yıldızhan tarafından kişisel olarak geliştirilen bir projedir. Üniversite bu
proje bakımından veri sorumlusu değildir.

Kanun kapsamında veri sorumlusu: Esma Nur Yıldızhan
İletişim: esmanuryildizhan02@gmail.com
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

module.exports = { SURUM, SURUM_TARIHI, AYDINLATMA, ACIK_RIZA };
