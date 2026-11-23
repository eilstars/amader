import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { isBalanced } from '../game';
import { BigButton, Chip, Face, FoodPlate, Icon, IconName, K, S, card } from '../design';
import { useStore } from '../store';
import { C, F } from '../theme';
import { T } from '../ui';
import { VoicePlayer } from '../voice';
import { daysBetween, slotName, timeText } from '../words';

const QUICK = ['Looks delicious', 'Proud of you'];

/** One hand count that can go up and down: a fist of rice, a palm of fish, a handful of veg. */
export function Stepper({ icon, value, unit, onChange }: { icon: IconName; value: number; unit: string; onChange: (n: number) => void }) {
  const round = (name: IconName, label: string, next: number) => (
    <Pressable onPress={() => onChange(Math.max(0, Math.min(4, next)))} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={16} />
    </Pressable>
  );
  return (
    <View style={[card, { flex: 1, padding: 10, alignItems: 'center', gap: 4 }]}>
      <Icon name={icon} size={28} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {round('minus', `Less ${unit}`, value - 1)}
        <T w="bold" size={24} style={{ minWidth: 20, textAlign: 'center' }}>
          {value}
        </T>
        {round('plus', `More ${unit}`, value + 1)}
      </View>
      <T w="medium" size={S.small} color={C.muted} center>
        {unit}
      </T>
    </View>
  );
}

