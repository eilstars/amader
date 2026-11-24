import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { BigButton, Confetti, FoodDot, FoodKind, Icon, K, Mado, RoundIcon, S, card } from '../design';
import { Beat, FadeUp, PopIn } from '../motion';
import { C } from '../theme';
import { T } from '../ui';

/**
 * "Fix the plate": a short game that teaches the balanced plate by touch.
 * Each round starts with a familiar heavy plate. Tap a slice to swap what's on it.
 * The plate never gets smaller: the point is that less rice does not mean less food.
 */
type Part = 'base' | 'veg' | 'main';
const CYCLE: Record<Part, Part> = { base: 'veg', veg: 'main', main: 'base' };
const SLICES = 8;
const GOAL: Record<Part, number> = { veg: 4, base: 2, main: 2 };

interface Round {
  title: string;
  names: Record<Part, string>;
  dots: Record<Part, FoodKind>;
  start: Part[];
  fill: Record<Part, string>;
}

const ROUNDS: Round[] = [
  {
    title: "Ammi's rice plate",
    names: { base: 'Rice', main: 'Fish curry', veg: 'Shak' },
    dots: { base: 'rice', main: 'curry', veg: 'veg' },
    start: ['base', 'base', 'base', 'main', 'base', 'base', 'main', 'veg'],
    fill: { base: '#F2EAD3', main: '#E0A458', veg: C.leaf },
  },
  {
    title: 'Sunday roti',
    names: { base: 'Roti', main: 'Chana', veg: 'Sabzi' },
    dots: { base: 'roti', main: 'dal', veg: 'veg' },
    start: ['base', 'main', 'base', 'base', 'main', 'base', 'main', 'veg'],
    fill: { base: '#E6C79A', main: '#E8B04B', veg: C.leaf },
  },
  {
    title: 'Pasta night',
    names: { base: 'Pasta', main: 'Chicken', veg: 'Salad' },
    dots: { base: 'bread', main: 'egg', veg: 'veg' },
    start: ['base', 'base', 'base', 'base', 'main', 'base', 'base', 'veg'],
    fill: { base: '#F3D9A4', main: '#D98E5F', veg: '#6FB58F' },
  },
];

const SIZE = 280;

function wedge(i: number) {
  const c = SIZE / 2;
  const r = SIZE * 0.42;
  const a0 = (i / SLICES) * Math.PI * 2;
  const a1 = ((i + 1) / SLICES) * Math.PI * 2;
  const p = (a: number) => `${c + r * Math.sin(a)} ${c - r * Math.cos(a)}`;
  return `M ${c} ${c} L ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)} Z`;
}

function tally(plate: Part[]) {
  return { base: plate.filter((p) => p === 'base').length, main: plate.filter((p) => p === 'main').length, veg: plate.filter((p) => p === 'veg').length };
}

