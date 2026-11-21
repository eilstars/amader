import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { C } from './theme';
import { T } from './ui';

/**
 * Flat food illustrations, so everyone can tell at a glance what a number is counting.
 * Drawn on a 64 by 64 grid, two or three tones each, no outlines.
 */

const BOWL = '#C9D3CD';
const BOWL_DARK = '#AEBAB3';
const RICE = '#FFFFFF';
const RICE_SHADE = '#EDE6D3';
const CRUST = '#C98B4F';
const DOUGH = '#F0D39C';
const SPOT = '#B9773E';
const MEAT = '#C98B4F';
const MEAT_DARK = '#A86A33';
const BONE = '#F7F2E6';
const GREEN = C.leaf;
const GREEN_LIGHT = '#4FA67D';
const STEM = '#8CC5A8';
const CARROT = '#E39A5A';
const CARROT_DARK = '#C9783A';

function Bowl({ children }: { children?: React.ReactNode }) {
  return (
    <G>
      {children}
      <Path d="M6 34 H58 C58 48 46 56 32 56 C18 56 6 48 6 34 Z" fill={BOWL} />
      <Rect x={6} y={32} width={52} height={5} rx={2.5} fill={BOWL_DARK} />
      <Rect x={24} y={55} width={16} height={4} rx={2} fill={BOWL_DARK} />
    </G>
  );
}

function RiceBowl() {
  return (
    <Bowl>
      <Ellipse cx={32} cy={33} rx={22} ry={16} fill={RICE_SHADE} />
      <Ellipse cx={30} cy={31} rx={19} ry={14} fill={RICE} />
      {[
        [22, 26],
        [30, 22],
        [38, 26],
        [26, 32],
        [35, 31],
        [42, 31],
      ].map(([x, y], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={2.4} ry={1.1} fill={RICE_SHADE} transform={`rotate(${i % 2 ? 25 : -20} ${x} ${y})`} />
      ))}
    </Bowl>
  );
}

function NoodleBowl({ color = '#E8C77E' }: { color?: string }) {
  return (
    <Bowl>
      <Ellipse cx={32} cy={33} rx={22} ry={12} fill={color} />
      {[20, 26, 32, 38, 44].map((x, i) => (
        <Path key={i} d={`M${x - 4} 34 C${x - 2} 26 ${x + 2} 26 ${x + 4} 34`} stroke="#C9A35A" strokeWidth={2} fill="none" strokeLinecap="round" />
      ))}
    </Bowl>
  );
}

function Bread() {
  return (
    <G>
      <Path d="M14 30 C8 30 8 14 22 13 C26 9 38 9 42 13 C56 14 56 30 50 30 V52 C50 55 48 56 46 56 H18 C16 56 14 55 14 52 Z" fill={CRUST} />
      <Path d="M18 31 C13 30 14 18 24 17 C28 14 36 14 40 17 C50 18 51 30 46 31 V50 C46 51.5 45 52 44 52 H20 C19 52 18 51.5 18 50 Z" fill={DOUGH} />
    </G>
  );
}

function Flatbread({ naan }: { naan?: boolean }) {
  return (
    <G>
      {naan ? <Path d="M32 6 C46 16 54 30 52 42 C50 54 40 58 32 58 C24 58 14 54 12 42 C10 30 18 16 32 6 Z" fill={DOUGH} /> : <Circle cx={32} cy={32} r={25} fill={DOUGH} />}
      {[
        [24, 24, 3],
        [38, 22, 2.5],
        [30, 36, 3.5],
        [42, 38, 2.5],
        [22, 42, 2.5],
        [34, 48, 2],
      ].map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill={SPOT} opacity={0.7} />
      ))}
    </G>
  );
}

function Tortilla() {
  return (
    <G>
      <Path d="M6 44 C6 26 18 14 32 14 C46 14 58 26 58 44 Z" fill={DOUGH} />
      <Path d="M14 44 C14 30 22 22 32 22 C42 22 50 30 50 44 Z" fill="#E6C485" />
      {[
        [24, 32],
        [38, 30],
        [44, 40],
        [20, 40],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2} fill={SPOT} opacity={0.6} />
      ))}
    </G>
  );
}

function Potato() {
  return (
    <G>
      <Ellipse cx={32} cy={34} rx={24} ry={18} fill="#D9B27C" />
      <Ellipse cx={28} cy={30} rx={18} ry={12} fill="#E4C391" />
      {[
        [22, 30],
        [38, 26],
        [42, 40],
        [28, 42],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.8} fill={SPOT} opacity={0.7} />
      ))}
    </G>
  );
}

/** The grain the person picked: a bowl of rice, a slice of bread, a roti, and so on. */
export function GrainArt({ kind = 'Rice', size = 44 }: { kind?: string | null; size?: number }) {
  const k = (kind ?? 'Rice').toLowerCase();
  const art =
    k === 'bread' ? <Bread /> : k === 'roti' ? <Flatbread /> : k === 'naan' ? <Flatbread naan /> : k === 'tortilla' ? <Tortilla /> : k === 'potato' ? <Potato /> : k === 'pasta' ? <NoodleBowl /> : k === 'noodles' ? <NoodleBowl color="#EBD9A6" /> : <RiceBowl />;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {art}
    </Svg>
  );
}

