import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../theme';
import { Btn, Puti, Row, T } from '../ui';

const SIZE = 280;
const PLATE = 6; // a full dinner plate holds about six handfuls
const START = 4; // the usual plate: four of the six are rice
const RICE = '#F2EAD3';
const DAL = C.lightGreen;
const SABZI = C.leaf;

function wedge(c: number, r: number, from: number, to: number, fill: string, key: string) {
  if (to - from <= 0.001) return null;
  if (to - from >= Math.PI * 2 - 0.001) return <Circle key={key} cx={c} cy={c} r={r} fill={fill} />;
  const x1 = c + r * Math.sin(from);
  const y1 = c - r * Math.cos(from);
  const x2 = c + r * Math.sin(to);
  const y2 = c - r * Math.cos(to);
  return <Path key={key} d={`M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`} fill={fill} />;
}

function count(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  const text = `${whole || (half ? '' : '0')}${half ? '½' : ''}`;
  return `${text} ${n === 1 ? 'handful' : 'handfuls'}`;
}

/**
 * One idea, taught by touch: drag the edge of the rice. The plate stays full the whole time,
 * so the person feels that less rice does not mean less food.
 */
export default function Teach({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [rice, setRice] = useState(START);
  const [moved, setMoved] = useState(false);
  const riceRef = useRef(rice);
  riceRef.current = rice;

  const c = SIZE / 2;
  const r = SIZE * 0.4;
  const full = Math.PI * 2;
  const riceEnd = (rice / PLATE) * full;
  const rest = PLATE - rice;
  const dalEnd = riceEnd + (full - riceEnd) / 2;
  const handle = { x: c + r * Math.sin(riceEnd), y: c - r * Math.cos(riceEnd) };

  // Any touch on the plate moves the rice edge to where the finger is, in half handfuls.
  function drag(x: number, y: number) {
    let angle = Math.atan2(x - c, c - y);
    if (angle < 0) angle += full;
    const want = Math.round((angle / full) * PLATE * 2) / 2;
    const next = Math.min(5, Math.max(1, want));
    // Ignore the jump across the top of the plate.
    if (Math.abs(next - riceRef.current) > 2) return;
    if (next !== riceRef.current) {
      setRice(next);
      setMoved(true);
    }
  }

  const done = rice <= 2;
  const line = !moved
    ? 'This is a usual dinner plate. Most of it is rice.'
    : rice > START
      ? 'More rice, and the dal and sabzi get squeezed out.'
      : rice === START
        ? 'Back where we started.'
        : done
          ? `Same plate, same food, still full. ${count(START - rice)} of rice became dal and sabzi.`
          : 'Keep going. Watch what the rice turns into.';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, gap: 14 }}>
      <View style={{ gap: 4 }}>
        <T w="bold" size={28}>
          Drag the rice
        </T>
        <T color={C.muted}>Put your finger on the white dot and pull it around the plate.</T>
      </View>

      <View style={{ alignItems: 'center' }}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={c} cy={c} r={c} fill={C.steel} />
            <Circle cx={c} cy={c} r={c * 0.88} fill={C.white} stroke="#CCD4CF" strokeWidth={1} />
            {wedge(c, r, 0, riceEnd, RICE, 'rice')}
            {wedge(c, r, riceEnd, dalEnd, DAL, 'dal')}
            {wedge(c, r, dalEnd, full, SABZI, 'sabzi')}
            <Circle cx={handle.x} cy={handle.y} r={18} fill={C.white} stroke={C.deep} strokeWidth={4} />
          </Svg>
          <View
            testID="teach-plate"
            accessibilityLabel={`Plate with ${count(rice)} of rice. Drag to change.`}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(e) => drag(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            onResponderMove={(e) => drag(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, borderRadius: c, ...({ touchAction: 'none', cursor: 'grab' } as object) }}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {[
          { name: 'Rice', color: RICE, amount: rice, was: START },
          { name: 'Dal', color: DAL, amount: rest / 2, was: (PLATE - START) / 2 },
          { name: 'Sabzi', color: SABZI, amount: rest / 2, was: (PLATE - START) / 2 },
        ].map((row) => (
          <Row key={row.name} gap={10}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: row.color, borderWidth: 1, borderColor: C.line }} />
            <T w="semibold" style={{ width: 58 }}>
              {row.name}
            </T>
            <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: C.soft, overflow: 'hidden' }}>
              <View style={{ width: `${(row.amount / PLATE) * 100}%`, height: 14, borderRadius: 7, backgroundColor: row.color === RICE ? '#E3D7B4' : row.color }} />
            </View>
            <T size={14} color={C.muted} style={{ width: 96, textAlign: 'right' }}>
              {count(row.amount)}
            </T>
          </Row>
        ))}
      </View>

      <View style={{ backgroundColor: done ? C.mint : C.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Puti mood={done ? 'happy' : 'hello'} width={56} />
        <T style={{ flex: 1 }} w={done ? 'semibold' : 'regular'} color={done ? C.deep : C.ink} size={15}>
          {line}
        </T>
      </View>

      {done ? (
        <T color={C.muted} size={14}>
          That is all Amader asks. Same food, right amount, with family. One tap after each meal keeps track of the rice, and the family cheers the rest.
        </T>
      ) : null}

      <View style={{ flex: 1 }} />
      <Btn label={done ? 'Got it' : 'Skip'} kind={done ? 'primary' : 'ghost'} onPress={onClose} />
      <T center color={C.muted} size={12}>
        A picture of the idea, not medical advice.
      </T>
    </ScrollView>
  );
}
