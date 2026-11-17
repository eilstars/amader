import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { webUrl } from '../backend';
import { nudgeText, sendOnWhatsApp } from '../nudge';
import { Badge, badgesFor, bestStreak, isBalanced, plateAverage, pointsFor, streakGoal, streakOf, streakReward } from '../game';
import { Avatar, Btn, Chip, Eyebrow, PageHead, Row, Stat, T, Thali, WeekStrip, field } from '../ui';
import { dayCounts, dayHeading, handsText, inWeek, roleName, weekDays, weekLabel } from '../words';
import MealCard from './MealCard';

const QUICK_NOTES = ["You're doing great!", 'So proud of you', 'That looks delicious', 'Miss eating with you', 'Keep going, one day at a time'];

/** Every badge there is, so people can see what is still ahead of them. */
const ALL_BADGES: Badge[] = [
  { id: 'first', title: 'First Bite', how: 'Share a first meal', icon: 'restaurant' },
  { id: 's3', title: 'Three in a Row', how: '3 days in a row', icon: 'flame' },
  { id: 's7', title: 'One Week', how: '7 days in a row', icon: 'flame' },
  { id: 'bal5', title: 'Half Sabzi', how: '5 balanced plates', icon: 'leaf' },
  { id: 'tog3', title: 'Dawat', how: 'Eat together 3 times', icon: 'people' },
  { id: 'cheer3', title: 'Cheerleader', how: 'Send 3 notes', icon: 'heart' },
  { id: 'recipe', title: 'Keeper of Recipes', how: 'Save a family recipe', icon: 'book' },
  { id: 'fast', title: 'Roza', how: 'Share a fasting day', icon: 'moon' },
  { id: 's30', title: 'Month at the Table', how: '30 days in a row', icon: 'trophy' },
  { id: 'm50', title: 'Fifty Plates', how: '50 meals shared', icon: 'star' },
];

