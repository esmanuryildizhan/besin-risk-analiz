// src/screens/BesinlerScreen.js
//
// Besin arama, besin kartı ve besin detay penceresi.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Info, FileText, Leaf,
} from 'lucide-react';
import { api } from '../api';
import { HataKutusu, KaynakYazisi, Modal, Yukleniyor, stilAl } from '../components/ortak';

const BesinKarti = ({ besin, onTikla }) => {
  const stil = stilAl(besin.analiz.seviye);
  const Ikon = stil.icon;
  const porsiyonKcal = Math.round((besin.kcal * besin.portionGrams) / 100);

  return (
    <button
      onClick={() => onTikla(besin)}
      className={`bg-white rounded-2xl border ${stil.border} shadow-sm hover:shadow-xl transition p-5 flex flex-col text-left h-full`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-3xl">{besin.icon || '🍽️'}</div>
        <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 text-center leading-tight ${stil.badge} ${stil.text}`}>
          <Ikon size={12} className="shrink-0" /> {stil.etiket}
        </div>
      </div>

      <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{besin.name}</h3>
      <p className="text-gray-500 text-xs mb-1">{besin.category} • {besin.kcal} kcal / 100 g</p>
      <p className="text-gray-500 text-xs mb-3">{besin.portionName} ({besin.portionGrams} g) ≈ {porsiyonKcal} kcal</p>

      <div className={`mt-auto p-3 rounded-xl text-xs font-medium ${stil.bg} ${stil.text} border ${stil.border}`}>
        {besin.analiz.ozet}
      </div>

      {besin.analiz.faydalar.length > 0 && (
        <div className="mt-2 text-[11px] text-green-700 font-semibold flex items-center gap-1">
          <Leaf size={12} /> {besin.analiz.faydalar.length} olumlu bulgu
        </div>
      )}
    </button>
  );
};

const BesinDetay = ({ besin, onKapat }) => {
  if (!besin) return null;
  const stil = stilAl(besin.analiz.seviye);
  const Ikon = stil.icon;
  const oran = besin.portionGrams / 100;

  // Sunucu, eksik veri notlarını kritik olup olmadığıyla işaretliyor.
  // Yalnızca `kritik === false` olanlar gizleniyor; hastalık açıklama
  // notlarında bu alan hiç yok, onlar görünmeye devam ediyor.
  const gosterilecekNotlar = besin.analiz.bilgiNotlari.filter((n) => n.kritik !== false);
  const g = (v, birim = 'g', basamak = 1) =>
    v === null || v === undefined ? '—' : `${(v).toFixed(basamak)} ${birim}`;
  const p = (v, birim = 'g', basamak = 1) =>
    v === null || v === undefined ? '—' : `${(v * oran).toFixed(basamak)} ${birim}`;

  const satirlar = [
    ['Enerji', besin.kcal, 'kcal', 0], ['Protein', besin.proteins, 'g', 1],
    ['Karbonhidrat', besin.carbohydrates, 'g', 1], ['— şeker', besin.sugars, 'g', 1],
    ['Lif', besin.fiber, 'g', 1], ['Yağ', besin.fat, 'g', 1],
    ['— doymuş yağ', besin.saturatedFat, 'g', 1], ['Kolesterol', besin.cholesterolMg, 'mg', 0],
    ['Sodyum', besin.sodiumMg, 'mg', 0], ['Potasyum', besin.potassiumMg, 'mg', 0],
    ['Demir', besin.ironMg, 'mg', 1], ['Kalsiyum', besin.calciumMg, 'mg', 0],
    ['Magnezyum', besin.magnesiumMg, 'mg', 0], ['C vitamini', besin.vitaminCMg, 'mg', 1],
    ['K vitamini', besin.vitaminKUg, 'µg', 1], ['Folat', besin.folateUg, 'µg', 0],
    ['B12 vitamini', besin.vitaminB12Ug, 'µg', 1],
  ];

  return (
    <Modal isOpen={!!besin} onClose={onKapat} title={`${besin.icon || ''} ${besin.name}`} genis>
      <div className="space-y-6">
        <div className={`${stil.bg} ${stil.border} border rounded-2xl p-5 flex items-start gap-4`}>
          <Ikon className={stil.text} size={28} />
          <div>
            <div className={`font-bold text-lg ${stil.text}`}>{stil.etiket}</div>
            <p className={`text-sm mt-1 ${stil.text}`}>{besin.analiz.ozet}</p>
          </div>
        </div>

        {besin.analiz.alerjiUyarilari.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800">Alerji uyarıları</h4>
            {besin.analiz.alerjiUyarilari.map((u, i) => (
              <div key={i} className="bg-purple-50 border border-purple-200 text-purple-800 rounded-xl px-4 py-3 text-sm font-medium">{u.mesaj}</div>
            ))}
          </div>
        )}

        {besin.analiz.riskler.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800">Hastalıklarınıza göre dikkat edilmesi gerekenler</h4>
            {besin.analiz.riskler.map((r, i) => {
              const s = stilAl(r.seviye);
              return (
                <div key={i} className={`${s.bg} border ${s.border} ${s.text} rounded-xl px-4 py-3 text-sm`}>
                  <span className="font-bold">{r.hastalik}:</span> {r.mesaj}
                </div>
              );
            })}
          </div>
        )}

        {besin.analiz.faydalar.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800">Sizin için olumlu yönleri</h4>
            {besin.analiz.faydalar.map((f, i) => (
              <div key={i} className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
                <span className="font-bold">{f.hastalik}:</span> {f.mesaj}
              </div>
            ))}
          </div>
        )}

        {besin.analiz.diyetUyarilari.length > 0 && (
          <div className="space-y-2">
            {besin.analiz.diyetUyarilari.map((d, i) => (
              <div key={i} className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl px-4 py-3 text-sm font-medium">{d}</div>
            ))}
          </div>
        )}

        {/* Yalnızca ağırlığı olan notlar gösteriliyor.
            Eksik veri notlarının kritik olmayanları (kritik === false)
            gizli: glisemik indeks veritabanındaki 155 besnin HİÇBİRİNDE yok,
            C vitamini 47'sinde var. Yani o not her kartta çıkıyordu ve besin
            hakkında bir şey söylemiyordu. Her kartta tekrarlanan bir uyarı
            okunmaz hâle geliyor ve yanındaki kritik uyarıyı da götürüyor.
            Kritik eksikler (netCarbs, saturatedFat, sodiumMg, sugars) ve
            hastalık açıklama notları görünmeye devam ediyor. */}
        {gosterilecekNotlar.length > 0 && (
          <div className="space-y-2">
            {gosterilecekNotlar.map((n, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-4 py-3 text-sm flex gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span><span className="font-semibold">{n.hastalik}:</span> {n.mesaj}</span>
              </div>
            ))}
          </div>
        )}

        {/* TAHLİL BULGUSU — risk değerlendirmesinden AYRI bir bilgi bloğu.
            Seviyeyi etkilemez, profili değiştirmez. Backend yalnızca son
            tahlilde laboratuvar aralığının ALTINDA kalan değerler için
            dolduruyor; yoksa `besin.tahlil` null gelir ve bu blok hiç çizilmez. */}
        {besin.tahlil && besin.tahlil.bulgular.length > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h4 className="font-bold text-sky-900 flex items-center gap-2">
                <FileText size={18} className="text-sky-600" /> Tahlilinize göre
              </h4>
              <span className="text-xs text-sky-700/70">{besin.tahlil.tarih} tahliliniz</span>
            </div>

            {besin.tahlil.bulgular.map((b) => (
              <div key={b.test} className="bg-white rounded-xl border border-sky-100 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                  <span className="font-bold text-gray-800">{b.test}</span>
                  <span className="font-bold text-red-700">
                    {b.deger}{b.birim ? ` ${b.birim}` : ''}
                  </span>
                  <span className="text-xs text-gray-500">
                    (laboratuvar aralığı {b.refAlt ?? ''}
                    {b.refUst !== null && b.refUst !== undefined ? `–${b.refUst}` : ''}
                    {b.birim ? ` ${b.birim}` : ''})
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{b.eslesmeNotu}</p>

                {b.porsiyonda === null ? (
                  <p className="text-sm text-gray-500">
                    Bu besinde <strong>{b.besinOgesi}</strong> ölçülmemiş — değeri bilmiyoruz.
                    Ölçülmemiş olması &ldquo;yok&rdquo; demek değildir.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="text-gray-700">
                      {besin.portionName} ({besin.portionGrams} g) →{' '}
                      <strong className="text-sky-800">
                        {b.porsiyonda} {b.besinOgesiBirimi} {b.besinOgesi}
                      </strong>
                    </span>
                    <span className="text-gray-500">
                      Ölçümü olan {b.olculenSayisi} besin içinde{' '}
                      <strong className="text-gray-700">{b.sira}.</strong> sırada
                    </span>
                  </div>
                )}
              </div>
            ))}

            <p className="text-xs text-sky-800/70 leading-relaxed">
              Bu bölüm <strong>risk değerlendirmenizi değiştirmez</strong> ve teşhis koymaz.
              Değerler laboratuvarınızın kendi aralığından, besin içerikleri TürKomp&rsquo;tan
              geliyor. &ldquo;İyi kaynak&rdquo; demiyoruz çünkü bunun için kaynaklı bir eşiğimiz yok;
              onun yerine besnin veri tabanımızdaki sırasını söylüyoruz.
            </p>
          </div>
        )}

        <div>
          <h4 className="font-bold text-gray-800 mb-3">Besin değerleri</h4>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 rounded-l-lg">Değer</th>
                <th className="text-right px-4 py-2">100 g</th>
                <th className="text-right px-4 py-2 rounded-r-lg">{besin.portionName} ({besin.portionGrams} g)</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map(([ad, deger, birim, basamak]) => (
                <tr key={ad} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-700">{ad}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-800">{g(deger, birim, basamak)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{p(deger, birim, basamak)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 border-t pt-4 leading-relaxed">
          <KaynakYazisi kaynak={besin.source} /> — {besin.nameEn}
          <br />
          Bu değerlendirme bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.
          Alerjen bilgisi tipik tarife göredir; paketli ürünlerde etiketi kontrol edin.
        </div>
      </div>
    </Modal>
  );
};

export const DashboardScreen = ({ user }) => {
  const [arama, setArama] = useState('');
  const [kategori, setKategori] = useState('Tümü');
  const [besinler, setBesinler] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [secili, setSecili] = useState(null);
  const zamanlayici = useRef(null);

  useEffect(() => {
    api.meta().then((m) => setKategoriler(m.categories || [])).catch(() => {});
  }, []);

  const getir = useCallback(async (search, category) => {
    setYukleniyor(true); setHata('');
    try {
      const sonuc = await api.besinAra({ search, category, limit: 60 });
      setBesinler(sonuc.foods);
    } catch (e) {
      setHata(`Sunucuya ulaşılamadı: ${e.message}. Backend çalışıyor mu? (npm start)`);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  // Yazarken her harfte istek atmayalım: 350 ms bekleyip öyle arıyoruz (debounce)
  useEffect(() => {
    clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => getir(arama, kategori), 350);
    return () => clearTimeout(zamanlayici.current);
  }, [arama, kategori, getir]);

  const profilOzeti = [
    ...(user.diseases || []).length ? [`${user.diseases.length} hastalık`] : [],
    ...(user.allergies || []).length ? [`${user.allergies.length} alerji`] : [],
  ].join(' • ');

  return (
    <div className="p-6 sm:p-10 max-w-[1500px] mx-auto">
      <BesinDetay besin={secili} onKapat={() => setSecili(null)} />

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Besin Ara</h1>
        <p className="text-gray-500 text-lg">
          {profilOzeti
            ? `Sonuçlar profilinize göre değerlendiriliyor (${profilOzeti}).`
            : 'Profilinizde hastalık/alerji yok; genel bilgi gösteriliyor.'}
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
        <input
          type="text" value={arama} onChange={(e) => setArama(e.target.value)}
          placeholder="Pırasa, muz, mercimek..."
          className="w-full p-5 pl-16 border rounded-2xl shadow-sm text-lg outline-none focus:border-green-500 bg-white"
        />
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {[{ name: 'Tümü', count: null }, ...kategoriler].map((k) => (
          <button
            key={k.name}
            onClick={() => setKategori(k.name)}
            className={`px-5 py-3 rounded-xl border-2 whitespace-nowrap font-bold transition ${
              kategori === k.name ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {k.name}{k.count ? ` (${k.count})` : ''}
          </button>
        ))}
      </div>

      <HataKutusu mesaj={hata} />

      {yukleniyor ? (
        <Yukleniyor yazi="Besinler getiriliyor..." />
      ) : besinler.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-40" />
          <p className="font-medium">"{arama}" için sonuç bulunamadı.</p>
          <p className="text-sm mt-1">Veri tabanında şu an 219 genel besin var.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {besinler.map((b) => <BesinKarti key={b.id} besin={b} onTikla={setSecili} />)}
        </div>
      )}

      <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500 leading-relaxed">
        Besin değerleri:{' '}
        <a href="https://turkomp.tarimorman.gov.tr/" target="_blank" rel="noreferrer" className="text-green-700 underline">
          TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı v1.0
        </a>.
        <br />
        Bu uygulama bilgilendirme amaçlıdır; tıbbi tanı ve tedavi yerine geçmez.
        Sağlık sorunlarınız için hekiminize veya diyetisyeninize başvurun.
      </footer>
    </div>
  );
};

/* ==========================================================================
   PROFİL
   ========================================================================== */