/** Protein: a chicken leg and an egg. Stands for meat, fish, eggs, beans and lentils. */
export function ProteinArt({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G>
        <Rect x={34} y={30} width={8} height={22} rx={4} fill={BONE} transform="rotate(-35 38 41)" />
        <Circle cx={47} cy={52} r={4.5} fill={BONE} />
        <Circle cx={51} cy={48} r={4.5} fill={BONE} />
        <Path d="M10 22 C10 10 22 4 32 8 C42 12 44 24 38 32 C32 40 20 40 14 34 C11 31 10 27 10 22 Z" fill={MEAT} />
        <Path d="M16 20 C16 13 23 9 29 11" stroke={MEAT_DARK} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.5} />
      </G>
      <G>
        <Ellipse cx={20} cy={50} rx={13} ry={10} fill={RICE} />
        <Circle cx={21} cy={50} r={5} fill="#F2B84B" />
      </G>
    </Svg>
  );
}

/** Vegetables: broccoli and a carrot. */
export function VegArt({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G>
        <Path d="M40 22 L56 54 C57 57 54 59 52 57 L30 28 Z" fill={CARROT} />
        <Path d="M44 30 L48 28 M48 38 L52 36 M52 46 L55 45" stroke={CARROT_DARK} strokeWidth={2} strokeLinecap="round" />
        <Path d="M34 24 C30 16 34 10 38 12 C38 16 38 20 36 24 Z" fill={GREEN_LIGHT} />
        <Path d="M36 25 C34 16 42 12 44 16 C42 19 40 22 38 26 Z" fill={GREEN} />
      </G>
      <G>
        <Path d="M18 36 H28 L30 58 C30 60 16 60 16 58 Z" fill={STEM} />
        <Circle cx={14} cy={30} r={9} fill={GREEN} />
        <Circle cx={32} cy={30} r={9} fill={GREEN} />
        <Circle cx={23} cy={22} r={11} fill={GREEN_LIGHT} />
        <Circle cx={22} cy={32} r={8} fill={GREEN} />
      </G>
    </Svg>
  );
}

/** Fruit: an apple and a banana. */
export function FruitArt({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M30 50 C40 52 54 44 58 26 C59 22 55 21 54 25 C50 38 40 44 30 44 C26 44 26 50 30 50 Z" fill="#F2C94C" />
      <Path d="M56 24 L59 19" stroke="#8A6A2A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M22 22 C12 16 4 24 6 36 C8 48 16 56 22 54 C24 53 26 53 28 54 C34 56 40 46 40 36 C40 24 32 16 22 22 Z" fill="#D9534F" />
      <Path d="M12 30 C12 26 15 23 18 23" stroke="#F4A7A3" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M22 22 C22 16 24 12 27 10" stroke="#7A4A22" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M24 14 C28 8 36 9 36 12 C32 16 27 16 24 14 Z" fill={GREEN_LIGHT} />
    </Svg>
  );
}

/** Dairy: a glass of milk and a bowl of yoghurt. */
export function DairyArt({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M10 10 H32 L29 56 C29 58 13 58 13 56 Z" fill="#DCE6EF" />
      <Path d="M11.5 22 H30.5 L29 56 C29 58 13 58 13 56 Z" fill="#FFFFFF" />
      <Rect x={10} y={8} width={22} height={4} rx={2} fill="#C4D2DE" />
      <Path d="M32 40 H60 C60 50 54 58 46 58 C38 58 32 50 32 40 Z" fill={BOWL} />
      <Ellipse cx={46} cy={40} rx={14} ry={4} fill="#FFFFFF" />
      <Path d="M44 39 C46 36 50 37 50 39" stroke="#EDE6D3" strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/**
 * A meal at a glance: each part of the plate as a clear picture with how many fists, palms or handfuls.
 * Used wherever a meal has no photo, and to compare a usual plate with a balanced one.
 */
export function PlateCard({
  grains,
  protein,
  veg,
  fruit,
  dairy,
  grain,
  size = 76,
  fasting,
  party,
}: {
  grains?: number | null;
  protein?: number | null;
  veg?: number | null;
  fruit?: number | null;
  dairy?: number | null;
  grain?: string | null;
  size?: number;
  fasting?: boolean;
  party?: boolean;
}) {
  // Fruit and dairy only take a seat on the plate when they were there, so most plates stay three big pictures.
  const extra = [fruit ? 'f' : null, dairy ? 'd' : null].filter(Boolean) as string[];
  const icon = size * (extra.length ? 0.3 : 0.36);
  const part = (art: React.ReactNode, n: number | null | undefined, key: string) => (
    <View key={key} style={{ alignItems: 'center', opacity: n ? 1 : 0.28 }}>
      {art}
      <View style={{ position: 'absolute', right: -size * 0.04, bottom: -size * 0.02, minWidth: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: C.deep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
        <T w="bold" size={Math.max(10, size * 0.13)} color={C.white} style={{ lineHeight: size * 0.18 }}>
          {n ? (n >= 4 ? '4+' : Math.round(n * 2) / 2) : 0}
        </T>
      </View>
    </View>
  );
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.steel, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.88, height: size * 0.88, borderRadius: size, backgroundColor: '#F6F8F6', alignItems: 'center', justifyContent: 'center' }}>
        {fasting ? (
          <T w="bold" size={size * 0.16} color={C.deep}>
            Fasting
          </T>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: size * 0.02 }}>
              {part(<GrainArt kind={grain} size={icon} />, grains, 'g')}
              {part(<ProteinArt size={icon} />, protein, 'p')}
            </View>
            <View style={{ flexDirection: 'row', gap: size * 0.02, marginTop: -size * 0.02 }}>
              {part(<VegArt size={icon} />, veg, 'v')}
              {fruit ? part(<FruitArt size={icon} />, fruit, 'f') : null}
              {dairy ? part(<DairyArt size={icon} />, dairy, 'd') : null}
            </View>
            {party ? (
              <View style={{ position: 'absolute', top: 0, right: 0 }}>
                <Ionicons name="sparkles" size={size * 0.16} color={C.leaf} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