/** One person's progress: streak, badges, their week, and a way to cheer them on. */
export default function Profile({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { family, meals, cheers, recipes, me } = store;
  const person = store.member(memberId);
  const days = useMemo(() => weekDays(offset), [offset]);
  if (!family || !person || !me) return null;

  const you = person.id === me.id;
  const theirs = meals.filter((m) => m.memberId === person.id);
  const week = inWeek(theirs, days);
  const streak = streakOf(meals, person.id);
  const goal = streakGoal(streak);
  const points = week.reduce((sum, m) => sum + pointsFor(m), 0);
  const earned = new Set(badgesFor(person.id, meals, cheers, recipes.filter((r) => r.addedBy === person.id).length).map((b) => b.id));
  const avg = plateAverage(week);

  // Who reached out to this person this week: hearts on their meals and notes sent to them.
  const weekStart = weekDays(0)[0];
  const circle = family.members
    .filter((m) => m.id !== person.id)
    .map((m) => ({
      member: m,
      hearts: theirs.filter((meal) => new Date(meal.date) >= weekStart && meal.hearts.includes(m.id)).length,
      notes: cheers.filter((c) => c.fromId === m.id && c.toId === person.id && new Date(c.date) >= weekStart).length,
    }));
  const notesToThem = cheers.filter((c) => c.toId === person.id).slice(0, 4);
  const link = webUrl ?? '';

  async function send(text: string) {
    setFailed(false);
    try {
      await store.sendCheer(person!.id, text);
      setSent(text);
      setNote('');
    } catch {
      setFailed(true);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <PageHead title={you ? 'Your progress' : `${person.name}'s progress`} onBack={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Row gap={14}>
          <Avatar member={person} size={64} />
          <View style={{ flex: 1 }}>
            <T w="bold" size={26} style={{ lineHeight: 32 }}>
              {person.name}
            </T>
            <T size={15} color={C.muted}>
              {roleName(person.role)}
              {person.joined ? '' : ' · invited, not joined yet'} · best streak {bestStreak(meals, person.id)} days
            </T>
          </View>
        </Row>

        <Row gap={8}>
          <Stat icon="flame" value={streak} label="day streak" />
          <Stat icon="star" value={points} label="points" />
          <Stat icon="ribbon" value={earned.size} label="badges" />
        </Row>

        {/* The next streak goal and what it gives. */}
        <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: '#E6EBE6' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T w="semibold">Next goal: {goal} days in a row</T>
            <T size={14} color={C.muted}>
              {streak} of {goal}
            </T>
          </Row>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.soft, overflow: 'hidden' }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.leaf, width: `${Math.round((streak / goal) * 100)}%` }} />
          </View>
          <T size={14} color={C.muted}>
            Reaching it gives {streakReward(goal)}.
          </T>
        </View>

        {!you ? (
          <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 14, gap: 10 }}>
            <T w="bold" size={18}>
              Send {person.name} a note
            </T>
            <T size={14} color="#5B4A4F">
              It shows up on their table. Small words go a long way.
            </T>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {QUICK_NOTES.map((q) => (
                <Chip key={q} label={q} on={sent === q} onPress={() => send(q)} />
              ))}
            </Row>
            <Row gap={8}>
              <TextInput value={note} onChangeText={setNote} placeholder="Or write your own" placeholderTextColor="#9AA79F" maxLength={200} style={[field, { flex: 1 }]} />
              <Pressable
                onPress={() => note.trim() && send(note)}
                disabled={!note.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send note"
                style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: note.trim() ? C.heart : '#F1C5CF', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="send" size={22} color={C.white} />
              </Pressable>
            </Row>
            {sent ? (
              <T w="semibold" size={14} color="#8A2942">
                Sent. {person.name} will see it on the table.
              </T>
            ) : null}
            {failed ? (
              <T size={14} color="#8A2942">
                That note didn't send. Check your connection and try again.
              </T>
            ) : null}
            <Btn kind="ghost" icon="logo-whatsapp" label={`Message ${person.name} on WhatsApp`} onPress={() => sendOnWhatsApp(nudgeText(person.name, week.length ? 'proud' : 'ask', link))} />
          </View>
        ) : null}

        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
          <WeekStrip days={days} label={weekLabel(offset, days)} counts={dayCounts(theirs, days)} onPrev={() => setOffset(offset - 1)} onNext={offset < 0 ? () => setOffset(offset + 1) : undefined} />
          <Row gap={14}>
            <Thali size={92} grains={avg.counted ? Math.round(avg.grains) : 0} protein={Math.round(avg.protein)} veg={Math.round(avg.veg)} />
            <View style={{ flex: 1, gap: 2 }}>
              <T w="semibold">{avg.counted ? 'A usual plate that week' : 'No plates that week'}</T>
              {avg.counted ? (
                <T size={14} color={C.muted}>
                  {handsText(avg.grains, 'fist', 'fists')} {store.goalFood.toLowerCase()} · {handsText(avg.protein, 'palm', 'palms')} protein · {handsText(avg.veg, 'handful', 'handfuls')} veg
                </T>
              ) : null}
              <T size={14} color={C.muted}>
                {week.filter((m) => m.slot !== 'fasting').length} meals · {week.filter(isBalanced).length} balanced · {week.filter((m) => (m.withIds?.length ?? 0) > 0 || m.withOthers).length} together
              </T>
            </View>
          </Row>
        </View>

        <Eyebrow>Badges</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {ALL_BADGES.map((b) => {
            const has = earned.has(b.id);
            return (
              <View key={b.id} style={{ width: '33.33%', padding: 4 }}>
                <View style={{ alignItems: 'center', backgroundColor: has ? C.white : C.soft, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 4, borderWidth: has ? 1.5 : 0, borderColor: C.lightGreen, gap: 2, opacity: has ? 1 : 0.6 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: has ? C.leaf : C.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={(has ? b.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap} size={22} color={C.white} />
                  </View>
                  <T w="semibold" size={13} center numberOfLines={1}>
                    {b.title}
                  </T>
                  <T size={11} color={C.muted} center numberOfLines={2} style={{ lineHeight: 14 }}>
                    {b.how}
                  </T>
                </View>
              </View>
            );
          })}
        </View>

        {person.role === 'parent' ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <T w="bold" size={18}>
              {person.name}'s circle this week
            </T>
            <T size={14} color={C.muted}>
              Who has reached out with a heart or a note. Take turns, so it never falls on one person.
            </T>
            {circle.map((c) => (
              <Row key={c.member.id} gap={10}>
                <Avatar member={c.member} size={36} />
                <T w="semibold" style={{ flex: 1 }}>
                  {c.member.id === me.id ? 'You' : c.member.name}
                </T>
                <T size={15} color={c.hearts + c.notes ? C.deep : C.muted}>
                  {c.hearts + c.notes ? `${c.hearts} ${c.hearts === 1 ? 'heart' : 'hearts'}, ${c.notes} ${c.notes === 1 ? 'note' : 'notes'}` : 'Not yet'}
                </T>
              </Row>
            ))}
          </View>
        ) : null}

        {notesToThem.length ? (
          <>
            <Eyebrow>{you ? 'Notes you got' : `Notes ${person.name} got`}</Eyebrow>
            {notesToThem.map((c) => {
              const from = store.member(c.fromId);
              return (
                <Row key={c.id} gap={10} style={{ alignItems: 'flex-start' }}>
                  {from ? <Avatar member={from} size={32} /> : null}
                  <View style={{ flex: 1, backgroundColor: C.pinkSoft, borderRadius: 14, borderTopLeftRadius: 4, padding: 10 }}>
                    <T size={16}>{c.text}</T>
                    <T size={13} color={C.muted}>
                      {from?.id === me.id ? 'You' : from?.name ?? 'Family'} · {dayHeading(new Date(c.date))}
                    </T>
                  </View>
                </Row>
              );
            })}
          </>
        ) : null}

        <Eyebrow>{offset === 0 ? 'This week' : weekLabel(offset, days)}</Eyebrow>
        {week.length ? week.map((m) => <MealCard key={m.id} meal={m} />) : <T color={C.muted}>Nothing shared that week.</T>}
      </ScrollView>
    </View>
  );
}
