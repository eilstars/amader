import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { FoodDot, FoodKind, Icon, K, S, card } from '../design';
import { COMMON, DishKind, KINDS, KIND_ORDER, PlateItem, amountText, firstAmount, kindOf } from '../dishes';
import { knowsDish, searchFoods } from '../foods';
import { useStore } from '../store';
import { C, F } from '../theme';
import { T } from '../ui';

/** The little food picture for a dish. */
export function dotFor(item: Pick<PlateItem, 'name' | 'kind'>): FoodKind {
  const n = item.name.toLowerCase();
  if (item.kind === 'base') return /roti|chapat|naan|paratha|porota|puri|luchi|tortilla/.test(n) ? 'roti' : /bread|toast|bun/.test(n) ? 'bread' : 'rice';
  if (/cheese|paneer/.test(n)) return 'dairy';
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
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [teach, setTeach] = useState(false);
  const known = knowsDish(item);
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
      {!known && !teach ? (
        <Pressable onPress={() => setTeach(true)} accessibilityRole="button" accessibilityLabel={`Tell Mado what's in ${item.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.mint }}>
          <Icon name="sparkle" size={14} color={C.leaf} />
          <T w="bold" size={13} color={C.deep}>
            New to Mado. What's in it?
          </T>
        </Pressable>
      ) : null}
      {teach ? (
        <TeachDish
          name={item.name}
          onDone={(parts) => {
            setTeach(false);
            if (parts) store.addDish(item.name, parts);
          }}
        />
      ) : null}
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

const SHARES: [number, string][] = [
  [3, 'A lot'],
  [2, 'Some'],
  [1, 'A little'],
];
const STARTERS = ['Rice', 'Roti', 'Dal', 'Chicken', 'Fish', 'Egg', 'Paneer', 'Chana', 'Mixed vegetables', 'Aloo', 'Yoghurt'];

/**
 * Teaching Mado a dish it doesn't know: tap the main things in it and roughly how much.
 * Saved for the whole family, so "Nani's khichuri" is known the next time anyone logs it.
 */
function TeachDish({ name, onDone }: { name: string; onDone: (parts: { food: string; share: number }[] | null) => void }) {
  const [parts, setParts] = useState<{ food: string; share: number }[]>([]);
  const [q, setQ] = useState('');
  const have = new Set(parts.map((p) => p.food.toLowerCase()));
  const found = q.trim().length >= 2 ? searchFoods(q, 5).filter((f) => !have.has(f.toLowerCase())) : [];
  const add = (food: string) => {
    if (parts.length >= 8 || have.has(food.toLowerCase())) return;
    setParts([...parts, { food, share: 2 }]);
    setQ('');
  };
  return (
    <View style={{ gap: 8, backgroundColor: C.rice, borderRadius: 16, padding: 10 }}>
      <T w="bold" size={S.body}>
        What's in {name}?
      </T>
      <T size={13} color={C.muted}>
        Tap the main things. Mado will remember it for the whole family.
      </T>
      {parts.map((p, i) => (
        <View key={p.food} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FoodDot kind={dotFor({ name: p.food, kind: kindOf(p.food) })} size={24} />
            <T w="bold" size={S.small} style={{ flex: 1 }} numberOfLines={1}>
              {p.food}
            </T>
            <Pressable onPress={() => setParts(parts.filter((_, n) => n !== i))} accessibilityRole="button" accessibilityLabel={`Take out ${p.food}`} hitSlop={8}>
              <Icon name="close" size={14} color={C.muted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SHARES.map(([share, label]) => (
              <Pressable
                key={share}
                onPress={() => setParts(parts.map((x, n) => (n === i ? { ...x, share } : x)))}
                accessibilityRole="button"
                accessibilityState={{ selected: p.share === share }}
                accessibilityLabel={`${label} ${p.food}`}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: p.share === share ? C.leaf : C.white, borderWidth: 1.5, borderColor: p.share === share ? C.leaf : K.line2 }}
              >
                <T w="bold" size={12} color={p.share === share ? C.white : C.deep}>
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search, like lentils or coconut milk"
        placeholderTextColor="#8A988F"
        maxLength={40}
        accessibilityLabel={`Search what's in ${name}`}
        style={{ height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.medium, fontSize: 16, color: C.ink }}
      />
      {found.map((f) => (
        <Pressable key={f} onPress={() => add(f)} accessibilityRole="button" accessibilityLabel={`Put ${f} in`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <Icon name="plus" size={16} color={C.leaf} />
          <T w="medium" size={S.small} numberOfLines={1} style={{ flex: 1 }}>
            {f}
          </T>
        </Pressable>
      ))}
      {!q.trim() ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {STARTERS.filter((f) => !have.has(f.toLowerCase())).map((f) => (
            <Pressable key={f} onPress={() => add(f)} accessibilityRole="button" accessibilityLabel={`Put ${f} in`} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: K.line2 }}>
              <T w="bold" size={12} color={C.deep}>
                {f}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <Pressable onPress={() => onDone(null)} accessibilityRole="button" style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center' }}>
          <T w="bold" size={S.small} color={C.muted}>
            Not now
          </T>
        </Pressable>
        <Pressable onPress={() => onDone(parts)} disabled={!parts.length} accessibilityRole="button" style={{ flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: parts.length ? C.leaf : C.steel }}>
          <T w="bold" size={S.small} color={C.white}>
            Save for the family
          </T>
        </Pressable>
      </View>
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
  const found = text.trim().length >= 2 ? searchFoods(text, 6) : [];
  const add = (raw: string, food?: string) => {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || items.length >= 12) return;
    const nice = (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, 40);
    const kind: DishKind = kindOf(nice);
    onChange([...items, { name: nice, kind, amount: firstAmount({ name: nice, kind }, items), ...(food ? { food } : {}) }]);
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
      {found.length ? (
        <View style={[card, { padding: 4 }]}>
          {found.map((n, i) => (
            <Pressable key={n} onPress={() => add(n, n)} accessibilityRole="button" accessibilityLabel={`Add ${n}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: '#EDF0EA' }}>
              <FoodDot kind={dotFor({ name: n, kind: kindOf(n) })} size={26} />
              <T w="medium" size={S.body} style={{ flex: 1 }} numberOfLines={1}>
                {n}
              </T>
              <Icon name="plus" size={18} color={C.leaf} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
        {picks.map((n) => (
          <Pressable key={n} onPress={() => add(n, n)} accessibilityRole="button" accessibilityLabel={`Add ${n}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, height: 38, borderRadius: 19, backgroundColor: C.white, borderWidth: 1.5, borderColor: K.line2 }}>
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

export { balanceHint } from '../guide';
