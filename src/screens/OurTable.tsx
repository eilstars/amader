import React, { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Meal, Member } from '../types';
import { webUrl } from '../backend';
import { shareText } from '../share';
import { nudgeText, sendOnWhatsApp } from '../nudge';
import { POINTS, pointsFor, streakGoal, streakOf } from '../game';
import { Avatar, Btn, Chip, Eyebrow, Puti, PutiSays, Row, Stat, T, WeekStrip } from '../ui';
import { dayCounts, dayHeading, greeting, inWeek, sameDay, spacedCode, startOfDay, weekDays, weekLabel } from '../words';
import MealCard from './MealCard';

type Filter = { kind: 'all' } | { kind: 'person'; id: string } | { kind: 'together' };

export default function OurTable({ onAdd, onMe, onPerson }: { onAdd: () => void; onMe: () => void; onPerson: (id: string) => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const { family, me, meals, cheers } = store;

  const days = useMemo(() => weekDays(offset), [offset]);
  if (!family || !me) return null;

  const today = new Date();
  const todaysOf = (id: string) => meals.filter((m) => m.memberId === id && sameDay(new Date(m.date), today));
  const iShared = todaysOf(me.id).length > 0;
  const waiting = family.members.filter((m) => !m.joined);
  const myStreak = streakOf(meals, me.id);
  const weekStart = weekDays(0)[0];
  const myPoints = meals.filter((m) => m.memberId === me.id && new Date(m.date) >= weekStart).reduce((sum, m) => sum + pointsFor(m), 0);
  const heartsForMe = meals.filter((m) => m.memberId === me.id && new Date(m.date) >= weekStart).reduce((sum, m) => sum + m.hearts.length, 0);

  // Notes the family sent me this week.
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
  const notesForMe = cheers.filter((c) => c.toId === me.id && new Date(c.date) >= weekAgo).slice(0, 3);

  // Someone who has not shared today, to say hi to. The person being cared for comes first.
  const quiet = family.members
    .filter((m) => m.id !== me.id && m.joined && todaysOf(m.id).length === 0)
    .sort((a, b) => (a.role === 'parent' ? -1 : 0) - (b.role === 'parent' ? -1 : 0))[0];

  // The feed: only the chosen week (or day), filtered, grouped by day.
  const matches = (m: Meal) =>
    filter.kind === 'all' ? true : filter.kind === 'person' ? m.memberId === filter.id : (m.withIds?.length ?? 0) > 0 || !!m.withOthers;
  const weekMeals = inWeek(meals, days).filter(matches);
  const shown = day === null ? weekMeals : weekMeals.filter((m) => sameDay(new Date(m.date), days[day]));
  const groups: { day: Date; meals: Meal[] }[] = [];
  for (const m of shown) {
    const d = startOfDay(new Date(m.date));
    const last = groups[groups.length - 1];
    if (last && last.day.getTime() === d.getTime()) last.meals.push(m);
    else groups.push({ day: d, meals: [m] });
  }

  const link = webUrl ? `${webUrl}` : '';
  const goal = streakGoal(myStreak);

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
      {/* The table itself: everyone sitting around it, a green ring for those who shared today. */}
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T w="medium" size={15} color={C.deep}>
              {greeting()}, {me.name}
            </T>
            <T w="bold" size={28} style={{ lineHeight: 34 }}>
              Our Table
            </T>
          </View>
          <Pressable onPress={onMe} accessibilityRole="button" accessibilityLabel="Settings" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={24} color={C.deep} />
          </Pressable>
        </Row>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 8 }}>
          {family.members.map((m) => (
            <Seat key={m.id} member={m} you={m.id === me.id} count={todaysOf(m.id).length} streak={streakOf(meals, m.id)} onPress={() => onPerson(m.id)} />
          ))}
        </ScrollView>

        <Row gap={8}>
          <Stat icon="flame" value={myStreak} label="day streak" tone="white" />
          <Stat icon="star" value={myPoints} label="points" tone="white" />
          <Stat icon="heart" value={heartsForMe} label="hearts" tone="pink" />
        </Row>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {store.session?.demo ? (
          <T size={14} color={C.muted}>
            This is a sample family, nothing here is real. Tap anyone above to see their progress, or switch who you are in Settings.
          </T>
        ) : null}

        {!iShared ? (
          <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 12, borderWidth: 2, borderColor: C.leaf }}>
            <Row gap={10}>
              <Puti mood="hello" width={70} />
              <View style={{ flex: 1 }}>
                <T w="bold" size={21}>
                  Did you eat?
                </T>
                <T size={15} color={C.muted}>
                  {myStreak > 0 ? `Share any meal or snack to keep your ${myStreak} day streak. ${goal - myStreak} more to reach ${goal}.` : `Share any meal or snack. That's +${POINTS.meal + POINTS.photo} points right away.`}
                </T>
              </View>
            </Row>
            <Btn label="Show my plate" icon="camera" onPress={onAdd} />
          </View>
        ) : null}

        {notesForMe.length ? (
          <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 14, gap: 10 }}>
            <Row gap={8}>
              <Ionicons name="mail-open" size={20} color={C.heart} />
              <T w="semibold" color="#8A2942">
                Notes for you
              </T>
            </Row>
            {notesForMe.map((c) => {
              const from = store.member(c.fromId);
              return (
                <Row key={c.id} gap={10} style={{ alignItems: 'flex-start' }}>
                  {from ? <Avatar member={from} size={32} /> : null}
                  <View style={{ flex: 1, backgroundColor: C.white, borderRadius: 14, borderTopLeftRadius: 4, padding: 10 }}>
                    <T size={16}>{c.text}</T>
                    <T size={13} color={C.muted}>
                      {from?.name ?? 'Family'} · {dayHeading(new Date(c.date))}
                    </T>
                  </View>
                </Row>
              );
            })}
          </View>
        ) : null}

        {quiet ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <Row gap={10}>
              <Avatar member={quiet} size={44} />
              <View style={{ flex: 1 }}>
                <T w="semibold">Say hi to {quiet.name}?</T>
                <T size={14} color={C.muted}>
                  {quiet.name} hasn't shared yet today. A kind word works better than a reminder.
                </T>
              </View>
            </Row>
            <Row gap={8}>
              <Btn kind="ghost" icon="heart-outline" label="Send a note" onPress={() => onPerson(quiet.id)} style={{ flex: 1, alignSelf: 'auto', minHeight: 50 }} />
              <Btn kind="ghost" icon="logo-whatsapp" label="WhatsApp" onPress={() => sendOnWhatsApp(nudgeText(quiet.name, iShared ? 'ask' : 'together', link))} style={{ flex: 1, alignSelf: 'auto', minHeight: 50 }} />
            </Row>
          </View>
        ) : null}

        {waiting.length > 0 && !store.session?.demo ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <Eyebrow>Family code</Eyebrow>
            <T w="bold" size={28} style={{ letterSpacing: 4 }}>
              {spacedCode(family.code)}
            </T>
            <T size={15} color={C.muted}>
              {waiting[0].name} hasn't joined yet. All {waiting[0].name} does is open the link, enter the code and take a photo.
            </T>
            <Row gap={8}>
              <Btn icon="logo-whatsapp" label="WhatsApp" onPress={() => sendOnWhatsApp(store.inviteMessage)} style={{ flex: 1, alignSelf: 'auto' }} />
              <Btn
                kind="ghost"
                icon="share-outline"
                label={copied ? 'Copied' : 'Other'}
                onPress={async () => {
                  const how = await shareText(store.inviteMessage).catch(() => null);
                  if (how === 'copied') setCopied(true);
                }}
                style={{ flex: 1, alignSelf: 'auto' }}
              />
            </Row>
            {!store.cloud ? (
              <T size={13} color={C.muted}>
                Heads up: this copy of the app isn't connected to a server yet, so phones can't see each other.
              </T>
            ) : null}
          </View>
        ) : null}

        {!store.prefs.widgetSeen ? <WidgetCard onClose={() => store.setPrefs({ widgetSeen: true })} /> : null}

        {/* Browse the weeks. Each ring fills as soon as anything is shared that day; the dots count the meals. */}
        <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
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
              <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <T w="bold" size={18}>
                  {dayHeading(g.day)}
                </T>
                <T size={14} color={C.muted}>
                  {g.meals.length} {g.meals.length === 1 ? 'plate' : 'plates'}
                </T>
              </Row>
              {g.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onPerson={onPerson} />
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

/** A seat at the table: the person, a ring that fills when they have shared today, and their streak. */
function Seat({ member, you, count, streak, onPress }: { member: Member; you: boolean; count: number; streak: number; onPress: () => void }) {
  const done = count > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${member.name}, ${done ? 'shared today' : 'not yet today'}. See progress`} style={{ alignItems: 'center', width: 72, gap: 2 }}>
      <View style={{ padding: 3, borderRadius: 40, borderWidth: 3, borderColor: done ? C.leaf : 'rgba(31,122,90,0.18)', borderStyle: done ? 'solid' : 'dashed' }}>
        <Avatar member={member} size={54} />
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

/** Asks once to put the "Did you eat?" widget on the home screen, with the steps for this phone. */
export function WidgetCard({ onClose }: { onClose: () => void }) {
  const steps =
    Platform.OS === 'android'
      ? ['Press and hold an empty spot on your home screen', 'Tap Widgets, then find Amader', 'Drag "Did you eat?" onto the screen']
      : Platform.OS === 'ios'
        ? ['Press and hold an empty spot on your home screen', 'Tap the + in the top corner', 'Search Amader and tap Add Widget']
        : ['Install the Amader app on your phone', 'Press and hold the home screen, then add the Amader widget', 'Log a meal with one tap, without opening the app'];
  return (
    <View style={{ backgroundColor: C.deep, borderRadius: 22, padding: 14, gap: 10 }}>
      <Row gap={12}>
        <MiniWidget />
        <View style={{ flex: 1 }}>
          <T w="bold" size={18} color={C.white}>
            Put "Did you eat?" on your home screen
          </T>
          <T size={14} color="#CFE6D9">
            One tap logs a meal. No need to open the app.
          </T>
        </View>
      </Row>
      {steps.map((step, i) => (
        <Row key={i} gap={10}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={14} color={C.white}>
              {i + 1}
            </T>
          </View>
          <T size={15} color={C.white} style={{ flex: 1 }}>
            {step}
          </T>
        </Row>
      ))}
      <Btn kind="dark" label="Got it" onPress={onClose} />
    </View>
  );
}

/** A small drawing of the home screen widget. */
export function MiniWidget({ size = 84 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: C.rice, padding: size * 0.09, justifyContent: 'space-between' }}>
      <T w="bold" size={size * 0.13} color={C.deep} style={{ lineHeight: size * 0.17 }}>
        Did you eat?
      </T>
      <Row gap={size * 0.05}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={{ flex: 1, height: size * 0.26, borderRadius: size * 0.08, backgroundColor: n === 2 ? C.leaf : C.mint, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={size * 0.12} color={n === 2 ? C.white : C.deep} style={{ lineHeight: size * 0.15 }}>
              {n}
            </T>
          </View>
        ))}
      </Row>
      <View style={{ height: size * 0.2, borderRadius: size * 0.1, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera" size={size * 0.13} color={C.white} />
      </View>
    </View>
  );
}