/** A family plate, opened as a pop-up over the table: the plate, who and when, the talk, and a heart. */
export default function MealSheet({ mealId, onPerson, canComment = true }: { mealId: string; onPerson?: (id: string) => void; canComment?: boolean }) {
  const store = useStore();
  const meal = store.meals.find((m) => m.id === mealId);
  const meId = store.session?.meId;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [mine, setMine] = useState({ grains: meal?.handfuls ?? 1, protein: meal?.protein ?? 1, veg: meal?.veg ?? 1 });
  const [joinBusy, setJoinBusy] = useState(false);
  if (!meal) return null;

  const who = store.member(meal.memberId);
  const own = meal.memberId === meId;
  const hearted = meId ? meal.hearts.includes(meId) : false;
  const comments = store.cheers.filter((c) => c.mealId === meal.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const withNames = [...(meal.withIds ?? []).map((id) => (id === meId ? 'you' : store.member(id)?.name)).filter(Boolean), meal.withOthers].filter(Boolean) as string[];
  const fasting = meal.slot === 'fasting';
  const counts = fasting
    ? []
    : ([
        ['fist', meal.handfuls],
        ['palm', meal.protein],
        ['handful', meal.veg],
        ['apple', meal.fruit],
        ['cup', meal.dairy],
      ] as [IconName, number | null | undefined][]).filter(([, n]) => (n ?? 0) > 0);
  const canJoin =
    !!meId && !own && !fasting && !meal.sameAs && (meal.withIds ?? []).includes(meId) && daysBetween(new Date(meal.date), new Date()) <= 1 && !store.meals.some((m) => m.memberId === meId && m.sameAs === meal.id);

  async function send(text: string) {
    if (!text.trim()) return;
    setSending(true);
    setFailed(null);
    try {
      await store.comment(meal!.id, text);
      setDraft('');
    } catch {
      setFailed("That didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function join() {
    setJoinBusy(true);
    setFailed(null);
    try {
      await store.addMeal({
        slot: meal!.slot,
        photo: null,
        portions: { ...mine, fruit: 0, dairy: 0 },
        sameAs: meal!.id,
        grain: meal!.grain ?? undefined,
        withIds: [meal!.memberId, ...(meal!.withIds ?? []).filter((id) => id !== meId)],
        chosenBy: 'tap',
      });
    } catch {
      setFailed("That didn't save. Please try again.");
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <FoodPlate meal={meal} size={124} />
          <View style={{ flex: 1, gap: 4 }}>
            <Pressable onPress={() => who && onPerson?.(who.id)} disabled={!onPerson || !who} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole={onPerson ? 'button' : undefined}>
              {who ? <Face member={who} size={26} /> : null}
              <T w="medium" size={S.small} color={C.muted} style={{ flexShrink: 1 }}>
                {own ? 'You' : who?.name ?? 'Someone'} · {fasting ? 'fasting' : slotName(meal.slot).toLowerCase()}, {timeText(meal.date)}
              </T>
            </Pressable>
            <T w="bold" size={S.title} style={{ lineHeight: 26 }}>
              {fasting ? 'Fasting today' : meal.dish || `${slotName(meal.slot)} plate`}
            </T>
            {counts.length ? (
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {counts.map(([icon, n]) => (
                  <View key={icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Icon name={icon} size={18} color={C.leaf} />
                    <T w="bold" size={S.small} color={C.deep}>
                      {n}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {isBalanced(meal) ? <Chip text="Balanced plate" icon="check" bg={C.mint} /> : null}
              {meal.party ? <Chip text="Party plate" icon="sparkle" bg={C.mint} /> : null}
            </View>
          </View>
        </View>

        {withNames.length ? (
          <T w="medium" size={S.small} color={C.deep}>
            Ate with {withNames.join(', ')}
          </T>
        ) : null}
        {meal.note ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: C.lightGreen, paddingLeft: 12 }}>
            <T size={S.body}>"{meal.note}"</T>
          </View>
        ) : null}
        {meal.voice ? <VoicePlayer uri={meal.voice} label={`${who?.name ?? 'their'} voice note`} /> : null}

        {canJoin ? (
          <View style={{ backgroundColor: C.mint, borderRadius: 24, padding: 14, gap: 10 }}>
            <View>
              <T w="bold" size={S.body}>
                Same food. Your own hands.
              </T>
              <T w="medium" size={S.small} color={C.deep}>
                {who?.name}'s photo goes on your plate too. Just count yours.
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stepper icon="fist" value={mine.grains} unit={`fist ${(meal.grain ?? store.goalFood).toLowerCase()}`} onChange={(n) => setMine({ ...mine, grains: n })} />
              <Stepper icon="palm" value={mine.protein} unit="palm protein" onChange={(n) => setMine({ ...mine, protein: n })} />
              <Stepper icon="handful" value={mine.veg} unit="handful veg" onChange={(n) => setMine({ ...mine, veg: n })} />
            </View>
            <BigButton label={joinBusy ? 'Saving...' : 'I ate this too'} icon="check" disabled={joinBusy} onPress={join} />
          </View>
        ) : null}

        {comments.map((c) => {
          const from = store.member(c.fromId);
          return (
            <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              {from ? <Face member={from} size={28} /> : null}
              <View style={{ ...card, padding: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderBottomLeftRadius: 4, maxWidth: '80%' }}>
                <T size={S.body}>{c.text}</T>
              </View>
            </View>
          );
        })}

        {failed ? (
          <T size={S.small} color="#8A2942">
            {failed}
          </T>
        ) : null}

        {own ? (
          asking ? (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <T size={S.small} color={C.muted}>
                Remove for everyone?
              </T>
              <Pressable onPress={() => setAsking(false)} accessibilityRole="button" hitSlop={8}>
                <T w="bold" size={S.small} color={C.deep}>
                  Keep
                </T>
              </Pressable>
              <Pressable onPress={() => store.removeMeal(meal.id).catch(() => setFailed("Couldn't remove it."))} accessibilityRole="button" hitSlop={8}>
                <T w="bold" size={S.small} color="#8A2942">
                  Remove
                </T>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setAsking(true)} accessibilityRole="button" hitSlop={8}>
              <T size={S.small} color={C.muted}>
                Remove this plate
              </T>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={() => store.toggleHeart(meal.id)} accessibilityRole="button" accessibilityLabel={hearted ? 'Take back heart' : 'Send a heart'} style={{ width: 56, height: 44, borderRadius: 22, backgroundColor: C.pinkSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name="heart" size={22} color={C.heart} fill={hearted ? C.heart : 'none'} />
            {meal.hearts.length ? (
              <T w="bold" size={S.small} color="#8A2942">
                {meal.hearts.length}
              </T>
            ) : null}
          </Pressable>
          {canComment && !own
            ? QUICK.map((q) => (
                <Pressable key={q} onPress={() => send(q)} disabled={sending} accessibilityRole="button" style={{ height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 14, justifyContent: 'center' }}>
                  <T w="medium" size={S.small}>
                    {q}
                  </T>
                </Pressable>
              ))
            : null}
        </ScrollView>
        {canComment ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={own ? 'Reply' : `Say something to ${who?.name ?? 'them'}`}
              placeholderTextColor="#8A988F"
              maxLength={200}
              accessibilityLabel="Comment"
              style={{ flex: 1, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 18, fontFamily: F.medium, fontSize: 17, color: C.ink }}
            />
            <Pressable onPress={() => send(draft)} disabled={sending || !draft.trim()} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: draft.trim() ? C.leaf : C.steel, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="send" size={22} color={C.white} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
