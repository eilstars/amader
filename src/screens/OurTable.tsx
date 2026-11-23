import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Meal, Member } from '../types';
import { webUrl } from '../backend';
import { nudgeText, sendOnWhatsApp } from '../nudge';
import { POINTS, familyStreak, learnPointsSince, pointsFor, streakOf } from '../game';
import { Avatar, Btn, Chip, Puti, PutiSays, Row, T, WeekStrip } from '../ui';
import { dayCounts, dayHeading, greeting, inWeek, sameDay, spacedCode, startOfDay, weekDays, weekLabel } from '../words';
import MealCard from './MealCard';
import MedsCard from './Meds';
import { QuestCard } from './Quest';

type Filter = { kind: 'all' } | { kind: 'person'; id: string } | { kind: 'together' };

/**
 * The family table. Kept light on purpose: who has eaten today, one thing to do, and the week's plates.
 * Everything else lives one tap away, on a person's page or in Recap.
 */
export default function OurTable({ onAdd, onMe, onPerson, onQuests }: { onAdd: () => void; onMe: () => void; onPerson: (id: string) => void; onQuests?: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const { family, me, meals, cheers, prefs } = store;

  const days = useMemo(() => weekDays(offset), [offset]);
  if (!family || !me) return null;

  const today = new Date();
  const todaysOf = (id: string) => meals.filter((m) => m.memberId === id && sameDay(new Date(m.date), today));
  const iShared = todaysOf(me.id).length > 0;
  const waiting = family.members.filter((m) => !m.joined);
  const myStreak = streakOf(meals, me.id);
  const joined = family.members.filter((m) => m.joined);
  const familyDays = familyStreak(meals, joined.map((m) => m.id));
  const weekStart = weekDays(0)[0];
  const myPoints = meals.filter((m) => m.memberId === me.id && new Date(m.date) >= weekStart).reduce((sum, m) => sum + pointsFor(m), 0) + learnPointsSince(prefs.learnLog, weekStart);

  // The newest note to me from the last few days, if any.
  const note = cheers.find((c) => c.toId === me.id && !c.mealId && today.getTime() - new Date(c.date).getTime() < 4 * 86_400_000);
  const from = note ? store.member(note.fromId) : undefined;

  // Someone far away who has not shared today. Not shown to people who live together: they can just ask.
  const quiet = prefs.sameHome
    ? undefined
    : family.members.filter((m) => m.id !== me.id && m.joined && todaysOf(m.id).length === 0).sort((a, b) => Number(b.role === 'parent') - Number(a.role === 'parent'))[0];

  const matches = (m: Meal) =>
    filter.kind === 'all' ? true : filter.kind === 'person' ? m.memberId === filter.id : (m.withIds?.length ?? 0) > 0 || !!m.withOthers || !!m.sameAs;
  const weekMeals = inWeek(meals, days).filter(matches);
  const shown = day === null ? weekMeals : weekMeals.filter((m) => sameDay(new Date(m.date), days[day]));
  const groups: { day: Date; meals: Meal[] }[] = [];
  for (const m of shown) {
    const d = startOfDay(new Date(m.date));
    const last = groups[groups.length - 1];
    if (last && last.day.getTime() === d.getTime()) last.meals.push(m);
    else groups.push({ day: d, meals: [m] });
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
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
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T w="medium" size={15} color={C.deep}>
              {greeting()}, {me.name}
            </T>
            <T w="bold" size={28} style={{ lineHeight: 34 }}>
              Our Table
            </T>
          </View>
          <Pressable onPress={() => onPerson(me.id)} accessibilityRole="button" accessibilityLabel={`My progress: ${myStreak} day streak, ${myPoints} points this week`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, height: 44, marginRight: 8 }}>
            <Ionicons name="flame" size={18} color={C.heart} />
            <T w="bold" size={16}>
              {myStreak}
            </T>
            <Ionicons name="star" size={17} color={C.leaf} style={{ marginLeft: 4 }} />
            <T w="bold" size={16}>
              {myPoints}
            </T>
          </Pressable>
          <Pressable onPress={onMe} accessibilityRole="button" accessibilityLabel="Settings" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={22} color={C.deep} />
          </Pressable>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
          {family.members.map((m) => (
            <Seat key={m.id} member={m} you={m.id === me.id} count={todaysOf(m.id).length} streak={streakOf(meals, m.id)} onPress={() => onPerson(m.id)} />
          ))}
        </ScrollView>
        {joined.length > 1 ? (
          <Row gap={8}>
            <Ionicons name="people" size={18} color={C.deep} />
            <T w="semibold" size={15} color={C.deep} style={{ flex: 1 }}>
              {familyDays > 0 ? `Family streak: ${familyDays} day${familyDays === 1 ? '' : 's'} everyone shared` : 'Family streak starts when everyone shares today'}
            </T>
          </Row>
        ) : null}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {store.news ? <NewsCard /> : null}

        {!iShared ? (
          <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 10, borderWidth: 2, borderColor: C.leaf }}>
            <Row gap={10}>
              <Puti mood="hello" width={64} />
              <View style={{ flex: 1 }}>
                <T w="bold" size={21}>
                  Did you eat?
                </T>
                <T size={15} color={C.muted}>
                  {prefs.sameHome ? 'Eating together? One photo covers the whole table.' : myStreak > 0 ? `Keep your ${myStreak} day streak going.` : `+${POINTS.meal + POINTS.photo} points for your first plate.`}
                </T>
              </View>
            </Row>
            <Btn label="Show my plate" icon="camera" onPress={onAdd} />
          </View>
        ) : null}

        <MedsCard />

        <QuestCard onOpen={onQuests} />

        {note && from ? (
          <Pressable onPress={() => onPerson(me.id)} accessibilityRole="button">
            <View style={{ backgroundColor: C.pinkSoft, borderRadius: 18, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Avatar member={from} size={36} />
              <View style={{ flex: 1 }}>
                <T size={16}>{note.text}</T>
                <T size={13} color={C.muted}>
                  {from.name} · {dayHeading(new Date(note.date))}
                </T>
              </View>
              <Ionicons name="heart" size={20} color={C.heart} />
            </View>
          </Pressable>
        ) : null}

        {quiet ? (
          <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <Avatar member={quiet} size={36} />
            <T w="semibold" style={{ flex: 1 }}>
              Say hi to {quiet.name}?
            </T>
            <Pressable onPress={() => onPerson(quiet.id)} accessibilityRole="button" accessibilityLabel={`Send ${quiet.name} a note`} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="heart" size={22} color={C.heart} />
            </Pressable>
            <Pressable
              onPress={() => sendOnWhatsApp(nudgeText(quiet.name, iShared ? 'ask' : 'together', webUrl ?? ''))}
              accessibilityRole="button"
              accessibilityLabel={`Message ${quiet.name} on WhatsApp`}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="logo-whatsapp" size={22} color={C.deep} />
            </Pressable>
          </View>
        ) : null}

        {waiting.length > 0 && !store.session?.demo ? (
          <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <T w="semibold">Family code {spacedCode(family.code)}</T>
            {waiting.map((w) => (
              <Btn key={w.id} icon="logo-whatsapp" label={`Send ${w.name} the invite`} onPress={() => sendOnWhatsApp(store.inviteFor(w.name))} />
            ))}
          </View>
        ) : null}

        <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 12, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
          <WeekStrip
            days={days}
            label={day === null ? weekLabel(offset, days) : dayHeading(days[day])}
            counts={dayCounts(inWeek(meals, days).filter(matches), days)}
            onPrev={() => {
              setOffset(offset - 1);
              setDay(null);
            }}
            onNext={offset < 0 ? () => (setOffset(offset + 1), setDay(null)) : undefined}
            selected={day}
            onDay={(i) => setDay(day === i ? null : i)}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Everyone" on={filter.kind === 'all'} onPress={() => setFilter({ kind: 'all' })} />
            {family.members.map((m) => (
              <Chip key={m.id} label={m.id === me.id ? 'Me' : m.name} on={filter.kind === 'person' && filter.id === m.id} onPress={() => setFilter({ kind: 'person', id: m.id })} />
            ))}
            <Chip icon="people" label="Together" on={filter.kind === 'together'} onPress={() => setFilter({ kind: 'together' })} />
          </ScrollView>
        </View>

        {groups.length === 0 ? (
          <PutiSays mood="sleep" title={offset === 0 && day === null && filter.kind === 'all' ? 'The table is empty' : 'Nothing here'}>
            {offset === 0 && filter.kind === 'all' ? 'Share the first plate and the family will see it here.' : 'Try another week, or tap "Everyone".'}
          </PutiSays>
        ) : (
          groups.map((g) => (
            <View key={g.day.toISOString()} style={{ gap: 8 }}>
              <T w="bold" size={18} style={{ paddingHorizontal: 4 }}>
                {dayHeading(g.day)}
              </T>
              {g.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onPerson={onPerson} />
              ))}
            </View>
          ))
        )}
        {store.session?.demo ? (
          <T size={13} color={C.muted} center>
            Sample family. Switch who you are in Settings.
          </T>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** A seat at the table: the person, a ring that fills when they have shared today, and their streak. */
function Seat({ member, you, count, streak, onPress }: { member: Member; you: boolean; count: number; streak: number; onPress: () => void }) {
  const done = count > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${member.name}, ${done ? 'shared today' : 'not yet today'}. See progress`} style={{ alignItems: 'center', width: 70, gap: 2 }}>
      <View style={{ padding: 3, borderRadius: 40, borderWidth: 3, borderColor: done ? C.leaf : 'rgba(31,122,90,0.18)', borderStyle: done ? 'solid' : 'dashed' }}>
        <Avatar member={member} size={50} />
        {done ? (
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: C.leaf, borderWidth: 2, borderColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={14} color={C.white} />
          </View>
        ) : null}
      </View>
      <T w="semibold" size={15} numberOfLines={1}>
        {you ? 'You' : member.name}
      </T>
      <T size={12} color={C.muted} numberOfLines={1} style={{ lineHeight: 15 }}>
        {!member.joined ? 'Invited' : streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : done ? 'Shared' : 'Not yet'}
      </T>
    </Pressable>
  );
}

/** "Ammi just shared a snack": a heart is one tap away. Shown while the app is open. */
export function NewsCard() {
  const store = useStore();
  const news = store.news;
  if (!news) return null;
  const who = store.member(news.memberId);
  const meal = store.meals.find((m) => m.id === news.mealId);
  const hearted = !!meal && !!store.session && meal.hearts.includes(store.session.meId);
  return (
    <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {who ? <Avatar member={who} size={40} /> : null}
      <T w="semibold" size={17} style={{ flex: 1 }}>
        {news.text}
      </T>
      <Pressable
        onPress={() => {
          if (meal && !hearted) store.toggleHeart(meal.id);
          setTimeout(() => store.clearNews(), 900);
        }}
        accessibilityRole="button"
        accessibilityLabel="Send a heart"
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={hearted ? 'heart' : 'heart-outline'} size={24} color={C.heart} />
      </Pressable>
      <Pressable onPress={() => store.clearNews()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
        <Ionicons name="close" size={22} color={C.muted} />
      </Pressable>
    </View>
  );
}
