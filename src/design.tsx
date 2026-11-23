/**
 * The Amader design kit (style sheet, 2026-11-23). Every screen is built from these pieces:
 * four type sizes, two weights, one 2px line icon set, one plate drawing, faces, Mado, the river, the table.
 * Pink is only for notes and hearts. Steel is only for plates. Mado is never cropped and never on dark ground.
 */
import React from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { Bob, FadeUp, FallingBit, PopIn, Squish, useSlide } from './motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { MadoDressed } from './costumes';
import { useStore } from './store';
import { C } from './theme';
import { Meal, Member } from './types';
import { T } from './ui';

export const K = {
  ...C,
  pale: '#C3E2D2',
  table: '#EFE8D6',
  tableRim: '#E3D9C0',
  line2: '#E3E8E4',
};

/** Type scale: 30 / 22 / 17 / 14. Parent screens go one size up. */
export const S = { display: 30, title: 22, body: 17, small: 14 } as const;

export const card: ViewStyle = {
  backgroundColor: C.white,
  borderRadius: 24,
  padding: 16,
  shadowColor: '#145A41',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

// ---------- icons: 24 grid, 2px round line ----------
const ICONS = {
  table: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.5" r="2"/><circle cx="12" cy="16.5" r="2"/><circle cx="7.5" cy="12" r="2"/><circle cx="16.5" cy="12" r="2"/>',
  camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14c2.6 0 4.5 1.6 4.5 5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  walk: '<path d="M7.5 3.2c1.7 0 2.6 1.8 2.6 4.2 0 2-1 3.3-2.6 3.3S4.9 9.4 4.9 7.4c0-2.4.9-4.2 2.6-4.2zM5.6 13.4h3.9v1.4a1.95 1.95 0 0 1-3.9 0zM16.5 8.2c1.7 0 2.6 1.8 2.6 4.2 0 2-1 3.3-2.6 3.3s-2.6-1.3-2.6-3.3c0-2.4.9-4.2 2.6-4.2zM14.6 18.4h3.9v1.4a1.95 1.95 0 0 1-3.9 0z"/>',
  medal: '<path d="M8 3l2.5 6M16 3l-2.5 6"/><circle cx="12" cy="15" r="5.5"/><path d="M12 12.6l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
  cap: '<path d="M4 15.5a8 8 0 0 1 16 0z"/><path d="M12 7.5v8M20 15.5h2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  send: '<path d="M4 12l16-7-6 16-3-7z"/><path d="M11 14l9-9"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  pencil: '<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3.5 3.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  chat: '<path d="M5 18.5l-1.5 3 4-1.5A8.5 8.5 0 1 0 5 18.5z"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16v4M16.5 18h4"/>',
  whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 2.2 4.2 4.8 5l1.3-1.3-2-1-1 .8c-.8-.4-1.5-1.1-1.9-1.9l.8-1-1-2z"/>',
  fist: '<path d="M6 10.5V8.2a1.7 1.7 0 0 1 3.4 0M9.4 8.2V7a1.7 1.7 0 0 1 3.4 0v1.2M12.8 8.2V7.5a1.7 1.7 0 0 1 3.4 0v1M16.2 8.5a1.7 1.7 0 0 1 3.4 0V14a6.5 6.5 0 0 1-6.5 6.5H12A6 6 0 0 1 6 14.5V10.5"/><path d="M6 12h4.5a1.8 1.8 0 0 0 0-3.6H8"/>',
  palm: '<path d="M7 12V5.5a1.5 1.5 0 0 1 3 0V11M10 4.5a1.5 1.5 0 0 1 3 0V11M13 5.5a1.5 1.5 0 0 1 3 0V11.5M16 8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 5.2 17L3.6 13.4a1.5 1.5 0 0 1 2.6-1.4L7 13.3"/>',
  handful: '<path d="M3 11.5h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z"/><circle cx="8.5" cy="8" r="1.6"/><circle cx="12.5" cy="6.5" r="1.6"/><circle cx="15.5" cy="9" r="1.6"/>',
  cup: '<path d="M6 5h12l-1.5 14a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z"/><path d="M6.5 10h11"/>',
  apple: '<path d="M12 8c-2-1.6-6-1.2-6.5 3-.5 4 2 8.5 4.5 8.5 1 0 1.3-.5 2-.5s1 .5 2 .5c2.5 0 5-4.5 4.5-8.5-.5-4.2-4.5-4.6-6.5-3z"/><path d="M12 8c0-2 1-3.5 3-4"/>',
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color = C.deep, fill = 'none' }: { name: IconName; size?: number; color?: string; fill?: string }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

// ---------- food and plates: one drawing system ----------
export type FoodKind = 'rice' | 'roti' | 'bread' | 'dal' | 'curry' | 'veg' | 'fruit' | 'dairy' | 'egg';
const FOOD: Record<FoodKind, (x: number, y: number, r: number) => string> = {
  rice: (x, y, r) => {
    const pts: [number, number, number][] = [[-0.45, -0.2, 20], [0.1, -0.5, -30], [0.4, 0.05, 60], [-0.1, 0.35, 10], [-0.5, 0.3, -50], [0.2, 0.5, 30], [0.45, -0.35, -10]];
    const g = pts.map(([a, b, rot]) => `<ellipse cx="${x + a * r}" cy="${y + b * r}" rx="${r * 0.13}" ry="${r * 0.055}" fill="#E6DBBE" transform="rotate(${rot} ${x + a * r} ${y + b * r})"/>`).join('');
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#F5EFDD"/><circle cx="${x - r * 0.15}" cy="${y - r * 0.2}" r="${r * 0.7}" fill="#FAF6EA"/>${g}`;
  },
  roti: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#E9CC94"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.09}" fill="#C79E5E"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.1}" r="${r * 0.11}" fill="#C79E5E"/><circle cx="${x}" cy="${y + r * 0.45}" r="${r * 0.08}" fill="#C79E5E"/>`,
  bread: (x, y, r) => `<rect x="${x - r * 0.85}" y="${y - r * 0.8}" width="${r * 1.7}" height="${r * 1.6}" rx="${r * 0.45}" fill="#E0B373"/><rect x="${x - r * 0.65}" y="${y - r * 0.55}" width="${r * 1.3}" height="${r * 1.2}" rx="${r * 0.3}" fill="#F3E0B8"/>`,
  dal: (x, y, r) => bowl(x, y, r, '#E2A84B'),
  curry: (x, y, r) => bowl(x, y, r, '#C98B4F') + `<ellipse cx="${x + r * 0.15}" cy="${y + r * 0.1}" rx="${r * 0.32}" ry="${r * 0.2}" fill="#F1E2C8"/>`,
  veg: (x, y, r) => `<circle cx="${x - r * 0.35}" cy="${y + r * 0.15}" r="${r * 0.55}" fill="#3F8E63"/><circle cx="${x + r * 0.3}" cy="${y - r * 0.25}" r="${r * 0.55}" fill="#5FA77F"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.4}" r="${r * 0.45}" fill="#7DBB95"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.4}" r="${r * 0.35}" fill="#5FA77F"/>`,
  fruit: (x, y, r) => `<circle cx="${x}" cy="${y + r * 0.08}" r="${r * 0.85}" fill="#E2A84B"/><path d="M${x} ${y - r * 0.75} q${r * 0.25} ${-r * 0.3} ${r * 0.5} ${-r * 0.15} q${-r * 0.15} ${r * 0.3} ${-r * 0.5} ${r * 0.15}z" fill="#5FA77F"/>`,
  dairy: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#C9D1CC"/><circle cx="${x}" cy="${y}" r="${r * 0.8}" fill="#FFFFFF"/><circle cx="${x - r * 0.2}" cy="${y - r * 0.2}" r="${r * 0.3}" fill="#F5EFDD"/>`,
  egg: (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.85}" fill="#FFFFFF" stroke="#E3E8E4" stroke-width="2"/><circle cx="${x + r * 0.1}" cy="${y}" r="${r * 0.42}" fill="#E8A93A"/>`,
};
function bowl(x: number, y: number, r: number, col: string) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#C9D1CC"/><circle cx="${x}" cy="${y}" r="${r * 0.8}" fill="${col}"/><path d="M${x - r * 0.45} ${y - r * 0.35} A${r * 0.6} ${r * 0.6} 0 0 1 ${x + r * 0.1} ${y - r * 0.55}" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="${r * 0.12}" stroke-linecap="round"/>`;
}

