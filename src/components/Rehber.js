// src/components/Rehber.js
//
// Renk açıklaması ve ilk kullanım tanıtımı.
//
// NİYE GEREKLİ: uygulama bir besni renkle sınıflandırıyor ama rengin ne
// anlama geldiği hiçbir yerde yazmıyordu. Geliştiriciler bildiği için
// gözden kaçan, kullanıcı için anlaşılmaz olan tipik durum. Renk üstelik
// SAĞLIK bilgisi taşıyor; yanlış anlaşılması yalnızca kafa karışıklığı
// değil, yanlış karar demek.
//
// NİYE OKLU "COACHMARK" TURU DEĞİL: ekrandaki öğelerin üstüne ok ve balon
// konumlandıran turlar, öğe kaydırıldığında, ekran daraldığında ya da öğe
// geç yüklendiğinde yanlış yere çiziyor; mobilde özellikle kırılgan.
// Bunun yerine adım adım ilerleyen bir kutu yapıldı: her ekranda aynı
// çalışıyor, klavyeyle gezilebiliyor ve atlanabiliyor.

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, Calendar, ChevronLeft, ChevronRight, Info, Search, ShieldCheck, X,
} from 'lucide-react';
import { stilAl } from './ortak';

export const TANITIM_ANAHTARI = 'tanitimGoruldu';

/** Tanıtım daha önce görüldü mü? Depolama kapalıysa "görüldü" sayılıyor:
 *  her açılışta tanıtım açmak, kapatamayan kullanıcı için tuzak olurdu. */
export function tanitimGoruldu() {
  try {
    return localStorage.getItem(TANITIM_ANAHTARI) === 'evet';
  } catch {
    return true;
  }
}

export function tanitimiIsaretle() {
  try {
    localStorage.setItem(TANITIM_ANAHTARI, 'evet');
  } catch { /* gizli sekmede yazılamayabilir, sorun değil */ }
}

/* ─────────────────────────── RENK AÇIKLAMASI ─────────────────────────── */

// SEVİYELERİN TANIMI TEK YERDEN: renkler ve etiketler stilAl()'den geliyor,
// yani besin kartlarında görünen neyse burada da o görünüyor. Elle yazılsaydı
// bir gün biri rengi değiştirir, açıklama eski kalırdı.
const SEVIYELER = [
  { kod: 'UYGUN', aciklama: 'Profilinizdeki hastalık ve alerjiler için bu besinde bir sorun bulunmadı.' },
  { kod: 'DIKKAT', aciklama: 'Yenebilir ama bir değere dikkat etmek gerekiyor. Kartı açınca hangi değer olduğu ve kaynağı yazıyor.' },
  { kod: 'RISKLI', aciklama: 'Profilinizdeki bir hastalık için kaynaklara göre sakıncalı bir değer var.' },
  { kod: 'ALERJEN', aciklama: 'Belirttiğiniz bir alerjen içeriyor. Bu uyarı diğer her şeyin önüne geçer.' },
  { kod: 'DIYET_DISI', aciklama: 'Sağlık riski değil: seçtiğiniz diyete (ör. vegan) uymuyor.' },
];

export const RenkRehberi = ({ baslikli = true }) => (
  <div>
    {baslikli && (
      <h3 className="font-bold text-gray-800 mb-3">Renkler ne anlama geliyor?</h3>
    )}
    <ul className="space-y-3">
      {SEVIYELER.map(({ kod, aciklama }) => {
        const s = stilAl(kod);
        const Ikon = s.icon;
        return (
          <li key={kod} className={`flex gap-3 items-start p-3 rounded-xl border ${s.bg} ${s.border}`}>
            {/* Renk TEK BAŞINA bilgi taşımıyor: her seviyenin kendi ikonu ve
                yazılı etiketi var (WCAG 1.4.1). Renk körü bir kullanıcı da
                ayırt edebiliyor. */}
            <Ikon size={20} className={`${s.text} shrink-0 mt-0.5`} aria-hidden="true" />
            <div>
              <span className={`font-bold text-sm ${s.text}`}>{s.etiket}</span>
              <p className="text-sm text-gray-700 mt-0.5">{aciklama}</p>
            </div>
          </li>
        );
      })}
    </ul>
    <p className="text-xs text-gray-600 mt-4 leading-relaxed">
      Her uyarının altında hangi kaynağa dayandığı yazıyor. Bir besin için
      gerekli veri elimizde yoksa &quot;değerlendirilemedi&quot; deniyor;
      sessizce &quot;uygun&quot; denmiyor.
    </p>
  </div>
);

/* ────────────────────────────── TANITIM ────────────────────────────── */

