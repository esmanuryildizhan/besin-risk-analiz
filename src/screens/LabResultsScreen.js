// src/screens/LabResultsScreen.js
//
// Tahlil sonuçları: PDF yükleme, karşılaştırma, beslenme önerisi.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle, X, ChevronRight, Save, CheckCircle, FileText,
  TrendingUp, Upload, Leaf, Loader2,
} from 'lucide-react';
import { api } from '../api';
import { Modal } from '../components/ortak';
import { DemoUyarisi } from '../kvkk/KvkkBilesenleri';

/**
 * Bir sonucun rozeti. ETİKET TAMAMEN PDF'TEN GELİYOR — bizim koyduğumuz bir
 * eşik yok.
 *
 * RENK KURALI — 3 Ekim 2026'da düzeltildi.
 * İlk sürümde "düşük" kehribar, "yüksek" kırmızıydı. Bu YANLIŞTI: düşük bir
 * değeri yüksek bir değerden daha az ciddi saymak tıbbi bir hüküm ve bizim
 * uydurduğumuz bir ayrımdı. PDF bir değerin aralık DIŞINDA olduğunu söylüyor,
 * ne kadar ciddi olduğunu söylemiyor. Düşük ferritin ile yüksek bir değerin
 * hangisinin daha önemli olduğuna karar vermek bu uygulamanın işi değil.
 *
 * Yeni kural: renk yalnızca kaynağın söylediğini yansıtır.
 *   YEŞİL    laboratuvarın aralığı içinde ya da laboratuvarın "iyi" kademesi
 *   KEHRİBAR YALNIZCA laboratuvarın kendisi bir ARA kademe tanımlamışsa
 *            ("Sınırda yüksek", "Orta derecede risk", "Bozulmuş açlık glukozu")
 *   KIRMIZI  aralık dışı, ya da laboratuvarın olumsuz kademesi
 *
 * Yani kehribar bizim "bu daha az ciddi" dememizden değil, laboratuvarın
 * iyi ile kötü arasına bir basamak koymuş olmasından geliyor. Laboratuvar
 * yalnızca alt/üst sınır veriyorsa iki durum vardır: içinde ya da dışında.
 */
const IYI_ETIKETLER = ['normal', 'Normal', 'Optimum', 'Risk yok'];

// Laboratuvarın KENDİ ara kademeleri. Buraya yalnızca PDF'te geçen, iyi ile
// kötü arasına konmuş basamaklar yazılır.
const ARA_ETIKETLER = [
  'Sınırda yüksek', 'Orta derecede risk', 'Optimuma yakın/optimum düzeyin üzerinde',
  'Bozulmuş açlık glukozu',
];

const TahlilRozeti = ({ yorum, aralik }) => {
  if (!yorum) {
    return <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold">YORUM YOK</span>;
  }
  let stil = 'bg-red-100 text-red-700';          // tanınmayan etiket güvenli tarafta: dikkat
  if (IYI_ETIKETLER.includes(yorum)) stil = 'bg-green-100 text-green-700';
  else if (ARA_ETIKETLER.includes(yorum)) stil = 'bg-amber-100 text-amber-800';
  return (
    <span className={`text-xs px-3 py-1 rounded-lg font-bold ${stil}`}
      title={aralik ? `Laboratuvarınızın aralığı: ${aralik}` : ''}>
      {yorum.toLocaleUpperCase('tr')}
    </span>
  );
};

/**
 * Ayrıştırma uyarıları.
 *
 * NİYE İKİYE AYRILDI: eskiden hepsi "Okunamayan bilgiler" başlığı altında tek
 * listede gösteriliyordu. Gerçek bir e-Nabız raporunda ÖLÇÜLDÜ (8 Ekim 2026):
 * hemogram panelinde referans aralığı BASILMIYOR — biyokimyada basılıyor
 * ("AFP 9.20 µg/L 0 - 8"), hemogramda basılmıyor ("BASO# 0.05 x10^9/L").
 * Sonuç: tamamen normal bir rapor, 28 satırlık bir hata yığını gibi
 * görünüyordu ve kullanıcı uygulamanın bozuk olduğunu sanıyordu.
 *
 * Değerler zaten kaydediliyordu; yanlış olan tek şey sunumdu. Artık:
 *  - gerçekten okunamayan satırlar (hata) kırmızımsı kutuda,
 *  - raporda aralığı olmayan testler (hata değil) nötr kutuda, açıklamasıyla.
 */