export function foodXml(kind: FoodKind, size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${FOOD[kind](50, 50, 44)}</svg>`;
}
export function FoodDot({ kind, size = 24 }: { kind: FoodKind; size?: number }) {
  return <SvgXml xml={foodXml(kind, size)} width={size} height={size} />;
}

function grainKind(grain?: string | null): FoodKind {
  const g = (grain ?? 'rice').toLowerCase();
  if (g.includes('roti') || g.includes('naan') || g.includes('tortilla') || g.includes('chapati') || g.includes('paratha')) return 'roti';
  if (g.includes('bread')) return 'bread';
  return 'rice';
}

/** What a plate looks like from above, laid out from its hand counts. */
function plateItems(p: { grains?: number | null; protein?: number | null; veg?: number | null; fruit?: number | null; dairy?: number | null; grain?: string | null }) {
  const items: { kind: FoodKind; n: number }[] = [];
  const g = p.grains ?? 1;
  if (g > 0) items.push({ kind: grainKind(p.grain), n: g });
  if ((p.protein ?? 1) > 0) items.push({ kind: 'curry', n: p.protein ?? 1 });
  if ((p.veg ?? 1) > 0) items.push({ kind: 'veg', n: p.veg ?? 1 });
  if ((p.fruit ?? 0) > 0) items.push({ kind: 'fruit', n: p.fruit ?? 0 });
  if ((p.dairy ?? 0) > 0) items.push({ kind: 'dairy', n: p.dairy ?? 0 });
  // Biggest portion first, so it gets the biggest spot.
  items.sort((a, b) => b.n - a.n);
  const spots: [number, number][][] = [
    [[50, 50]],
    [[38, 46], [66, 56]],
    [[38, 42], [66, 38], [56, 67]],
    [[36, 38], [64, 36], [36, 65], [64, 65]],
    [[34, 38], [62, 32], [70, 58], [48, 70], [30, 62]],
  ];
  const at = spots[Math.max(0, items.length - 1)] ?? spots[4];
  const base = items.length <= 1 ? 30 : items.length === 2 ? 20 : items.length === 3 ? 15 : 12;
  return items.slice(0, 5).map((it, i) => ({ ...it, x: at[i][0], y: at[i][1], r: Math.min(base * 1.35, base * (0.7 + 0.18 * Math.min(4, it.n))) }));
}

export function plateXml(p: Parameters<typeof plateItems>[0] & { empty?: boolean }, size: number) {
  const food = p.empty ? '' : plateItems(p).map((i) => FOOD[i.kind](i.x, i.y, i.r)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="#DDE3DF"/><circle cx="50" cy="50" r="42" fill="#FFFFFF"/><circle cx="50" cy="50" r="42" fill="none" stroke="#EEF1EF" stroke-width="2"/>${food}</svg>`;
}

