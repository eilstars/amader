import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { FoodDot, FoodKind, Icon, K, S, card } from '../design';
import { COMMON, DishKind, KINDS, KIND_ORDER, PlateItem, amountText, kindOf } from '../dishes';
import { C, F } from '../theme';
import { T } from '../ui';

/** The little food picture for a dish. */
export function dotFor(item: Pick<PlateItem, 'name' | 'kind'>): FoodKind {
  const n = item.name.toLowerCase();
  if (item.kind === 'base') return /roti|chapat|naan|paratha|porota|puri|luchi|tortilla/.test(n) ? 'roti' : /bread|toast|bun/.test(n) ? 'bread' : 'rice';
  if (item.kind === 'main') return /egg|dim\b|anda|omelet/.test(n) ? 'egg' : /dal|daal|dahl|lentil|sambar|chana|chole|rajma/.test(n) ? 'dal' : 'curry';
  if (item.kind === 'side') return /raita|yog|dahi|doi/.test(n) ? 'dairy' : 'veg';
  if (item.kind === 'drink') return 'dairy';
  return 'fruit';
}

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 4];
const step = (n: number, dir: 1 | -1) => {
  const i = STEPS.findIndex((s) => s >= n);
  const at = i < 0 ? STEPS.length - 1 : i;
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, at + dir))];
};

/** One dish: its picture, its name, what kind it is (tap to change), and how much, in its own measure. */
function DishRow({ item, onChange, onRemove }: { item: PlateItem; onChange: (i: PlateItem) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const round = (name: 'minus' | 'plus', label: string, dir: 1 | -1) => (
    <Pressable
      onPress={() => onChange({ ...item, amount: step(item.amount, dir) })}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${item.name}`}
      hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={name} size={16} />
    </Pressable>
  );
  return (
    <View style={[card, { padding: 10, gap: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <FoodDot kind={dotFor(item)} size={34} />
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`${item.name}, ${KINDS[item.kind].label}. Change kind`} style={{ flex: 1 }}>
          <T w="bold" size={S.body} style={{ lineHeight: 20 }} numberOfLines={1}>
            {item.name}
          </T>
          <T w="medium" size={12} color={C.muted}>
            {amountText(item)}
          </T>
        </Pressable>
        {round('minus', 'Less', -1)}
        {round('plus', 'More', 1)}
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} hitSlop={8} style={{ width: 28, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={C.muted} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ gap: 6 }}>
          <T w="bold" size={12} color={C.muted}>
            This is...
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {KIND_ORDER.map((k) => (
              <Pressable
                key={k}
                onPress={() => {
                  onChange({ ...item, kind: k });
                  setOpen(false);
                }}
                accessibilityRole="button"
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: item.kind === k ? C.leaf : C.mint }}
              >
                <T w="bold" size={13} color={item.kind === k ? C.white : C.deep}>
                  {KINDS[k].label}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The plate as a list of dishes. Type a dish or tap one the family often eats.
 * Each dish is counted in its own measure, so nobody has to think in nutrients.
 */
export function DishList({ items, onChange, recent = [] }: { items: PlateItem[]; onChange: (items: PlateItem[]) => void; recent?: string[] }) {
  const [text, setText] = useState('');
  const here = new Set(items.map((i) => i.name.toLowerCase()));
  const picks = [...new Set([...recent, ...COMMON])].filter((n) => !here.has(n.toLowerCase())).slice(0, 12);
  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || items.length >= 12) return;
    const nice = name.charAt(0).toUpperCase() + name.slice(1);
    const kind: DishKind = kindOf(nice);
    onChange([...items, { name: nice.slice(0, 40), kind, amount: kind === 'base' ? 2 : 1 }]);
    setText('');
  };
  return (
    <View style={{ gap: 8 }}>
      {items.map((it, i) => (
        <DishRow key={`${it.name}-${i}`} item={it} onChange={(next) => onChange(items.map((x, n) => (n === i ? next : x)))} onRemove={() => onChange(items.filter((_, n) => n !== i))} />
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => add(text)}
          placeholder={items.length ? 'Add another dish' : 'Type a dish, like masoor dal'}
          placeholderTextColor="#8A988F"
          maxLength={40}
          returnKeyType="done"
          accessibilityLabel="Add a dish"
          style={{ flex: 1, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 17, color: C.ink }}
        />
        <Pressable onPress={() => add(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel="Add dish" style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: text.trim() ? C.leaf : C.steel, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={22} color={C.white} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
        {picks.map((n) => (
          <Pressable key={n} onPress={() => add(n)} accessibilityRole="button" accessibilityLabel={`Add ${n}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, height: 38, borderRadius: 19, backgroundColor: C.white, borderWidth: 1.5, borderColor: K.line2 }}>
            <FoodDot kind={dotFor({ name: n, kind: kindOf(n) })} size={24} />
            <T w="bold" size={S.small} color={C.deep}>
              {n}
            </T>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** A gentle, plain-words hint about what would balance the plate. Never about what to cut. */
export function balanceHint(items: PlateItem[], p: { grains: number; protein: number; veg: number }): string | null {
  if (!items.length) return null;
  if (p.veg >= Math.max(1, p.grains) && p.protein > 0) return null;
  if (p.protein === 0) return 'A bowl of dal, egg, meat or fish would balance it.';
  return 'A handful of vegetables or salad would balance it.';
}
