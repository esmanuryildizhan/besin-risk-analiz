// src/screens/LoginScreen.js
//
// Giriş ekranı.

import React, { useState } from 'react';
import {
  Apple, ChevronRight, Loader2, Lock, Mail, Shield,
} from 'lucide-react';
import { api, tokenKaydet, depolamaCalisiyorMu } from '../api';
import { HataKutusu } from '../components/ortak';
import { KvkkBaglantilari } from '../kvkk/KvkkBilesenleri';

export const LoginScreen = ({ onLogin, onRegister, onSifremiUnuttum }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  // 2FA açık hesapta giriş iki adıma bölünüyor: parola doğruysa sunucu token
  // yerine kısa ömürlü bir ara bilet veriyor, kod bu biletle doğrulanıyor.
  const [araBilet, setAraBilet] = useState(null);
  const [kod, setKod] = useState('');

  // E-posta doğrulanmamışsa sunucu 403 + { dogrulanmamis: true } dönüyor.
  // Kullanıcıyı çıkmaza sokmamak için yeni bağlantı isteme yolu sunuluyor.
  const [dogrulanmamis, setDogrulanmamis] = useState(false);
  const [tekrarGonderildi, setTekrarGonderildi] = useState(false);

  const dogrulamaTekrarGonder = async () => {
    setHata(''); setBekliyor(true);
    try {
      await api.dogrulamaTekrarGonder(email);
      setTekrarGonderildi(true);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  const girisYap = async () => {
    setHata(''); setBekliyor(true);
    setDogrulanmamis(false); setTekrarGonderildi(false);
    try {
      const sonuc = await api.girisYap(email, password);
      if (sonuc.ikinciAsama) { setAraBilet(sonuc.geciciBilet); setBekliyor(false); return; }
      tokenKaydet(sonuc.token);
      onLogin(sonuc.user);
    } catch (e) {
      setHata(e.message);
      // Mesajı sunucudan geliyor; burada yalnızca "yeni bağlantı iste"
      // düğmesini göstermek için işaretliyoruz.
      if (e.message.includes('doğrulanmadı')) setDogrulanmamis(true);
    } finally {
      setBekliyor(false);
    }
  };

  const kodGonder = async () => {
    setHata(''); setBekliyor(true);
    try {
      const sonuc = await api.girisKodDogrula(araBilet, kod);
      tokenKaydet(sonuc.token);
      onLogin(sonuc.user);
    } catch (e) {
      setHata(e.message);
      // Bilet süresi dolduysa baştan başlatmak gerekiyor.
      if (e.message.includes('süresi doldu')) { setAraBilet(null); setKod(''); }
    } finally {
      setBekliyor(false);
    }
  };

  // ───── İKİNCİ AŞAMA: doğrulayıcı kodu ─────
  // Ayrı bir ekran olarak çiziliyor; parola alanları görünmüyor ki kullanıcı
  // hangi adımda olduğunu karıştırmasın.
  if (araBilet) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-[460px] border">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-5 border border-green-100">
              <Shield size={40} className="text-green-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Doğrulama Kodu</h1>
            <p className="text-gray-500 text-center text-sm">
              Telefonunuzdaki doğrulayıcı uygulamada görünen 6 haneli kodu girin.
            </p>
          </div>

          <input
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\s/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && kodGonder()}
            placeholder="000000"
            inputMode="numeric"
            autoFocus
            className="w-full text-center text-3xl tracking-[0.4em] font-bold py-5 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
          />

          <div className="mt-5">
            <HataKutusu mesaj={hata} />
          </div>

          <button
            onClick={kodGonder}
            disabled={bekliyor || kod.length < 6}
            className="w-full mt-5 bg-gradient-to-r from-green-700 to-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>DOĞRULA <ChevronRight size={20} /></>}
          </button>

          <p className="text-xs text-gray-500 text-center mt-5 leading-relaxed">
            Telefonunuza erişemiyorsanız, kurulum sırasında aldığınız
            yedek kodlardan birini girebilirsiniz.
          </p>

          <button
            onClick={() => { setAraBilet(null); setKod(''); setHata(''); }}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 font-semibold"
          >
            Geri dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 sm:p-14 w-full max-w-[520px] border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-teal-600" />
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl flex items-center justify-center mb-6 border border-green-100">
            <Apple size={48} className="text-green-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hoş Geldiniz</h1>
          <p className="text-gray-500 text-center">Kişiselleştirilmiş Besin Risk Analizi</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="giris-eposta" className="block text-xs font-bold text-gray-500 mb-2 uppercase">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                id="giris-eposta"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
              />
            </div>
          </div>
          <div>
            <label htmlFor="giris-sifre" className="block text-xs font-bold text-gray-500 mb-2 uppercase">Parola</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                id="giris-sifre"
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && girisYap()}
                placeholder="••••••••"
                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
              />
            </div>
          </div>

          <HataKutusu mesaj={hata} />

          {dogrulanmamis && !tekrarGonderildi && (
            <button
              onClick={dogrulamaTekrarGonder} disabled={bekliyor || !email}
              className="w-full border-2 border-green-200 text-green-700 hover:bg-green-50 font-bold py-3 rounded-xl transition disabled:opacity-40"
            >
              Yeni doğrulama bağlantısı gönder
            </button>
          )}
          {tekrarGonderildi && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-4 text-center leading-relaxed">
              Adres kayıtlı ve henüz doğrulanmamışsa yeni bir bağlantı gönderildi.
              Gereksiz (spam) klasörünü de kontrol edin.
            </p>
          )}

          <button
            onClick={girisYap} disabled={bekliyor}
            className="w-full bg-gradient-to-r from-green-700 to-teal-700 hover:from-green-800 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2 text-lg"
          >
            {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>GİRİŞ YAP <ChevronRight size={20} /></>}
          </button>

          <div className="text-center">
            <button
              onClick={onSifremiUnuttum}
              className="text-sm text-gray-500 hover:text-gray-700 font-semibold hover:underline"
            >
              Parolamı unuttum
            </button>
          </div>

          <div className="text-center pt-2">
            <button onClick={onRegister} className="text-green-700 hover:text-green-900 font-bold hover:underline">
              Hesabınız yok mu? Hemen kayıt olun
            </button>
          </div>

          {/* DEPOLAMA KAPALIYSA UYAR
              Tarayıcı site verisini engelliyorsa uygulama çalışıyor ama oturum
              bellekte tutuluyor ve sekme kapanınca bitiyor. Bunu söylemezsek
              kullanıcı "sürekli çıkış yapıyor" diye düşünüyor ve sebebini
              bulamıyor. Ayrı bir denetim sayfasına yönlendiriyoruz. */}
          {!depolamaCalisiyorMu() && (
            <div
              role="status"
              className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed"
            >
              Tarayıcınız site verisini engelliyor. Giriş yapabilirsiniz, ancak
              sekmeyi kapattığınızda oturumunuz sona erer.{' '}
              <a href="/uyumluluk.html" className="font-bold text-green-800 underline">
                Tarayıcımı denetle
              </a>
            </div>
          )}

          {/* Aydınlatma yükümlülüğü onaya bağlı değildir: metinler giriş
              yapmadan da okunabilir olmalı. */}
          <KvkkBaglantilari />
        </div>
      </div>
    </div>
  );
};
