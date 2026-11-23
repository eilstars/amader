import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

/**
 * Small, friendly motion used across the app: things pop onto the table, Mado floats,
 * buttons squish under a thumb, confetti falls. Short and soft, never flashy, and it all
 * respects the phone's "reduce motion" setting.
 */
const native = Platform.OS !== 'web';

let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((on) => (reduce = !!on))
  .catch(() => undefined);

/** Pops in from a little smaller, with a soft bounce. Change `k` to pop again. */
export function PopIn({ children, delay = 0, k, style, from = 0.6 }: { children: React.ReactNode; delay?: number; k?: string | number; style?: StyleProp<ViewStyle>; from?: number }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    v.setValue(0);
    const a = Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 140, useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [k, delay, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] });
  const opacity = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Fades in while rising a few points. For cards and page content. */
export function FadeUp({ children, delay = 0, k, style, distance = 14 }: { children: React.ReactNode; delay?: number; k?: string | number; style?: StyleProp<ViewStyle>; distance?: number }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, delay, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [k, delay, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Drops in from above and lands with a bounce, like a plate set down on the table. */
export function DropIn({ children, delay = 0, style, height = 160 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; height?: number }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 60, useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [delay, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] });
  const opacity = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** A gentle float up and down, forever. Mado swims. */
export function Bob({ children, amp = 4, ms = 1800, tilt = 0, style }: { children: React.ReactNode; amp?: number; ms?: number; tilt?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    // Start each one at a slightly different moment so a screen of them doesn't move in lockstep.
    const t = setTimeout(() => loop.start(), Math.random() * 600);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [ms, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${-tilt}deg`, `${tilt}deg`] });
  return <Animated.View style={[style, { transform: [{ translateY }, { rotate }] }]}>{children}</Animated.View>;
}

/** Animates a number change on a style property, like Mado sliding along the river. */
export function useSlide(to: number, ms = 900) {
  const v = useRef(new Animated.Value(reduce ? to : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(to);
      return;
    }
    const a = Animated.timing(v, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [to, ms, v]);
  return v;
}

const APressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that squishes a little under the thumb and springs back. */
export function Squish({ style, children, onPressIn, onPressOut, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) => Animated.spring(v, { toValue: n, friction: 5, tension: 300, useNativeDriver: native }).start();
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) to(0.95);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </APressable>
  );
}

/** A quick heartbeat when something turns on: a heart, a tick. */
export function Beat({ on, children, style }: { on: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!on || reduce) return;
    Animated.sequence([
      Animated.timing(v, { toValue: 1.35, duration: 120, useNativeDriver: native }),
      Animated.spring(v, { toValue: 1, friction: 3, tension: 200, useNativeDriver: native }),
    ]).start();
  }, [on, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** One piece of confetti that falls into place and turns as it lands. */
export function FallingBit({ x, y, r, i, color }: { x: number; y: number; r: number; i: number; color: string }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(v, { toValue: 1, delay: i * 70, duration: 900 + (i % 3) * 200, easing: Easing.out(Easing.quad), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [i, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-y - 60, 0] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${r - 220}deg`, `${r}deg`] });
  const opacity = v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] });
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: `${x}%`, top: y, width: 14, height: 6, borderRadius: 3, backgroundColor: color, opacity, transform: [{ translateY }, { rotate }] }} />;
}
