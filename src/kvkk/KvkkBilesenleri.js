// src/kvkk/KvkkBilesenleri.js
//
// KVKK aydınlatma metni, açık rıza ve hesap silme arayüzü.
// Metinlerin kendisi backend'de (src/kvkk_metinleri.js), burada yalnızca gösterim var.

import React, { useState, useEffect } from 'react';
import {
  AlertCircle, AlertTriangle, X, CheckCircle, Download, FileText, Shield,
  Loader2, ShieldAlert,
} from 'lucide-react';
import { api, tokenKaydet, verileriniIndir } from '../api';
import { HataKutusu, Modal, OnayKutusu, Yukleniyor } from '../components/ortak';

/** Metinlerdeki **kalın** işaretlerini gerçek kalına çevirir. */
const kalinYap = (metin) =>
  metin.split('**').map((parca, i) => (i % 2
    ? <strong key={i} className="text-gray-800">{parca}</strong>
    : <React.Fragment key={i}>{parca}</React.Fragment>));

/** Küçük metin gövdesi çizici — ## başlık, - madde, **kalın**. */
const MetinGovde = ({ metin }) => {
  const parcalar = [];
  let maddeler = [];
  const maddeleriBosalt = (anahtar) => {
    if (!maddeler.length) return;
    parcalar.push(
      <ul key={`liste-${anahtar}`} className="list-disc pl-5 space-y-1.5 my-3 text-gray-600">
        {maddeler}
      </ul>,
    );
    maddeler = [];
  };

  metin.split('\n').forEach((ham, i) => {
    const s = ham.trim();
    if (!s) { maddeleriBosalt(i); return; }
    if (s.startsWith('## ')) {
      maddeleriBosalt(i);
      parcalar.push(
        <h4 key={i} className="font-semibold text-gray-800 mt-6 mb-2 first:mt-0">{s.slice(3)}</h4>,
      );
      return;
    }
    if (s.startsWith('- ')) { maddeler.push(<li key={i}>{kalinYap(s.slice(2))}</li>); return; }
    maddeleriBosalt(i);
    const noluMu = /^\d+\.\s/.test(s);
    parcalar.push(
      <p key={i} className={`text-gray-600 leading-relaxed ${noluMu ? 'pl-5 my-1' : 'my-3'}`}>
        {kalinYap(s)}
      </p>,
    );
  });
  maddeleriBosalt('son');
  return <div className="text-sm">{parcalar}</div>;
};

/** Metinleri bir kez çeker, bütün ekranlar bunu kullanır. */
export const useKvkk = () => {
  const [metinler, setMetinler] = useState(null);
  const [hata, setHata] = useState('');
  useEffect(() => {
    api.kvkkMetinleri().then(setMetinler).catch((e) => setHata(e.message));
  }, []);
  return { metinler, hata };
};

/** Metni tam ekran gösteren pencere. */
const KvkkPenceresi = ({ acik, onKapat, baslik, metin, surum, surumTarihi }) => (
  <Modal isOpen={acik} onClose={onKapat} title={baslik} genis>
    {metin ? (
      <>
        <MetinGovde metin={metin} />
        <p className="mt-6 pt-4 border-t text-xs text-gray-500">
          Metin sürümü {surum} — {surumTarihi}
        </p>
      </>
    ) : <Yukleniyor />}
  </Modal>
);

/**
 * İki beyanı toplayan ortak blok. Hem kayıt ekranında hem mevcut
 * kullanıcıların onay ekranında kullanılıyor.
 */
/**
 * DEMO UYARISI — veri girişinin TAM OLDUĞU yerde.
 *
 * Aynı uyarı aydınlatma metninin 7. bölümünde de var, ama orada kimse
 * okumuyor. Uyarının işe yaraması için kişinin hastalığını yazacağı anda,
 * göz hizasında olması gerekiyor.
 *
 * Bunun hukuki bir muafiyet sağlamadığını bilerek koyuyoruz: biri yine de
 * gerçek verisini girerse yükümlülük doğar. Amaç sorumluluktan kaçmak değil,
 * gerçek veri girilme İHTİMALİNİ düşürmek — yani asıl koruma olan veri
 * minimizasyonuna hizmet etmek.
 */
