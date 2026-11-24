import React from 'react';
import { Pressable, View } from 'react-native';
import { S } from '../design';
import { C } from '../theme';
import { T } from '../ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRESETS: [string, number[]][] = [
  ['Every day', [0, 1, 2, 3, 4, 5, 6]],
  ['Weekends', [5, 6]],
  ['Not usually', []],
];

/**
 * Which days you're home together, any mix: every day, weekends from college, Fridays at Nani's.
 * Tap the days, or a shortcut. On those days, one photo can cover a meal you eat together.
 */
export function HomeDays({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DAYS.map((d, i) => {
          const on = value.includes(i);
          return (
            <Pressable
              key={d}
              onPress={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={d}
              style={{ flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.leaf : C.white, borderWidth: on ? 0 : 1.5, borderColor: '#D8E2DC' }}
            >
              <T w="bold" size={13} color={on ? C.white : C.deep}>
                {d}
              </T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map(([label, days]) => {
          const on = same(value, days);
          return (
            <Pressable key={label} onPress={() => onChange(days)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? C.mint : 'transparent', borderWidth: 1.5, borderColor: on ? C.leaf : '#D8E2DC' }}>
              <T w="bold" size={S.small - 1} color={C.deep}>
                {label}
              </T>
            </Pressable>
          );
        })}
      </View>
      <T size={12} color={C.muted}>
        {value.length === 0 ? 'You can still tag each other on any meal.' : value.length === 7 ? 'On every day, meals you eat together can share one photo.' : `On ${value.map((i) => DAYS[i]).join(', ')}, meals you eat together can share one photo.`}
      </T>
    </View>
  );
}