export default function Teach({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [round, setRound] = useState(0);
  const [plate, setPlate] = useState<Part[]>(ROUNDS[0].start);
  const [taps, setTaps] = useState(0);
  const [stars, setStars] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const done = round >= ROUNDS.length;
  const R = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  const t = tally(plate);
  const won = t.veg === GOAL.veg && t.base === GOAL.base && t.main === GOAL.main;
  const wrong = ROUNDS[Math.min(round, ROUNDS.length - 1)].start.length - Math.min(tally(R.start).veg, GOAL.veg) - Math.min(tally(R.start).base, GOAL.base) - Math.min(tally(R.start).main, GOAL.main);
  const earned = taps <= wrong + 1 ? 3 : taps <= wrong * 2 + 2 ? 2 : 1;

  const tap = (i: number) => {
    if (won) return;
    setPlate(plate.map((p, n) => (n === i ? CYCLE[p] : p)));
    setTaps(taps + 1);
    setLast(i);
  };
  const next = () => {
    const s = [...stars, earned];
    setStars(s);
    const n = round + 1;
    setRound(n);
    setTaps(0);
    setLast(null);
    if (n < ROUNDS.length) setPlate(ROUNDS[n].start);
  };
  const restart = () => {
    setRound(0);
    setPlate(ROUNDS[0].start);
    setTaps(0);
    setStars([]);
    setLast(null);
  };

  if (done) {
    const total = stars.reduce((a, b) => a + b, 0);
    return (
      <View style={{ flex: 1, backgroundColor: C.mint, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        <Confetti points={[[8, 120, 20], [86, 140, -30], [18, 360, 50], [82, 380, 10], [28, 90, -60], [72, 90, 35]]} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <PopIn from={0.3}>
            <Mado mood="happy" width={150} />
          </PopIn>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <PopIn key={i} delay={300 + i * 90}>
                <Icon name="sparkle" size={26} color={i < total ? C.leaf : '#BFDCCB'} fill={i < total ? C.leaf : 'none'} />
              </PopIn>
            ))}
          </View>
          <T w="bold" size={32} center style={{ lineHeight: 38 }}>
            Three full plates!
          </T>
          <T size={S.body} center color={C.deep}>
            Every plate stayed full. Half vegetables, a quarter rice or roti, a quarter curry, dal, meat or fish. Same food, right amounts.
          </T>
        </View>
        <View style={{ gap: 10, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <BigButton label="Play again" icon="sparkle" kind="line" onPress={restart} />
          <BigButton label="Done" onPress={onClose} />
        </View>
      </View>
    );
  }

  const row = (part: Part) => {
    const ok = t[part] === GOAL[part];
    return (
      <View key={part} style={[card, { flex: 1, padding: 8, alignItems: 'center', gap: 2, borderWidth: 2, borderColor: ok ? C.leaf : 'transparent' }]}>
        <FoodDot kind={R.dots[part]} size={30} />
        <T w="bold" size={12} color={C.deep} numberOfLines={1}>
          {R.names[part]}
        </T>
        <Beat on={ok}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <T w="bold" size={S.body} color={ok ? C.leaf : C.ink}>
              {t[part]}
            </T>
            <T w="medium" size={12} color={C.muted}>
              / {GOAL[part]}
            </T>
            {ok ? <Icon name="check" size={14} color={C.leaf} /> : null}
          </View>
        </Beat>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 110, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RoundIcon name="close" onPress={onClose} label="Close" bg={C.mint} />
          <View style={{ flex: 1 }}>
            <T w="bold" size={S.small} color={C.muted}>
              Fix the plate · {round + 1} of {ROUNDS.length}
            </T>
            <T w="bold" size={S.title}>
              {R.title}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {stars.map((s, i) => (
              <T key={i} w="bold" size={S.small} color={C.leaf}>
                {'★'.repeat(s)}
              </T>
            ))}
          </View>
        </View>

        <FadeUp k={round}>
          <T size={S.body} color={C.deep}>
            {won ? 'Balanced, and still a full plate!' : 'Tap a slice to swap it. Make half the plate vegetables.'}
          </T>
        </FadeUp>

        <View style={{ alignItems: 'center' }}>
          <PopIn k={round} from={0.7}>
            <View style={{ width: SIZE, height: SIZE }}>
              <Svg width={SIZE} height={SIZE}>
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 4} fill={C.steel} />
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE * 0.45} fill={C.white} />
                <G>
                  {plate.map((p, i) => (
                    <Path key={i} d={wedge(i)} fill={R.fill[p]} stroke={C.white} strokeWidth={3} onPress={() => tap(i)} />
                  ))}
                </G>
              </Svg>
              {/* A small picture in each slice, popping when it changes. */}
              {plate.map((p, i) => {
                const a = ((i + 0.5) / SLICES) * Math.PI * 2;
                const x = SIZE / 2 + SIZE * 0.27 * Math.sin(a);
                const y = SIZE / 2 - SIZE * 0.27 * Math.cos(a);
                return (
                  <Pressable key={i} onPress={() => tap(i)} accessibilityRole="button" accessibilityLabel={`Slice ${i + 1}: ${R.names[p]}. Tap to swap`} style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <PopIn k={`${round}-${p}-${last === i ? taps : 0}`} from={last === i ? 0.4 : 1}>
                      <FoodDot kind={R.dots[p]} size={30} />
                    </PopIn>
                  </Pressable>
                );
              })}
              <View style={{ position: 'absolute', right: -24, bottom: -18 }} pointerEvents="none">
                <Mado mood={won ? 'happy' : 'hello'} width={88} flip />
              </View>
            </View>
          </PopIn>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {row('veg')}
          {row('base')}
          {row('main')}
        </View>
        <T w="medium" size={S.small} color={C.muted} center>
          Taps: {taps}
        </T>
        {won ? <Confetti key={round} points={[[10, 80, 20], [86, 100, -30], [20, 260, 50], [80, 300, 10], [50, 40, 15]]} /> : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
        {won ? (
          <PopIn>
            <BigButton label={`${'★'.repeat(earned)}  ${round + 1 < ROUNDS.length ? 'Next plate' : 'See how you did'}`} onPress={next} />
          </PopIn>
        ) : (
          <View style={{ height: 62, borderRadius: 26, borderWidth: 1.5, borderColor: K.line2, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={S.body} color={C.muted}>
              {t.veg < GOAL.veg ? `${GOAL.veg - t.veg} more veg to go` : 'Almost: check rice and curry'}
            </T>
          </View>
        )}
      </View>
    </View>
  );
}
