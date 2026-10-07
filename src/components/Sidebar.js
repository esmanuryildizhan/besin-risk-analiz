// src/components/Sidebar.js
//
// Sol menü.
//
// MOBİLDE ÇEKMECE, MASAÜSTÜNDE SABİT:
// Menü w-72 (≈252 px) genişliğinde. 390 px'lik bir telefonda bu, içeriğe
// ~140 px bırakıyordu — uygulama "yarım" görünmesinin sebebi buydu.
// lg kırılımının (1024 px) altında menü ekrandan çıkıyor ve hamburger
// düğmesiyle üstüne kayarak açılıyor; üstünde eskisi gibi sabit duruyor.
//
// ERİŞİLEBİLİRLİK:
//  - Düğme aria-expanded ve aria-controls taşıyor, durumu ekran okuyucuya
//    söylüyor.
//  - Açıkken Escape kapatıyor (fare kullanamayan için tek çıkış yolu
//    arka plana tıklamak olmasın).
//  - Açılınca odak çekmecenin içine taşınıyor, kapanınca düğmeye geri
//    dönüyor; yoksa klavye kullanıcısı odağı sayfanın başında kaybeder.
//  - Arka plan perdesi aria-hidden: ekran okuyucu için anlamı yok.

import React, { useEffect, useRef } from 'react';
import {
  Search, Calendar, X, Settings, Activity, Menu,
} from 'lucide-react';
import { MenuButton } from './ortak';

export const Sidebar = ({ aktif, git, user, cikisYap, acik, setAcik }) => {
  const cekmeceRef = useRef(null);

  // Escape ile kapat. Yalnızca açıkken dinleniyor.
  useEffect(() => {
    if (!acik) return undefined;
    const tus = (e) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [acik, setAcik]);

  // Açılınca odağı çekmeceye taşı (yalnızca mobilde anlamlı; masaüstünde
  // çekmece zaten görünür ve acik=false kalıyor).
  useEffect(() => {
    if (acik && cekmeceRef.current) cekmeceRef.current.focus();
  }, [acik]);

  const gitVeKapat = (ekran) => { git(ekran); setAcik(false); };

  return (
    <>
      {/* Mobil üst çubuk: yalnızca lg altında */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14">
        <button
          type="button"
          onClick={() => setAcik(true)}
          aria-expanded={acik}
          aria-controls="yan-menu"
          className="p-2 -ml-2 rounded-xl text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Menu size={24} aria-hidden="true" />
          <span className="sr-only">Menüyü aç</span>
        </button>
        <span className="font-bold text-gray-800">Besin Risk Analiz</span>
      </div>

      {/* Perde: çekmece açıkken içeriği örtüyor */}
      {acik && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setAcik(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="yan-menu"
        ref={cekmeceRef}
        tabIndex={-1}
        className={`w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 outline-none
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          ${acik ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0`}
      >
        <div className="p-8 flex flex-col items-center text-center relative">
          <button
            type="button"
            onClick={() => setAcik(false)}
            className="lg:hidden absolute top-3 right-3 p-2 rounded-xl text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <X size={20} aria-hidden="true" />
            <span className="sr-only">Menüyü kapat</span>
          </button>
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 uppercase">
            {(user.name || '?').charAt(0)}{(user.surname || '').charAt(0)}
          </div>
          <div className="font-bold text-gray-800 text-lg">{user.name} {user.surname}</div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <MenuButton icon={Search} label="Besin Arama" isActive={aktif === 'dashboard'} onClick={() => gitVeKapat('dashboard')} />
          <MenuButton icon={Calendar} label="Günlük Takip" isActive={aktif === 'diary'} onClick={() => gitVeKapat('diary')} />
          <MenuButton icon={Activity} label="Tahlil Sonuçları" isActive={aktif === 'lab'} onClick={() => gitVeKapat('lab')} />
        </nav>

        <div className="px-4 pb-6 pt-4 border-t border-gray-100 space-y-2">
          <MenuButton icon={Settings} label="Profil Ayarları" isActive={aktif === 'profile'} onClick={() => gitVeKapat('profile')} isSecondary />
          <button onClick={cikisYap} className="flex items-center gap-3 text-gray-600 hover:bg-red-50 hover:text-red-700 transition w-full px-5 py-3.5 rounded-xl text-sm font-bold">
            <X size={20} aria-hidden="true" /> <span>Oturumu Kapat</span>
          </button>
        </div>
      </div>
    </>
  );
};