const AyristirmaUyarilari = ({ uyarilar }) => {
  if (!uyarilar || !uyarilar.length) return null;
  // Eski sürümlerden düz metin gelirse de bozulmasın.
  const duz = uyarilar.filter((u) => typeof u === 'string');
  const tur = (t) => uyarilar.filter((u) => u && u.tur === t);
  const okunamadi = tur('okunamadi');
  const aralikYok = tur('aralikYok');
  const kisisel = tur('kisiselAtlandi');

  return (
    <div className="space-y-3 mb-6">
      {(okunamadi.length > 0 || duz.length > 0) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
          <strong className="block mb-1">Okunamayan satırlar</strong>
          <p className="mb-2 text-red-700/90">
            Bu testlerin sonucu PDF&apos;ten çıkarılamadı; kaydedilmeyecekler.
          </p>
          {[...okunamadi.map((u) => u.ad), ...duz].join(' · ')}
        </div>
      )}

      {kisisel.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 px-5 py-4 rounded-2xl text-sm">
          <strong className="block mb-1">Kişisel bilgi içeren satırlar atlandı</strong>
          <p>
            Raporunuzdaki ad, doğum tarihi gibi satırlar kasıtlı olarak
            okunmadı ve hiç kaydedilmiyor.
          </p>
        </div>
      )}

      {aralikYok.length > 0 && (
        <details className="bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl text-sm">
          <summary className="px-5 py-4 cursor-pointer font-bold select-none">
            {aralikYok.length} testin referans aralığı raporda yok
          </summary>
          <div className="px-5 pb-4">
            <p className="mb-2">
              Bu <strong>bir hata değil</strong>: değerler okundu ve kaydedilecek.
              e-Nabız, hemogram (tam kan sayımı) panelinde referans aralığı
              basmıyor; biyokimya ve idrar panellerinde basıyor.
            </p>
            <p className="mb-3">
              Aralık olmadığı için bu testler için &quot;yüksek / düşük&quot; yorumu
              yapılmıyor; değerin kendisi kaydediliyor ve geçmişle
              karşılaştırılabiliyor.
            </p>
            <p className="text-gray-600">{aralikYok.map((u) => u.ad).join(' · ')}</p>
          </div>
        </details>
      )}
    </div>
  );
};

