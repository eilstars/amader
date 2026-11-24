import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CostumeArt, wornCostume } from '../costumes';
import { BigButton, Face, FoodPlate, Icon, K, Mado, River, RoundIcon, RoundTable, S, Seat, card } from '../design';
import { MedSlot } from '../reminders';
import { medKey, useStore } from '../store';
import { C } from '../theme';
import { Member } from '../types';
import { T } from '../ui';
import { dayName, fastingToday, greeting, hourText, sameDay } from '../words';
import { todaysPlate } from './Home';

/** Days of sharing before comments, then the family quest, show up in the simple view. */
export const UNLOCK = { comments: 4, quest: 7 };

const MED_WORD: Record<MedSlot, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner' };

/** The medicine compartment that's due next today, or null when all are done. */
export function nextMed(prefs: ReturnType<typeof useStore>['prefs'], now = new Date()): MedSlot | null {
  if (!prefs.meds.on) return null;
  const left = (['breakfast', 'lunch', 'dinner'] as MedSlot[]).filter((s) => prefs.meds.slots.includes(s) && !prefs.meds.taken.includes(medKey(now, s)));
  if (!left.length) return null;
  const h = now.getHours();
  const due = left.filter((s) => (prefs.times[s] ?? 0) - 1 <= h);
  return due[due.length - 1] ?? left[0];
}

/**
 * Home for the person the family looks after. One screen, big type: did you eat, the table, one big button.
 * New things appear as the person settles in. A break and a fasting day change the top of the screen.
 */
