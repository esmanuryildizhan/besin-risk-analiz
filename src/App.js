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
import {
  EPostaDogrulamaEkrani, SifremiUnuttumEkrani, SifreYenileEkrani,
} from './screens/SifreEkranlari';

export default function App() {
  const [ekran, setEkran] = useState('login');
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState({});
  const [hazir, setHazir] = useState(false);

  // ŞİFRE SIFIRLAMA BAĞLANTISI
  //
  // Postadaki bağlantı /sifre-yenile?bilet=... adresine geliyor. Projede
  // yönlendirme kütüphanesi (react-router) yok; ekranlar durum değişkeniyle
  // seçiliyor. Bu yüzden bileti adres satırından bir kez okuyup durumda
  // tutuyoruz. Kütüphane eklemek yalnızca bu tek adres için ağır olurdu.
  //
  // Bilet HEMEN adres satırından siliniyor (replaceState): tarayıcı geçmişinde
  // ve ekran görüntüsünde kalmasın, kullanıcı adresi kopyalayıp paylaşırsa
  // parola sıfırlama yetkisini paylaşmış olmasın.
  //
  // İKİ ADRES VAR: /sifre-yenile ve /eposta-dogrula. İkisi de aynı kalıpla
  // okunuyor, bu yüzden tek yardımcı.
  const biletiOku = (yol) => {
    if (typeof window === 'undefined') return null;
    if (!window.location.pathname.startsWith(yol)) return null;
    const bilet = new URLSearchParams(window.location.search).get('bilet');
    if (bilet) window.history.replaceState({}, '', '/');
    return bilet || null;
  };
  const [sifirlamaBileti, setSifirlamaBileti] = useState(() => biletiOku('/sifre-yenile'));
  const [dogrulamaBileti, setDogrulamaBileti] = useState(() => biletiOku('/eposta-dogrula'));

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

  // Sıfırlama bağlantısıyla gelindiyse her şeyin önüne geçiyor: kullanıcının
  // elinde geçerli bir bilet varsa yapmak istediği tek şey parolasını
  // değiştirmek.
  if (sifirlamaBileti) {
    return (
      <SifreYenileEkrani
        bilet={sifirlamaBileti}
        onBitti={() => { setSifirlamaBileti(null); setEkran('login'); }}
      />
    );
  }

  if (dogrulamaBileti) {
    return (
      <EPostaDogrulamaEkrani
        bilet={dogrulamaBileti}
        onGiris={(kullanici) => { setDogrulamaBileti(null); girisYapildi(kullanici); }}
        onGeri={() => { setDogrulamaBileti(null); setEkran('login'); }}
      />
    );
  }

  if (!user) {
    if (ekran === 'sifremi-unuttum') {
      return <SifremiUnuttumEkrani onGeri={() => setEkran('login')} />;
    }
    return ekran === 'register'
      ? <RegisterScreen meta={meta} onBack={() => setEkran('login')} />
      : (
        <LoginScreen
          onLogin={girisYapildi}
          onRegister={() => setEkran('register')}
          onSifremiUnuttum={() => setEkran('sifremi-unuttum')}
        />
      );
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
