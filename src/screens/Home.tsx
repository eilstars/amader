import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { homeToday, useStore } from '../store';
import { C } from '../theme';
import { Member } from '../types';
import { T } from '../ui';
import { CostumeArt } from '../costumes';
import { familyStreak } from '../game';
import { webUrl } from '../backend';
import { nudgeText, sendOnWhatsApp } from '../nudge';
import { BigButton, Chip, Face, Icon, K, Mado, River, RoundTable, S, Seat, card } from '../design';
import { greeting, sameDay } from '../words';
import { PILOT } from '../pilot';
import { focusMembers } from '../starch';
import { PathCard } from './Path';

/** Today's newest plate for a person, if they shared one. */
export function todaysPlate(meals: ReturnType<typeof useStore>['meals'], id: string) {
  const today = new Date();
  return meals.find((m) => m.memberId === id && sameDay(new Date(m.date), today)) ?? null;
}

/** The quest header: the river, Mado, and this week's costume. Light ground so Mado always shows. */
export function QuestHeader({ onOpen, big }: { onOpen: () => void; big?: boolean }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480) - 40;
  const q = store.quest;
  const joined = (store.family?.members ?? []).filter((m) => m.joined);
  const streak = familyStreak(store.meals, joined.map((m) => m.id));
  if (!store.questLive || !q) {
    return (
      <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mado width={88} />
        <View style={{ flex: 1 }}>
          <T w="bold" size={S.title} style={{ lineHeight: 26 }}>
            Quests start when someone joins
          </T>
          <T w="medium" size={S.small} color={C.deep}>
            Then Mado swims for all of you.
          </T>
        </View>
      </View>
    );
  }
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${q.quest.name}, ${q.done} of ${q.goal}. Open the quest`} style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          {big ? (
            <T w="medium" size={S.small} color={C.deep}>
              {greeting()}, {store.me?.name}
            </T>
          ) : (
            <T w="bold" size={S.title} style={{ lineHeight: 26 }}>
              {q.quest.name}
            </T>
          )}
          {big ? null : (
            <T w="bold" size={S.small} color={C.deep}>
              {q.finished ? `Done! ${q.done} together` : `${q.done} of ${q.goal} together`} · {q.quest.costumeName.toLowerCase()} on Sunday
            </T>
          )}
        </View>
        {streak > 1 && !big ? <Chip text={`${streak} days in a row`} icon="check" /> : null}
      </View>
      <River done={q.done} goal={q.goal} width={w} goalArt={<CostumeArt id={q.quest.costume} size={34} />} />
      {big ? (
        <T w="bold" size={S.small} color={C.deep}>
          {q.quest.name}: {q.finished ? 'done! Mado won.' : q.done * 2 >= q.goal ? 'Mado is halfway there.' : `${q.done} of ${q.goal} together.`}
        </T>
      ) : null}
    </Pressable>
  );
}

/**
 * Home for the person looking after the family: the table seen from above. Each seat is a person;
 * an empty plate means they haven't shared yet. Tap a plate to open it, tap an empty seat to nudge.
 */
export default function Home({ onAdd, onMeal, onPerson, onQuest, onRecap }: { onAdd: () => void; onMeal: (id: string) => void; onPerson: (id: string) => void; onQuest: () => void; onRecap: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [nudged, setNudged] = useState<string | null>(null);
  const { family, me, meals, cheers, prefs } = store;
  if (!family || !me) return null;

  const others = family.members.filter((m) => m.id !== me.id);
  const people = [...others.sort((a, b) => Number(b.role === 'parent') - Number(a.role === 'parent')), me];
  const joined = family.members.filter((m) => m.joined);
  const ate = joined.filter((m) => todaysPlate(meals, m.id)).length;
  const waiting = others.filter((m) => !m.joined);
  const today = new Date();
  const note = cheers.find((c) => c.toId === me.id && !c.mealId && today.getTime() - new Date(c.date).getTime() < 4 * 86_400_000);
  const from = note ? store.member(note.fromId) : undefined;
  const recapDay = today.getDay() === 0 || today.getDay() === 1;

  const seat = (m: Member): Seat => {
    const meal = todaysPlate(meals, m.id);
    const mine = m.id === me.id;
    if (meal) return { member: m, meal, label: mine ? 'You' : m.name, heart: meal.hearts.length > 0, onPress: () => onMeal(meal.id), onFace: () => onPerson(m.id) };
    if (mine) return { member: m, label: 'You', empty: <Icon name="camera" size={26} color={C.leaf} />, onPress: onAdd, onFace: () => onPerson(m.id) };
    if (!m.joined)
      return { member: m, dim: true, empty: <T w="bold" size={S.small} color={C.leaf}>Invite</T>, onPress: () => sendOnWhatsApp(store.inviteFor(m.name)), onFace: () => onPerson(m.id) };
    return {
      member: m,
      dim: true,
      label: nudged === m.id ? 'Nudged' : m.name,
      empty: <Icon name="heart" size={22} color={C.heart} fill={nudged === m.id ? C.heart : 'none'} />,
      onPress: () => {
        setNudged(m.id);
        if (!homeToday(prefs)) sendOnWhatsApp(nudgeText(m.name, todaysPlate(meals, me.id) ? 'ask' : 'together', webUrl ?? ''));
      },
      onFace: () => onPerson(m.id),
    };
  };

  const size = Math.min(width - 40, 340);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 130 }}
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
      {PILOT ? (
        <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {(family ? focusMembers(family.members) : []).slice(0, 2).map((m, i) => (
            <PathCard key={m.id} memberId={m.id} onPress={onQuest} showGrains={i === 0} />
          ))}
        </View>
      ) : (
        <QuestHeader onOpen={onQuest} />
      )}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <T w="medium" size={S.small} color={C.muted}>
          {greeting()}, {me.name}
        </T>
        <T w="bold" size={S.display} style={{ lineHeight: 36 }}>
          {waiting.length === others.length && others.length ? 'Your table is set' : 'Who has eaten today?'}
        </T>
      </View>
      <View style={{ marginTop: 14 }}>
        <RoundTable
          size={size}
          seats={people.map(seat)}
          center={
            <>
              <T w="bold" size={S.display} color={C.deep} style={{ lineHeight: 34 }}>
                {ate} of {joined.length}
              </T>
              <T w="medium" size={S.small} color={C.muted}>
                {joined.length < family.members.length ? 'here so far' : 'ate today'}
              </T>
            </>
          }
        />
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
        {note && from ? (
          <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Face member={from} size={30} ring={C.pinkSoft} />
            <T size={S.body} style={{ flex: 1 }}>
              "{note.text}"
            </T>
          </View>
        ) : null}

        {recapDay && store.questLive && !PILOT ? (
          <Pressable onPress={onRecap} accessibilityRole="button" style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: K.white }]}>
            <Mado width={40} mood="happy" />
            <T w="bold" size={S.body} style={{ flex: 1 }}>
              Your family's week is ready
            </T>
            <Icon name="next" size={20} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
