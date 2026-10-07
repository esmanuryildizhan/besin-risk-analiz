// src/screens/DiaryScreen.js
//
// Günlük takip: alınan/yakılan kalori, su, takvim.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, AlertCircle, Calendar, Plus, X, Droplet,
  ChevronLeft, ChevronRight, ArrowLeft, Flame, Footprints, Bike,
  Loader2,
} from 'lucide-react';
import { api } from '../api';

/** Bugünü "YYYY-AA-GG" olarak verir (yerel saate göre, UTC'ye kaymadan). */
const bugununGunu = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const gunuOkunurYaz = (gun) => {
  const [y, a, g] = gun.split('-').map(Number);
  return `${g} ${AY_ADLARI[a - 1]} ${y}`;
};

const OGUN_ADLARI = {
  kahvalti: 'Kahvaltı', ogle: 'Öğle', aksam: 'Akşam', ara: 'Ara Öğün',
};

/**
 * Üç ölçütü iç içe üç halka olarak gösterir: alınan kalori, yakılan kalori, su.
 *
 * NOT — ÖZGÜN TASARIMDAN TEK SAPMA: taslakta üç yay AYNI çember üzerindeydi ve
 * birbirine `strokeDashoffset` ile kaydırılıyordu. Taslaktaki küçük örnek
 * değerlerde hoş duruyordu ama gerçek değerlerde yaylar üst üste biniyor
 * (alınan %80, yakılan %40 olduğunda ikisi aynı yerde çiziliyor). İç içe üç
 * halka aynı bilgiyi çakışmadan veriyor. Birebir eski görünüm istenirse
 * yarıçapları eşitleyip offset vermek yeterli.
 *
 * r = 15.9155 seçili çünkü çevresi tam 100 birim; böylece strokeDasharray
 * doğrudan YÜZDE olarak yazılabiliyor.
 */
