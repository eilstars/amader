/**
 * Food drawings for starch-first logging: pictures first, so people who don't read English
 * (or don't read much) can log by looking. Flat shapes, steel for bowls only, no outlines.
 */
import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { StarchId, StarchUnit, clampAmount, starchById } from './starch';

export type Art = StarchId | 'corn' | 'dal' | 'fish' | 'sabzi' | 'hand';

const BOWL = '<path d="M8 34h48c0 12-10 20-24 20S8 46 8 34z" fill="#B7C0BC"/><path d="M8 34h48" stroke="#9AA49F" stroke-width="2"/>';
const ART: Record<Art, string> = {
  rice: `${BOWL}<path d="M11 34c2-12 11-19 21-19s19 7 21 19z" fill="#FFFFFF"/><g fill="#E3DDCD"><ellipse cx="22" cy="28" rx="3" ry="1.3"/><ellipse cx="32" cy="22" rx="3" ry="1.3"/><ellipse cx="40" cy="29" rx="3" ry="1.3"/><ellipse cx="29" cy="31" rx="3" ry="1.3"/><ellipse cx="45" cy="25" rx="2.6" ry="1.2"/></g>`,
  roti: '<circle cx="32" cy="33" r="23" fill="#EBCB91"/><circle cx="32" cy="33" r="23" fill="none" stroke="#D5AA62" stroke-width="2.5"/><g fill="#BD8642"><circle cx="24" cy="26" r="2.6"/><circle cx="38" cy="24" r="1.8"/><circle cx="41" cy="38" r="2.8"/><circle cx="27" cy="41" r="1.8"/><circle cx="33" cy="33" r="1.4"/></g>',
  bread: '<path d="M12 25c0-9 9-14 20-14s20 5 20 14c0 4-2 6-5 7v20H17V32c-3-1-5-3-5-7z" fill="#D29A50"/><path d="M16 26c0-7 7-11 16-11s16 4 16 11c0 3-2 4-4 5v17H20V31c-2-1-4-2-4-5z" fill="#F6E3BB"/>',
  noodles: `${BOWL}<path d="M13 32c3-6 6-6 9 0s6 6 9 0 6-6 9 0 6 6 9 0 M15 26c3-6 6-6 9 0s6 6 9 0 6-6 9 0 6 6 7 2" fill="none" stroke="#E8C46A" stroke-width="3.4" stroke-linecap="round"/><path d="M40 8l-6 22 M48 10l-10 21" stroke="#9E6F3A" stroke-width="2.6" stroke-linecap="round"/>`,
  potato: '<path d="M12 36c-2-11 7-20 20-21 14-1 22 7 21 17-1 11-9 18-22 18-11 0-18-5-19-14z" fill="#C99A62"/><path d="M18 32c2-7 8-11 15-11" fill="none" stroke="#DDB585" stroke-width="3" stroke-linecap="round"/><g fill="#9E6F3A"><circle cx="24" cy="38" r="1.8"/><circle cx="38" cy="30" r="1.6"/><circle cx="43" cy="41" r="1.8"/><circle cx="32" cy="44" r="1.3"/></g>',
  other: `${BOWL}<path d="M14 34c2-10 9-15 18-15s16 5 18 15z" fill="#E9D7B0"/><circle cx="24" cy="28" r="3" fill="#D9C08C"/><circle cx="36" cy="25" r="3" fill="#D9C08C"/><circle cx="42" cy="31" r="2.6" fill="#D9C08C"/>`,
  none: '<circle cx="32" cy="32" r="25" fill="#DDE3DF"/><circle cx="32" cy="32" r="19" fill="#EEF1EF"/><path d="M20 44L44 20" stroke="#9AA49F" stroke-width="3" stroke-linecap="round"/>',
  corn: '<g transform="rotate(-25 32 32)"><ellipse cx="32" cy="30" rx="10" ry="21" fill="#F0C94A"/><g stroke="#D9AE2C" stroke-width="1.6"><path d="M23 20h18 M22 27h20 M22 34h20 M24 41h16"/><path d="M28 10v40 M36 10v40"/></g><path d="M32 58c-10-4-15-14-14-26 4 6 8 12 14 26z" fill="#4E9A62"/><path d="M32 58c10-4 15-14 14-26-4 6-8 12-14 26z" fill="#6DB27E"/></g>',
  dal: '<path d="M10 30h44c0 13-9 22-22 22S10 43 10 30z" fill="#B7C0BC"/><ellipse cx="32" cy="30" rx="22" ry="7" fill="#9AA49F"/><ellipse cx="32" cy="30" rx="19" ry="5.2" fill="#E2B455"/><g fill="#C9962E"><circle cx="26" cy="29" r="1.3"/><circle cx="36" cy="31" r="1.3"/><circle cx="40" cy="28" r="1.1"/></g>',
  fish: '<path d="M8 32c8-11 20-15 32-11l6 2 10-8-3 17 3 17-10-8-6 2C28 47 16 43 8 32z" fill="#D9A066"/><path d="M26 22c3 6 3 14 0 20 M34 21c3 7 3 15 0 22" fill="none" stroke="#BF8244" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="30" r="2.4" fill="#17342A"/>',
  sabzi: '<path d="M32 54C18 50 12 38 16 22c12 2 20 12 16 32z" fill="#4E9A62"/><path d="M32 54c14-4 20-16 16-32-12 2-20 12-16 32z" fill="#6DB27E"/><path d="M32 54C28 40 30 24 32 12c4 10 4 28 0 42z" fill="#3E8552"/><path d="M32 52V20" stroke="#E4F1E9" stroke-width="1.6" stroke-linecap="round"/>',
  // A cupped hand holding rice: the measure for loose starch.
  hand: '<path d="M14 30c2-11 12-17 24-17s22 6 24 17z" fill="#FFFFFF" stroke="#E3DDCD" stroke-width="1.5"/><g fill="#E3DDCD"><ellipse cx="28" cy="24" rx="3" ry="1.3"/><ellipse cx="40" cy="19" rx="3" ry="1.3"/><ellipse cx="48" cy="25" rx="3" ry="1.3"/></g><path d="M8 30h60c0 16-13 28-30 28S8 46 8 30z" fill="#D9A47A"/><path d="M20 34v10 M30 35v13 M40 35v13 M50 34v10" stroke="#BF865C" stroke-width="2.2" stroke-linecap="round"/><path d="M62 31c6-6 10-6 11-2s-4 9-10 12" fill="#D9A47A"/>',
};

