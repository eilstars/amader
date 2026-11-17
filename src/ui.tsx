import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, F, Weight, shadow } from './theme';
import Svg, { Circle, Path } from 'react-native-svg';
import { Member, Parts } from './types';

type TProps = TextProps & { w?: Weight; size?: number; color?: string; center?: boolean };

/** All text goes through here so Hind Siliguri is used everywhere. */
export function T({ w = 'regular', size = 15, color = C.ink, center, style, ...rest }: TProps) {
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
    <T w="semibold" size={12} color={C.leaf} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
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
      <T w="semibold" size={kind === 'line' ? 16 : 17} color={text}>
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
  { bg: C.steel, fg: C.deep },
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

export function Puti({ mood = 'hello', width = 96 }: { mood?: 'hello' | 'happy' | 'sleep'; width?: number }) {
  const source =
    mood === 'happy' ? require('../assets/brand/puti-happy.png') : mood === 'sleep' ? require('../assets/brand/puti-sleep.png') : require('../assets/brand/puti-hello.png');
  return <Image source={source} style={{ width, height: (width * 780) / 1250 }} resizeMode="contain" accessibilityLabel="Puti the fish" />;
}

export function Row({ children, gap = 12, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  btn: {
    minHeight: 56,
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
