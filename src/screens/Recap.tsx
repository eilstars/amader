import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Parts } from '../types';
import { Avatar, Card, Eyebrow, Hero, PART_COLORS, PART_NAMES, Plate, PlatePie, Row, Soft, T, Tag } from '../ui';
import { DAY_LETTERS, amountText, dateText, sameDay, weekDays, whenText } from '../words';

/** The weekly recap: who came to the table, how the goal food went, what the family loved. */
export default function Recap({ onCheckup }: { onCheckup: () => void }) {
  const store = useStore();
  const [offset, setOffset] = useState(0);
  const { family, me, meals } = store;
  if (!family || !me) return null;

  const days = weekDays(offset);
  const end = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate() + 1);
  const weekMeals = meals.filter((m) => {
    const d = new Date(m.date);
    return d >= days[0] && d < end;
  });
  const mine = weekMeals.filter((m) => m.memberId === me.id);
  const answered = mine.filter((m) => m.handfuls !== null);
  const onPlan = answered.filter((m) => (m.handfuls ?? 0) <= store.goalHandfuls).length;
  const hearts = weekMeals.reduce((sum, m) => sum + m.hearts.length, 0);
  const loved = [...weekMeals].sort((a, b) => b.hearts.length - a.hearts.length)[0];
  const food = store.goalFood;

  // The week's plate: the average of what the photos showed.
  const average = (list: typeof meals): Parts | null => {
    const seen = list.filter((m) => m.parts);
    if (seen.length === 0) return null;
    const sum = { grain: 0, veg: 0, protein: 0, other: 0 };
    seen.forEach((m) => {
      const p = m.parts as Parts;
      const total = p.grain + p.veg + p.protein + p.other || 1;
      sum.grain += (p.grain / total) * 100;
      sum.veg += (p.veg / total) * 100;
      sum.protein += (p.protein / total) * 100;
      sum.other += (p.other / total) * 100;
    });
    return { grain: Math.round(sum.grain / seen.length), veg: Math.round(sum.veg / seen.length), protein: Math.round(sum.protein / seen.length), other: Math.round(sum.other / seen.length) };
  };
  const plate = average(mine);
  const plateCount = mine.filter((m) => m.parts).length;

  // Compare with the week before, in plain words.
  const before = weekDays(offset - 1);
  const mineBefore = meals.filter((m) => {
    const d = new Date(m.date);
    return m.memberId === me.id && d >= before[0] && d < days[0];
  }).length;
  const plateBefore = average(meals.filter((m) => {
    const d = new Date(m.date);
    return m.memberId === me.id && d >= before[0] && d < days[0];
  }));
  const trend =
    mine.length === 0
      ? 'No plates from you this week yet. One photo is enough to start.'
      : mine.length > mineBefore
        ? `You shared ${mine.length} ${mine.length === 1 ? 'meal' : 'meals'}, up from ${mineBefore} the week before.`
        : mine.length === mineBefore
          ? `You shared ${mine.length} ${mine.length === 1 ? 'meal' : 'meals'}, the same as the week before.`
          : `You shared ${mine.length} ${mine.length === 1 ? 'meal' : 'meals'}. The week before it was ${mineBefore}.`;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Hero>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T w="medium" size={14} color={C.deep}>
              Week of {dateText(days[0])}
            </T>
            <T w="bold" size={26}>
              Our week at the table
            </T>
          </View>
        </Row>
        <Row style={{ marginTop: 12 }} gap={8}>
          <WeekButton icon="chevron-back" label="Earlier week" onPress={() => setOffset(offset - 1)} />
          <WeekButton icon="chevron-forward" label="Later week" onPress={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0} />
          {offset !== 0 ? (
            <Pressable onPress={() => setOffset(0)} accessibilityRole="button">
              <T w="semibold" size={14} color={C.deep}>
                Back to this week
              </T>
            </Pressable>
          ) : null}
        </Row>
      </Hero>

      <View style={{ padding: 20, gap: 16 }}>
        <Card style={{ gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T w="bold" size={18}>
              Who came to the table
            </T>
            <Tag text={`${weekMeals.length} ${weekMeals.length === 1 ? 'meal' : 'meals'}`} />
          </Row>
          <Row gap={0}>
            <View style={{ width: 84 }} />
            {DAY_LETTERS.map((letter, i) => (
              <T key={i} size={11} color={C.muted} center style={{ flex: 1 }}>
                {letter}
              </T>
            ))}
          </Row>
          {family.members.map((m) => (
            <Row key={m.id} gap={0}>
              <Row gap={6} style={{ width: 84 }}>
                <Avatar member={m} size={26} />
                <T w="medium" size={13} numberOfLines={1} style={{ flex: 1 }}>
                  {m.id === me.id ? 'You' : m.name}
                </T>
              </Row>
              {days.map((day, i) => {
                const meal = weekMeals.find((x) => x.memberId === m.id && sameDay(new Date(x.date), day));
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Plate size={30} empty={!meal} photo={meal?.photo} handfuls={meal?.handfuls} />
                  </View>
                );
              })}
            </Row>
          ))}
          <T size={12} color={C.muted}>
            A full plate is a shared meal. An empty plate is a day off.
          </T>
        </Card>

        {plate ? (
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T w="bold" size={18}>
                Your plate this week
              </T>
              <Tag text={`from ${plateCount} ${plateCount === 1 ? 'photo' : 'photos'}`} />
            </Row>
            <Row gap={16}>
              <PlatePie parts={plate} size={132} />
              <View style={{ flex: 1, gap: 8 }}>
                {(['grain', 'veg', 'protein', 'other'] as const).map((k) => (
                  <Row key={k} gap={8}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PART_COLORS[k], borderWidth: k === 'grain' ? 1 : 0, borderColor: '#D9CFB0' }} />
                    <T size={13} style={{ flex: 1 }}>
                      {PART_NAMES[k]}
                    </T>
                    <T w="semibold" size={13}>
                      {plate[k]}%
                    </T>
                  </Row>
                ))}
              </View>
            </Row>
            {plateBefore && plate.veg !== plateBefore.veg ? (
              <T size={13} color={C.muted}>
                Dal and vegetables were {plateBefore.veg}% of your plate last week and {plate.veg}% this week.
              </T>
            ) : null}
            <T size={12} color={C.muted}>
              A rough picture from your photos, not a measurement.
            </T>
          </Card>
        ) : null}

        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T w="bold" size={18}>
              Your {food.toLowerCase()}
            </T>
            {answered.length > 0 ? <Tag text={`${onPlan} of ${answered.length} on plan`} /> : null}
          </Row>
          {answered.length === 0 ? (
            <T size={14} color={C.muted}>
              Nothing logged this week.
            </T>
          ) : (
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {[...answered].reverse().map((m) => (
                <View key={m.id} style={{ alignItems: 'center', gap: 2 }}>
                  <Plate size={40} handfuls={m.handfuls} />
                  <T size={11} color={C.muted}>
                    {(m.handfuls ?? 0) >= 4 ? '4+' : m.handfuls}
                  </T>
                </View>
              ))}
            </Row>
          )}
          <T size={12} color={C.muted}>
            Your plan is {amountText(store.goalHandfuls, food)} a meal. More mounds on a plate means a bigger serving.
          </T>
        </Card>

        <Soft>
          <T w="semibold" size={14}>
            {trend}
          </T>
          <T size={13} color={C.muted}>
            The family sent {hearts} {hearts === 1 ? 'heart' : 'hearts'} this week.
          </T>
        </Soft>

        {loved && loved.hearts.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <Eyebrow>Most loved this week</Eyebrow>
            <Row>
              <Plate size={52} photo={loved.photo} handfuls={loved.handfuls} />
              <View style={{ flex: 1 }}>
                <T w="semibold">{store.mealTitle(loved)}</T>
                <T size={13} color={C.muted}>
                  {whenText(loved.date)}
                </T>
              </View>
              <Row gap={4}>
                <Ionicons name="heart" size={18} color={C.heart} />
                <T w="semibold" color="#8A2942">
                  {loved.hearts.length}
                </T>
              </Row>
            </Row>
          </Card>
        ) : null}

        <Pressable onPress={onCheckup} accessibilityRole="button">
          <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <T w="semibold" size={16} color={C.deep}>
              Checkup coming up? Get ready
            </T>
            <Ionicons name="chevron-forward" size={18} color={C.deep} />
          </Row>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function WeekButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Ionicons name={icon} size={18} color={C.ink} />
    </Pressable>
  );
}
