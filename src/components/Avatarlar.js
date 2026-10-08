// src/components/Avatarlar.js
//
// Avatar çizimleri — hepsi bu proje için çizilmiş basit geometrik SVG'ler.
//
// NİYE SVG, NİYE RESİM DOSYASI DEĞİL: her boyutta net görünüyorlar, toplamı
// birkaç kB, ek ağ isteği yok ve renkleri koyu temada da çalışıyor.
//
// ORTAK DİL: hepsi 64×64 kutuda, yuvarlak zemin + sade yüz. Tek tek
// çizilselerdi her biri farklı bir üslupta olur ve bir arada kötü dururdu.
// Kediler tek bir gövde şablonunu paylaşıyor, yalnızca renkleri değişiyor.

import React from 'react';

/* ───────────────────────── ortak parçalar ───────────────────────── */

const Zemin = ({ renk }) => <circle cx="32" cy="32" r="32" fill={renk} />;

/** Kedi yüzü. Dört kedi bunu paylaşıyor; fark yalnızca renklerde. */
const KediYuzu = ({ zemin, kurk, ic, goz1, goz2, burun }) => (
  <>
    <Zemin renk={zemin} />
    {/* kulaklar */}
    <path d="M14 26 L18 10 L30 20 Z" fill={kurk} />
    <path d="M50 26 L46 10 L34 20 Z" fill={kurk} />
    <path d="M17 24 L19.5 15 L26.5 20.5 Z" fill={ic} />
    <path d="M47 24 L44.5 15 L37.5 20.5 Z" fill={ic} />
    {/* baş */}
    <ellipse cx="32" cy="36" rx="19" ry="17" fill={kurk} />
    {/* gözler — Van kedisinde iki farklı renk (cinsin bilinen özelliği) */}
    <ellipse cx="25" cy="34" rx="3.4" ry="4.2" fill={goz1} />
    <ellipse cx="39" cy="34" rx="3.4" ry="4.2" fill={goz2} />
    <ellipse cx="25" cy="34" rx="1.3" ry="3.4" fill="#111827" />
    <ellipse cx="39" cy="34" rx="1.3" ry="3.4" fill="#111827" />
    {/* burun + ağız */}
    <path d="M30 42 L34 42 L32 45 Z" fill={burun} />
    <path d="M32 45 v2.5 M32 47.5 q-3 2.5 -5.5 0 M32 47.5 q3 2.5 5.5 0"
      stroke="#111827" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.65" />
    {/* bıyıklar */}
    <g stroke="#111827" strokeWidth="1" opacity="0.4" strokeLinecap="round">
      <path d="M13 40 h7 M13 44 h7 M51 40 h-7 M51 44 h-7" />
    </g>
  </>
);

/** Köpekgil yüzü (kurt, Sibirya kurdu, Kangal). */
const KopekYuzu = ({ zemin, kurk, maske, goz, burun, kulakIc }) => (
  <>
    <Zemin renk={zemin} />
    <path d="M13 28 L16 9 L29 19 Z" fill={kurk} />
    <path d="M51 28 L48 9 L35 19 Z" fill={kurk} />
    <path d="M16 25 L17.8 14 L25 19.5 Z" fill={kulakIc} />
    <path d="M48 25 L46.2 14 L39 19.5 Z" fill={kulakIc} />
    <ellipse cx="32" cy="36" rx="18.5" ry="17" fill={kurk} />
    {/* burun köprüsü ve ağız bölgesi — köpekgilleri kediden ayıran şey */}
    <path d="M32 24 q-8 10 -7 18 q0 7 7 7 q7 0 7 -7 q1 -8 -7 -18 Z" fill={maske} />
    <ellipse cx="24.5" cy="33" rx="3" ry="3.6" fill={goz} />
    <ellipse cx="39.5" cy="33" rx="3" ry="3.6" fill={goz} />
    <ellipse cx="24.5" cy="33.6" rx="1.3" ry="1.8" fill="#111827" />
    <ellipse cx="39.5" cy="33.6" rx="1.3" ry="1.8" fill="#111827" />
    <ellipse cx="32" cy="42" rx="3.6" ry="2.8" fill={burun} />
    <path d="M32 45 v3 M32 48 q-3.5 2.5 -6 0 M32 48 q3.5 2.5 6 0"
      stroke="#111827" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
  </>
);