/**
 * The plate: the person's real photo cropped round inside the steel rim, or, when there is no photo,
 * the plate drawn from their hand counts.
 */
export function FoodPlate({ meal, size, portions, photo }: { meal?: Meal | null; size: number; portions?: Parameters<typeof plateItems>[0]; photo?: string | null }) {
  const store = useStore();
  const original = meal?.sameAs ? store.meals.find((m) => m.id === meal.sameAs) : undefined;
  const uri = photo ?? meal?.photo ?? original?.photo ?? null;
  if (uri) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.steel, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={{ uri }} style={{ width: size * 0.84, height: size * 0.84, borderRadius: size * 0.42, backgroundColor: '#EEF1EF' }} accessibilityLabel={meal?.dish || 'Plate photo'} />
      </View>
    );
  }
  if (meal?.slot === 'fasting') {
    return (
      <View style={{ width: size, height: size }}>
        <SvgXml xml={plateXml({ empty: true }, size)} width={size} height={size} />
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="moon" size={size * 0.34} color={C.leaf} />
        </View>
      </View>
    );
  }
  const p = portions ?? { grains: meal?.handfuls, protein: meal?.protein, veg: meal?.veg, fruit: meal?.fruit, dairy: meal?.dairy, grain: meal?.grain ?? store.goalFood };
  return <SvgXml xml={plateXml(p, size)} width={size} height={size} />;
}

