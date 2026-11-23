import React, { useState } from 'react';
import { Beat, FadeUp } from '../motion';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Face, FoodPlate, Icon, S, card } from '../design';
import { dishLine } from '../dishes';
import { useStore } from '../store';
import { C } from '../theme';
import { Meal } from '../types';
import { T } from '../ui';
import { dateText, sameDay, slotName, startOfDay, timeText } from '../words';

/** The family feed: every plate, newest first, as big friendly cards. Tap one to heart or reply. */
export function Feed({ onMeal, onPerson }: { onMeal: (id: string) => void; onPerson: (id: string) => void }) {
  const store = useStore();
  const { width } = useWindowDimensions();
  const [shown, setShown] = useState(12);
  const meals = store.meals.slice(0, shown);
  const w = Math.min(width, 480) - 40;
  if (!meals.length) {
    return (
      <View style={[card, { alignItems: 'center', gap: 6, padding: 24 }]}>
        <Icon name="camera" size={32} color={C.leaf} />
        <T w="bold" size={S.body}>
          No plates yet
        </T>
        <T size={S.small} color={C.muted} center>
          Plates the family shares show up here.
        </T>
      </View>
    );
  }
  let lastDay = '';
  return (
    <View style={{ gap: 12 }}>
      {meals.map((m, idx) => {
        const who = store.member(m.memberId);
        const day = new Date(m.date).toDateString();
        const header = day !== lastDay;
        lastDay = day;
        const comments = store.cheers.filter((c) => c.mealId === m.id).length;
        const mine = m.hearts.includes(store.me?.id ?? '');
        return (
          <FadeUp key={m.id} delay={Math.min(idx, 6) * 70} style={{ gap: 8 }}>
            {header ? (
              <T w="bold" size={S.small} color={C.muted} style={{ marginTop: 4 }}>
                {sameDay(new Date(m.date), new Date()) ? 'Today' : dateText(new Date(m.date))}
              </T>
            ) : null}
            <Pressable onPress={() => onMeal(m.id)} accessibilityRole="button" accessibilityLabel={`${who?.name ?? 'Someone'}'s ${slotName(m.slot).toLowerCase()}`} style={[card, { padding: 12, gap: 10 }]}>
              <Pressable onPress={() => who && onPerson(who.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {who ? <Face member={who} size={32} ring={C.white} /> : null}
                <View style={{ flex: 1 }}>
                  <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                    {who?.id === store.me?.id ? 'You' : who?.name ?? 'Someone'}
                  </T>
                  <T w="medium" size={12} color={C.muted}>
                    {m.slot === 'fasting' ? 'Fasting' : slotName(m.slot)} · {timeText(m.date)}
                    {m.withIds?.length ? ` · with ${m.withIds.map((id) => (id === store.me?.id ? 'you' : store.member(id)?.name)).filter(Boolean).join(', ')}` : ''}
                  </T>
                </View>
              </Pressable>
              <View style={{ alignItems: 'center', backgroundColor: C.mint, borderRadius: 20, paddingVertical: 14 }}>
                <FoodPlate meal={m} size={Math.min(220, w - 60)} />
              </View>
              {m.slot !== 'fasting' ? (
                <T w="bold" size={S.body}>
                  {(m.items?.length ? dishLine(m.items) : m.dish) || `${slotName(m.slot)} plate`}
                </T>
              ) : null}
              {m.note ? (
                <T size={S.small} color={C.deep}>
                  "{m.note}"
                </T>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable onPress={() => store.toggleHeart(m.id)} accessibilityRole="button" accessibilityLabel={mine ? 'Take back heart' : 'Send a heart'} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Beat on={mine}>
                    <Icon name="heart" size={22} color={C.heart} fill={mine ? C.heart : 'none'} />
                  </Beat>
                  {m.hearts.length ? (
                    <T w="bold" size={S.small} color="#8A2942">
                      {m.hearts.length}
                    </T>
                  ) : null}
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="chat" size={20} color={C.muted} />
                  <T w="bold" size={S.small} color={C.muted}>
                    {comments || 'Reply'}
                  </T>
                </View>
              </View>
            </Pressable>
          </FadeUp>
        );
      })}
      {store.meals.length > shown ? (
        <Pressable onPress={() => setShown(shown + 12)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 10 }}>
          <T w="bold" size={S.small} color={C.leaf}>
            Show more plates
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The meal calendar: a month at a time, a small plate on each day someone shared.
 * Pick a person to see just their month, the way a doctor would want it. Tap a day for its plates.
 */
export function MealCalendar({ onMeal }: { onMeal: (id: string) => void }) {
  const store = useStore();
  const { width } = useWindowDimensions();
  const family = store.family;
  const cared = family?.members.find((m) => m.role === 'parent');
  const [who, setWho] = useState<string | null>(cared?.id ?? null);
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<Date>(startOfDay(new Date()));
  if (!family) return null;
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const lead = (month.getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const meals = store.meals.filter((m) => !who || m.memberId === who);
  const on = (d: Date): Meal[] => meals.filter((m) => sameDay(new Date(m.date), d));
  const cellW = Math.floor((Math.min(width, 480) - 40 - 24) / 7);
  const dayMeals = on(picked).sort((a, b) => (a.date < b.date ? -1 : 1));
  const shared = cells.filter((d) => d && on(d).length).length;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[{ id: null as string | null, name: 'Everyone' }, ...family.members.map((m) => ({ id: m.id as string | null, name: m.id === store.me?.id ? 'You' : m.name }))].map((p) => (
          <Pressable key={p.id ?? 'all'} onPress={() => setWho(p.id)} accessibilityRole="button" accessibilityState={{ selected: who === p.id }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: who === p.id ? C.leaf : C.white }}>
            <T w="bold" size={S.small} color={who === p.id ? C.white : C.deep}>
              {p.name}
            </T>
          </Pressable>
        ))}
      </View>

      <View style={[card, { padding: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => setOffset(offset + 1)} accessibilityRole="button" accessibilityLabel="Last month" hitSlop={8} style={{ padding: 6 }}>
            <Icon name="back" size={20} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T w="bold" size={S.body}>
              {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </T>
            <T w="medium" size={12} color={C.muted}>
              {shared} {shared === 1 ? 'day' : 'days'} with plates
            </T>
          </View>
          <Pressable onPress={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={{ padding: 6, opacity: offset === 0 ? 0.3 : 1 }}>
            <Icon name="next" size={20} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={{ width: cellW, alignItems: 'center' }}>
              <T w="bold" size={12} color={C.muted}>
                {d}
              </T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={{ width: cellW, height: cellW + 6 }} />;
            const list = on(d);
            const future = d > now;
            const sel = sameDay(d, picked);
            const today = sameDay(d, now);
            return (
              <Pressable key={i} onPress={() => setPicked(d)} disabled={future} accessibilityRole="button" accessibilityLabel={`${dateText(d)}, ${list.length} plates`} style={{ width: cellW, height: cellW + 6, alignItems: 'center', paddingTop: 2 }}>
                <View style={{ width: cellW - 4, height: cellW + 2, borderRadius: 12, alignItems: 'center', backgroundColor: sel ? C.mint : 'transparent', borderWidth: today ? 1.5 : 0, borderColor: C.leaf }}>
                  <T w="bold" size={11} color={future ? '#C5CEC8' : C.deep}>
                    {d.getDate()}
                  </T>
                  {list.length ? <FoodPlate meal={list[list.length - 1]} size={Math.max(18, cellW - 16)} /> : null}
                  {list.length > 1 ? (
                    <View style={{ position: 'absolute', right: 1, bottom: 1, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <T w="bold" size={10} color={C.white} style={{ lineHeight: 12 }}>
                        {list.length}
                      </T>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <T w="bold" size={S.body}>
        {sameDay(picked, now) ? 'Today' : dateText(picked)}
      </T>
      {dayMeals.length ? (
        dayMeals.map((m) => {
          const p = store.member(m.memberId);
          return (
            <Pressable key={m.id} onPress={() => onMeal(m.id)} accessibilityRole="button" style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }]}>
              <FoodPlate meal={m} size={56} />
              <View style={{ flex: 1 }}>
                <T w="bold" size={S.body} style={{ lineHeight: 20 }} numberOfLines={2}>
                  {m.slot === 'fasting' ? 'Fasting' : (m.items?.length ? dishLine(m.items) : m.dish) || `${slotName(m.slot)} plate`}
                </T>
                <T w="medium" size={12} color={C.muted}>
                  {p?.id === store.me?.id ? 'You' : p?.name} · {slotName(m.slot).toLowerCase()}, {timeText(m.date)}
                </T>
              </View>
              <Icon name="next" size={18} color={C.muted} />
            </Pressable>
          );
        })
      ) : (
        <T size={S.small} color={C.muted}>
          No plates this day.
        </T>
      )}
    </View>
  );
}