export const DemoUyarisi = () => (
  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex gap-3 items-start">
    <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
    <div className="text-sm text-amber-900 leading-relaxed">
      <span className="font-bold">Bu bir demo uygulamasıdır.</span>{' '}
      Lütfen gerçek sağlık bilgilerinizi girmeyin. Denemek için gerçek olmayan
      hastalık, alerji ve tahlil bilgileri kullanın. Hesabınızı ve tüm
      verilerinizi dilediğiniz an profil ekranından silebilirsiniz; uzun süre
      giriş yapılmayan hesaplar ayrıca kendiliğinden silinir.
    </div>
  </div>
);

export const OnayBloku = ({ metinler, aydinlatma, setAydinlatma, riza, setRiza }) => {
  const [acikMetin, setAcikMetin] = useState(null);   // 'aydinlatma' | 'riza' | null

  return (
    <div className="space-y-5">
      <DemoUyarisi />
      <KvkkPenceresi
        acik={acikMetin === 'aydinlatma'} onKapat={() => setAcikMetin(null)}
        baslik="Aydınlatma Metni" metin={metinler && metinler.aydinlatma}
        surum={metinler && metinler.surum} surumTarihi={metinler && metinler.surumTarihi} />
      <KvkkPenceresi
        acik={acikMetin === 'riza'} onKapat={() => setAcikMetin(null)}
        baslik="Açık Rıza Metni" metin={metinler && metinler.acikRiza}
        surum={metinler && metinler.surum} surumTarihi={metinler && metinler.surumTarihi} />

      {/* ───── 1. AYDINLATMA — bilgilendirme, onay değil ───── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" /> Aydınlatma Metni
          </h4>
          <button type="button" onClick={() => setAcikMetin('aydinlatma')}
            className="text-sm font-bold text-green-700 hover:text-green-800 underline shrink-0">
            Metni oku
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Hangi verilerinizin, hangi amaçla işlendiğini ve haklarınızı anlatır.
          Bu bir onay değildir; sizi bilgilendirmek için vardır.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={aydinlatma}
            onChange={(e) => setAydinlatma(e.target.checked)}
            className="w-5 h-5 accent-green-600 shrink-0 mt-0.5" />
          <span className="text-sm font-semibold text-gray-700">
            Aydınlatma metnini okudum ve anladım.
          </span>
        </label>
      </div>

      {/* ───── 2. AÇIK RIZA — ayrı metin, ayrı ve açık seçim ───── */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h4 className="font-bold text-green-900 flex items-center gap-2">
            <Shield size={18} className="text-green-700" /> Açık Rıza Metni
          </h4>
          <button type="button" onClick={() => setAcikMetin('riza')}
            className="text-sm font-bold text-green-700 hover:text-green-800 underline shrink-0">
            Metni oku
          </button>
        </div>
        <p className="text-sm text-green-800/80 mb-4">
          Hastalık bilgileriniz, besin alerjileriniz ve tahlil sonuçlarınız özel nitelikli
          kişisel veridir ve ancak açık rızanızla işlenebilir.
        </p>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition
            ${riza === true ? 'bg-white border-green-500' : 'bg-white/60 border-transparent hover:border-green-200'}`}>
            <input type="radio" name="acikRiza" checked={riza === true}
              onChange={() => setRiza(true)} className="w-5 h-5 accent-green-600 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-gray-800">Açık rıza veriyorum</span>
          </label>
          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition
            ${riza === false ? 'bg-white border-gray-400' : 'bg-white/60 border-transparent hover:border-gray-300'}`}>
            <input type="radio" name="acikRiza" checked={riza === false}
              onChange={() => setRiza(false)} className="w-5 h-5 accent-gray-500 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-gray-700">Açık rıza vermiyorum</span>
          </label>
        </div>

        {riza === false && (
          <div className="mt-4 bg-white border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>
              Rıza vermezseniz uygulamayı kullanamazsınız. Bunun sebebi şu: bu uygulamanın
              tek işlevi hastalık ve tahlil bilgilerinize göre besinleri değerlendirmek.
              Bu veriler olmadan gösterebileceği bir şey kalmıyor.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Bu özellik eklenmeden önce kayıt olmuş kullanıcılar için onay ekranı.
 * Metin sürümü arttığında da aynı ekran çıkıyor.
 *
 * NİYE GERİYE DÖNÜK ONAY SAYMIYORUZ: eski kullanıcılar bu metinleri hiç
 * görmedi. "Zaten kayıt olmuştu" demek açık rızayı varsaymak olurdu.
 */
export const OnayEkrani = ({ user, onOnaylandi, onCikis }) => {
  const { metinler, hata: metinHatasi } = useKvkk();
  const [aydinlatma, setAydinlatma] = useState(false);
  const [riza, setRiza] = useState(null);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async () => {
    setBekliyor(true); setHata('');
    try {
      const sonuc = await api.onayVer();
      onOnaylandi(sonuc.user);
    } catch (e) { setHata(e.message); } finally { setBekliyor(false); }
  };

  const yeniSurum = user.rizaSurumu && metinler && user.rizaSurumu !== metinler.surum;

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] overflow-y-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 max-w-[800px] mx-auto border">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {yeniSurum ? 'Metinlerimiz güncellendi' : 'Devam etmeden önce'}
        </h1>
        <p className="text-gray-500 mb-8">
          {yeniSurum
            ? 'Aydınlatma ve açık rıza metinleri değişti. Devam edebilmek için yeni metinleri okuyup onayınızı yenilemeniz gerekiyor.'
            : `Merhaba ${user.name}. Sağlık verilerinizi işleyebilmemiz için aşağıdaki iki adımı tamamlamanız gerekiyor.`}
        </p>

        <HataKutusu mesaj={metinHatasi || hata} />

        <OnayBloku metinler={metinler} aydinlatma={aydinlatma} setAydinlatma={setAydinlatma}
          riza={riza} setRiza={setRiza} />

        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={gonder} disabled={bekliyor || !aydinlatma || riza !== true}
            className="flex-1 min-w-[200px] bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-40">
            {bekliyor ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            Onaylıyorum, devam et
          </button>
          <button onClick={onCikis}
            className="px-8 py-4 rounded-2xl font-bold border bg-white hover:bg-gray-50 transition">
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Profil ekranındaki "verilerimi indir" bölümü.
 *
 * KVKK m.11: kişinin verisinin işlenip işlenmediğini öğrenme ve bilgi talep
 * etme hakkı. GDPR m.15 (erişim) ve m.20 (taşınabilirlik).
 *
 * Silme hakkının yanında DURUYOR ama onun yerine geçmiyor: biri "hakkımda ne
 * tutuluyor" sorusunu cevaplıyor, öteki veriyi ortadan kaldırıyor. Yalnızca
 * silme sunulsa kullanıcı ilk soruyu ancak her şeyi kaybederek cevaplayabilirdi.
 */
export const VeriIndirme = () => {
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState('');

  const indir = async () => {
    setBekliyor(true); setHata('');
    try {
      await verileriniIndir();
    } catch (e) { setHata(e.message); } finally { setBekliyor(false); }
  };

  return (
    <div className="mt-8 bg-white border rounded-2xl p-6">
      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
        <Download size={20} className="text-green-700" /> Verilerimi indir
      </h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Hakkınızda saklanan tüm kişisel veriyi makine tarafından okunabilir
        biçimde (JSON) indirebilirsiniz: hesap bilgileriniz, hastalık ve alerji
        kayıtlarınız, tahlil sonuçlarınız, günlük takip kayıtlarınız ve onay
        tarihleriniz. Parolanız ve iki aşamalı doğrulama anahtarınız dosyaya
        dâhil edilmez; bunlar kimlik doğrulama bilgisidir.
      </p>
      <HataKutusu mesaj={hata} />
      <button onClick={indir} disabled={bekliyor}
        className="mt-2 px-6 py-3 rounded-xl font-bold border-2 border-green-200 text-green-700 hover:bg-green-50 transition flex items-center gap-2 disabled:opacity-40">
        {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
        Verilerimi indir
      </button>
    </div>
  );
};

/** Profil ekranındaki "hesabımı sil" bölümü — KVKK m.11 silme hakkı. */
export const HesapSilme = ({ onSilindi }) => {
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [onayAcik, setOnayAcik] = useState(false);

  const sil = async () => {
    setOnayAcik(false);
    setBekliyor(true); setHata('');
    try {
      await api.hesabiSil(sifre);
      tokenKaydet(null);
      onSilindi();
    } catch (e) { setHata(e.message); setBekliyor(false); }
  };

  return (
    <div className="mt-8 bg-white border-2 border-red-100 rounded-2xl p-6">
      <h3 className="font-bold text-red-900 flex items-center gap-2 mb-2">
        <ShieldAlert size={20} className="text-red-500" /> Hesabımı ve verilerimi sil
      </h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Açık rızanızı geri çekme ve verilerinizin silinmesini isteme hakkınız var
        (6698 sayılı Kanun m.11). Bu işlem hesabınızı, hastalık ve alerji
        bilgilerinizi, tahlil sonuçlarınızı ve günlük takip kayıtlarınızı siler.
        <strong className="text-red-700"> Geri alınamaz.</strong>
      </p>

      {!acik ? (
        <button onClick={() => setAcik(true)}
          className="px-6 py-3 rounded-xl font-bold border-2 border-red-200 text-red-700 hover:bg-red-50 transition">
          Hesabımı silmek istiyorum
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Onaylamak için parolanızı girin:
          </p>
          <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)}
            placeholder="Parolanız" autoComplete="current-password"
            className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-red-400" />
          <HataKutusu mesaj={hata} />
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setOnayAcik(true)} disabled={bekliyor || !sifre}
              className="bg-red-700 hover:bg-red-800 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 disabled:opacity-40">
              {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <X size={18} />}
              Evet, kalıcı olarak sil
            </button>
            <button onClick={() => { setAcik(false); setSifre(''); setHata(''); }}
              className="px-6 py-3 rounded-xl font-bold border bg-white hover:bg-gray-50 transition">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* SON ONAY. Parola alanı tek başına yeterli bir engel değil: kullanıcı
          parolasını yazıp düğmeye refleksle basabilir. Burada NE KAYBEDECEĞİ
          tek tek yazılıyor ve kutu "Vazgeç" odaklı açılıyor. */}
      <OnayKutusu
        acik={onayAcik}
        tehlikeli
        baslik="Hesabınız ve tüm verileriniz kalıcı olarak silinecek"
        aciklama={(
          <>
            <p className="mb-3">Silinecekler:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Hesabınız ve giriş bilgileriniz</li>
              <li>Hastalık ve besin alerjisi bilgileriniz</li>
              <li>Yüklediğiniz tahlil sonuçlarının tamamı</li>
              <li>Günlük takip kayıtlarınız</li>
            </ul>
            <p className="font-bold text-red-700">
              Bu işlem geri alınamaz. Verilerin bir kopyası saklanmaz.
            </p>
            <p className="mt-3 text-gray-600">
              Önce verilerinizi indirmek isterseniz bu kutuyu kapatıp
              &quot;Verilerimi indir&quot; bölümünü kullanabilirsiniz.
            </p>
          </>
        )}
        onayYazisi="Evet, kalıcı olarak sil"
        onOnay={sil}
        onIptal={() => setOnayAcik(false)}
        bekliyor={bekliyor}
      />
    </div>
  );
};

/** Giriş ekranının altındaki "metinleri oku" bağlantıları. */
export const KvkkBaglantilari = () => {
  const { metinler } = useKvkk();
  const [acikMetin, setAcikMetin] = useState(null);
  return (
    <>
      <KvkkPenceresi acik={acikMetin === 'aydinlatma'} onKapat={() => setAcikMetin(null)}
        baslik="Aydınlatma Metni" metin={metinler && metinler.aydinlatma}
        surum={metinler && metinler.surum} surumTarihi={metinler && metinler.surumTarihi} />
      <KvkkPenceresi acik={acikMetin === 'riza'} onKapat={() => setAcikMetin(null)}
        baslik="Açık Rıza Metni" metin={metinler && metinler.acikRiza}
        surum={metinler && metinler.surum} surumTarihi={metinler && metinler.surumTarihi} />
      <div className="text-center text-xs text-gray-500 mt-6 space-x-3">
        <button onClick={() => setAcikMetin('aydinlatma')} className="underline hover:text-gray-600">
          Aydınlatma Metni
        </button>
        <span>·</span>
        <button onClick={() => setAcikMetin('riza')} className="underline hover:text-gray-600">
          Açık Rıza Metni
        </button>
      </div>
    </>
  );
};

/* ==========================================================================
   ANA BİLEŞEN
   ========================================================================== */
