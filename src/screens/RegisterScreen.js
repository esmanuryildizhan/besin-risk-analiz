// src/screens/RegisterScreen.js
//
// Kayıt ekranı: profil bilgileri + KVKK onayları.

import React, { useState } from 'react';
import {
  User, Apple, ChevronRight, ArrowLeft, Activity, Shield,
  Loader2, Mail,
} from 'lucide-react';
import { api } from '../api';
import { HataKutusu, SecimKutusu } from '../components/ortak';
import { OnayBloku, useKvkk } from '../kvkk/KvkkBilesenleri';

export const RegisterScreen = ({ onBack, meta }) => {
  // onRegister KALDIRILDI: kayıt artık doğrudan içeri almıyor. Sunucu oturum
  // bileti vermiyor, kullanıcının önce e-posta adresini doğrulaması gerekiyor.
  const [kayitTamam, setKayitTamam] = useState(false);
  const [form, setForm] = useState({
    name: '', surname: '', email: '', password: '', gender: '', diet: 'Normal',
  });
  const [hastaliklar, setHastaliklar] = useState([]);
  const [alerjiler, setAlerjiler] = useState([]);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  // KVKK: ikisi AYRI tutuluyor. aydinlatma bir "okudum ve anladım" beyanı,
  // riza ise açık rıza seçimi. riza null = henüz seçim yapılmadı.
  const [aydinlatma, setAydinlatma] = useState(false);
  const [riza, setRiza] = useState(null);
  const { metinler, hata: metinHatasi } = useKvkk();

  const degistir = (alan) => (e) => setForm({ ...form, [alan]: e.target.value });

  const kaydet = async () => {
    setHata(''); setBekliyor(true);
    try {
      await api.kayitOl({
        ...form, diseases: hastaliklar, allergies: alerjiler,
        aydinlatmaOkundu: aydinlatma, acikRiza: riza === true,
      });
      // Sunucu, adres zaten kayıtlı olsa da AYNI yanıtı veriyor (hesap sayımını
      // engellemek için). Arayüz de bu yüzden ikisini ayırt etmiyor.
      setKayitTamam(true);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  if (kayitTamam) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-[460px] border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-5 border border-green-100 mx-auto">
            <Mail size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">E-postanızı kontrol edin</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            <span className="font-semibold text-gray-700">{form.email}</span> adresine
            bir doğrulama bağlantısı gönderildi. Hesabınızı kullanmaya başlamak
            için bağlantıya tıklayın.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            Bağlantı 24 saat geçerlidir. Posta gelmediyse gereksiz (spam)
            klasörünü kontrol edin.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-green-600 to-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition"
          >
            Giriş ekranına dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] overflow-y-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 max-w-[1100px] mx-auto border border-gray-100 relative">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-2 font-bold text-sm bg-gray-100 px-4 py-2 rounded-lg mb-6">
          <ArrowLeft size={18} /> GERİ DÖN
        </button>

        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-green-50 rounded-full mb-4"><Apple className="text-green-600" size={40} /></div>
          <h1 className="text-3xl font-bold text-gray-800">Hesap Oluştur</h1>
          <p className="text-gray-500 mt-2">Sağlık profilinizi doldurun; besinler size göre değerlendirilsin.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-5">
            <h3 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-3 text-xl flex items-center gap-3">
              <User size={24} className="text-blue-500" /> Kişisel Bilgiler
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Ad" value={form.name} onChange={degistir('name')} className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
              <input placeholder="Soyad" value={form.surname} onChange={degistir('surname')} className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
            </div>
            <input type="email" placeholder="E-posta Adresi" value={form.email} onChange={degistir('email')} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
            <input type="password" placeholder="Şifre (en az 8 karakter)" value={form.password} onChange={degistir('password')} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
            <select value={form.gender} onChange={degistir('gender')} className="w-full p-4 bg-gray-50 border rounded-xl text-gray-600 outline-none focus:border-green-500">
              <option value="">Cinsiyet seçiniz</option>
              <option value="Kadın">Kadın</option>
              <option value="Erkek">Erkek</option>
              <option value="Belirtilmemiş">Belirtmek istemiyorum</option>
            </select>
          </div>

          <div className="space-y-8">
            <h3 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-3 text-xl flex items-center gap-3">
              <Activity size={24} className="text-green-500" /> Sağlık & Beslenme
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Diyet Tercihi</label>
              <select value={form.diet} onChange={degistir('diet')} className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl text-gray-700 outline-none focus:border-green-500">
                {(meta.diets || ['Normal']).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <SecimKutusu
              label="Kronik Rahatsızlıklar"
              secenekler={meta.diseases || []}
              secili={hastaliklar}
              onEkle={(k) => setHastaliklar([...hastaliklar, k])}
              onCikar={(k) => setHastaliklar(hastaliklar.filter((x) => x !== k))}
            />
            <SecimKutusu
              label="Besin Alerjileri"
              secenekler={meta.allergens || []}
              secili={alerjiler}
              onEkle={(k) => setAlerjiler([...alerjiler, k])}
              onCikar={(k) => setAlerjiler(alerjiler.filter((x) => x !== k))}
            />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100 space-y-5">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={24} className="text-green-500" /> Kişisel Verilerin Korunması
          </h3>
          <OnayBloku metinler={metinler} aydinlatma={aydinlatma} setAydinlatma={setAydinlatma}
            riza={riza} setRiza={setRiza} />

          <HataKutusu mesaj={metinHatasi || hata} />
          <button
            onClick={kaydet} disabled={bekliyor || !aydinlatma || riza !== true}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-5 rounded-2xl shadow-xl transition text-xl flex items-center justify-center gap-3 disabled:opacity-40"
          >
            {bekliyor ? <Loader2 className="animate-spin" size={22} /> : <>KAYIT İŞLEMİNİ TAMAMLA <ChevronRight size={24} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   BESİN ARAMA
   ========================================================================== */