const SonucSatiri = ({ t, secili, onSec }) => (
  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition
    ${secili ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
    {onSec && (
      <input type="checkbox" checked={secili} onChange={onSec}
        className="w-4 h-4 accent-green-600 shrink-0" />
    )}
    <div className="min-w-0 flex-1">
      <span className="font-semibold text-gray-700 block truncate">{t.testName}</span>
      <span className="text-xs text-gray-500">
        {t.refLow !== null && t.refLow !== undefined ? `Ref: ${t.refLow}` : ''}
        {t.refHigh !== null && t.refHigh !== undefined ? `${t.refLow !== null && t.refLow !== undefined ? '–' : 'Ref: ≤'}${t.refHigh}` : ''}
        {t.unit ? ` ${t.unit}` : ''}
        {(t.refLow === null || t.refLow === undefined) && (t.refHigh === null || t.refHigh === undefined)
          ? 'Referans aralığı PDF\'te yok' : ''}
      </span>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className="font-bold text-gray-800">
        {t.valueOp ? `${t.valueOp} ` : ''}
        {t.value !== null && t.value !== undefined ? t.value : (t.textValue || '—')}
        {t.unit ? <span className="text-gray-500 font-normal"> {t.unit}</span> : null}
      </span>
      <TahlilRozeti yorum={t.pdfYorumu} aralik={t.pdfAralik} />
    </div>
  </label>
);

export const LabResultsScreen = () => {
  const [tahliller, setTahliller] = useState([]);
  const [oneriVerisi, setOneriVerisi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [okunan, setOkunan] = useState(null);
  const [secimler, setSecimler] = useState({});
  const [islemde, setIslemde] = useState(false);
  const [karsilastirAcik, setKarsilastirAcik] = useState(false);
  const [acikTarih, setAcikTarih] = useState(null);
  const dosyaRef = useRef(null);

  const listeyiYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [liste, oneri] = await Promise.all([api.tahlilleriGetir(), api.tahlilOnerileri()]);
      setTahliller(liste.tahliller || []);
      setOneriVerisi(oneri);
      if ((liste.tahliller || []).length) setAcikTarih(liste.tahliller[0].tarih);
    } catch (e) { setHata(e.message); } finally { setYukleniyor(false); }
  }, []);

  useEffect(() => { listeyiYukle(); }, [listeyiYukle]);

  // Sunucu da 2 MB sınırı uyguluyor; buradaki kontrol onun yerine geçmiyor,
  // kullanıcıyı boşuna bekletmemek için. Büyük dosya yüklenip sonunda
  // reddedilmesi yerine seçildiği anda söylüyoruz.
  const PDF_SINIRI_MB = 3;

  const dosyaSecildi = async (e) => {
    const dosya = e.target.files && e.target.files[0];
    if (!dosya) return;
    setHata(''); setMesaj('');
    if (dosya.size > PDF_SINIRI_MB * 1024 * 1024) {
      const boyut = (dosya.size / (1024 * 1024)).toFixed(1);
      setHata(`Dosya ${boyut} MB. En fazla ${PDF_SINIRI_MB} MB olabilir. `
        + 'Tahlil raporları genelde 1 MB\'ın altındadır.');
      if (dosyaRef.current) dosyaRef.current.value = '';
      return;
    }
    setIslemde(true);
    try {
      const veri = await api.tahlilOku(dosya);
      setOkunan(veri);
      const ilk = {};
      veri.testler.forEach((t, i) => { ilk[i] = true; });
      setSecimler(ilk);
    } catch (h) { setHata(h.message); } finally {
      setIslemde(false);
      if (dosyaRef.current) dosyaRef.current.value = '';
    }
  };

  const kaydet = async () => {
    if (!okunan) return;
    const secilen = okunan.testler.filter((t, i) => secimler[i]);
    if (!secilen.length) { setHata('Kaydedilecek test seçilmedi.'); return; }
    setIslemde(true); setHata('');
    try {
      await api.tahlilKaydet(okunan.tarih, secilen);
      setMesaj(`${secilen.length} sonuç kaydedildi.`);
      setOkunan(null); setSecimler({});
      await listeyiYukle();
      setTimeout(() => setMesaj(''), 4000);
    } catch (e) { setHata(e.message); } finally { setIslemde(false); }
  };

  const sil = async (tarih) => {
    setIslemde(true); setHata('');
    try { await api.tahlilSil(tarih); await listeyiYukle(); }
    catch (e) { setHata(e.message); } finally { setIslemde(false); }
  };

  const secimSayisi = Object.values(secimler).filter(Boolean).length;
  const oneriler = (oneriVerisi && oneriVerisi.oneriler) || [];

  // --- Karşılaştırma tablosu: aynı testin tarihlere göre değerleri -----------
  // Yalnızca BİRDEN FAZLA tarihte ölçülmüş testler gösteriliyor; tek seferlik
  // bir sonucun "karşılaştırması" olmaz.
  const karsilastirma = (() => {
    const tarihler = tahliller.map((t) => t.tarih).slice(0, 6);
    const harita = new Map();
    tahliller.slice(0, 6).forEach((grup) => {
      grup.testler.forEach((t) => {
        if (!harita.has(t.testName)) harita.set(t.testName, {});
        harita.get(t.testName)[grup.tarih] = t;
      });
    });
    const satirlar = [...harita.entries()]
      .filter(([, degerler]) => Object.keys(degerler).length >= 2)
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
    return { tarihler, satirlar };
  })();

  return (
    <div className="p-6 sm:p-10 max-w-[1200px] mx-auto">
      {/* ---------- KARŞILAŞTIRMA PENCERESİ ---------- */}
      <Modal isOpen={karsilastirAcik} onClose={() => setKarsilastirAcik(false)}
        title="Tahlil Karşılaştırma" genis>
        {karsilastirma.satirlar.length === 0 ? (
          <p className="text-gray-500">
            Karşılaştırma için aynı testin en az iki farklı tarihte ölçülmüş olması gerekiyor.
            Şu an {tahliller.length} tahlil kayıtlı.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Aynı testin tarihlere göre değerleri. Renkler laboratuvarınızın kendi aralığından geliyor.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-600 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Test</th>
                    {karsilastirma.tarihler.map((t) => (
                      <th key={t} className="px-4 py-3 whitespace-nowrap">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {karsilastirma.satirlar.map(([ad, degerler]) => (
                    <tr key={ad} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-800">{ad}</td>
                      {karsilastirma.tarihler.map((tarih) => {
                        const t = degerler[tarih];
                        if (!t) return <td key={tarih} className="px-4 py-3 text-gray-500">—</td>;
                        return (
                          <td key={tarih} className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-gray-800">
                              {t.valueOp ? `${t.valueOp} ` : ''}
                              {t.value !== null && t.value !== undefined ? t.value : (t.textValue || '—')}
                            </span>
                            {t.unit ? <span className="text-gray-500"> {t.unit}</span> : null}
                            <span className="ml-2 inline-block align-middle">
                              <TahlilRozeti yorum={t.pdfYorumu} aralik={t.pdfAralik} />
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* ---------- BAŞLIK ---------- */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Tahlil Sonuçlarım</h1>
          <p className="text-gray-500">
            Tahlil sonucunuzu PDF olarak yükleyin. Sonuçlar okunur, siz onaylarsınız, sonra kaydedilir.
          </p>
        </div>
        <div className="mb-5"><DemoUyarisi /></div>
        <div className="flex gap-3">
          <input ref={dosyaRef} type="file" accept="application/pdf,.pdf"
            onChange={dosyaSecildi} className="hidden" />
          <button onClick={() => dosyaRef.current && dosyaRef.current.click()} disabled={islemde}
            className="bg-green-50 text-green-700 px-6 py-3 rounded-xl font-bold border border-green-200 flex items-center gap-2 hover:bg-green-100 transition disabled:opacity-50">
            {islemde ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />} PDF Yükle
          </button>
          <button onClick={() => setKarsilastirAcik(true)} disabled={tahliller.length < 2}
            title={tahliller.length < 2 ? 'En az iki tahlil gerekiyor' : ''}
            className="bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-green-800 transition disabled:opacity-40 disabled:shadow-none">
            <TrendingUp size={20} /> Karşılaştır
          </button>
        </div>
      </div>

      {hata && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertCircle size={18} /> {hata}
        </div>
      )}
      {mesaj && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
          <CheckCircle size={18} /> {mesaj}
        </div>
      )}

      {/* ---------- ONAY ---------- */}
      {okunan && (
        <div className="bg-white rounded-3xl border p-8 mb-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
            <h2 className="text-xl font-bold text-gray-800">
              Okunan sonuçlar {okunan.tarih ? `— ${okunan.tarih}` : ''}
            </h2>
            <span className="text-sm text-gray-500">{secimSayisi} / {okunan.testler.length} seçili</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Yanlış okunan bir satır varsa işaretini kaldırın; yalnızca seçtikleriniz kaydedilir.
          </p>
          <AyristirmaUyarilari uyarilar={okunan.uyarilar} />
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
            {okunan.testler.map((t, i) => (
              <SonucSatiri key={`${t.testName}-${i}`} t={t} secili={!!secimler[i]}
                onSec={() => setSecimler({ ...secimler, [i]: !secimler[i] })} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-8">
            <button onClick={kaydet} disabled={islemde || !secimSayisi}
              className="bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50">
              {islemde ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Seçilenleri kaydet
            </button>
            <button onClick={() => { setOkunan(null); setSecimler({}); }} disabled={islemde}
              className="px-8 py-4 rounded-xl font-bold border bg-white hover:bg-gray-50 transition">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ---------- BESLENME ÖNERİSİ ---------- */}
      {oneriler.length > 0 && (
        <div className="bg-green-50 rounded-3xl border border-green-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-green-800 mb-2 flex items-center gap-3">
            <Leaf className="text-green-700" size={22} /> Tahlilinize göre
          </h2>
          <p className="text-sm text-green-700/80 mb-6">
            Laboratuvarınızın aralığının altında kalan değerler için, veri tabanındaki
            o besin öğesinden en zengin besinler. Porsiyon başına sıralı.
          </p>
          <div className="space-y-6">
            {oneriler.map((o) => (
              <div key={o.test} className="bg-white rounded-2xl p-6 border border-green-100">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                  <h3 className="font-bold text-gray-800">{o.test}</h3>
                  <span className="font-bold text-red-700">
                    {o.deger}{o.birim ? ` ${o.birim}` : ''}
                  </span>
                  <span className="text-sm text-gray-500">
                    (laboratuvar aralığı {o.refAlt ?? ''}{o.refUst !== null && o.refUst !== undefined ? `–${o.refUst}` : ''})
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-5">{o.eslesmeNotu}</p>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  {o.besinOgesi.charAt(0).toLocaleUpperCase('tr') + o.besinOgesi.slice(1)} açısından en zengin besinler:
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {o.besinler.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border">
                      <span className="text-sm text-gray-700 truncate">
                        {b.icon} {b.name}
                        <span className="block text-xs text-gray-500">{b.portionName}</span>
                      </span>
                      <span className="text-sm font-bold text-green-700 shrink-0">
                        {b.miktar} {o.besinOgesiBirimi}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {oneriVerisi && oneriVerisi.eslesmeyen && oneriVerisi.eslesmeyen.length > 0 && (
            <p className="mt-6 text-xs text-green-700/70">
              Şu düşük sonuçlar için besin eşleşmesi yok (yenen bir besin öğesine karşılık gelmiyorlar):{' '}
              {oneriVerisi.eslesmeyen.join(', ')}.
            </p>
          )}
          <p className="mt-6 text-xs text-green-700/70 leading-relaxed">
            Bu bir tedavi önerisi değildir. Değerleriniz laboratuvarınızın aralığına, besin
            içerikleri TürKomp'a dayanıyor. Ne yapmanız gerektiğine hekiminiz karar verir.
          </p>
        </div>
      )}

      {/* ---------- GEÇMİŞ KAYITLAR ---------- */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Geçmiş Kayıtlar</h2>
      {yukleniyor ? (
        <div className="flex items-center gap-3 text-gray-500 py-10 justify-center">
          <Loader2 className="animate-spin" /> Yükleniyor…
        </div>
      ) : tahliller.length === 0 ? (
        <div className="bg-gray-50 border rounded-3xl p-10 text-center text-gray-500">
          Henüz kayıtlı tahlil yok. Yukarıdan tahlil sonucunuzun PDF'ini yükleyin.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border p-4 sm:p-6">
          {tahliller.map((t) => (
            <div key={t.tarih} className="border-b last:border-0 py-2">
              <div className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-2xl transition group">
                <button onClick={() => setAcikTarih(acikTarih === t.tarih ? null : t.tarih)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left">
                  <div className="p-3 bg-green-50 rounded-xl text-green-700 group-hover:bg-white transition shrink-0">
                    <FileText size={22} />
                  </div>
                  <span className="min-w-0">
                    <span className="font-bold text-gray-700 block truncate">{t.tarih} tahlili</span>
                    <span className="text-sm text-gray-500">
                      {t.testler.length} test
                      {t.araliginDisinda > 0 ? ` · ${t.araliginDisinda} sonuç aralığın dışında` : ''}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => sil(t.tarih)} disabled={islemde}
                    className="text-gray-500 hover:text-red-500 transition disabled:opacity-40"
                    aria-label="Bu tahlili sil"><X size={18} /></button>
                  <ChevronRight size={22}
                    className={`text-gray-500 transition ${acikTarih === t.tarih ? 'rotate-90' : ''}`} />
                </div>
              </div>
              {acikTarih === t.tarih && (
                <div className="space-y-2 px-4 pb-4 pt-2">
                  {t.testler.map((x) => <SonucSatiri key={x.id} t={x} secili />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-gray-500 leading-relaxed max-w-3xl">
        Bu ekran tahlil sonuçlarınızı kaydeder ve laboratuvarınızın kendi referans aralığına göre
        gösterir. <strong>Teşhis koymaz ve hastalık profilinizi değiştirmez.</strong>
        <br /><br />
        Kırmızı rozet "laboratuvarınızın aralığının dışında" demektir; ne kadar önemli olduğunu
        söylemez. Kehribar rozet yalnızca laboratuvarın kendisi bir ara kademe tanımladığında
        çıkar. <strong>Sonuçlarınızı hekiminizle değerlendirin.</strong>
      </p>
    </div>
  );
};

/* ==========================================================================
   KVKK — aydınlatma, açık rıza ve hesap silme
   ==========================================================================
   TASARIM GEREKÇESİ (KVKK Kurulu 18.02.2026 tarih, 2026/347 sayılı ilke kararı):
   - Aydınlatma metni ve açık rıza metni AYRI başlıklar altında, ayrı metinler.
   - Aydınlatma metni için "kabul ediyorum / onaylıyorum" beyanı İSTENMİYOR;
     aydınlatma bir onay değil bilgilendirmedir. Beyan "okudum ve anladım".
   - Açık rıza için ayrı ve AÇIK bir seçim sunuluyor; iki seçenek de görünür,
     hiçbiri önceden işaretli değil.
   ========================================================================== */