// ---------- faces ----------
const FACE = [
  { bg: '#E6E0F2', fg: '#4B3B7A' },
  { bg: '#D9E4F2', fg: '#2A4D7A' },
  { bg: '#EFE3CC', fg: '#6B5426' },
  { bg: '#D6EDE0', fg: '#145A41' },
  { bg: '#F0E4D8', fg: '#7A4B2A' },
];

/** First letter, or two letters when someone else in the family starts with the same one (Am, Ab). */
export function initials(name: string, others: string[] = []): string {
  const n = name.trim();
  if (!n) return '?';
  const first = n[0].toUpperCase();
  const clash = others.some((o) => o.trim() && o.trim() !== n && o.trim()[0].toUpperCase() === first);
  return clash ? first + (n[1] ?? '').toLowerCase() : first;
}

export function Face({ member, size = 32, ring = C.rice, style }: { member: Pick<Member, 'name' | 'tint'>; size?: number; ring?: string; style?: StyleProp<ViewStyle> }) {
  const store = useStore();
  const tint = FACE[Math.abs(member.tint) % FACE.length];
  const text = initials(member.name, (store.family?.members ?? []).map((m) => m.name));
  return (
    <View style={[{ width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, backgroundColor: ring, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
        <T w="bold" size={Math.round(size * (text.length > 1 ? 0.36 : 0.42))} color={tint.fg} style={{ lineHeight: Math.round(size * 0.6) }}>
          {text}
        </T>
      </View>
    </View>
  );
}

export function Faces({ members, size = 24, ring = C.rice }: { members: Member[]; size?: number; ring?: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {members.map((m, i) => (
        <Face key={m.id} member={m} size={size} ring={ring} style={i ? { marginLeft: -8 } : null} />
      ))}
    </View>
  );
}

// ---------- Mado ----------
/** Mado comes in three sizes: 40, 88, 150. Always whole, on light ground, facing the goal. */
export function Mado({ mood = 'hello', width = 88, flip, costume }: { mood?: 'hello' | 'happy' | 'sleep'; width?: number; flip?: boolean; costume?: string | null }) {
  return (
    <Bob amp={Math.max(2, width * 0.04)} tilt={mood === 'sleep' ? 0 : 2} ms={mood === 'sleep' ? 3200 : 1900}>
      <View style={flip ? { transform: [{ scaleX: -1 }] } : null}>
        <MadoDressed costume={costume} mood={mood} width={width} />
      </View>
    </Bob>
  );
}

// ---------- the river ----------
/** The family counter: Mado swims along the river toward this week's costume. */
export function River({ done, goal, width, goalArt }: { done: number; goal: number; width: number; goalArt: React.ReactNode }) {
  const pct = Math.max(0, Math.min(1, goal ? done / goal : 0));
  const usable = width - 90;
  const px = 14 + usable * pct;
  const left = useSlide(Math.max(0, px - 30), 1200);
  const path = `M14 52 C ${width * 0.22} 22, ${width * 0.36} 76, ${width * 0.57} 48 S ${width - 90} 30, ${width - 40} 44`;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="84" viewBox="0 0 ${width} 84"><path d="${path}" fill="none" stroke="${K.pale}" stroke-width="20" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${C.lightGreen}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${px + 10} 2000"/><path d="M${width * 0.11} 46 q 8 -5 16 0 M${width * 0.31} 56 q 8 -5 16 0 M${width * 0.71} 40 q 8 -5 16 0" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>`;
  return (
    <View style={{ width, height: 84 }}>
      <SvgXml xml={xml} width={width} height={84} />
      <Animated.View style={{ position: 'absolute', left, top: 12 }} accessibilityLabel={`Mado, ${done} of ${goal}`}>
        <Mado width={64} flip />
      </Animated.View>
      <View style={{ position: 'absolute', right: 0, top: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: C.white, borderWidth: 4, borderColor: K.pale, alignItems: 'center', justifyContent: 'center' }}>{goalArt}</View>
    </View>
  );
}

// ---------- the table ----------
export interface Seat {
  member: Member;
  meal?: Meal | null;
  label?: string;
  /** What sits in an empty seat: a camera, a heart, "Invite". */
  empty?: React.ReactNode;
  heart?: boolean;
  dim?: boolean;
  glow?: boolean;
  onPress?: () => void;
  onFace?: () => void;
}

/** The family table seen from above. Everyone has a seat; an empty plate means they haven't shared yet. Me at the bottom. */
export function RoundTable({ seats, size, center }: { seats: Seat[]; size: number; center?: React.ReactNode }) {
  const r = size / 2;
  const plate = Math.min(80, Math.round(size * (seats.length > 5 ? 0.2 : 0.25)));
  const ring = r - plate / 2 - 16;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: r, backgroundColor: K.table, borderWidth: 9, borderColor: K.tableRim, ...card, padding: 0 }} />
      {center ? (
        <PopIn delay={80} style={{ position: 'absolute', left: r - 60, top: r - 26, width: 120, alignItems: 'center' }}>
          {center}
        </PopIn>
      ) : null}
      {seats.map((seat, i) => {
        // The last seat (me) goes at the bottom; the rest spread round from the top.
        const n = seats.length;
        const angle = Math.PI / 2 + ((i + 1) / n) * 2 * Math.PI;
        const cx = r + ring * Math.cos(angle);
        const cy = r + ring * Math.sin(angle) - 6;
        return (
          <View key={seat.member.id} style={{ position: 'absolute', left: cx - plate / 2, top: cy - plate / 2, width: plate, alignItems: 'center' }}>
            <PopIn delay={120 + i * 90} k={seat.meal?.id ?? 'empty'}>
            <Squish onPress={seat.onPress} disabled={!seat.onPress} accessibilityRole={seat.onPress ? 'button' : undefined} accessibilityLabel={`${seat.member.name}${seat.meal ? "'s plate" : ''}`}>
              {seat.meal ? (
                <View style={seat.glow ? { shadowColor: C.lightGreen, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, borderRadius: plate / 2 } : null}>
                  <FoodPlate meal={seat.meal} size={plate} />
                </View>
              ) : (
                <View style={{ width: plate, height: plate, borderRadius: plate / 2, backgroundColor: C.rice, borderWidth: 2.5, borderStyle: 'dashed', borderColor: seat.dim ? C.steel : C.lightGreen, alignItems: 'center', justifyContent: 'center' }}>{seat.empty}</View>
              )}
            </Squish>
            </PopIn>
            <Pressable onPress={seat.onFace} disabled={!seat.onFace} style={{ position: 'absolute', left: -8, top: -6 }} accessibilityRole={seat.onFace ? 'button' : undefined} accessibilityLabel={seat.onFace ? `${seat.member.name}'s page` : undefined}>
              <Face member={seat.member} size={26} ring={K.table} />
            </Pressable>
            {seat.heart ? (
              <PopIn delay={500 + i * 90} style={{ position: 'absolute', right: -8, top: -4 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="heart" size={15} color={C.heart} fill={C.heart} />
                </View>
              </PopIn>
            ) : null}
            <T w="bold" size={S.small} color={seat.dim ? C.muted : C.deep} numberOfLines={1} style={{ marginTop: 2, width: plate + 30, textAlign: 'center' }}>
              {seat.label ?? seat.member.name}
            </T>
          </View>
        );
      })}
    </View>
  );
}

// ---------- controls ----------
export function BigButton({ label, onPress, icon, kind = 'primary', disabled, height = 62, size = 20, style }: { label: string; onPress: () => void; icon?: IconName; kind?: 'primary' | 'line' | 'mint' | 'pink'; disabled?: boolean; height?: number; size?: number; style?: StyleProp<ViewStyle> }) {
  const bg = kind === 'primary' ? C.leaf : kind === 'mint' ? C.mint : kind === 'pink' ? C.pinkSoft : C.white;
  const fg = kind === 'primary' ? C.white : C.deep;
  return (
    <Squish
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        { height, borderRadius: Math.min(28, height / 2.4), backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, opacity: disabled ? 0.45 : 1 },
        kind === 'line' && { borderWidth: 1.5, borderColor: K.line2 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={Math.round(size * 1.2)} color={fg} /> : null}
      <T w="bold" size={size} color={fg}>
        {label}
      </T>
    </Squish>
  );
}

export function RoundIcon({ name, onPress, label, bg = C.white, color = C.deep, size = 44 }: { name: IconName; onPress: () => void; label: string; bg?: string; color?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.5)} color={color} />
    </Pressable>
  );
}