/* ───────────────────────── tek tek hayvanlar ───────────────────────── */

const VanKedisi = () => (
  // Van kedisinin bilinen özelliği: beyaz kürk ve iki FARKLI renkte göz.
  <KediYuzu zemin="#e0f2fe" kurk="#f8fafc" ic="#fecdd3" goz1="#38bdf8" goz2="#f59e0b" burun="#fb7185" />
);
const TuruncuKedi = () => (
  <KediYuzu zemin="#fff7ed" kurk="#fb923c" ic="#fecdd3" goz1="#65a30d" goz2="#65a30d" burun="#be123c" />
);
const SiyahKedi = () => (
  <KediYuzu zemin="#e5e7eb" kurk="#374151" ic="#6b7280" goz1="#fbbf24" goz2="#fbbf24" burun="#111827" />
);
const GriKedi = () => (
  <KediYuzu zemin="#f1f5f9" kurk="#94a3b8" ic="#cbd5e1" goz1="#0ea5e9" goz2="#0ea5e9" burun="#64748b" />
);
const SibiryaKurdu = () => (
  // Husky: koyu gri kürk, beyaz maske, mavi göz.
  <KopekYuzu zemin="#e0f2fe" kurk="#64748b" maske="#f8fafc" goz="#38bdf8" burun="#1f2937" kulakIc="#cbd5e1" />
);
const Kurt = () => (
  <KopekYuzu zemin="#e5e7eb" kurk="#6b7280" maske="#d1d5db" goz="#facc15" burun="#111827" kulakIc="#9ca3af" />
);
const Kangal = () => (
  // Kangal: açık bej kürk, siyah maske — cinsin ayırt edici işareti.
  <KopekYuzu zemin="#fef3c7" kurk="#d6bb8a" maske="#44403c" goz="#92400e" burun="#1c1917" kulakIc="#a8a29e" />
);

const Civciv = () => (
  <>
    <Zemin renk="#fef9c3" />
    <ellipse cx="32" cy="37" rx="18" ry="17" fill="#fbbf24" />
    <ellipse cx="32" cy="20" rx="11" ry="10" fill="#fcd34d" />
    {/* tepedeki tüy */}
    <path d="M32 11 q-2 -6 2 -8 q-1 4 1 7 Z" fill="#f59e0b" />
    <circle cx="27.5" cy="20" r="2.4" fill="#111827" />
    <circle cx="36.5" cy="20" r="2.4" fill="#111827" />
    <circle cx="28.3" cy="19.2" r="0.8" fill="#ffffff" />
    <circle cx="37.3" cy="19.2" r="0.8" fill="#ffffff" />
    <path d="M28.5 25 L35.5 25 L32 29.5 Z" fill="#f97316" />
    {/* kanat */}
    <ellipse cx="18" cy="38" rx="5" ry="8" fill="#f59e0b" />
  </>
);

const Balik = () => (
  <>
    <Zemin renk="#cffafe" />
    <path d="M12 32 q12 -15 28 -3 q-16 18 -28 3 Z" fill="#06b6d4" />
    <path d="M40 29 L54 20 L52 32 L54 44 L40 35 Z" fill="#0891b2" />
    <path d="M26 20 q4 -7 9 -1 q-5 1 -9 1 Z" fill="#22d3ee" />
    <circle cx="21" cy="31" r="3" fill="#ffffff" />
    <circle cx="21.6" cy="31" r="1.6" fill="#111827" />
    {/* kabarcıklar */}
    <circle cx="14" cy="18" r="2.2" fill="#a5f3fc" />
    <circle cx="20" cy="12" r="1.5" fill="#a5f3fc" />
  </>
);

