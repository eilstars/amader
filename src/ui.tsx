import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, F, Weight, shadow } from './theme';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Member, Parts } from './types';

type TProps = TextProps & { w?: Weight; size?: number; color?: string; center?: boolean };

/** All text goes through here so Hind Siliguri is used everywhere. */
export function T({ w = 'regular', size = 17, color = C.ink, center, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: F[w], fontSize: size, color, lineHeight: Math.round(size * 1.42) },
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <T w="semibold" size={13} color={C.leaf} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
      {children}
    </T>
  );
}

type BtnProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'line' | 'dark';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ label, onPress, kind = 'primary', disabled, icon, style }: BtnProps) {
  const text = kind === 'primary' ? C.white : kind === 'dark' ? C.white : C.deep;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'ghost' && { backgroundColor: C.mint },
        kind === 'dark' && { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
        kind === 'line' && { minHeight: 44 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={text} /> : null}
      <T w="semibold" size={kind === 'line' ? 17 : 18} color={text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Card({ children, style, selected }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; selected?: boolean }) {
  return <View style={[s.card, selected && { borderColor: C.leaf }, style]}>{children}</View>;
}

export function Soft({ children, pink, style }: { children: React.ReactNode; pink?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.soft, pink && { backgroundColor: C.pinkSoft }, style]}>{children}</View>;
}

/** The soft green header at the top of most screens. */
export function Hero({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.hero, { paddingTop: insets.top + 20 }, style]}>{children}</View>;
}

export function Tag({ text }: { text: string }) {
  return (
    <View style={s.tag}>
      <T w="semibold" size={12} color={C.deep}>
        {text}
      </T>
    </View>
  );
}

export function RoundButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={s.round} hitSlop={6}>
      <Ionicons name={icon} size={20} color={C.ink} />
    </Pressable>
  );
}

const TINTS = [
  { bg: '#FAD7DD', fg: '#8A2942' },
  { bg: '#D4EBDD', fg: C.deep },
  { bg: '#E8E2CF', fg: '#5B4A1E' },
  { bg: '#D6E4F0', fg: '#23466B' },
  { bg: '#EADCF2', fg: '#5A2F73' },
];

export function Avatar({ member, size = 40 }: { member: Pick<Member, 'name' | 'tint'>; size?: number }) {
  const tint = TINTS[Math.abs(member.tint) % TINTS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
      <T w="semibold" size={size * 0.42} color={tint.fg} style={{ lineHeight: size * 0.6 }}>
        {member.name.trim().slice(0, 1).toUpperCase() || '?'}
      </T>
    </View>
  );
}

type PlateProps = {
  size: number;
  /** Photo to show on the plate. */
  photo?: string | null;
  /** With no photo, how many rice mounds to draw. Null draws a plain served plate. */
  handfuls?: number | null;
  empty?: boolean;
};