export function Pill({ label, on, onPress, icon, food }: { label: string; on: boolean; onPress: () => void; icon?: IconName; food?: FoodKind }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 40, borderRadius: 20, paddingLeft: food ? 6 : 14, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? C.leaf : C.white, borderWidth: on ? 0 : 1.5, borderColor: K.line2 }}
    >
      {food ? <FoodDot kind={food} size={28} /> : null}
      {icon ? <Icon name={icon} size={16} color={on ? C.white : C.leaf} /> : null}
      <T w="bold" size={S.small} color={on ? C.white : C.deep}>
        {label}
      </T>
    </Pressable>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={8} style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.leaf : C.steel, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white }} />
    </Pressable>
  );
}

export function Chip({ text, icon, color = C.deep, bg = C.white }: { text: string; icon?: IconName; color?: string; bg?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' }}>
      {icon ? <Icon name={icon} size={16} color={C.leaf} /> : null}
      <T w="bold" size={S.small} color={color}>
        {text}
      </T>
    </View>
  );
}

/** A pop-up over the screen: dimmed behind, a rounded sheet from the bottom. */
export function Sheet({ visible, onClose, children, height = '86%' }: { visible: boolean; onClose: () => void; children: React.ReactNode; height?: `${number}%` | number }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,36,28,0.55)', alignItems: 'center' }}>
        <Pressable style={{ flex: 1, width: '100%' }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ height, width: '100%', maxWidth: 480, backgroundColor: C.rice, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingBottom: insets.bottom }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.steel, alignSelf: 'center', marginBottom: 4 }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** A full page with a back button and a title, scrolling. */
