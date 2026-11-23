import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PlateCard } from '../food';
import { useStore } from '../store';
import { C } from '../theme';
import { boardTitles, isBalanced, nextIdea, plateAverage, scores } from '../game';
import { Avatar, Eyebrow, FOOD, PutiSays, Row, Stat, T, WeekStrip } from '../ui';
import { handsText } from '../words';
import { dayCounts, inWeek, weekDays, weekLabel, whenText } from '../words';

/**
 * The weekly recap. Your plate next to a balanced one, drawn the same way, so the gap is easy to see
 * and never shouted. One idea for next week. And the family board, where everyone is best at something.
 */
export default function Recap({ onCheckup, onPerson }: { onCheckup: () => void; onPerson: (id: string) => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);
  const { family, me, meals, cheers } = store;
  const days = useMemo(() => weekDays(offset), [offset]);
  if (!family || !me) return null;

  const week = inWeek(meals, days);
  const mine = week.filter((m) => m.memberId === me.id);
  const before = inWeek(meals, weekDays(offset - 1)).filter((m) => m.memberId === me.id);
  const avg = plateAverage(mine);
  const idea = nextIdea(avg, store.goalFood);
  const end = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate(), 23, 59, 59);
  const board = scores(family, meals, cheers, days[0], end);
  const titles = boardTitles(board);
  const familyPlates = board.reduce((sum, s) => sum + s.meals, 0);
  const loved = [...week].sort((a, b) => b.hearts.length - a.hearts.length)[0];
  const myScore = board.find((s) => s.member.id === me.id);
  const grain = store.goalFood.toLowerCase();

  const count = mine.filter((m) => m.slot !== 'fasting').length;
  const diff = count - before.filter((m) => m.slot !== 'fasting').length;
  const trend =
    count === 0
      ? 'Nothing from you this week yet. One plate is enough to start.'
      : diff > 0
        ? `${diff} more ${diff === 1 ? 'meal' : 'meals'} than the week before. That is the habit growing.`
        : diff === 0
          ? 'Same as the week before. Steady is good.'
          : 'A quieter week than the one before. That happens, every day is a fresh start.';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
        <T w="bold" size={28} style={{ lineHeight: 34 }}>
          Progress
        </T>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 12 }}>
          <WeekStrip days={days} label={weekLabel(offset, days)} counts={dayCounts(mine, days)} onPrev={() => setOffset(offset - 1)} onNext={offset < 0 ? () => setOffset(offset + 1) : undefined} />
        </View>
        <Row gap={8}>
          <Stat icon="restaurant" value={count} label="your meals" tone="white" />
          <Stat icon="leaf" value={mine.filter(isBalanced).length} label="balanced" tone="white" />
          <Stat icon="flame" value={myScore?.streak ?? 0} label="day streak" tone="white" />
        </Row>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <T size={16} color={C.muted}>
          {trend}
        </T>

        {/* Your plate next to a balanced one, both as thalis. */}
        <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
          <T w="bold" size={19}>
            Your plate, next to a balanced one
          </T>
          <Row style={{ justifyContent: 'space-around', alignItems: 'flex-start' }}>
            <PlateColumn
              title={avg.counted ? 'Your usual plate' : 'No plates yet'}
              grains={avg.counted ? avg.grains : 0}
              protein={avg.protein}
              veg={avg.veg}
              grain={grain}
              empty={!avg.counted}
            />
            <PlateColumn title="A balanced plate" grains={1} protein={1} veg={2} grain={grain} />
          </Row>
          <View style={{ backgroundColor: C.soft, borderRadius: 14, padding: 12, gap: 4 }}>
            <Legend color={FOOD.grain} text="Rice, bread or other grains: one fist" />
            <Legend color={FOOD.protein} text="Meat, fish, eggs, beans or lentils: one palm" />
            <Legend color={FOOD.veg} text="Vegetables or salad: two handfuls, half the plate" />
          </View>
        </View>

        <PutiSays title={idea.title}>{idea.body}</PutiSays>

        {/* Family board: titles, not ranks. */}
        <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T w="bold" size={19}>
              Family board
            </T>
            <View style={{ backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
              <T w="semibold" size={14} color={C.deep}>
                {familyPlates} plates together
              </T>
            </View>
          </Row>
          <T size={14} color={C.muted}>
            Everyone is best at something.
          </T>
          {board.map((s) => (
            <Pressable key={s.member.id} onPress={() => onPerson(s.member.id)} accessibilityRole="button" accessibilityLabel={`${s.member.name}, ${titles.get(s.member.id)}`}>
              <Row gap={10} style={{ paddingVertical: 4 }}>
                <Avatar member={s.member} size={44} />
                <View style={{ flex: 1 }}>
                  <T w="semibold">{s.member.id === me.id ? 'You' : s.member.name}</T>
                  <Row gap={4}>
                    <Ionicons name="ribbon" size={14} color={C.leaf} />
                    <T size={14} color={C.deep}>
                      {titles.get(s.member.id)}
                    </T>
                  </Row>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T w="bold" size={17} color={C.deep}>
                    {s.meals}
                  </T>
                  <T size={12} color={C.muted}>
                    {s.meals === 1 ? 'plate' : 'plates'}{s.streak > 0 ? ` · ${s.streak} day streak` : ''}
                  </T>
                </View>
              </Row>
            </Pressable>
          ))}
        </View>

        {loved && loved.hearts.length > 0 ? (
          <View style={{ backgroundColor: C.pinkSoft, borderRadius: 22, padding: 14, gap: 10 }}>
            <Eyebrow>Most loved {offset === 0 ? 'this week' : 'that week'}</Eyebrow>
            <Row gap={12}>
              {loved.photo ? (
                <Image source={{ uri: loved.photo }} style={{ width: 64, height: 64, borderRadius: 14 }} />
              ) : (
                <PlateCard size={64} grains={loved.handfuls} protein={loved.protein} veg={loved.veg} grain={loved.grain ?? store.goalFood} party={loved.party} />
              )}
              <View style={{ flex: 1 }}>
                <T w="semibold">{loved.dish || store.mealTitle(loved)}</T>
                <T size={14} color={C.muted}>
                  {store.mealTitle(loved)}, {whenText(loved.date)}
                </T>
              </View>
              <Row gap={4}>
                <Ionicons name="heart" size={20} color={C.heart} />
                <T w="bold" color="#8A2942">
                  {loved.hearts.length}
                </T>
              </Row>
            </Row>
          </View>
        ) : null}

        <Pressable onPress={onCheckup} accessibilityRole="button">
          <View style={{ backgroundColor: C.deep, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text" size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="semibold" color={C.white}>
                Checkup coming up?
              </T>
              <T size={14} color="#CFE6D9">
                Make a PDF of what you ate to show the doctor.
              </T>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.white} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function PlateColumn({ title, grains, protein, veg, grain, empty }: { title: string; grains: number; protein: number; veg: number; grain: string; empty?: boolean }) {
  return (
    <View style={{ alignItems: 'center', width: '48%', gap: 6 }}>
      <PlateCard size={128} grains={empty ? 0 : grains} protein={empty ? 0 : protein} veg={empty ? 0 : veg} grain={grain} />
      <T w="semibold" center>
        {title}
      </T>
      {!empty ? (
        <T size={14} color={C.muted} center>
          {handsText(grains, 'fist', 'fists')} {grain}
          {'\n'}
          {handsText(protein, 'palm', 'palms')} protein
          {'\n'}
          {handsText(veg, 'handful', 'handfuls')} veg
        </T>
      ) : null}
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <Row gap={8}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, borderWidth: 1, borderColor: '#CCD4CF' }} />
      <T size={14} style={{ flex: 1 }}>
        {text}
      </T>
    </Row>
  );
}
