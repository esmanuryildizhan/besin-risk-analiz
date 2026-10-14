// src/components/Avatarlar.js
//
// Avatar görselleri.
//
// NİYE RESİM, NİYE SVG DEĞİL: önceki sürümde avatarlar el yazımı SVG
// hayvan çizimleriydi. Kullanıcı yerine hayvan göstermek, sağlık profili
// olan bir uygulamada kimseye benzemiyordu. Bu çizimler insanları
// gösteriyor ve farklı yaş, cinsiyet ve giyim tercihlerini kapsıyor;
// kullanıcı kendine benzeyen birini seçebiliyor.
//
// DOSYALAR public/avatarlar/ ALTINDA: kod ile dosya adı birebir aynı
// (kod "buyukanne" ise dosya "buyukanne.png"). İki ayrı liste tutulsaydı
// biri değişip diğeri unutulurdu. betikler/arayuz_test.js her kodun
// karşılığında gerçekten bir dosya olduğunu denetliyor.
//
// BOYUT: her biri 192×192 ve ortalama 10 kB. Ekranda en büyük 80 pikselle
// gösteriliyor, yüksek yoğunluklu ekranlarda bile 2 katı yetiyor. Daha
// büyük tutmak sadece indirme süresini uzatırdı.
//
// SAYDAM DAİRE: PNG'ler daire biçiminde kesilmiş ve kenarları
// yumuşatılmış. CSS ile yuvarlatmaya güvenilmiyor; eski tarayıcılarda
// border-radius bir resmin üstünde tırtıklı çıkabiliyor.

import React, { useState } from 'react';

/* process.env.PUBLIC_URL: uygulama alt dizine kurulursa (ör. /uygulama)
   adresler yine doğru çözülüyor. Üretimde boş dize. */
const KLASOR = `${process.env.PUBLIC_URL || ''}/avatarlar`;

export const AVATARLAR = [
  { kod: 'gencAdam', ad: 'Genç adam' },
  { kod: 'gencKadin', ad: 'Genç kadın' },
  { kod: 'basortuluGenc', ad: 'Başörtülü genç' },
  { kod: 'sakalliAdam', ad: 'Sakallı adam' },
  { kod: 'gozlukluKadin', ad: 'Gözlüklü kadın' },
  { kod: 'basortuluKadin', ad: 'Başörtülü kadın' },
  { kod: 'buyukbaba', ad: 'Büyükbaba' },
  { kod: 'buyukanne', ad: 'Büyükanne' },
  { kod: 'basortuluBuyukanne', ad: 'Başörtülü büyükanne' },
];

/** Baş harfler: avatar seçilmemişse ya da görsel yüklenemezse. */
const BasHarfler = ({ ad, soyad, boyut, className }) => (
  <div
    style={{ width: boyut, height: boyut }}
    className={`bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase ${className}`}
  >
    <span style={{ fontSize: boyut * 0.32 }}>
      {(ad || '?').charAt(0)}{(soyad || '').charAt(0)}
    </span>
  </div>
);

/**
 * Avatarı çizer.
 *
 * ÜÇ DURUM VAR:
 *  1. Kod yok ya da tanınmıyor  -> baş harfler. Eski sürümden kalma hayvan
 *     kodları (vanKedisi gibi) buraya düşüyor; hata vermiyor, kullanıcı
 *     yeni bir avatar seçene kadar baş harflerini görüyor.
 *  2. Görsel yüklenemedi        -> baş harfler. Ağ hatasında boş bir kutu
 *     kalmasın diye.
 *  3. Her şey yolunda           -> resim.
 */
export const Avatar = ({ kod, ad, soyad, boyut = 80, className = '' }) => {
  const [yuklenemedi, setYuklenemedi] = useState(false);
  const secili = AVATARLAR.find((a) => a.kod === kod);

  if (!secili || yuklenemedi) {
    return <BasHarfler ad={ad} soyad={soyad} boyut={boyut} className={className} />;
  }

  return (
    <img
      src={`${KLASOR}/${secili.kod}.png`}
      // alt: ekran okuyucu "Büyükanne avatarı" diyor. Boş bırakılsaydı bazı
      // okuyucular dosya adını heceleyecekti.
      alt={`${secili.ad} avatarı`}
      width={boyut}
      height={boyut}
      style={{ width: boyut, height: boyut }}
      onError={() => setYuklenemedi(true)}
      className={`rounded-full object-cover select-none ${className}`}
      draggable="false"
    />
  );
};
