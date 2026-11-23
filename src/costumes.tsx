import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { CostumeId, QUESTS } from './quests';
import { C } from './theme';
import { Puti } from './ui';

/**
 * Puti's costumes, earned by finishing a family quest. Drawn on top of the Puti picture,
 * on the same 360 by 225 grid as the picture, so they sit on the head at any size.
 * Flat shapes in the brand greens, with one warm marigold for the garland.
 */

const MARIGOLD = '#F0A03C';
const MARIGOLD_DARK = '#D9822B';
const OUTLINE = C.deep;

function ChefHat() {
  return (
    <G>
      <Rect x={-26} y={-12} width={52} height={14} rx={3} fill={C.white} stroke={OUTLINE} strokeWidth={3} />
      <Path d="M-24 -12 C-40 -16 -36 -40 -18 -36 C-16 -52 6 -54 10 -40 C24 -48 40 -30 24 -12 Z" fill={C.white} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M-6 -12 L-8 -26 M8 -12 L10 -24" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
    </G>
  );
}

function LeafCrown() {
  const leaves = [-34, -17, 0, 17, 34];
  return (
    <G>
      <Rect x={-30} y={-6} width={60} height={8} rx={4} fill={C.deep} />
      {leaves.map((a, i) => (
        <Ellipse key={a} cx={a * 0.85} cy={-14 - (i === 2 ? 6 : i % 2 ? 3 : 0)} rx={6} ry={13} fill={i % 2 ? C.lightGreen : '#4FA77E'} transform={`rotate(${a * 0.7} ${a * 0.85} ${-14})`} />
      ))}
    </G>
  );
}

function WalkingCap() {
  return (
    <G>
      <Path d="M-26 0 C-26 -30 26 -30 26 0 Z" fill={C.lightGreen} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M-26 0 L-52 2 C-50 -6 -40 -8 -26 -6 Z" fill={C.deep} />
      <Circle cx={0} cy={-22} r={3.5} fill={C.deep} />
      <Path d="M-14 -6 L14 -6" stroke={C.white} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

function AppleHat() {
  return (
    <G>
      <Path d="M0 -6 C-10 -14 -30 -10 -28 6 C-27 18 -14 22 0 16 C14 22 27 18 28 6 C30 -10 10 -14 0 -6 Z" fill="#8CC541" stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M0 -6 L2 -18" stroke="#7A5230" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M3 -16 C10 -24 20 -22 22 -16 C14 -12 8 -12 3 -16 Z" fill={C.leaf} />
      <Ellipse cx={-14} cy={0} rx={4} ry={6} fill={C.white} opacity={0.5} />
    </G>
  );
}

function Garland() {
  // Marigolds along the gills, from the top of the head to the belly.
  const flowers = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { x: 86 + Math.sin(t * Math.PI) * 10, y: 52 + t * 124 };
  });
  return (
    <G>
      <Path d={`M86 52 Q102 114 86 176`} stroke={C.deep} strokeWidth={2} fill="none" />
      {flowers.map((f, i) => (
        <G key={i}>
          <Circle cx={f.x} cy={f.y} r={9} fill={i % 2 ? MARIGOLD_DARK : MARIGOLD} />
          <Circle cx={f.x} cy={f.y} r={3.5} fill={i % 2 ? MARIGOLD : MARIGOLD_DARK} />
        </G>
      ))}
    </G>
  );
}

/** Each costume, and where it sits on Puti: on the slope of the head, tilted to match it. */
const ART: Record<CostumeId, { draw: () => React.ReactElement; at: string; shelf: string }> = {
  chef: { draw: ChefHat, at: 'translate(52 64) rotate(-30) scale(1.3)', shelf: '-44 -58 88 64' },
  crown: { draw: LeafCrown, at: 'translate(52 64) rotate(-32) scale(1.3)', shelf: '-40 -40 80 46' },
  cap: { draw: WalkingCap, at: 'translate(54 62) rotate(-32) scale(1.4)', shelf: '-56 -34 86 40' },
  apple: { draw: AppleHat, at: 'translate(50 48) rotate(-24) scale(1.25)', shelf: '-32 -26 64 52' },
  garland: { draw: Garland, at: '', shelf: '40 40 104 150' },
};

export function isCostume(id: string | null | undefined): id is CostumeId {
  return !!id && id in ART;
}

export function costumeName(id: string): string {
  return QUESTS.find((q) => q.costume === id)?.costumeName ?? id;
}

/** Puti wearing a costume, or plain Puti when there is none. */
export function PutiDressed({ costume, mood = 'hello', width = 96 }: { costume?: string | null; mood?: 'hello' | 'happy' | 'sleep'; width?: number }) {
  const height = (width * 225) / 360;
  // Hats stick out above the head, so leave room for them.
  const top = isCostume(costume) && costume !== 'garland' ? height * 0.12 : 0;
  const art = isCostume(costume) ? ART[costume] : null;
  return (
    <View style={{ width, height: height + top }} accessibilityLabel={art ? `Puti the fish wearing a ${costumeName(costume as string).toLowerCase()}` : 'Puti the fish'}>
      <View style={{ position: 'absolute', top }}>
        <Puti mood={mood} width={width} />
      </View>
      {art ? (
        <Svg width={width} height={height + top} viewBox={`0 ${(-top * 360) / width} 360 ${225 + (top * 360) / width}`} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
          <G transform={art.at}>{art.draw()}</G>
        </Svg>
      ) : null}
    </View>
  );
}

/** Just the costume, for the shelf. */
export function CostumeArt({ id, size = 56 }: { id: CostumeId; size?: number }) {
  const art = ART[id];
  return (
    <Svg width={size} height={size} viewBox={art.shelf}>
      {art.draw()}
    </Svg>
  );
}

/** The costume Puti wears: the one picked on this phone, or the newest the family earned. */
export function wornCostume(costumes: string[] | undefined, wear: string | null): string | null {
  const list = costumes ?? [];
  if (wear === 'none') return null;
  if (wear && list.includes(wear)) return wear;
  return list[list.length - 1] ?? null;
}