const UcluHalka = ({ alinan, yakilan, su, hedefKcal, hedefSu, boyut = 'buyuk' }) => {
  const yuzde = (deger, hedef) => {
    if (!hedef || hedef <= 0) return 0;
    return Math.max(0, Math.min(100, (deger / hedef) * 100));
  };
  const halkalar = [
    { r: 15.9155, renk: '#3B82F6', pay: yuzde(alinan, hedefKcal) },      // mavi: alınan
    { r: 12.0, renk: '#10B981', pay: yuzde(yakilan, hedefKcal * 0.25) }, // yeşil: yakılan
    { r: 8.5, renk: '#eab308', pay: yuzde(su, hedefSu) },                // sarı: su
  ];
  const kalinlik = boyut === 'buyuk' ? 3 : 4;

  return (
    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
      {halkalar.map((h, i) => (
        <g key={i}>
          <circle cx="18" cy="18" r={h.r} fill="none" stroke="#e5e7eb" strokeWidth={kalinlik} />
          <circle
            cx="18" cy="18" r={h.r} fill="none" stroke={h.renk} strokeWidth={kalinlik}
            strokeDasharray={`${(h.pay / 100) * (2 * Math.PI * h.r)}, ${2 * Math.PI * h.r}`}
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
};

/**
 * Bir öğün satırı. İki giriş biçimi de burada:
 *   - besin seçerek (veri tabanından arayıp ekle)
 *   - serbest kalori (dışarıda yenen, veri tabanında olmayan yemek)
 */
const OgunSatiri = ({ ogunKey, kalemler, onEkle, onSil, onAdet, kilitli }) => {
  const [arama, setArama] = useState('');
  const [sonuclar, setSonuclar] = useState([]);
  const [araniyor, setAraniyor] = useState(false);
  const [serbestKcal, setSerbestKcal] = useState('');
  const [serbestAd, setSerbestAd] = useState('');
  // Besin seçerken kaç porsiyon yendiği. Varsayılan 1; "iki dilim ekmek"
  // yiyen kişi 2 yazıp seçince kalori iki katı ekleniyor.
  const [adet, setAdet] = useState('1');

  // Arama: 2 harften sonra, 300 ms bekleyip tek istek.
  useEffect(() => {
    if (arama.trim().length < 2) { setSonuclar([]); return undefined; }
    let iptal = false;
    setAraniyor(true);
    const zamanlayici = setTimeout(async () => {
      try {
        const veri = await api.besinAra({ search: arama.trim(), limit: 6 });
        if (!iptal) setSonuclar(veri.foods || veri || []);
      } catch {
        if (!iptal) setSonuclar([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 300);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [arama]);

  const toplam = kalemler.reduce((t, k) => t + k.kcal, 0);
  const secilenAdet = Number(adet) > 0 ? Number(adet) : 1;

  const serbestEkle = () => {
    const sayi = Number(serbestKcal);
    if (!(sayi > 0)) return;
    onEkle({ mealType: ogunKey, kcal: sayi, label: serbestAd.trim() });
    setSerbestKcal(''); setSerbestAd('');
  };

  return (
    <div className="bg-white rounded-3xl border p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-xl text-gray-800">{OGUN_ADLARI[ogunKey]}</h3>
        <span className="text-gray-500 font-bold">{toplam} kcal</span>
      </div>

      {kalemler.length > 0 && (
        <ul className="mb-4 space-y-2">
          {kalemler.map((k) => (
            <li key={k.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm text-gray-700 flex items-center gap-2 min-w-0">
                {k.icon && <span>{k.icon}</span>}
                <span className="truncate">{k.ad}</span>
                {k.adet ? (
                  <span className="text-gray-500 shrink-0">
                    · {k.adet} × {k.porsiyonAdi} ({Math.round(k.amount)} g)
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {/* Adet yalnızca besin seçerek eklenen kalemlerde değiştirilebilir;
                    serbest girişte porsiyon diye bir şey yok. */}
                {k.adet ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => onAdet(k.id, Math.max(0.5, k.adet - 1))}
                      disabled={kilitli || k.adet <= 0.5}
                      className="w-7 h-7 rounded-lg bg-white border text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-30 leading-none"
                      aria-label="Adeti azalt"
                    >−</button>
                    <span className="w-8 text-center text-sm font-bold text-gray-700">{k.adet}</span>
                    <button
                      onClick={() => onAdet(k.id, k.adet + 1)} disabled={kilitli}
                      className="w-7 h-7 rounded-lg bg-white border text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-30 leading-none"
                      aria-label="Adeti artır"
                    >+</button>
                  </span>
                ) : null}
                <span className="text-sm font-bold text-gray-600 w-20 text-right">{k.kcal} kcal</span>
                <button
                  onClick={() => onSil(k.id)} disabled={kilitli}
                  className="text-gray-500 hover:text-red-500 transition disabled:opacity-40"
                  aria-label="Kaydı sil"
                >
                  <X size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Besin seçerek ekleme */}
      <div className="relative">
        <div className="flex items-center gap-2 border rounded-xl px-3 focus-within:border-green-500 transition">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Besin ara (ör. yoğurt) — veya aşağıdan kalori gir"
            aria-label="Besin ara"
            className="p-3 outline-none text-sm w-full bg-transparent rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-inset"
          />
          {araniyor && <Loader2 size={16} className="animate-spin text-gray-500 shrink-0" />}
          <span className="flex items-center gap-1 shrink-0 border-l pl-3">
            <input
              type="number" min="0.5" step="0.5" value={adet}
              onChange={(e) => setAdet(e.target.value)}
              className="w-14 p-2 text-sm text-center outline-none bg-transparent rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-inset"
              aria-label="Kaç porsiyon"
            />
            <span className="text-xs text-gray-500 pr-1">adet</span>
          </span>
        </div>

        {sonuclar.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-2 bg-white border rounded-2xl shadow-xl overflow-hidden">
            {sonuclar.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => {
                    onEkle({ mealType: ogunKey, foodId: b.id, adet: Number(adet) > 0 ? Number(adet) : 1 });
                    setArama(''); setSonuclar([]); setAdet('1');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 transition flex justify-between items-center gap-3"
                >
                  <span className="text-sm text-gray-800 min-w-0">
                    {b.icon} {b.name}
                    <span className="text-gray-500">
                      {' '}· {secilenAdet} × {b.portionName}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-gray-500 shrink-0">
                    {Math.round((b.kcal * b.portionGrams * secilenAdet) / 100)} kcal
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Serbest kalori girişi */}
      <div className="flex items-center gap-2 mt-3">
        <input
          value={serbestAd}
          onChange={(e) => setSerbestAd(e.target.value)}
          placeholder="Yemeğin adı (isteğe bağlı)"
          className="p-3 border rounded-xl outline-none text-sm flex-1 focus:border-green-500 transition"
        />
        <input
          type="number" min="1"
          value={serbestKcal}
          onChange={(e) => setSerbestKcal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && serbestEkle()}
          placeholder="kalori"
          className="p-3 border rounded-xl outline-none text-sm w-28 focus:border-green-500 transition"
        />
        <button
          onClick={serbestEkle} disabled={kilitli || !(Number(serbestKcal) > 0)}
          className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 active:scale-95 transition disabled:opacity-40 disabled:active:scale-100"
          aria-label="Serbest kalori ekle"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

export const DiaryScreen = () => {
  const [gun, setGun] = useState(bugununGunu);
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [kilitli, setKilitli] = useState(false);
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [ayVerisi, setAyVerisi] = useState(null);
  const [aktiviteGirdi, setAktiviteGirdi] = useState('');

  // Hedef yoksa makul bir varsayılan gösteriyoruz ama bunu kullanıcıya da
  // söylüyoruz: uydurulmuş bir hedefi kendi hedefi sanmasın.
  const VARSAYILAN_KCAL = 2000;
  const VARSAYILAN_SU = 2;
  const hedefKcal = (veri && veri.hedefler.kcal) || VARSAYILAN_KCAL;
  const hedefSu = (veri && veri.hedefler.suL) || VARSAYILAN_SU;
  const hedefKendi = Boolean(veri && veri.hedefler.kcal);

  const gunuYukle = useCallback(async (hangiGun) => {
    setYukleniyor(true); setHata('');
    try {
      setVeri(await api.gunlukGetir(hangiGun));
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => { gunuYukle(gun); }, [gun, gunuYukle]);

  const ayiYukle = useCallback(async (yilAy) => {
    try {
      setAyVerisi(await api.gunlukAyGetir(yilAy));
    } catch (e) {
      setHata(e.message);
    }
  }, []);

  useEffect(() => {
    if (takvimAcik) ayiYukle(gun.slice(0, 7));
  }, [takvimAcik, gun, ayiYukle]);

  /** Her değişiklikten sonra günü yeniden okuyoruz: toplamları sunucu hesaplıyor,
   *  istemcide ikinci bir hesap tutmak iki kaynağın ayrışması demek olurdu. */
  const islem = async (fn) => {
    setKilitli(true); setHata('');
    try {
      await fn();
      await gunuYukle(gun);
      if (takvimAcik) await ayiYukle(gun.slice(0, 7));
    } catch (e) {
      setHata(e.message);
    } finally {
      setKilitli(false);
    }
  };

  const kalemEkle = (kalem) => islem(() => api.gunlukKalemEkle(gun, kalem));
  const kalemSil = (id) => islem(() => api.gunlukKalemSil(id));
  const kalemAdet = (id, yeniAdet) => islem(() => api.gunlukKalemAdet(id, yeniAdet));
  const suDegistir = (fark) => islem(() => api.gunlukGunGuncelle(gun, {
    waterL: Math.max(0, Number(((veri ? veri.suL : 0) + fark).toFixed(1))),
  }));
  const aktiviteEkle = () => {
    const sayi = Number(aktiviteGirdi);
    if (!(sayi > 0)) return;
    islem(() => api.gunlukGunGuncelle(gun, { burnedKcal: (veri ? veri.yakilanKcal : 0) + sayi }))
      .then(() => setAktiviteGirdi(''));
  };

  const gunDegistir = (fark) => {
    const d = new Date(`${gun}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + fark);
    setGun(d.toISOString().slice(0, 10));
  };

  const kalemleri = (ogunKey) => (veri ? veri.kalemler.filter((k) => k.mealType === ogunKey) : []);

  // --- TAKVİM ---
  if (takvimAcik) {
    const [yil, ay] = gun.split('-').map(Number);
    const ilkGun = new Date(Date.UTC(yil, ay - 1, 1));
    const gunSayisi = new Date(Date.UTC(yil, ay, 0)).getUTCDate();
    // Pazartesi = 0 olacak şekilde kaydır (JS'te Pazar = 0)
    const bosluk = (ilkGun.getUTCDay() + 6) % 7;
    const ozet = new Map((ayVerisi ? ayVerisi.gunler : []).map((g) => [g.gun, g]));

    return (
      <div className="p-6 sm:p-10 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            {AY_ADLARI[ay - 1]} {yil}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(Date.UTC(yil, ay - 2, 1)); setGun(d.toISOString().slice(0, 10)); }}
              className="p-3 rounded-xl bg-white border hover:bg-gray-50 transition" aria-label="Önceki ay">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => { const d = new Date(Date.UTC(yil, ay, 1)); setGun(d.toISOString().slice(0, 10)); }}
              className="p-3 rounded-xl bg-white border hover:bg-gray-50 transition" aria-label="Sonraki ay">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setTakvimAcik(false)}
              className="px-6 py-3 rounded-xl font-bold bg-white border shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
              <ArrowLeft size={18} /> Güne Dön
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6 sm:p-10">
          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((g) => (
              <div key={g} className="text-center font-bold text-gray-500 uppercase text-xs mb-2 tracking-widest">{g}</div>
            ))}
            {Array.from({ length: bosluk }).map((_, i) => <div key={`bos-${i}`} />)}
            {Array.from({ length: gunSayisi }).map((_, i) => {
              const sayi = i + 1;
              const anahtar = `${yil}-${String(ay).padStart(2, '0')}-${String(sayi).padStart(2, '0')}`;
              const o = ozet.get(anahtar);
              const bugun = anahtar === bugununGunu();
              return (
                <button
                  key={sayi}
                  onClick={() => { setGun(anahtar); setTakvimAcik(false); }}
                  className={`aspect-square border-2 rounded-2xl p-2 transition flex flex-col items-center justify-between
                    ${bugun ? 'border-green-500 bg-green-50/40' : 'border-gray-100 bg-gray-50/30'}
                    hover:border-green-400 hover:shadow-lg`}
                >
                  <span className="font-bold text-sm text-gray-700">{sayi}</span>
                  <div className="w-10 h-10">
                    {o ? (
                      <UcluHalka
                        alinan={o.alinanKcal} yakilan={o.yakilanKcal} su={o.suL}
                        hedefKcal={hedefKcal} hedefSu={hedefSu} boyut="kucuk"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full border-4 border-gray-100" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-8 flex flex-wrap gap-5 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" />Alınan kalori</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" />Yakılan kalori</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" />Su</span>
          </p>
        </div>
      </div>
    );
  }

  // --- GÜN GÖRÜNÜMÜ ---
  return (
    <div className="p-6 sm:p-10 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{gunuOkunurYaz(gun)}</h1>
          {gun === bugununGunu() && <span className="text-sm font-bold text-green-600">Bugün</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => gunDegistir(-1)} className="p-3 rounded-xl bg-white border hover:bg-gray-50 transition" aria-label="Önceki gün">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => gunDegistir(1)} className="p-3 rounded-xl bg-white border hover:bg-gray-50 transition" aria-label="Sonraki gün">
            <ChevronRight size={20} />
          </button>
          <button onClick={() => setTakvimAcik(true)}
            className="px-6 py-3 rounded-xl font-bold bg-white border shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
            <Calendar size={18} /> Takvim
          </button>
        </div>
      </div>

      {hata && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertCircle size={18} /> {hata}
        </div>
      )}

      {yukleniyor && !veri ? (
        <div className="flex items-center gap-3 text-gray-500 py-20 justify-center">
          <Loader2 className="animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {['kahvalti', 'ogle', 'aksam', 'ara'].map((o) => (
              <OgunSatiri
                key={o} ogunKey={o} kalemler={kalemleri(o)}
                onEkle={kalemEkle} onSil={kalemSil} onAdet={kalemAdet} kilitli={kilitli}
              />
            ))}

            {/* Aktivite */}
            <div className="bg-white rounded-3xl border p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-xl"><Flame size={24} className="text-green-600" /></div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800">Aktivite</h3>
                    <span className="text-sm text-gray-500">{veri ? veri.yakilanKcal : 0} kcal yakıldı</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Footprints size={20} className="text-gray-500" />
                  <Bike size={20} className="text-gray-500" />
                  <input
                    type="number" min="1" value={aktiviteGirdi}
                    onChange={(e) => setAktiviteGirdi(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aktiviteEkle()}
                    placeholder="yakılan kalori"
                    className="p-3 border rounded-xl outline-none text-sm w-36 focus:border-green-500 transition"
                  />
                  <button onClick={aktiviteEkle} disabled={kilitli || !(Number(aktiviteGirdi) > 0)}
                    className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 active:scale-95 transition disabled:opacity-40">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Su */}
            <div className="bg-blue-50 rounded-3xl border border-blue-100 p-6 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <Droplet size={28} className="text-blue-500" />
                <div>
                  <h3 className="font-bold text-blue-900 text-xl">Su: {(veri ? veri.suL : 0).toFixed(1)} L</h3>
                  <span className="text-sm text-blue-700/70">Hedef {hedefSu} L</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => suDegistir(-0.2)} disabled={kilitli}
                  className="w-12 h-12 rounded-full bg-white text-blue-500 font-bold border border-blue-200 text-xl hover:bg-blue-50 disabled:opacity-40">−</button>
                <button onClick={() => suDegistir(0.2)} disabled={kilitli}
                  className="w-12 h-12 rounded-full bg-blue-500 text-white font-bold text-xl hover:bg-blue-600 disabled:opacity-40">+</button>
              </div>
            </div>
          </div>

          {/* Günün özeti */}
          <div className="bg-white rounded-3xl border p-8 h-fit lg:sticky lg:top-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b">Günün Özeti</h2>

            <div className="w-56 h-56 mx-auto mb-8 relative flex items-center justify-center">
              <UcluHalka
                alinan={veri ? veri.alinanKcal : 0}
                yakilan={veri ? veri.yakilanKcal : 0}
                su={veri ? veri.suL : 0}
                hedefKcal={hedefKcal} hedefSu={hedefSu}
              />
              <div className="absolute text-center">
                <span className="block text-4xl font-bold text-gray-800">{veri ? veri.netKcal : 0}</span>
                <span className="text-sm text-gray-500 font-bold">Net kcal</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full" />Alınan</span>
                <span>{veri ? veri.alinanKcal : 0} kcal</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full" />Yakılan</span>
                <span>− {veri ? veri.yakilanKcal : 0} kcal</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-full" />Su</span>
                <span>{(veri ? veri.suL : 0).toFixed(1)} L</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 border">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Net</span><span>{veri ? veri.netKcal : 0} / {hedefKcal} kcal</span>
              </div>
              {!hedefKendi && (
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                  Bu hedef sizin değil, varsayılan bir değer ({VARSAYILAN_KCAL} kcal / {VARSAYILAN_SU} L).
                  Kendi hedefinizi Profil Ayarları'ndan girebilirsiniz.
                </p>
              )}
            </div>

            <p className="mt-6 text-xs text-gray-500 leading-relaxed">
              Girdiğiniz her kayıt anında kaydediliyor; ayrıca kaydetmeniz gerekmiyor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   TAHLİL SONUÇLARI
   ========================================================================== */