const ADIMLAR = [
  {
    ikon: Search,
    baslik: 'Besinleri size göre değerlendiriyoruz',
    icerik: (
      <>
        <p className="mb-3">
          Profilinize girdiğiniz hastalıklar ve besin alerjileri, her besnin
          sizin için uygun olup olmadığını belirliyor. Aynı besin iki kişide
          farklı sonuç verebilir.
        </p>
        <p>
          <strong>Besin Arama</strong> sekmesinden bir besne dokunun; hangi
          değerin neden işaretlendiğini ve kaynağını görürsünüz.
        </p>
      </>
    ),
  },
  {
    ikon: Info,
    baslik: 'Renkler ne anlama geliyor?',
    icerik: <RenkRehberi baslikli={false} />,
  },
  {
    ikon: Calendar,
    baslik: 'Günlük Takip',
    icerik: (
      <>
        <p className="mb-3">
          Gün içinde yediklerinizi öğünlere ekleyebilirsiniz. Besin seçerseniz
          kaloriyi biz hesaplarız; listede olmayan bir şey yediyseniz adını ve
          kalorisini elle yazabilirsiniz.
        </p>
        <p>Su ve hareketle yakılan kaloriyi de aynı ekrandan girebilirsiniz.</p>
      </>
    ),
  },
  {
    ikon: Activity,
    baslik: 'Tahlil Sonuçları',
    icerik: (
      <>
        <p className="mb-3">
          Tahlil sonucunuzun PDF&apos;ini yükleyebilirsiniz. Sonuçlar okunur,
          <strong> siz onaylamadan hiçbir şey kaydedilmez.</strong>
        </p>
        <p>
          Raporunuzdaki ad, doğum tarihi gibi kişisel satırlar kasıtlı olarak
          okunmaz ve hiç kaydedilmez.
        </p>
      </>
    ),
  },
  {
    ikon: ShieldCheck,
    baslik: 'Verileriniz',
    icerik: (
      <>
        <p className="mb-3">
          Sağlık verileriniz veritabanında <strong>şifreli</strong> tutuluyor.
          Dilediğiniz an hepsini indirebilir ya da hesabınızı tümüyle
          silebilirsiniz (Profil &gt; Verilerim).
        </p>
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Bu bir <strong>demo</strong> uygulamadır ve tıbbi tavsiye vermez.
          Lütfen gerçek sağlık bilgilerinizi girmeyin.
        </p>
      </>
    ),
  },
];

export const Tanitim = ({ acik, onKapat }) => {
  const [adim, setAdim] = useState(0);
  const kutuRef = useRef(null);

  useEffect(() => { if (acik) setAdim(0); }, [acik]);

  useEffect(() => {
    if (!acik) return undefined;
    if (kutuRef.current) kutuRef.current.focus();
    const tus = (e) => { if (e.key === 'Escape') onKapat(); };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [acik, onKapat]);

  if (!acik) return null;
  const son = adim === ADIMLAR.length - 1;
  const a = ADIMLAR[adim];
  const Ikon = a.ikon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={kutuRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tanitim-baslik"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg outline-none flex flex-col max-h-[90vh]"
      >
        <div className="flex items-start gap-4 p-7 pb-4">
          <div className="bg-green-100 text-green-700 p-3 rounded-2xl shrink-0">
            <Ikon size={22} aria-hidden="true" />
          </div>
          <h2 id="tanitim-baslik" className="text-lg font-bold text-gray-800 mt-1 flex-1">
            {a.baslik}
          </h2>
          <button
            type="button"
            onClick={onKapat}
            className="p-2 -mt-1 -mr-1 rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <X size={20} aria-hidden="true" />
            <span className="sr-only">Tanıtımı kapat</span>
          </button>
        </div>

        <div className="px-7 text-sm text-gray-700 leading-relaxed overflow-y-auto">
          {a.icerik}
        </div>

        <div className="p-7 pt-5 flex items-center justify-between gap-4">
          {/* Adım göstergesi hem nokta hem yazı: yalnızca nokta olsaydı ekran
              okuyucu kullanan biri kaçıncı adımda olduğunu bilemezdi. */}
          <div className="flex items-center gap-2" aria-hidden="true">
            {ADIMLAR.map((x, i) => (
              <span
                key={x.baslik}
                className={`h-2 rounded-full transition-all ${i === adim ? 'w-6 bg-green-700' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            {`Adım ${adim + 1} / ${ADIMLAR.length}: ${a.baslik}`}
          </span>

          <div className="flex gap-2">
            {adim > 0 && (
              <button
                type="button"
                onClick={() => setAdim(adim - 1)}
                className="px-4 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center gap-1"
              >
                <ChevronLeft size={18} aria-hidden="true" /> Geri
              </button>
            )}
            {!son && (
              <button
                type="button"
                onClick={onKapat}
                className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Atla
              </button>
            )}
            <button
              type="button"
              onClick={() => (son ? onKapat() : setAdim(adim + 1))}
              className="px-5 py-2.5 rounded-xl font-bold bg-green-700 hover:bg-green-800 text-white transition flex items-center gap-1"
            >
              {son ? 'Başlayalım' : <>İleri <ChevronRight size={18} aria-hidden="true" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
