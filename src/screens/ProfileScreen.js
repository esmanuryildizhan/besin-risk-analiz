// src/screens/ProfileScreen.js
//
// Profil, günlük hedefler ve hesap silme.

import React, { useRef, useState } from 'react';
import {
  Activity, CheckCircle, ChevronDown, Clock, Info, KeyRound, Loader2, Monitor,
  Moon, Palette, Save, Shield, Smile, Sun, User,
} from 'lucide-react';
import { api, tokenKaydet } from '../api';
import { HataKutusu, SecimKutusu } from '../components/ortak';
import { HesapSilme, VeriIndirme } from '../kvkk/KvkkBilesenleri';
import { kayitliTema, temayiSec } from '../tema';
import { OnayKutusu, ParolaKurallari } from '../components/ortak';
import { AVATARLAR, Avatar } from '../components/Avatarlar';
import { tumKurallarTamamMi } from '../parolaKurali';

/**
 * Parola değiştirme.
 *
 * MEVCUT PAROLA SORULUYOR: kullanıcı bilgisayarını kilitlemeden kalktıysa ya
 * da biri oturum tokenını ele geçirdiyse, parola değiştirme hesabı KALICI
 * devralmaya yarar. Mevcut parola şartı bunu engelliyor. Sunucu da ayrıca
 * doğruluyor; buradaki alan yalnızca onu göndermek için.
 *
 * 2FA AÇIKSA: sunucu { ikinciAsama: true } dönüyor, kod alanı açılıyor.
 * Aynı desen giriş ve parola sıfırlamada da kullanılıyor.
 */
const ParolaDegistirme = () => {
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [kod, setKod] = useState('');
  const [kodGerekli, setKodGerekli] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [tamam, setTamam] = useState('');
  const [onayAcik, setOnayAcik] = useState(false);

  /** Önce doğrula, sonra onay sor. Sıra böyle: kullanıcıya önce "emin misin"
   *  deyip sonra "parolan kurala uymuyor" demek gereksiz bir adım olurdu. */
  const onayIste = () => {
    setHata(''); setTamam('');
    if (yeni !== tekrar) { setHata('İki parola birbiriyle aynı değil.'); return; }
    if (!tumKurallarTamamMi(yeni)) { setHata('Yeni parola aşağıdaki kuralların tümünü karşılamalı.'); return; }
    if (yeni === mevcut) { setHata('Yeni parola eskisiyle aynı olamaz.'); return; }
    setOnayAcik(true);
  };

  const gonder = async () => {
    setOnayAcik(false);
    setBekliyor(true);
    try {
      const c = await api.parolaDegistir(mevcut, yeni, kodGerekli ? kod : undefined);
      if (c.ikinciAsama) { setKodGerekli(true); setBekliyor(false); return; }
      // Sunucu diğer oturumları kapattı ve bize yeni bir token verdi;
      // saklanmazsa kullanıcı kendi oturumundan da düşerdi.
      if (c.token) tokenKaydet(c.token);
      setTamam(c.mesaj || 'Parolanız güncellendi.');
      setMevcut(''); setYeni(''); setTekrar(''); setKod(''); setKodGerekli(false);
    } catch (h) {
      setHata(h.message);
    } finally {
      setBekliyor(false);
    }
  };

  const girdi = 'w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-gray-700';

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-amber-100 p-3 rounded-2xl text-amber-800"><KeyRound size={22} /></div> Parola Değiştir
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="parola-mevcut" className="text-xs font-bold text-gray-500 mb-1 block uppercase">Mevcut parola</label>
          <input
            id="parola-mevcut" type="password" autoComplete="current-password"
            value={mevcut} onChange={(e) => setMevcut(e.target.value)} className={girdi}
          />
        </div>
        <div>
          <label htmlFor="parola-yeni" className="text-xs font-bold text-gray-500 mb-1 block uppercase">Yeni parola</label>
          <input
            id="parola-yeni" type="password" autoComplete="new-password"
            value={yeni} onChange={(e) => setYeni(e.target.value)} className={girdi}
          />
          <ParolaKurallari parola={yeni} />
        </div>
        <div>
          <label htmlFor="parola-tekrar" className="text-xs font-bold text-gray-500 mb-1 block uppercase">Yeni parola (tekrar)</label>
          <input
            id="parola-tekrar" type="password" autoComplete="new-password"
            value={tekrar} onChange={(e) => setTekrar(e.target.value)} className={girdi}
          />
        </div>
        {kodGerekli && (
          <div>
            <label htmlFor="parola-2fa" className="text-xs font-bold text-gray-500 mb-1 block uppercase">
              Doğrulama uygulamasındaki kod
            </label>
            <input
              id="parola-2fa" inputMode="numeric" value={kod}
              onChange={(e) => setKod(e.target.value.replace(/\s/g, ''))}
              className={`${girdi} text-center text-2xl tracking-[0.3em] font-bold`}
            />
          </div>
        )}

        <HataKutusu mesaj={hata} />
        {tamam && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-4" role="status">
            {tamam}
          </p>
        )}

        <OnayKutusu
          acik={onayAcik}
          baslik="Parolanızı değiştirmek istediğinize emin misiniz?"
          aciklama={(
            <>
              <p className="mb-3">Yeni parolanızla giriş yapacaksınız.</p>
              <p>
                <strong>Diğer cihazlardaki açık oturumlar kapatılacak.</strong>{' '}
                Telefonunuzda ya da başka bir tarayıcıda açık oturumunuz varsa
                yeniden giriş yapmanız gerekecek.
              </p>
            </>
          )}
          onayYazisi="Parolayı değiştir"
          onOnay={gonder}
          onIptal={() => setOnayAcik(false)}
          bekliyor={bekliyor}
        />

        <button
          onClick={onayIste}
          disabled={bekliyor || !mevcut || !yeni || !tekrar}
          className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-40 flex items-center gap-2"
        >
          {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
          Parolayı Değiştir
        </button>
        <p className="text-xs text-gray-500">
          Parolanızı değiştirince diğer cihazlarda açık kalan oturumlar kapatılır.
        </p>
      </div>
    </div>
  );
};