/** The steel plate, the main motif of the app. */
export function Plate({ size, photo, handfuls, empty }: PlateProps) {
  const inner = size * 0.7;
  const mounds = handfuls === null || handfuls === undefined ? 2 : Math.min(4, Math.max(0, handfuls));
  const mound = inner * (mounds > 2 ? 0.3 : 0.36);
  return (
    <View style={[s.plateOuter, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={{ width: size * 0.86, height: size * 0.86, borderRadius: size, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: Math.max(1, size * 0.012), borderColor: '#CCD4CF' }}>
        {empty ? (
          <View style={{ width: inner, height: inner, borderRadius: inner, borderWidth: Math.max(1, size * 0.015), borderColor: '#EEF1EF' }} />
        ) : photo ? (
          <Image source={{ uri: photo }} style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: C.soft }} />
        ) : (
          <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: '#2F8F68', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', padding: inner * 0.12 }}>
            {Array.from({ length: mounds }, (_, i) => (
              <View key={i} style={{ width: mound, height: mound * 0.78, borderRadius: mound, backgroundColor: '#FBF8F1', margin: inner * 0.02 }} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function MadoPic({ mood = 'hello', width = 96 }: { mood?: 'hello' | 'happy' | 'sleep'; width?: number }) {
  const source =
    mood === 'happy' ? require('../assets/brand/mado-happy.png') : mood === 'sleep' ? require('../assets/brand/mado-sleep.png') : require('../assets/brand/mado-hello.png');
  return <Image source={source} style={{ width, height: (width * 780) / 1250 }} resizeMode="contain" accessibilityLabel="Mado the fish" />;
}

export function Row({ children, gap = 12, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  btn: {
    minHeight: 58,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
  },
  btnPrimary: {
    backgroundColor: C.leaf,
    shadowColor: C.leaf,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow,
  },
  soft: { backgroundColor: C.soft, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  hero: {
    backgroundColor: C.mint,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tag: { backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  count: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateOuter: {
    backgroundColor: C.steel,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

export const PART_COLORS = { grain: '#F2EAD3', veg: C.leaf, protein: C.lightGreen, other: '#C9D3CD' } as const;
export const PART_NAMES = { grain: 'Rice, roti and grains', veg: 'Dal and vegetables', protein: 'Fish, meat and eggs', other: 'Everything else' } as const;

/** The week's plate drawn as a pie on a steel plate. */
export function PlatePie({ parts, size }: { parts: Parts; size: number }) {
  const keys = ['grain', 'veg', 'protein', 'other'] as const;
  const total = keys.reduce((sum, k) => sum + Math.max(0, parts[k]), 0) || 1;
  const c = size / 2;
  const r = size * 0.33;
  let angle = -Math.PI / 2;
  const wedges = keys
    .filter((k) => parts[k] > 0)
    .map((k) => {
      const sweep = (Math.max(0, parts[k]) / total) * Math.PI * 2;
      const from = angle;
      angle += sweep;
      if (sweep >= Math.PI * 2 - 0.001) return <Circle key={k} cx={c} cy={c} r={r} fill={PART_COLORS[k]} />;
      const x1 = c + r * Math.cos(from);
      const y1 = c + r * Math.sin(from);
      const x2 = c + r * Math.cos(angle);
      const y2 = c + r * Math.sin(angle);
      return <Path key={k} d={`M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`} fill={PART_COLORS[k]} />;
    });
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={c} fill={C.steel} />
      <Circle cx={c} cy={c} r={c * 0.86} fill={C.white} stroke="#CCD4CF" strokeWidth={1} />
      {wedges}
    </Svg>
  );
}

/** A pill-shaped choice. Big enough for older thumbs. */
export function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 46, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: on ? C.leaf : C.line, backgroundColor: on ? C.leaf : C.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
    >
      {icon ? <Ionicons name={icon} size={18} color={on ? C.white : C.deep} /> : null}
      <T w="medium" size={16} color={on ? C.white : C.ink}>
        {label}
      </T>
    </Pressable>
  );
}

/** A small number with an icon: streak, points, badges. */
export function Stat({ icon, value, label, tone = 'green' }: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string; tone?: 'green' | 'pink' | 'white' }) {
  const bg = tone === 'pink' ? C.pinkSoft : tone === 'white' ? C.white : C.mint;
  const fg = tone === 'pink' ? '#8A2942' : C.deep;
  return (
    <View accessibilityLabel={`${value} ${label}`} style={{ flex: 1, backgroundColor: bg, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={22} color={tone === 'pink' ? C.heart : C.leaf} />
      <View style={{ flexShrink: 1 }}>
        <T w="bold" size={19} color={fg} style={{ lineHeight: 22 }}>
          {value}
        </T>
        <T size={12} color={C.muted} style={{ lineHeight: 15 }} numberOfLines={1}>
          {label}
        </T>
      </View>
    </View>
  );
}

/**
 * A day as a ring. Full as soon as anything is shared that day, with one dot per meal underneath.
 * Fasting days show a small moon.
 */
export function DayRing({ letter, count, fasting, today, size = 38, onPress, selected }: { letter: string; count: number; fasting?: boolean; today?: boolean; size?: number; onPress?: () => void; selected?: boolean }) {
  const done = count > 0 || fasting;
  const body = (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: done ? C.leaf : C.white,
          borderWidth: today || selected ? 3 : 1.5,
          borderColor: selected ? C.deep : today ? C.lightGreen : C.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {fasting && !count ? <Ionicons name="moon" size={size * 0.42} color={C.white} /> : <T w="semibold" size={size * 0.4} color={done ? C.white : C.muted} style={{ lineHeight: size * 0.5 }}>{letter}</T>}
      </View>
      <View style={{ flexDirection: 'row', gap: 2, height: 6 }}>
        {Array.from({ length: Math.min(count, 4) }, (_, i) => (
          <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.deep }} />
        ))}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${letter}, ${count} meals`} hitSlop={4}>
      {body}
    </Pressable>
  );
}

const RICE = '#FBF8F1';
const RICE_SHADE = '#E8DFC6';
/** Colours used for food in drawings and in the portion counters, so they always match. */
export const FOOD = { grain: '#EFE4C8', protein: '#C98B4F', proteinDark: '#A86A33', veg: C.leaf, vegLight: '#4FA67D' } as const;

/** Where each handful of sabzi sits on the plate, as fractions of the plate size from the centre. */
const VEG_SPOTS: [number, number][] = [
  [0.2, -0.1],
  [0.24, 0.12],
  [0.05, -0.27],
  [0.06, 0.27],
];
/** Where each palm of protein sits inside the katori. */
const PROTEIN_SPOTS: [number, number][] = [
  [-0.03, -0.03],
  [0.04, 0.03],
  [-0.04, 0.05],
  [0.05, -0.04],
];

/**
 * A steel thali drawn from the portions: a mound of rice, a katori of curry or dal with one piece
 * per palm of protein, and one heap of sabzi per handful. Every meal without a photo still gets
 * its own picture, so the table never looks empty, and two plates can be compared at a glance.
 */
export function Thali({ size, grains, protein, veg, party, fasting }: { size: number; grains?: number | null; protein?: number | null; veg?: number | null; party?: boolean; fasting?: boolean }) {
  const c = size / 2;
  const g = Math.max(0, Math.min(4, grains ?? 2));
  const p = Math.max(0, Math.min(4, protein ?? 1));
  const v = Math.max(0, Math.min(4, veg ?? 1));
  const heap = (x: number, y: number, key: string) => {
    const r = size * 0.062;
    return (
      <G key={key}>
        <Circle cx={x - r * 0.7} cy={y + r * 0.3} r={r} fill={FOOD.veg} />
        <Circle cx={x + r * 0.7} cy={y + r * 0.35} r={r * 0.95} fill={FOOD.vegLight} />
        <Circle cx={x} cy={y - r * 0.45} r={r * 1.05} fill={FOOD.veg} />
        <Circle cx={x + r * 0.15} cy={y - r * 0.55} r={r * 0.35} fill={FOOD.vegLight} />
      </G>
    );
  };
  const kx = c - size * 0.19;
  const ky = c - size * 0.15;
  const kr = size * 0.15;
  const moundW = size * (0.1 + 0.045 * g);
  const mx = c - size * 0.1;
  const my = c + size * 0.17;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={c} fill={C.steel} />
      <Circle cx={c} cy={c} r={c * 0.9} fill="#EEF2EF" stroke="#CCD4CF" strokeWidth={1} />
      {fasting ? (
        <G>
          <Circle cx={c} cy={c} r={size * 0.2} fill={C.deep} />
          <Circle cx={c + size * 0.07} cy={c - size * 0.05} r={size * 0.17} fill="#EEF2EF" />
        </G>
      ) : party ? (
        <G>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const fills = [RICE, FOOD.veg, FOOD.protein, FOOD.grain, FOOD.vegLight, RICE];
            return <Circle key={i} cx={c + Math.cos(a) * size * 0.24} cy={c + Math.sin(a) * size * 0.24} r={size * 0.11} fill={fills[i]} stroke="#CCD4CF" strokeWidth={0.5} />;
          })}
          <Circle cx={c} cy={c} r={size * 0.1} fill={FOOD.protein} />
        </G>
      ) : (
        <G>
          {/* The katori: curry, with one piece per palm of protein. */}
          <Circle cx={kx} cy={ky} r={kr} fill="#C9D1CC" />
          <Circle cx={kx} cy={ky} r={kr * 0.84} fill={p > 0 ? '#E3B57E' : '#E9EDEA'} />
          {PROTEIN_SPOTS.slice(0, p).map(([dx, dy], i) => (
            <G key={`p${i}`}>
              <Circle cx={kx + dx * size} cy={ky + dy * size} r={size * 0.045} fill={FOOD.protein} />
              <Circle cx={kx + dx * size - size * 0.012} cy={ky + dy * size - size * 0.012} r={size * 0.015} fill={FOOD.proteinDark} opacity={0.5} />
            </G>
          ))}
          {/* Rice, as a mound that grows with each fist. */}
          {g > 0 ? (
            <G>
              <Ellipse cx={mx} cy={my + moundW * 0.08} rx={moundW} ry={moundW * 0.66} fill={RICE_SHADE} />
              <Ellipse cx={mx} cy={my} rx={moundW * 0.95} ry={moundW * 0.6} fill={RICE} />
              {[-0.4, 0, 0.35, -0.15, 0.2].map((dx, i) => (
                <Ellipse key={i} cx={mx + dx * moundW} cy={my + (i % 2 ? 0.15 : -0.2) * moundW} rx={size * 0.012} ry={size * 0.005} fill={RICE_SHADE} />
              ))}
            </G>
          ) : null}
          {/* Sabzi: one heap per handful. */}
          {VEG_SPOTS.slice(0, v).map(([dx, dy], i) => heap(c + dx * size, c + dy * size, `v${i}`))}
        </G>
      )}
    </Svg>
  );
}

/** A plain header row for full screen pages: back button, title, optional action on the right. */
export function PageHead({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {onBack ? <RoundButton icon="chevron-back" label="Back" onPress={onBack} /> : null}
      <T w="bold" size={24} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </T>
      {right}
    </View>
  );
}

/** Counts up portions with your hands: a big minus, the number, a big plus. */
export function HandCount({ label, unit, value, onChange, art }: { label: string; unit: [string, string]; value: number; onChange: (n: number) => void; art: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>{art}</View>
      <View style={{ flex: 1 }}>
        <T w="semibold" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </T>
        <T size={14} color={C.muted} numberOfLines={1}>
          {value === 0 ? 'None' : `${value >= 4 ? '4+' : value} ${value === 1 ? unit[0] : unit[1]}`}
        </T>
      </View>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} accessibilityRole="button" accessibilityLabel={`Less ${label}`} style={s.count}>
        <Ionicons name="remove" size={24} color={C.ink} />
      </Pressable>
      <T w="bold" size={22} style={{ width: 30, textAlign: 'center' }}>
        {value >= 4 ? '4+' : value}
      </T>
      <Pressable onPress={() => onChange(Math.min(4, value + 1))} accessibilityRole="button" accessibilityLabel={`More ${label}`} style={[s.count, { backgroundColor: C.mint, borderColor: C.mint }]}>
        <Ionicons name="add" size={24} color={C.deep} />
      </Pressable>
    </View>
  );
}

/** Staples people count in fists. The family picks a usual one; each meal can be different. */
export const GOAL_FOODS = ['Rice', 'Bread', 'Roti', 'Naan', 'Pasta', 'Tortilla', 'Potato', 'Noodles'];

/** A text field big enough for older eyes and thumbs. */
export const field = {
  minHeight: 54,
  borderWidth: 1.5,
  borderColor: C.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  fontFamily: F.regular,
  fontSize: 17,
  backgroundColor: C.white,
  color: C.ink,
} as const;

/** Minus, a value, plus. */
export function Stepper({ text, onLess, onMore, label }: { text: string; onLess: () => void; onMore: () => void; label: string }) {
  return (
    <Row gap={8}>
      <Pressable style={s.count} onPress={onLess} accessibilityRole="button" accessibilityLabel={`Earlier or less ${label}`} hitSlop={4}>
        <Ionicons name="remove" size={22} color={C.ink} />
      </Pressable>
      <T w="semibold" size={17} style={{ minWidth: 76, textAlign: 'center' }}>
        {text}
      </T>
      <Pressable style={[s.count, { backgroundColor: C.mint, borderColor: C.mint }]} onPress={onMore} accessibilityRole="button" accessibilityLabel={`Later or more ${label}`} hitSlop={4}>
        <Ionicons name="add" size={22} color={C.deep} />
      </Pressable>
    </Row>
  );
}

/** One meal time: name on the left, the hour with minus and plus on the right. */
export function TimeRow({ icon, label, hour, onChange, min = 0, max = 23 }: { icon: keyof typeof Ionicons.glyphMap; label: string; hour: number; onChange: (h: number) => void; min?: number; max?: number }) {
  const text = `${((hour + 11) % 12) + 1} ${hour < 12 ? 'AM' : 'PM'}`;
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
      <Row gap={10} style={{ flex: 1 }}>
        <Ionicons name={icon} size={22} color={C.leaf} />
        <T w="semibold">{label}</T>
      </Row>
      <Stepper text={text} label={label} onLess={() => onChange(Math.max(min, hour - 1))} onMore={() => onChange(Math.min(max, hour + 1))} />
    </Row>
  );
}

/** A setting row with a title, a line of help and a switch-like toggle on the right. */
export function Toggle({ title, help, on, onChange }: { title: string; help?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <T w="semibold">{title}</T>
        {help ? (
          <T size={14} color={C.muted}>
            {help}
          </T>
        ) : null}
      </View>
      <View style={{ width: 56, height: 32, borderRadius: 16, backgroundColor: on ? C.leaf : C.line, padding: 3, alignItems: on ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.white }} />
      </View>
    </Pressable>
  );
}

/** A small speech bubble from Mado. Used for tips and ideas, never for warnings. */
export function MadoSays({ title, children, mood = 'happy', pink }: { title?: string; children: React.ReactNode; mood?: 'hello' | 'happy' | 'sleep'; pink?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      <MadoPic mood={mood} width={64} />
      <View style={{ flex: 1, backgroundColor: pink ? C.pinkSoft : C.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: pink ? '#F6D3DA' : '#E3EAE4' }}>
        {title ? <T w="semibold">{title}</T> : null}
        {typeof children === 'string' ? (
          <T size={15} color={C.muted}>
            {children}
          </T>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Seven day rings with arrows for going back through the weeks. */
export function WeekStrip({
  days,
  label,
  counts,
  onPrev,
  onNext,
  selected,
  onDay,
}: {
  days: Date[];
  label: string;
  counts: { count: number; fasting: boolean }[];
  onPrev: () => void;
  onNext?: () => void;
  selected?: number | null;
  onDay?: (index: number) => void;
}) {
  const today = new Date().toDateString();
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel="Week before" hitSlop={8} style={s.arrow}>
          <Ionicons name="chevron-back" size={22} color={C.deep} />
        </Pressable>
        <T w="semibold" size={16}>
          {label}
        </T>
        <Pressable onPress={onNext} disabled={!onNext} accessibilityRole="button" accessibilityLabel="Week after" hitSlop={8} style={[s.arrow, !onNext && { opacity: 0.25 }]}>
          <Ionicons name="chevron-forward" size={22} color={C.deep} />
        </Pressable>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        {days.map((d, i) => (
          <DayRing
            key={i}
            letter={letters[i]}
            count={counts[i]?.count ?? 0}
            fasting={counts[i]?.fasting}
            today={d.toDateString() === today}
            selected={selected === i}
            onPress={onDay ? () => onDay(i) : undefined}
          />
        ))}
      </Row>
    </View>
  );
}