export function Page({ title, sub, onBack, children, bg = C.rice, right, footer }: { title?: string; sub?: string; onBack: () => void; children: React.ReactNode; bg?: string; right?: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: (footer ? 110 : 30) + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 }}>
          <RoundIcon name="back" onPress={onBack} label="Back" bg={bg === C.rice ? C.mint : C.white} />
          <View style={{ flex: 1 }}>
            {title ? (
              <T w="bold" size={S.title} style={{ lineHeight: 26 }}>
                {title}
              </T>
            ) : null}
            {sub ? (
              <T w="medium" size={S.small} color={C.muted}>
                {sub}
              </T>
            ) : null}
          </View>
          {right}
        </View>
        <FadeUp delay={60}>{children}</FadeUp>
      </ScrollView>
      {footer ? <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 20, gap: 10 }}>{footer}</View> : null}
    </View>
  );
}

/** A row of seven day circles: filled when the person (or the family) shared that day. */
export function DayDots({ values, size = 18, gap = 6, today = -1 }: { values: number[]; size?: number; gap?: number; today?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {values.map((v, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: v >= 2 ? C.leaf : v === 1 ? C.lightGreen : 'transparent', borderWidth: v ? 0 : 2, borderColor: i === today ? C.leaf : K.line2 }} />
      ))}
    </View>
  );
}

/** Rice-grain confetti for the reward screens. */
export function Confetti({ points }: { points: [number, number, number][] }) {
  return (
    <>
      {points.map(([x, y, r], i) => (
        <FallingBit key={i} x={x} y={y} r={r} i={i} color={i % 2 ? C.lightGreen : C.leaf} />
      ))}
    </>
  );
}

/** A drop down: shows the choice, opens a short list right under it. */
export function Dropdown({ value, options, onChange, placeholder = 'Choose', label }: { value: string | null; options: string[]; onChange: (v: string) => void; placeholder?: string; label: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={{ height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: open ? C.leaf : K.line2, backgroundColor: C.white, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
      >
        <T w={value ? 'bold' : 'medium'} size={S.body} color={value ? C.ink : C.muted} style={{ flex: 1 }}>
          {value ?? placeholder}
        </T>
        <Icon name="down" size={20} color={C.deep} />
      </Pressable>
      {open ? (
        <View style={[card, { padding: 6, marginTop: 6 }]}>
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: o === value ? C.mint : pressed ? K.rice : 'transparent' })}
            >
              <T w={o === value ? 'bold' : 'medium'} size={S.body} style={{ flex: 1 }}>
                {o}
              </T>
              {o === value ? <Icon name="check" size={18} color={C.leaf} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
