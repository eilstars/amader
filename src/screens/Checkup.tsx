import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { shareText } from '../share';
import { Btn, Card, Eyebrow, RoundButton, Row, T } from '../ui';
import { amountText, dateText, daysBetween, portionLine, timeText } from '../words';
import { Chip } from './SetupFamily';

/**
 * A plain log of what this person shared, to bring to a checkup.
 * It belongs to them: only their own meals, and only they can send it.
 * No health numbers, no readings, no advice.
 */
export default function Checkup({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [sent, setSent] = useState<string | null>(null);
  const me = store.me;
  if (!me) return null;

  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
  const mine = store.meals.filter((m) => m.memberId === me.id && new Date(m.date) >= since);
  const food = store.goalFood;
  const answered = mine.filter((m) => m.handfuls !== null).map((m) => m.handfuls as number);
  const counts = new Map<number, number>();
  answered.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));
  const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const daysLogged = new Set(mine.map((m) => new Date(m.date).toDateString())).size;
  const slots = ['breakfast', 'lunch', 'dinner'].map((s) => ({ s, n: mine.filter((m) => m.slot === s).length })).sort((a, b) => b.n - a.n);

  const checkup = store.checkupDate ? new Date(store.checkupDate) : null;
  const daysToGo = checkup ? daysBetween(now, checkup) : null;
  const setIn = (days: number) => store.setCheckupDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toISOString());

  const rows: [string, string][] = [
    ['Meals shared', String(mine.length)],
    ['Days with a meal logged', `${daysLogged} of 90`],
    ['Most often shared', mine.length ? slots[0].s : 'Nothing yet'],
    [`${food}, usually`, usual === undefined ? 'Nothing yet' : usual === 0 ? 'None' : `${amountText(usual, food)} a meal`],
  ];

  const summary = [
    `Meal summary for ${me.name}`,
    `${dateText(since)} to ${dateText(now)} (last 90 days)`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Recent meals',
    ...mine.slice(0, 40).map((m) => `${dateText(new Date(m.date))}, ${timeText(m.date)}: ${m.slot}${portionLine(m.handfuls, food) ? `, ${portionLine(m.handfuls, food)}` : ''}`),
    '',
    'This is a simple log of meals shared in the Amader app. Portions are rough hand measures, not weighed amounts. It is not a medical record.',
  ].join('\n');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <RoundButton icon="chevron-back" label="Back" onPress={onClose} />
      <View style={{ gap: 4 }}>
        <T w="bold" size={28}>
          Getting ready for the doctor
        </T>
        <T color={C.muted} size={14}>
          {daysToGo === null ? 'When is your next checkup?' : daysToGo > 0 ? `Your checkup is in ${daysToGo} ${daysToGo === 1 ? 'day' : 'days'}.` : daysToGo === 0 ? 'Your checkup is today.' : 'Your checkup date has passed. Set the next one?'}
        </T>
      </View>

      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Chip label="In 1 week" on={daysToGo === 7} onPress={() => setIn(7)} />
        <Chip label="In 1 month" on={daysToGo === 30} onPress={() => setIn(30)} />
        <Chip label="In 3 months" on={daysToGo === 90} onPress={() => setIn(90)} />
        {checkup ? <Chip label="Clear" on={false} onPress={() => store.setCheckupDate(null)} /> : null}
      </Row>

      <Card style={{ gap: 0 }}>
        <Eyebrow>What you shared, last 90 days</Eyebrow>
        {rows.map(([k, v], i) => (
          <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: '#EDF0EA' }}>
            <T style={{ flex: 1 }}>{k}</T>
            <T w="semibold">{v}</T>
          </Row>
        ))}
      </Card>

      <View style={{ gap: 8 }}>
        <T w="semibold" size={14}>
          Questions you might ask
        </T>
        {[`Is ${amountText(store.goalHandfuls, food)} of ${food.toLowerCase()} a meal right for me?`, 'Is there anything I should change about when I eat?', "Anything to change when I'm fasting?"].map((q) => (
          <View key={q} style={{ backgroundColor: C.soft, borderRadius: 14, padding: 14 }}>
            <T size={14}>{q}</T>
          </View>
        ))}
      </View>

      <Btn
        label={sent ?? 'Share the meal summary'}
        icon="share-outline"
        onPress={async () => {
          const how = await shareText(summary).catch(() => null);
          if (how === 'copied') setSent('Copied. Paste it anywhere');
        }}
      />
      <T center color={C.muted} size={12}>
        A simple log of what you shared. No readings or medical advice. Only you can send it.
      </T>
    </ScrollView>
  );
}
