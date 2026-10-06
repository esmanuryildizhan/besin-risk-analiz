// src/screens/LoginScreen.js
//
// Giriş ekranı.

import React, { useState } from 'react';
import {
  Apple, ChevronRight, Lock, Mail, Loader2,
} from 'lucide-react';
import { api, tokenKaydet } from '../api';
import { HataKutusu } from '../components/ortak';
import { KvkkBaglantilari } from '../kvkk/KvkkBilesenleri';

export const LoginScreen = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const girisYap = async () => {
    setHata(''); setBekliyor(true);
    try {
      const sonuc = await api.girisYap(email, password);
      tokenKaydet(sonuc.token);
      onLogin(sonuc.user);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 sm:p-14 w-full max-w-[520px] border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-teal-600" />
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl flex items-center justify-center mb-6 border border-green-100">
            <Apple size={48} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hoş Geldiniz</h1>
          <p className="text-gray-500 text-center">Kişiselleştirilmiş besin risk analizi sistemi</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && girisYap()}
                placeholder="••••••••"
                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-700"
              />
            </div>
          </div>

          <HataKutusu mesaj={hata} />

          <button
            onClick={girisYap} disabled={bekliyor}
            className="w-full bg-gradient-to-r from-green-600 to-teal-700 hover:from-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2 text-lg"
          >
            {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <>GİRİŞ YAP <ChevronRight size={20} /></>}
          </button>

          <div className="text-center pt-2">
            <button onClick={onRegister} className="text-green-700 hover:text-green-900 font-bold hover:underline">
              Hesabınız yok mu? Hemen kayıt olun
            </button>
          </div>

          {/* Aydınlatma yükümlülüğü onaya bağlı değildir: metinler giriş
              yapmadan da okunabilir olmalı. */}
          <KvkkBaglantilari />
        </div>
      </div>
    </div>
  );
};
