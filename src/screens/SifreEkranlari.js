// src/screens/SifreEkranlari.js
//
// Şifre sıfırlamanın iki ekranı:
//   SifremiUnuttumEkrani — e-posta alır, bağlantı gönderilmesini ister
//   SifreYenileEkrani    — postadaki bağlantıdan açılır, yeni şifreyi belirler

import React, { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle, ChevronRight, KeyRound, Loader2, Lock, Mail, Shield,
} from 'lucide-react';
import { api, tokenKaydet } from '../api';
import { HataKutusu } from '../components/ortak';

const Kutu = ({ simge: Simge, baslik, aciklama, children }) => (
  <div className="w-full min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
    <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-[460px] border border-gray-100">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-5 border border-green-100">
          <Simge size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">{baslik}</h1>
        <p className="text-gray-500 text-center text-sm leading-relaxed">{aciklama}</p>
      </div>
      {children}
    </div>
  </div>
);

const girdiStili = 'w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-200 '
  + 'rounded-xl focus:border-green-500 outline-none text-gray-700';
const dugmeStili = 'w-full bg-gradient-to-r from-green-600 to-teal-700 text-white '
  + 'font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-40 '
  + 'flex items-center justify-center gap-2';

/* ─────────────────── E-POSTA DOĞRULAMA (kayıt sonrası) ─────────────────── */

export const EPostaDogrulamaEkrani = ({ bilet, onGiris, onGeri }) => {
  const [durum, setDurum] = useState('bekliyor');   // bekliyor | tamam | hata
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const sonuc = await api.ePostaDogrula(bilet);
        if (iptal) return;
        // 2FA açık hesapta oturum bileti VERİLMİYOR; kullanıcı normal giriş
        // akışından geçip kodunu girmek zorunda.
        if (sonuc.token) {
          tokenKaydet(sonuc.token);
          setDurum('tamam');
          // Kullanıcı "doğrulandı" yazısını görsün diye kısa bir an bekliyoruz;
          // anında yönlendirmek ne olduğunu anlamadan geçmek olurdu.
          setTimeout(() => { if (!iptal) onGiris(sonuc.user); }, 1200);
        } else {
          setDurum('tamam');
          setTimeout(() => { if (!iptal) onGeri(); }, 1800);
        }
      } catch (e) {
        if (!iptal) { setHata(e.message); setDurum('hata'); }
      }
    })();
    return () => { iptal = true; };
  }, [bilet, onGiris, onGeri]);

  if (durum === 'bekliyor') {
    return (
      <Kutu simge={Loader2} baslik="Doğrulanıyor" aciklama="E-posta adresiniz doğrulanıyor, lütfen bekleyin.">
        <div />
      </Kutu>
    );
  }

  if (durum === 'hata') {
    return (
      <Kutu simge={AlertCircle} baslik="Doğrulanamadı" aciklama={hata}>
        <button onClick={onGeri} className={dugmeStili}>Giriş ekranına dön</button>
      </Kutu>
    );
  }

  return (
    <Kutu
      simge={CheckCircle}
      baslik="E-postanız doğrulandı"
      aciklama="Hesabınız kullanıma hazır. Yönlendiriliyorsunuz..."
    >
      <div />
    </Kutu>
  );
};

/* ───────────────────────── ADIM 1: e-posta ───────────────────────── */

export const SifremiUnuttumEkrani = ({ onGeri }) => {
  const [email, setEmail] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);

  const gonder = async () => {
    setHata(''); setBekliyor(true);
    try {
      await api.sifremiUnuttum(email);
      setGonderildi(true);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  // ONAY EKRANI "posta gönderildi" DEMİYOR, "kayıtlıysa gönderildi" diyor.
  // Sunucu de aynı yanıtı veriyor: adresin sistemde olup olmadığını
  // söylemek, bir kişinin bu uygulamaya kayıtlı olduğunu ifşa etmek olurdu.
  if (gonderildi) {
    return (
      <Kutu
        simge={CheckCircle}
        baslik="Bağlantı gönderildi"
        aciklama={`${email} adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. `
          + 'Bağlantı 60 dakika geçerlidir ve yalnızca bir kez kullanılabilir.'}
      >
        <p className="text-xs text-gray-500 text-center leading-relaxed mb-5">
          Posta gelmediyse gereksiz (spam) klasörünü kontrol edin.
        </p>
        <button onClick={onGeri} className={dugmeStili}>Giriş ekranına dön</button>
      </Kutu>
    );
  }

  return (
    <Kutu
      simge={KeyRound}
      baslik="Şifremi Unuttum"
      aciklama="Hesabınızın e-posta adresini girin. Yeni şifre belirlemeniz için bir bağlantı gönderilecek."
    >
      <div className="relative">
        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && email && gonder()}
          placeholder="ornek@email.com" autoFocus className={girdiStili}
        />
      </div>

      <div className="mt-5"><HataKutusu mesaj={hata} /></div>

      <button onClick={gonder} disabled={bekliyor || !email} className={`${dugmeStili} mt-5`}>
        {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>BAĞLANTI GÖNDER <ChevronRight size={20} /></>}
      </button>

      <button
        onClick={onGeri}
        className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 font-semibold"
      >
        Geri dön
      </button>
    </Kutu>
  );
};

