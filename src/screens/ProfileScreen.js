// src/screens/ProfileScreen.js
//
// Profil, günlük hedefler ve hesap silme.

import React, { useState } from 'react';
import {
  User, Save, CheckCircle, Info, Activity, Loader2,
} from 'lucide-react';
import { api } from '../api';
import { HataKutusu, SecimKutusu } from '../components/ortak';
import { HesapSilme } from '../kvkk/KvkkBilesenleri';

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
        <button onClick={kaydet} disabled={bekliyor} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-60">
          {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Değişiklikleri Kaydet
        </button>
      </header>

      <div className="space-y-4 mb-6">
        <HataKutusu mesaj={hata} />
        {mesaj && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex gap-2">
            <CheckCircle size={18} /> {mesaj}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><User size={22} /></div> Kişisel Bilgiler
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad" className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
              <input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="Soyad" className="p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">E-posta</label>
              <input value={user.email} disabled className="w-full p-4 bg-gray-100 border rounded-xl text-gray-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Cinsiyet</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500 text-gray-700">
                <option value="">Belirtilmemiş</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Günlük Hedefler</label>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                Günlük Takip ekranındaki halkalar bu hedeflere göre doluyor.
                Boş bırakırsanız varsayılan (2000 kcal / 2 L) kullanılır ve ekranda
                bunun sizin hedefiniz olmadığı belirtilir.
                <strong className="text-gray-500"> Bu bir sağlık tavsiyesi değildir</strong> —
                hedefi siz belirlersiniz.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 mb-1 block">Kalori (kcal)</span>
                  <input
                    type="number" min="500" max="6000" value={form.kcalGoal}
                    onChange={(e) => setForm({ ...form, kcalGoal: e.target.value })}
                    placeholder="örn. 2000"
                    className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 mb-1 block">Su (litre)</span>
                  <input
                    type="number" min="0.5" max="8" step="0.1" value={form.waterGoalL}
                    onChange={(e) => setForm({ ...form, waterGoalL: e.target.value })}
                    placeholder="örn. 2"
                    className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-green-100 p-3 rounded-2xl text-green-600"><Activity size={22} /></div> Sağlık & Beslenme
          </h2>
          <div className="space-y-8">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Diyet Tercihi</label>
              <select value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-green-500 text-gray-700">
                {(meta.diets || ['Normal']).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-2">
                Diyetinize uymayan besinler mor "DİYETİNİZE UYGUN DEĞİL" etiketiyle gösterilir.
              </p>
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
          <Info size={20} className="shrink-0 text-gray-400" />
          <div>
            Seçtiğiniz hastalıklardan bazıları için elimizdeki veriyle otomatik değerlendirme yapılamıyor
            (ör. IBS için FODMAP, gut için pürin bilgisi veri tabanında yok). Bu hastalıklar için besin kartlarında
            "değerlendirilemedi" notu göreceksiniz.
          </div>
        </div>
      )}

      <HesapSilme onSilindi={onSilindi} />
    </div>
  );
};

/* ==========================================================================
   GÜNLÜK TAKİP & TAHLİL (henüz API'ye bağlanmadı)
   ========================================================================== */

/* ==========================================================================
   GÜNLÜK TAKİP
   ========================================================================== */