const Aslan = () => (
  <>
    <Zemin renk="#fef3c7" />
    {/* yele: iki kat, dışı koyu */}
    <g fill="#b45309">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 12;
        return <circle key={a} cx={32 + Math.cos(a) * 18} cy={34 + Math.sin(a) * 18} r="8" />;
      })}
    </g>
    <g fill="#d97706">
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 10 + 0.3;
        return <circle key={a} cx={32 + Math.cos(a) * 13} cy={34 + Math.sin(a) * 13} r="7" />;
      })}
    </g>
    <ellipse cx="32" cy="34" rx="14" ry="13" fill="#fbbf24" />
    <circle cx="26.5" cy="32" r="2.3" fill="#111827" />
    <circle cx="37.5" cy="32" r="2.3" fill="#111827" />
    <path d="M29 39 L35 39 L32 42.5 Z" fill="#92400e" />
    <path d="M32 42.5 v2 M32 44.5 q-3 2 -5 0 M32 44.5 q3 2 5 0"
      stroke="#92400e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </>
);

const Kartal = () => (
  <>
    <Zemin renk="#e7e5e4" />
    {/* kanatlar */}
    <path d="M6 40 q10 -16 22 -8 l-4 12 Z" fill="#78716c" />
    <path d="M58 40 q-10 -16 -22 -8 l4 12 Z" fill="#78716c" />
    <ellipse cx="32" cy="34" rx="15" ry="16" fill="#fafaf9" />
    {/* kaş — kartalı "sert" yapan şey bu */}
    <path d="M19 26 q7 -4 12 1 l-1 3 q-5 -4 -11 -1 Z" fill="#a8a29e" />
    <path d="M45 26 q-7 -4 -12 1 l1 3 q5 -4 11 -1 Z" fill="#a8a29e" />
    <circle cx="25.5" cy="32" r="2.6" fill="#1c1917" />
    <circle cx="38.5" cy="32" r="2.6" fill="#1c1917" />
    <circle cx="26.3" cy="31.2" r="0.9" fill="#ffffff" />
    <circle cx="39.3" cy="31.2" r="0.9" fill="#ffffff" />
    {/* gaga */}
    <path d="M28.5 38 L35.5 38 L32 50 Z" fill="#f59e0b" />
    <path d="M30 44 q2 2 4 0" stroke="#b45309" strokeWidth="1" fill="none" />
  </>
);

/* ───────────────────────── dışa açılan tablo ───────────────────────── */

export const AVATARLAR = [
  { kod: 'vanKedisi', ad: 'Van kedisi', Ciz: VanKedisi },
  { kod: 'turuncuKedi', ad: 'Turuncu kedi', Ciz: TuruncuKedi },
  { kod: 'siyahKedi', ad: 'Siyah kedi', Ciz: SiyahKedi },
  { kod: 'griKedi', ad: 'Gri kedi', Ciz: GriKedi },
  { kod: 'sibiryaKurdu', ad: 'Sibirya kurdu', Ciz: SibiryaKurdu },
  { kod: 'kurt', ad: 'Kurt', Ciz: Kurt },
  { kod: 'kangal', ad: 'Kangal', Ciz: Kangal },
  { kod: 'aslan', ad: 'Aslan', Ciz: Aslan },
  { kod: 'kartal', ad: 'Kartal', Ciz: Kartal },
  { kod: 'civciv', ad: 'Civciv', Ciz: Civciv },
  { kod: 'balik', ad: 'Balık', Ciz: Balik },
];

/**
 * Avatarı çizer. Seçim yoksa baş harflere düşüyor — hesabı yeni açan
 * kimse boş bir daire görmesin.
 */
export const Avatar = ({ kod, ad, soyad, boyut = 80, className = '' }) => {
  const secili = AVATARLAR.find((a) => a.kod === kod);
  const olcu = { width: boyut, height: boyut };

  if (!secili) {
    return (
      <div
        style={olcu}
        className={`bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase ${className}`}
      >
        <span style={{ fontSize: boyut * 0.32 }}>
          {(ad || '?').charAt(0)}{(soyad || '').charAt(0)}
        </span>
      </div>
    );
  }
  const { Ciz } = secili;
  return (
    // role="img" + aria-label: ekran okuyucu "Van kedisi avatarı" diyor.
    // Olmasaydı SVG'nin içindeki şekiller tek tek okunmaya çalışılırdı.
    <svg
      viewBox="0 0 64 64"
      style={olcu}
      className={`rounded-full ${className}`}
      role="img"
      aria-label={`${secili.ad} avatarı`}
    >
      <Ciz />
    </svg>
  );
};
