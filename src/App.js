// src/App.js
//
// Uygulamanın kökü: oturumu yükler, ekranlar arasında yönlendirir,
// KVKK onayı eksikse onay ekranına kilitler.

import React, { useState, useEffect } from 'react';
import { api, tokenAl, tokenKaydet } from './api';
import { Sidebar } from './components/Sidebar';
import { Yukleniyor } from './components/ortak';
import { OnayEkrani } from './kvkk/KvkkBilesenleri';
import { DashboardScreen } from './screens/BesinlerScreen';
import { DiaryScreen } from './screens/DiaryScreen';
import { LabResultsScreen } from './screens/LabResultsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RegisterScreen } from './screens/RegisterScreen';

export default function App() {
  const [ekran, setEkran] = useState('login');
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState({});
  const [hazir, setHazir] = useState(false);

  // Açılışta: meta verisini çek + token varsa oturumu geri yükle
  useEffect(() => {
    (async () => {
      try {
        setMeta(await api.meta());
      } catch (e) {
        // backend kapalıysa giriş ekranı yine de açılsın
      }
      if (tokenAl()) {
        try {
          const ben = await api.profilimiGetir();
          setUser(ben);
          setEkran('dashboard');
        } catch (e) {
          tokenKaydet(null); // token geçersizse temizle
        }
      }
      setHazir(true);
    })();
  }, []);

  const girisYapildi = (kullanici) => { setUser(kullanici); setEkran('dashboard'); };
  const cikisYap = () => { tokenKaydet(null); setUser(null); setEkran('login'); };

  if (!hazir) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"><Yukleniyor /></div>;
  }

  if (!user) {
    return ekran === 'register'
      ? <RegisterScreen meta={meta} onRegister={girisYapildi} onBack={() => setEkran('login')} />
      : <LoginScreen onLogin={girisYapildi} onRegister={() => setEkran('register')} />;
  }

  // ONAY KAPISI — giriş yapmış ama onayı eksik/eskimiş kullanıcı uygulamanın
  // hiçbir ekranını göremez. Bu özellik eklenmeden önce kayıt olanlar ve
  // metin sürümü değiştiğinde herkes buraya düşer.
  if (user.onayGerekli) {
    return <OnayEkrani user={user} onOnaylandi={setUser} onCikis={cikisYap} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <Sidebar aktif={ekran} git={setEkran} user={user} cikisYap={cikisYap} />
      <main className="flex-1 overflow-x-hidden">
        {ekran === 'dashboard' && <DashboardScreen user={user} />}
        {ekran === 'diary' && <DiaryScreen />}
        {ekran === 'lab' && <LabResultsScreen />}
        {ekran === 'profile' && (
          <ProfileScreen user={user} meta={meta} onGuncelle={setUser} onSilindi={cikisYap} />
        )}
      </main>
    </div>
  );
}