/* ──────────────────── ADIM 2: yeni şifreyi belirle ──────────────────── */

export const SifreYenileEkrani = ({ bilet, onBitti }) => {
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [kod, setKod] = useState('');
  const [kodGerekli, setKodGerekli] = useState(false);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  const kaydet = async () => {
    // Tekrar alanı SUNUCUDA denetlenmiyor, denetlenmesi de gerekmiyor:
    // amacı güvenlik değil, kullanıcının yazım hatasıyla kendini kilitlemesini
    // önlemek. Sunucu şifrenin uzunluğuna bakıyor.
    if (sifre !== tekrar) { setHata('İki şifre birbiriyle aynı değil.'); return; }
    if (sifre.length < 8) { setHata('Şifre en az 8 karakter olmalı.'); return; }

    setHata(''); setBekliyor(true);
    try {
      const sonuc = await api.sifreYenile(bilet, sifre, kod);
      // 2FA açık hesapta sunucu hata değil "kod da gerekli" diyor.
      if (sonuc.ikinciAsama) {
        setKodGerekli(true);
        setHata('');
        setBekliyor(false);
        return;
      }
      setBitti(true);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  if (bitti) {
    return (
      <Kutu
        simge={CheckCircle}
        baslik="Şifreniz güncellendi"
        aciklama="Yeni şifrenizle giriş yapabilirsiniz. Açık kalan diğer tüm oturumlar kapatıldı."
      >
        <button onClick={onBitti} className={dugmeStili}>Giriş yap</button>
      </Kutu>
    );
  }

  // 2FA AŞAMASI: şifre alanları gizleniyor ki kullanıcı hangi adımda
  // olduğunu karıştırmasın (giriş ekranındaki aynı yaklaşım).
  if (kodGerekli) {
    return (
      <Kutu
        simge={Shield}
        baslik="Doğrulama Kodu"
        aciklama={'Bu hesapta iki aşamalı doğrulama açık. Şifreyi değiştirmek için '
          + 'doğrulayıcı uygulamadaki 6 haneli kodu girin.'}
      >
        <input
          value={kod}
          onChange={(e) => setKod(e.target.value.replace(/\s/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && kod.length >= 6 && kaydet()}
          placeholder="000000" inputMode="numeric" autoFocus
          className="w-full text-center text-3xl tracking-[0.4em] font-bold py-5 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
        />

        <div className="mt-5"><HataKutusu mesaj={hata} /></div>

        <button onClick={kaydet} disabled={bekliyor || kod.length < 6} className={`${dugmeStili} mt-5`}>
          {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>ŞİFREYİ DEĞİŞTİR <ChevronRight size={20} /></>}
        </button>

        <p className="text-xs text-gray-500 text-center mt-5 leading-relaxed">
          Telefonunuza erişemiyorsanız yedek kodlarınızdan birini girebilirsiniz.
        </p>
      </Kutu>
    );
  }

  return (
    <Kutu
      simge={Lock}
      baslik="Yeni Şifre"
      aciklama="En az 8 karakterli yeni bir şifre belirleyin."
    >
      <div className="space-y-5">
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="password" value={sifre} onChange={(e) => setSifre(e.target.value)}
            placeholder="Yeni şifre" autoFocus className={girdiStili}
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="password" value={tekrar} onChange={(e) => setTekrar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && kaydet()}
            placeholder="Yeni şifre (tekrar)" className={girdiStili}
          />
        </div>

        <HataKutusu mesaj={hata} />

        <button onClick={kaydet} disabled={bekliyor || !sifre || !tekrar} className={dugmeStili}>
          {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>ŞİFREYİ DEĞİŞTİR <ChevronRight size={20} /></>}
        </button>
      </div>
    </Kutu>
  );
};
