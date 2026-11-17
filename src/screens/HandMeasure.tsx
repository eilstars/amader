import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Hand } from '../hand';
import { C } from '../theme';
import { Photo } from '../types';
import { Btn, Row, T } from '../ui';

// Thumb to little finger, as pairs of joints to join with a line.
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function halves(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  return `${whole || (half ? '' : '0')}${half ? '½' : ''}`;
}

/**
 * The person's own hand is the ruler. The app found the hand in the photo, so it knows how big
 * one fist is in this picture. The person slides a ring over the food and the app reads the ring in fists.
 */
export default function HandMeasure({ photo, hand, food, onUse, onBack }: { photo: Photo; hand: Hand; food: string; onUse: (handfuls: number) => void; onBack: () => void }) {
  const [width, setWidth] = useState(0);
  const height = width / hand.aspect;
  const [units, setUnits] = useState(1);
  // Start the ring on the far side of the photo from the hand, where the plate usually is.
  const palm = hand.points[9];
  const [at, setAt] = useState({ x: palm.x < 0.5 ? 0.68 : 0.32, y: 0.5 });
  const from = useRef(at);
  const atRef = useRef(at);
  atRef.current = at;
  const box = useRef({ width: 1, height: 1 });
  box.current = { width: width || 1, height: height || 1 };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          from.current = atRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const x = Math.min(1, Math.max(0, from.current.x + g.dx / box.current.width));
          const y = Math.min(1, Math.max(0, from.current.y + g.dy / box.current.height));
          setAt({ x, y });
        },
      }),
    [],
  );

  const fistPx = hand.fist * width;
  // A ring that covers twice the food is twice the area, so its width grows with the square root.
  const ring = fistPx * Math.sqrt(units);
  const saved = Math.min(4, Math.max(1, Math.round(units)));

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <T w="bold" size={24} center>
          Slide the ring over the {food.toLowerCase()}
        </T>
        <T color={C.muted} size={14} center>
          Your hand is the ruler. The ring starts at the size of your fist.
        </T>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: C.soft }}>
        {width > 0 ? (
          <View style={{ width, height }}>
            <Image source={{ uri: photo.uri }} style={{ width, height }} />
            {BONES.map(([a, b], i) => {
              const p = hand.points[a];
              const q = hand.points[b];
              const dx = (q.x - p.x) * width;
              const dy = (q.y - p.y) * height;
              const length = Math.hypot(dx, dy);
              return (
                <View
                  key={`b${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: ((p.x + q.x) / 2) * width - length / 2,
                    top: ((p.y + q.y) / 2) * height - 1.5,
                    width: length,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  }}
                />
              );
            })}
            {hand.points.map((p, i) => (
              <View key={`p${i}`} pointerEvents="none" style={{ position: 'absolute', left: p.x * width - 5, top: p.y * height - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: C.leaf, borderWidth: 2, borderColor: C.white }} />
            ))}
            <View
              {...pan.panHandlers}
              accessibilityLabel={`Measuring ring, about ${halves(units)} handfuls`}
              style={{
                position: 'absolute',
                left: at.x * width - ring / 2,
                top: at.y * height - ring / 2,
                width: ring,
                height: ring,
                borderRadius: ring / 2,
                borderWidth: 4,
                borderColor: C.white,
                backgroundColor: 'rgba(31,122,90,0.28)',
                alignItems: 'center',
                justifyContent: 'center',
                // @ts-expect-error web only: stop the page scrolling while the ring is dragged
                touchAction: 'none',
                cursor: 'grab',
              }}
            >
              <Ionicons name="move" size={20} color={C.white} />
            </View>
          </View>
        ) : null}
      </View>

      <Row style={{ justifyContent: 'center' }} gap={18}>
        <Pressable onPress={() => setUnits((u) => Math.max(0.5, u - 0.5))} accessibilityRole="button" accessibilityLabel="Smaller ring" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={26} color={C.ink} />
        </Pressable>
        <View style={{ alignItems: 'center', minWidth: 150 }}>
          <T w="bold" size={20}>
            About {halves(units)} {units === 1 ? 'fist' : 'fists'}
          </T>
          <T color={C.muted} size={13}>
            of {food.toLowerCase()}, by your own hand
          </T>
        </View>
        <Pressable onPress={() => setUnits((u) => Math.min(4, u + 0.5))} accessibilityRole="button" accessibilityLabel="Bigger ring" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={26} color={C.ink} />
        </Pressable>
      </Row>

      <Btn label={`Use ${saved === 4 ? '4+' : saved} ${saved === 1 ? 'handful' : 'handfuls'}`} onPress={() => onUse(saved)} />
      <Btn kind="line" label="Tap a number instead" onPress={onBack} />
    </View>
  );
}