export function FoodArt({ art, size = 56, faded }: { art: Art; size?: number; faded?: boolean }) {
  const wide = art === 'hand';
  const w = wide ? Math.round(size * 1.19) : size;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${wide ? 76 : 64} 64">${ART[art]}</svg>`;
  return (
    <View style={{ opacity: faded ? 0.4 : 1 }} accessible={false} importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={w} height={size} />
    </View>
  );
}

/** The measure drawn: a hand of rice for loose starch, a roti for pieces, a slice for bread. */
export function measureArt(unit: StarchUnit, starch: StarchId): Art {
  if (unit === 'piece') return 'roti';
  if (unit === 'slice') return 'bread';
  return starch === 'none' ? 'none' : 'hand';
}

/** The amount as pictures: 2½ handfuls is two hands of rice and half of a third. */
export function AmountArt({ starch, amount, size = 48 }: { starch: StarchId; amount: number; size?: number }) {
  const unit = starchById(starch).unit;
  const art = measureArt(unit, starch);
  const n = clampAmount(amount);
  const full = art === 'hand' ? Math.round(size * 1.19) : size;
  // Past four, the pictures shrink so the row still fits a small phone.
  const scale = n > 4 ? 4 / Math.ceil(n) : 1;
  const items: number[] = [];
  for (let i = 0; i < Math.ceil(n); i++) items.push(n - i >= 1 ? 1 : 0.5);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, minHeight: size }}>
      {items.map((part, i) => (
        <View key={i} style={{ width: Math.round(full * scale * part), height: Math.round(size * scale), overflow: 'hidden' }}>
          <FoodArt art={art} size={Math.round(size * scale)} />
        </View>
      ))}
    </View>
  );
}
