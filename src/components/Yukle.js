// src/components/Yukle.js
//
// "Uygulamayı yükle" düğmesi.
//
// NASIL ÇALIŞIYOR: Chrome ve Edge, site kurulabilir olduğunda
// `beforeinstallprompt` olayını gönderiyor. Olayı yakalayıp saklıyoruz;
// kullanıcı düğmeye basınca tarayıcının kendi kurulum penceresini açıyoruz.
//
// iOS SAFARI BU OLAYI HİÇ GÖNDERMİYOR. Orada kurulum yalnızca elle
// yapılabiliyor (Paylaş > Ana Ekrana Ekle). Düğme o durumda yönerge
// gösteriyor — "yüklenemiyor" demek yerine nasıl yapılacağını anlatıyor.
//
// KİMSE ZORLANMIYOR: uygulama tarayıcıda da tam çalışıyor. Bu yüzden düğme
// profil ayarlarında duruyor, ekranın ortasında bir afiş olarak değil.

import React, { useEffect, useState } from 'react';
import { Download, Check, Share } from 'lucide-react';

/** Zaten kurulu mu? Kuruluysa uygulama kendi penceresinde açılıyor. */
function kuruluMu() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function iosMu() {
  try {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

export const UygulamayiYukle = () => {
  const [istem, setIstem] = useState(null);
  const [kurulu, setKurulu] = useState(kuruluMu);
  const [yonergeAcik, setYonergeAcik] = useState(false);

  useEffect(() => {
    const yakala = (e) => {
      // Tarayıcının kendi çubuğunu engelleyip olayı saklıyoruz: kurulum
      // kararını kullanıcı bizim düğmemizle, istediği anda versin.
      e.preventDefault();
      setIstem(e);
    };
    const kuruldu = () => { setKurulu(true); setIstem(null); };
    window.addEventListener('beforeinstallprompt', yakala);
    window.addEventListener('appinstalled', kuruldu);
    return () => {
      window.removeEventListener('beforeinstallprompt', yakala);
      window.removeEventListener('appinstalled', kuruldu);
    };
  }, []);

  const yukle = async () => {
    if (!istem) { setYonergeAcik(true); return; }
    istem.prompt();
    const { outcome } = await istem.userChoice;
    // İstem bir kez kullanılabiliyor; reddedilse de tekrar kullanılamaz.
    setIstem(null);
    if (outcome === 'accepted') setKurulu(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-blue-100 p-3 rounded-2xl text-blue-700"><Download size={22} /></div>
        Uygulama Olarak Yükle
      </h2>

      {kurulu ? (
        <p className="text-sm text-green-700 flex items-center gap-2 font-semibold">
          <Check size={18} aria-hidden="true" /> Uygulama bu cihaza kurulu.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-700 mb-5 leading-relaxed">
            Telefonunuzun ana ekranına ya da bilgisayarınıza kısayol olarak
            ekleyebilirsiniz; adres çubuğu olmadan, ayrı bir pencerede açılır.
            <strong> Zorunlu değil</strong> — tarayıcıdan da her özelliği
            kullanabilirsiniz.
          </p>
          <button
            type="button"
            onClick={yukle}
            className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
          >
            <Download size={18} aria-hidden="true" />
            {istem ? 'Uygulamayı yükle' : 'Nasıl yüklerim?'}
          </button>

          {yonergeAcik && (
            <div className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm text-gray-700 space-y-3">
              {iosMu() ? (
                <>
                  <p className="font-bold text-gray-800">iPhone / iPad (Safari)</p>
                  <p className="flex items-start gap-2">
                    <Share size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                    Alttaki <strong>Paylaş</strong> simgesine dokunun, ardından
                    <strong> Ana Ekrana Ekle</strong> seçeneğini seçin.
                  </p>
                  <p className="text-gray-600">
                    Safari dışındaki tarayıcılarda (Chrome, Firefox) iOS bu
                    seçeneği sunmuyor.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-800">Chrome / Edge</p>
                  <p>
                    Adres çubuğunun sağındaki <strong>yükle</strong> simgesine,
                    yoksa tarayıcı menüsünden
                    <strong> &quot;Uygulamayı yükle&quot;</strong> seçeneğine dokunun.
                  </p>
                  <p className="text-gray-600">
                    Seçenek görünmüyorsa sayfayı yenileyin; tarayıcı kurulabilirliği
                    sayfa yüklendikten kısa süre sonra değerlendiriyor.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