/**
 * Tema seçimi.
 *
 * NİYE RADYO DÜĞMESİ, NİYE <button> DEĞİL: üç seçenek birbirini dışlıyor ve
 * tam olarak biri seçili. Radyo grubu bunu tarayıcıya ve ekran okuyucuya
 * kendiliğinden anlatıyor — "3 seçenekten 2.si, seçili" diye duyuruluyor ve
 * ok tuşlarıyla geziliyor. Üç ayrı <button> ile aynı davranışı elde etmek
 * için role, aria-checked ve klavye işleyicisini elle yazmak gerekirdi.
 * Girdiler sr-only ile gizli; görünen kısım <label>, tıklama zaten ona bağlı.
 */
const GorunumAyari = () => {
  const [tema, setTema] = useState(kayitliTema());
  const secenekler = [
    { kod: 'sistem', ad: 'Sistem', ikon: Monitor, aciklama: 'Cihazınızın ayarını izler' },
    { kod: 'acik', ad: 'Açık', ikon: Sun, aciklama: null },
    { kod: 'karanlik', ad: 'Karanlık', ikon: Moon, aciklama: null },
  ];
  const degistir = (kod) => { setTema(kod); temayiSec(kod); };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-purple-100 p-3 rounded-2xl text-purple-700"><Palette size={22} /></div> Görünüm
      </h2>
      <fieldset>
        <legend className="text-xs font-bold text-gray-500 mb-3 block uppercase">Tema</legend>
        <div className="grid grid-cols-3 gap-3">
          {secenekler.map(({ kod, ad, ikon: Ikon }) => (
            <label
              key={kod}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition
                ${tema === kod
                  ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
            >
              <input
                type="radio" name="tema" value={kod} checked={tema === kod}
                onChange={() => degistir(kod)}
                className="sr-only"
              />
              <Ikon size={22} />
              <span className="text-sm">{ad}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Tercih bu tarayıcıda saklanıyor; başka bir cihazda tekrar seçmeniz gerekir.
          &quot;Sistem&quot; seçiliyken cihazınızın karanlık mod ayarı değişirse uygulama da izler.
        </p>
      </fieldset>
    </div>
  );
};

/**
 * İki aşamalı doğrulama kurulumu (profil ekranı).
 *
 * Akış: QR göster → kullanıcı taratıp kod girsin → doğrulanınca aç ve yedek
 * kodları BİR KEZ göster. Kod doğrulanmadan açılmıyor; aksi hâlde kurulumu
 * yanlış yapan kullanıcı kendi hesabından kilitlenirdi.
 */
const IkiAsamaliDogrulama = ({ user, onGuncelle }) => {
  const [asama, setAsama] = useState('kapali');   // kapali | kurulum | kodlar
  const [qr, setQr] = useState(null);
  const [anahtar, setAnahtar] = useState('');
  const [kod, setKod] = useState('');
  const [yedekKodlar, setYedekKodlar] = useState([]);
  const [sifre, setSifre] = useState('');
  const [kapatmaAcik, setKapatmaAcik] = useState(false);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const baslat = async () => {
    setBekliyor(true); setHata('');
    try {
      const s = await api.ikiAsamaBaslat();
      setQr(s.qr); setAnahtar(s.anahtar); setAsama('kurulum');
    } catch (e) { setHata(e.message); } finally { setBekliyor(false); }
  };

  const dogrula = async () => {
    setBekliyor(true); setHata('');
    try {
      const s = await api.ikiAsamaDogrula(kod);
      setYedekKodlar(s.yedekKodlar); setAsama('kodlar'); setKod('');
      onGuncelle(await api.profilimiGetir());
    } catch (e) { setHata(e.message); } finally { setBekliyor(false); }
  };

  const kapat = async () => {
    setBekliyor(true); setHata('');
    try {
      await api.ikiAsamaKapat(sifre);
      setSifre(''); setKapatmaAcik(false); setAsama('kapali');
      onGuncelle(await api.profilimiGetir());
    } catch (e) { setHata(e.message); } finally { setBekliyor(false); }
  };

  // ───── Yedek kodlar: tek seferlik gösterim ─────
  if (asama === 'kodlar') {
    return (
      <div className="mt-8 bg-white border-2 border-green-200 rounded-2xl p-6">
        <h3 className="font-bold text-green-900 flex items-center gap-2 mb-2">
          <CheckCircle size={20} className="text-green-700" /> İki aşamalı doğrulama açıldı
        </h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Aşağıdaki yedek kodları güvenli bir yere kaydedin. Telefonunuza
          erişemediğinizde her biri <strong>bir kez</strong> kullanılabilir.
          Bu kodlar yalnızca şimdi gösteriliyor; sayfadan çıkınca bir daha
          görüntülenemezler.
        </p>
        <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-4 border font-mono text-sm">
          {yedekKodlar.map((k) => <div key={k} className="text-gray-700">{k}</div>)}
        </div>
        <button
          onClick={() => { navigator.clipboard && navigator.clipboard.writeText(yedekKodlar.join('\n')); }}
          className="mt-4 px-5 py-2.5 rounded-xl font-semibold border bg-white hover:bg-gray-50 text-sm"
        >
          Panoya kopyala
        </button>
        <button
          onClick={() => setAsama('kapali')}
          className="mt-4 ml-3 px-5 py-2.5 rounded-xl font-semibold bg-green-700 text-white text-sm"
        >
          Kaydettim, kapat
        </button>
      </div>
    );
  }

  // ───── Kurulum: QR + kod ─────
  if (asama === 'kurulum') {
    return (
      <div className="mt-8 bg-white border-2 border-green-100 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Shield size={20} className="text-green-700" /> Doğrulayıcı uygulamayı bağlayın
        </h3>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            {qr && <img src={qr} alt="QR kodu" className="rounded-xl border" width={200} height={200} />}
          </div>
          <div className="flex-1 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Telefonunuza <strong>Google Authenticator</strong> veya
              <strong> Microsoft Authenticator</strong> kurun, uygulamayı açıp
              QR kodu okutun.
            </p>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-semibold">Kamera çalışmıyorsa</summary>
              <p className="mt-2">Bu anahtarı uygulamaya elle girin:</p>
              <code className="block mt-1 p-2 bg-gray-50 rounded border break-all font-mono">{anahtar}</code>
            </details>
            <div>
              <label htmlFor="totp-kod" className="text-xs font-bold text-gray-500 mb-2 block uppercase">
                Uygulamada görünen kod
              </label>
              <input
                id="totp-kod"
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\s/g, ''))}
                placeholder="000000" inputMode="numeric"
                className="w-full text-center text-2xl tracking-[0.3em] font-bold py-3 bg-gray-50 border rounded-xl outline-none focus:border-green-500"
              />
            </div>
            <HataKutusu mesaj={hata} />
            <div className="flex gap-3">
              <button onClick={dogrula} disabled={bekliyor || kod.length < 6}
                className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-40 flex items-center gap-2">
                {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Doğrula ve aç
              </button>
              <button onClick={() => { setAsama('kapali'); setHata(''); setKod(''); }}
                className="px-6 py-3 rounded-xl font-bold border bg-white hover:bg-gray-50">
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───── Varsayılan: durum ve aç/kapat ─────
  return (
    <div className="mt-8 bg-white border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-1">
            <Shield size={20} className={user.totpEnabled ? 'text-green-700' : 'text-gray-500'} />
            İki Aşamalı Doğrulama
            {user.totpEnabled && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">AÇIK</span>
            )}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
            {user.totpEnabled
              ? `Girişte parolanızın yanı sıra telefonunuzdaki doğrulayıcı uygulamanın ürettiği kod isteniyor. Kalan yedek kod: ${user.yedekKodSayisi}.`
              : 'Açtığınızda, parolanızı bilen biri bile telefonunuza erişemeden hesabınıza giremez. Sağlık verisi tutulduğu için açılması önerilir.'}
          </p>
        </div>
      </div>

      <HataKutusu mesaj={hata} />

      {!user.totpEnabled ? (
        <button onClick={baslat} disabled={bekliyor}
          className="mt-4 bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2">
          {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
          İki aşamalı doğrulamayı aç
        </button>
      ) : !kapatmaAcik ? (
        <button onClick={() => setKapatmaAcik(true)}
          className="mt-4 px-6 py-3 rounded-xl font-bold border text-gray-700 hover:bg-gray-50">
          Kapat
        </button>
      ) : (
        <div className="mt-4 space-y-3 max-w-md">
          <p className="text-sm font-semibold text-gray-700">Kapatmak için parolanızı girin:</p>
          <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)}
            placeholder="Parolanız" autoComplete="current-password"
            className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
          <div className="flex gap-3">
            <button onClick={kapat} disabled={bekliyor || !sifre}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-40">
              Kapat
            </button>
            <button onClick={() => { setKapatmaAcik(false); setSifre(''); setHata(''); }}
              className="px-6 py-3 rounded-xl font-bold border bg-white hover:bg-gray-50">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Avatar seçimi.
 *
 * NİYE SUNUCUDA SAKLANIYOR (tema localStorage'dayken): tema bir cihaz
 * tercihi — aynı kişi telefonda karanlık, masaüstünde açık isteyebilir.
 * Avatar ise kişinin KENDİSİNE ait; cihaz değiştirince kaybolması yanlış
 * olurdu. Bu yüzden profil alanı.
 *
 * Seçim ANINDA kaydediliyor, "Kaydet" beklemiyor: tek tıklık bir tercih
 * için ayrı bir kaydetme adımı gereksiz, üstelik bu sekmede kaydet düğmesi
 * yok.
 */
const AvatarSecimi = ({ user, onGuncelle }) => {
  const [bekleyen, setBekleyen] = useState(null);
  const [hata, setHata] = useState('');

  const sec = async (kod) => {
    setHata(''); setBekleyen(kod);
    try {
      onGuncelle(await api.avatarSec(kod));
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekleyen(null);
    }
  };

  const secenekler = [{ kod: null, ad: 'Baş harfler', Ciz: null }, ...AVATARLAR];

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-green-100 p-3 rounded-2xl text-green-700"><Smile size={22} /></div> Avatarınız
      </h2>
      <fieldset>
        <legend className="text-xs font-bold text-gray-500 mb-4 block uppercase">
          Yan menüde görünecek simge
        </legend>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {secenekler.map(({ kod, ad }) => {
            const secili = (user.avatar || null) === kod;
            return (
              <label
                key={kod || 'bosluk'}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition
                  ${secili ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}
                  ${bekleyen === kod ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio" name="avatar" value={kod || ''} checked={secili}
                  onChange={() => sec(kod)} className="sr-only"
                />
                <Avatar kod={kod} ad={user.name} soyad={user.surname} boyut={52} />
                <span className={`text-xs text-center leading-tight ${secili ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                  {ad}
                </span>
              </label>
            );
          })}
        </div>
        <HataKutusu mesaj={hata} />
      </fieldset>
    </div>
  );
};

const SEKMELER = [
  { kod: 'profil', ad: 'Profil', ikon: User },
  { kod: 'guvenlik', ad: 'Güvenlik', ikon: Shield },
  { kod: 'gorunum', ad: 'Görünüm', ikon: Palette },
  { kod: 'veriler', ad: 'Verilerim', ikon: Clock },
];

export const ProfileScreen = ({ user, onGuncelle, meta, onSilindi }) => {
  const [form, setForm] = useState({
    name: user.name || '', surname: user.surname || '',
    gender: user.gender || '', diet: user.diet || 'Normal',
    // Hedefler boş bırakılabilir; boşsa günlük ekranı varsayılan gösteriyor
    // ve bunun kendi hedefi OLMADIĞINI kullanıcıya açıkça yazıyor.
    kcalGoal: user.kcalGoal ?? '', waterGoalL: user.waterGoalL ?? '',
  });
  const [hastaliklar, setHastaliklar] = useState(user.diseases || []);
  const [alerjiler, setAlerjiler] = useState(user.allergies || []);
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  // Profil ekranı sekiz karta çıkmıştı: hepsi alt alta dizilince hem
  // bulunması zor hem de kaydırması uzun bir sayfa oluyordu. Sekmeler
  // ayrıca hizalama sorununu da çözüyor — eskiden ilk iki kart bir ızgara
  // içindeydi, kalanlar ızgaranın DIŞINDA ve aralarında boşluk yoktu, o
  // yüzden bazıları bitişik görünüyordu.
  const [sekme, setSekme] = useState('profil');
  const sekmeRef = useRef([]);

  const kaydet = async () => {
    setBekliyor(true); setHata(''); setMesaj('');
    try {
      const guncel = await api.profilGuncelle({
        ...form,
        // Boş alan "hedefim yok" demek, "0" demek değil: null gönderiyoruz ki
        // sunucu alanı temizlesin.
        kcalGoal: form.kcalGoal === '' ? null : Number(form.kcalGoal),
        waterGoalL: form.waterGoalL === '' ? null : Number(form.waterGoalL),
        diseases: hastaliklar,
        allergies: alerjiler,
      });
      onGuncelle(guncel);
      setMesaj('Değişiklikler kaydedildi. Besin analizleri artık yeni profilinize göre yapılacak.');
      setTimeout(() => setMesaj(''), 4000);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1200px] mx-auto pb-20">
      <header className="mb-10 border-b border-gray-200 pb-6 flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Profil Ayarları</h1>
          <p className="text-gray-500 mt-2">Sağlık profiliniz, besinlerin nasıl değerlendirileceğini belirler.</p>
        </div>
        {/* Kaydet yalnızca Profil sekmesinde: diğer sekmelerdeki ayarlar
            (tema, parola, 2FA) kendi düğmeleriyle anında kaydediliyor.
            Her sekmede görünseydi hangi değişikliği kaydettiği belirsiz olurdu. */}
        {sekme === 'profil' && (
          <button onClick={kaydet} disabled={bekliyor} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-60">
            {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Değişiklikleri Kaydet
          </button>
        )}
      </header>

      {/* SEKME ÇUBUĞU — ARIA sekme deseni.
          role="tablist" + aria-selected ekran okuyucuya "4 sekmeden 2.si,
          seçili" diye duyuruyor. Ok tuşlarıyla gezinme de desenin parçası;
          onsuz klavye kullanıcısı her sekmeye ayrı ayrı Tab'lamak zorunda
          kalır. Yalnızca seçili sekme Tab sırasında (roving tabindex). */}
      <div
        role="tablist"
        aria-label="Profil bölümleri"
        className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto"
      >
        {SEKMELER.map((sk, i) => {
          const secili = sekme === sk.kod;
          return (
            <button
              key={sk.kod}
              ref={(el) => { sekmeRef.current[i] = el; }}
              role="tab"
              id={`sekme-${sk.kod}`}
              aria-selected={secili}
              aria-controls={`panel-${sk.kod}`}
              tabIndex={secili ? 0 : -1}
              onClick={() => setSekme(sk.kod)}
              onKeyDown={(e) => {
                const yon = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!yon) return;
                e.preventDefault();
                const sonraki = (i + yon + SEKMELER.length) % SEKMELER.length;
                setSekme(SEKMELER[sonraki].kod);
                if (sekmeRef.current[sonraki]) sekmeRef.current[sonraki].focus();
              }}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm whitespace-nowrap border-b-2 -mb-px transition
                focus:outline-none focus:ring-2 focus:ring-green-500 rounded-t-lg
                ${secili
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}
            >
              <sk.ikon size={18} aria-hidden="true" />
              {sk.ad}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 mb-6">
        <HataKutusu mesaj={hata} />
        {mesaj && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex gap-2">
            <CheckCircle size={18} /> {mesaj}
          </div>
        )}
      </div>

      <div role="tabpanel" id="panel-profil" aria-labelledby="sekme-profil" hidden={sekme !== 'profil'}>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><User size={22} /></div> Kişisel Bilgiler
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input aria-label="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad" className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
              <input aria-label="Soyad" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="Soyad" className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
            </div>
            <div>
              <label htmlFor="profil-eposta" className="text-xs font-bold text-gray-500 mb-1 block uppercase">E-posta</label>
              <input id="profil-eposta" value={user.email} disabled className="w-full p-4 bg-gray-100 border rounded-xl text-gray-500" />
            </div>
            <div>
              <label htmlFor="profil-cinsiyet" className="text-xs font-bold text-gray-500 mb-1 block uppercase">Cinsiyet</label>
              <select id="profil-cinsiyet" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500 text-gray-700">
                <option value="">Belirtilmemiş</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
            </div>

            <fieldset className="pt-4 border-t border-gray-100">
              <legend className="text-xs font-bold text-gray-500 mb-1 block uppercase">Günlük Hedefler</legend>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Günlük Takip ekranındaki halkalar bu hedeflere göre doluyor.
                Boş bırakırsanız varsayılan (2000 kcal / 2 L) kullanılır ve ekranda
                bunun sizin hedefiniz olmadığı belirtilir.
                <strong className="text-gray-500"> Bu bir sağlık tavsiyesi değildir</strong>,
                hedefi siz belirlersiniz.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hedef-kcal" className="text-xs text-gray-500 mb-1 block">Kalori (kcal)</label>
                  <input
                    id="hedef-kcal"
                    type="number" min="500" max="6000" value={form.kcalGoal}
                    onChange={(e) => setForm({ ...form, kcalGoal: e.target.value })}
                    placeholder="örn. 2000"
                    className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="hedef-su" className="text-xs text-gray-500 mb-1 block">Su (litre)</label>
                  <input
                    id="hedef-su"
                    type="number" min="0.5" max="8" step="0.1" value={form.waterGoalL}
                    onChange={(e) => setForm({ ...form, waterGoalL: e.target.value })}
                    placeholder="örn. 2"
                    className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-green-100 p-3 rounded-2xl text-green-700"><Activity size={22} /></div> Sağlık & Beslenme
          </h2>
          <div className="space-y-8">
            <div>
              <label htmlFor="profil-diyet" className="text-xs font-bold text-gray-500 mb-2 block uppercase">Diyet Tercihi</label>
              <select id="profil-diyet" value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500 text-gray-700">
                {(meta.diets || ['Normal']).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <SecimKutusu
              label="Kronik Rahatsızlıklar" secenekler={meta.diseases || []} secili={hastaliklar}
              onEkle={(k) => setHastaliklar([...hastaliklar, k])}
              onCikar={(k) => setHastaliklar(hastaliklar.filter((x) => x !== k))}
            />
            <SecimKutusu
              label="Besin Alerjileri" secenekler={meta.allergens || []} secili={alerjiler}
              onEkle={(k) => setAlerjiler([...alerjiler, k])}
              onCikar={(k) => setAlerjiler(alerjiler.filter((x) => x !== k))}
            />
          </div>
        </div>
      </div>

      {(meta.diseases || []).some((h) => hastaliklar.includes(h.key) && !h.evaluable) && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm text-gray-600 flex gap-3">
          <Info size={20} className="shrink-0 text-gray-500" />
          <div>
            Seçtiğiniz hastalıklardan bazıları için elimizdeki veriyle otomatik değerlendirme yapılamıyor
            (ör. IBS için FODMAP, gut için pürin bilgisi veri tabanında yok). Bu hastalıklar için besin kartlarında
            "değerlendirilemedi" notu göreceksiniz.
          </div>
        </div>
      )}
      </div>

      <div role="tabpanel" id="panel-guvenlik" aria-labelledby="sekme-guvenlik" hidden={sekme !== 'guvenlik'}>
        <div className="space-y-8">
          <ParolaDegistirme />
          <IkiAsamaliDogrulama user={user} onGuncelle={onGuncelle} />
        </div>
      </div>

      <div role="tabpanel" id="panel-gorunum" aria-labelledby="sekme-gorunum" hidden={sekme !== 'gorunum'}>
        <div className="space-y-8">
          <GorunumAyari />
          <AvatarSecimi user={user} onGuncelle={onGuncelle} />
        </div>
      </div>

      <div role="tabpanel" id="panel-veriler" aria-labelledby="sekme-veriler" hidden={sekme !== 'veriler'}>
        <div className="space-y-8">

      {/* SAKLAMA SÜRESİ GÖRÜNÜR OLMALI.
          Aydınlatma metninde yazıyor ama onu kayıt sırasında bir kez okuyup
          geçiyorlar. KVKK m.4 verinin "gerekli olan süre kadar" tutulmasını
          istiyor; kullanıcının bu süreyi İSTEDİĞİ AN görebilmesi, hakkını
          kullanabilmesinin ön şartı. Sayılar sunucudaki ayarla aynı
          (backend/src/saklama.js ve guvenlik_gunlugu.js). */}
      {/* Katlanır: bilgi önemli ama her açılışta dört maddelik bir blok
          olarak durması gereksiz yer kaplıyordu. <details> kullanıldı,
          elle yazılmış bir aç/kapa yerine: klavye ve ekran okuyucu desteği
          tarayıcıdan geliyor, "genişletildi/daraltıldı" durumu kendiliğinden
          duyuruluyor. */}
      <details className="bg-white rounded-3xl border border-gray-200 group">
        <summary className="p-8 cursor-pointer list-none flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <div className="bg-sky-100 p-3 rounded-2xl text-sky-800"><Clock size={22} /></div>
            Verileriniz Ne Kadar Saklanıyor
          </h2>
          <ChevronDown size={22} className="text-gray-500 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="space-y-3 text-sm text-gray-700 px-8 pb-8">
          <li className="flex gap-3">
            <span className="text-sky-700 font-bold shrink-0">•</span>
            <span>
              <strong>Hesap ve sağlık verileriniz:</strong> hesabınız durduğu sürece.
              Hastalık, alerji, tahlil ve günlük kayıtlarınız şifreli saklanıyor.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-sky-700 font-bold shrink-0">•</span>
            <span>
              <strong>180 gün giriş yapılmazsa</strong> hesabınız tüm verileriyle
              otomatik siliniyor. Silinmeden <strong>14 gün önce</strong> e-posta ile
              uyarılıyorsunuz; o süre içinde giriş yapmanız sayacı sıfırlıyor.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-sky-700 font-bold shrink-0">•</span>
            <span>
              <strong>Güvenlik kayıtları</strong> (başarısız giriş denemeleri):
              90 gün. IP adresiniz düz değil, geri döndürülemez bir özet olarak
              tutuluyor.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-sky-700 font-bold shrink-0">•</span>
            <span>
              <strong>Dilediğiniz an silebilirsiniz.</strong> Aşağıdaki &quot;Hesabımı
              sil&quot; işlemi geri alınamaz ve 180 günü beklemez.
            </span>
          </li>
        </ul>
      </details>

          <VeriIndirme />

          <HesapSilme onSilindi={onSilindi} />
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   GÜNLÜK TAKİP & TAHLİL (henüz API'ye bağlanmadı)
   ========================================================================== */

/* ==========================================================================
   GÜNLÜK TAKİP
   ========================================================================== */