export default function ParentHome({ onAdd, onMe, onMeal, onPerson, onQuest, onMeds }: { onAdd: () => void; onMe: () => void; onMeal: (id: string) => void; onPerson: (id: string) => void; onQuest: () => void; onMeds: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const { family, me, meals, cheers, prefs } = store;
  if (!family || !me) return null;

  const today = new Date();
  const mine = todaysPlate(meals, me.id);
  const fasting = fastingToday(prefs);
  const costume = wornCostume(family.costumes, prefs.wear);
  const note = cheers.find((c) => c.toId === me.id && !c.mealId && today.getTime() - new Date(c.date).getTime() < 4 * 86_400_000);
  const from = note ? store.member(note.fromId) : undefined;
  const med = nextMed(prefs);
  const questOpen = store.questLive && !!store.quest && store.daysShared >= UNLOCK.quest;
  const breakEnds = prefs.breakUntil ? new Date(prefs.breakUntil) : null;
  const w = Math.min(width, 480) - 40;

  const others = family.members.filter((m) => m.id !== me.id);
  const seat = (m: Member): Seat => {
    const meal = todaysPlate(meals, m.id);
    if (m.id === me.id) {
      if (meal) return { member: m, meal, label: 'You', glow: true, onPress: () => onMeal(meal.id) };
      return { member: m, label: 'You', empty: store.onBreak ? <T w="bold" size={S.small} color={C.muted}>resting</T> : <Icon name={fasting ? 'moon' : 'camera'} size={30} color={C.leaf} />, dim: store.onBreak, onPress: onAdd };
    }
    if (meal) return { member: m, meal, heart: meal.hearts.includes(me.id), onPress: () => onMeal(meal.id), onFace: () => onPerson(m.id) };
    return { member: m, dim: true, onFace: () => onPerson(m.id) };
  };

  const header = store.onBreak ? (
    <View style={{ alignItems: 'center' }}>
      <Mado mood="sleep" width={150} costume={costume} />
      <T w="bold" size={32} center style={{ lineHeight: 36, marginTop: 8 }}>
        Resting until {breakEnds ? dayName(breakEnds) : 'later'}
      </T>
      <T size={S.body} color={C.deep} center>
        No meal reminders. Medicine reminders still come.
      </T>
    </View>
  ) : fasting ? (
    <View style={{ gap: 12 }}>
      <View>
        <T w="bold" size={S.small} color={C.deep}>
          Fasting today, {me.name}
        </T>
        <T w="bold" size={32} style={{ lineHeight: 36 }}>
          Break your fast at {hourText(prefs.iftarHour)}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['suhoor', 'iftar'] as const).map((slot) => {
          const shared = meals.find((m) => m.memberId === me.id && m.slot === slot && sameDay(new Date(m.date), today));
          return (
            <Pressable key={slot} onPress={shared ? () => onMeal(shared.id) : onAdd} accessibilityRole="button" style={{ flex: 1, backgroundColor: C.white, borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: shared ? 0 : 2.5, borderColor: C.leaf }}>
              {shared ? <FoodPlate meal={shared} size={44} /> : <Icon name="moon" size={28} color={C.leaf} />}
              <View style={{ flex: 1 }}>
                <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                  {slot === 'suhoor' ? 'Before dawn' : 'Break fast'}
                </T>
                <T w="bold" size={S.small} color={shared ? C.leaf : C.muted}>
                  {shared ? 'Shared' : hourText(slot === 'suhoor' ? prefs.suhoorHour : prefs.iftarHour)}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>
      <T w="medium" size={S.small} color={C.deep}>
        Fasting days keep the family streak going.
      </T>
    </View>
  ) : (
    <View style={{ gap: 4 }}>
      <T w="bold" size={S.small} color={C.deep}>
        {greeting()}, {me.name}
      </T>
      <T w="bold" size={36} style={{ lineHeight: 42 }}>
        {mine ? 'Thank you for sharing!' : 'Did you eat?'}
      </T>
      {questOpen && store.quest ? (
        <Pressable onPress={onQuest} accessibilityRole="button" accessibilityLabel={`${store.quest.quest.name}. Open the quest`}>
          <River done={store.quest.done} goal={store.quest.goal} width={w} goalArt={<CostumeArt id={store.quest.quest.costume} size={34} />} />
          <T w="bold" size={S.small} color={C.deep}>
            {store.quest.quest.name}: {store.quest.finished ? 'done! Mado won.' : store.quest.done * 2 >= store.quest.goal ? 'Mado is halfway there.' : `${store.quest.done} of ${store.quest.goal} together.`}
          </T>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Mado width={88} mood={mine ? 'happy' : 'hello'} costume={costume} />
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.leaf}
            onRefresh={async () => {
              setRefreshing(true);
              await store.refresh().catch(() => undefined);
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 18 }}>
          <View style={{ position: 'absolute', right: 20, top: insets.top + 14, zIndex: 2 }}>
            <RoundIcon name="gear" onPress={onMe} label="Settings" size={48} />
          </View>
          <View style={{ paddingRight: store.onBreak ? 0 : 56 }}>{header}</View>
        </View>

        <View style={{ marginTop: 20 }}>
          <RoundTable size={Math.min(width - 40, 320)} seats={[...others, me].map(seat)} />
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
          {note && from ? (
            <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Face member={from} size={32} ring={C.pinkSoft} />
              <T size={18} style={{ flex: 1 }}>
                "{note.text}"
              </T>
            </View>
          ) : null}

          {prefs.meds.on && prefs.meds.slots.length ? (
            <Pressable onPress={onMeds} accessibilityRole="button" accessibilityLabel="My medicine week" style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pill" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="bold" size={S.body} style={{ lineHeight: 21 }}>
                  {med ? `Medicine with ${MED_WORD[med]}` : 'Medicine done today'}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="lock" size={14} color={C.muted} />
                  <T w="medium" size={S.small} color={C.muted}>
                    Only you see this
                  </T>
                </View>
              </View>
              {med ? <BigButton label="Taken" icon="check" kind="mint" height={48} size={S.body} onPress={() => store.toggleMed(new Date(), med)} /> : <Icon name="check" size={24} color={C.leaf} />}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16, gap: 8 }}>
        {store.onBreak ? (
          <>
            <BigButton label="Share a plate anyway" icon="camera" kind="line" onPress={onAdd} />
            <Pressable onPress={() => store.takeBreak(null)} accessibilityRole="button" hitSlop={8}>
              <T w="bold" size={S.small} color={C.deep} center>
                End the break
              </T>
            </Pressable>
          </>
        ) : (
          <>
            <BigButton label={mine ? 'Show another plate' : 'Show my plate'} icon="camera" onPress={onAdd} height={78} size={24} style={{ shadowColor: C.leaf, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 }} />
            <T w="medium" size={S.small} color={C.muted} center style={{ backgroundColor: K.rice }}>
              Tap a plate to send a heart
            </T>
          </>
        )}
      </View>
    </View>
  );
}
