// src/components/ortak.js
//
// Birden çok ekranın kullandığı küçük bileşenler ve risk seviyesi stilleri.

import React, { useId, useState } from 'react';
import {
  Search, AlertCircle, AlertTriangle, X, CheckCircle, Utensils,
  Loader2, ShieldAlert,
} from 'lucide-react';

const RISK_STILI = {
  UYGUN:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  badge: 'bg-green-100',  icon: CheckCircle,   etiket: 'UYGUN' },
  DIKKAT:  { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100', icon: AlertTriangle, etiket: 'DİKKAT' },
  RISKLI:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    badge: 'bg-red-100',    icon: AlertCircle,   etiket: 'RİSKLİ' },
  ALERJEN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100', icon: ShieldAlert,   etiket: 'ALERJEN' },
  DIYET_DISI: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100', icon: Utensils, etiket: 'DİYETİNİZE UYGUN DEĞİL' },
};

export const stilAl = (seviye) => RISK_STILI[seviye] || RISK_STILI.UYGUN;

/** Kaynak metnindeki bağlantıyı tıklanabilir hale getirir.
 *  TürKomp'un kullanım koşulları, verinin internette gösterildiği yerde
 *  tıklanabilir bir bağlantı verilmesini ZORUNLU tutuyor. */
export const KaynakYazisi = ({ kaynak }) => {
  if (!kaynak) return null;
  const eslesme = kaynak.match(/https?:\/\/[^\s)]+/);
  if (!eslesme) return <>Kaynak: {kaynak}</>;
  const metin = kaynak.replace(/\s*\(?https?:\/\/[^\s)]+\)?/, '');
  return (
    <>
      Kaynak: {metin}{' '}
      <a href={eslesme[0]} target="_blank" rel="noreferrer" className="text-green-700 underline">
        {eslesme[0]}
      </a>
    </>
  );
};

export const Yukleniyor = ({ yazi = 'Yükleniyor...' }) => (
  <div className="flex items-center justify-center gap-3 text-gray-500 py-16">
    <Loader2 className="animate-spin" size={28} />
    <span className="font-medium">{yazi}</span>
  </div>
);

export const HataKutusu = ({ mesaj }) =>
  !mesaj ? null : (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
      <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{mesaj}</span>
    </div>
  );

export const Modal = ({ isOpen, onClose, title, children, genis = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${genis ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const MenuButton = ({ icon: Icon, label, isActive, onClick, isSecondary }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-base ${
      isActive
        ? 'bg-green-700 text-white font-bold shadow-lg shadow-green-200'
        : isSecondary
        ? 'text-gray-600 hover:bg-gray-50 hover:text-green-700 font-medium'
        : 'text-gray-600 hover:bg-green-50 hover:text-green-700 font-medium'
    }`}
  >
    <Icon size={22} className={isActive ? 'text-white' : 'text-gray-500'} />
    <span>{label}</span>
  </button>
);

/** Anahtar/etiket çiftlerinden seçim yapılan arama kutusu (hastalık, alerjen) */
export const SecimKutusu = ({ label, secenekler, secili, onEkle, onCikar }) => {
  // Bu bileşen aynı ekranda birden çok kez kullanılıyor (hastalıklar, alerjenler).
  // Sabit bir id yazılsaydı sayfada yinelenen id olurdu ve etiket yanlış girdiye
  // bağlanırdı; useId her örneğe benzersiz bir ön ek veriyor.
  const kimlik = useId();
  const [arama, setArama] = useState('');
  const [acik, setAcik] = useState(false);
  const filtreli = secenekler.filter(
    (o) => o.name.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')) && !secili.includes(o.key)
  );
  const adBul = (key) => (secenekler.find((o) => o.key === key) || { name: key }).name;

  return (
    // Liste, odak kapsayıcıdan TAMAMEN çıkınca kapanıyor (relatedTarget kontrolü).
    // Eskiden input'un onBlur'u 200 ms sonra kapatıyordu; liste <div> olduğu ve
    // klavyeyle erişilemediği sürece bu çalışıyordu. Seçenekler <button> olunca
    // Tab ile listeye geçmek input'u blur ediyor ve liste kullanıcı Enter'a
    // basamadan kapanırdı. Bu yüzden ikisi birlikte değişti.
    <div
      className="relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setAcik(false); }}
    >
      <label htmlFor={`${kimlik}-arama`} className="text-xs font-bold text-gray-500 mb-2 block uppercase">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
        <input
          id={`${kimlik}-arama`}
          type="text"
          placeholder="Aramak için yazın..."
          className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 transition"
          value={arama}
          onChange={(e) => { setArama(e.target.value); setAcik(true); }}
          onFocus={() => setAcik(true)}
        />
      </div>
      {acik && filtreli.length > 0 && (
        <div className="absolute top-full left-0 w-full bg-white border shadow-lg rounded-xl mt-1 z-50 max-h-48 overflow-auto py-2">
          {filtreli.map((o) => (
            // <div> değil <button>: tıklanabilir bir öğenin klavyeyle de
            // çalışması gerekiyor (WCAG 2.1.1). <button> bunu kendiliğinden
            // sağlıyor — odaklanabilir, Enter ve Space ile tetikleniyor,
            // ekran okuyucuya "düğme" diye duyuruluyor.
            <button
              type="button"
              key={o.key}
              onClick={() => { onEkle(o.key); setArama(''); }}
              className="w-full text-left px-4 py-2 hover:bg-green-50 focus:bg-green-100 cursor-pointer text-sm font-medium text-gray-700 outline-none"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3 min-h-[40px]">
        {secili.map((key) => (
          <span key={key} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 border border-green-100">
            {adBul(key)}
            <button onClick={() => onCikar(key)} className="hover:text-green-900 bg-white rounded-full p-0.5">
              <X size={12} />
            </button>
          </span>
        ))}
        {secili.length === 0 && <span className="text-sm text-gray-500 italic p-1.5">Henüz seçim yapılmadı.</span>}
      </div>
    </div>
  );
};

/* ==========================================================================
   GİRİŞ / KAYIT
   ========================================================================== */
