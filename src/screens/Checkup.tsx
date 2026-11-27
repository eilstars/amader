import React, { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlateCard } from '../food';
import { useStore } from '../store';
import { C } from '../theme';
import { sharePdf } from '../pdf';
import { starchSummaryHtml, summaryHtml } from '../summary';
import { PILOT } from '../pilot';
import { doctorSummary, lastStarch, usualFor } from '../starch';
import { AmountArt } from '../starchArt';
import { plateAverage } from '../game';
import { Btn, Chip, PageHead, Row, T } from '../ui';
import { dateText, daysBetween, handsText, slotName } from '../words';

/**
 * A plain log of what this person shared, as a PDF to bring to a checkup.
 * It belongs to them: only their own meals, and only they can send it.
 * No health numbers, no readings, no advice.
 */
export default function Checkup({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState(30);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const me = store.me;
  if (!me) return null;

  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - range);
  const mine = store.meals.filter((m) => m.memberId === me.id && new Date(m.date) >= since);
  const real = mine.filter((m) => m.slot !== 'fasting');
  const avg = plateAverage(real);
  const daysLogged = new Set(mine.map((m) => new Date(m.date).toDateString())).size;
  const plates = real.filter((m) => m.photo).slice(0, 6);

  const checkup = store.checkupDate ? new Date(store.checkupDate) : null;
  const daysToGo = checkup ? daysBetween(now, checkup) : null;
  const setIn = (days: number) => store.setCheckupDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toISOString());

  async function makePdf() {
    setBusy(true);
    setStatus(null);
    try {
      const html = (PILOT ? starchSummaryHtml : summaryHtml)({ me: me!, meals: mine, since, now, grain: store.goalFood, checkup });
      const how = await sharePdf(html, `Meal summary for ${me!.name}`);
      setStatus(how === 'printed' ? 'Choose "Save as PDF" in the print window to keep a copy.' : null);
    } catch {
      setStatus("We couldn't make the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <PageHead title="For the doctor" onBack={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <T size={16} color={C.muted}>
          {daysToGo === null
            ? 'A one page PDF of what you ate, to show at a checkup. When is yours?'
            : daysToGo > 0
              ? `Your checkup is in ${daysToGo} ${daysToGo === 1 ? 'day' : 'days'}. Bring this PDF along.`
              : daysToGo === 0
                ? 'Your checkup is today. Show the PDF on your phone, or print it.'
                : 'Your checkup date has passed. Set the next one?'}
        </T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Chip label="In 1 week" on={daysToGo === 7} onPress={() => setIn(7)} />
          <Chip label="In 1 month" on={daysToGo === 30} onPress={() => setIn(30)} />
          <Chip label="In 3 months" on={daysToGo === 90} onPress={() => setIn(90)} />
          {checkup ? <Chip label="Clear" on={false} onPress={() => store.setCheckupDate(null)} /> : null}
        </Row>

        {/* A preview of the page, so people know what they are sending. */}
        <View style={{ backgroundColor: C.white, borderRadius: 8, padding: 18, gap: 12, borderWidth: 1, borderColor: '#DDE3DF', shadowColor: C.ink, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <T w="bold" size={19} color={C.deep}>
                Meal summary for {me.name}
              </T>
              <T size={13} color={C.muted}>
                {dateText(since)} to {dateText(now)}
              </T>
            </View>
            <T w="bold" color={C.leaf}>
              Amader
            </T>
          </Row>
          <Row gap={8}>
            <Chip label="Last 2 weeks" on={range === 14} onPress={() => setRange(14)} />
            <Chip label="Month" on={range === 30} onPress={() => setRange(30)} />
            <Chip label="3 months" on={range === 90} onPress={() => setRange(90)} />
          </Row>
          {PILOT ? (
            <View style={{ gap: 8 }}>
              <AmountArt starch={lastStarch(store.meals, me.id) ?? 'rice'} amount={usualFor(store.meals, me.id, lastStarch(store.meals, me.id) ?? 'rice')} size={40} />
              {doctorSummary(store.meals, me.id, now).map((l) => (
                <T key={l} size={14} color={C.muted}>
                  {l}
                </T>
              ))}
            </View>
          ) : (
          <Row gap={14}>
            <PlateCard size={92} grains={avg.counted ? avg.grains : 0} protein={avg.protein} veg={avg.veg} grain={store.goalFood} />
            <View style={{ flex: 1, gap: 2 }}>
              <T w="semibold">A usual plate</T>
              <T size={14} color={C.muted}>
                {avg.counted ? `${handsText(avg.grains, 'fist', 'fists')} ${store.goalFood.toLowerCase()} · ${handsText(avg.protein, 'palm', 'palms')} protein · ${handsText(avg.veg, 'handful', 'handfuls')} veg` : 'Not enough plates yet'}
              </T>
            </View>
          </Row>
          )}
          {[
            ['Meals shared', String(real.length)],
            ['Days with something logged', `${daysLogged} of ${range}`],
            ['Snacks', String(real.filter((m) => m.slot === 'snack').length)],
            ...(PILOT ? [] : [['Fasting days', String(mine.filter((m) => m.slot === 'fasting').length)]]),
            ['Eaten with others', String(real.filter((m) => (m.withIds?.length ?? 0) > 0 || m.withOthers).length)],
          ].map(([k, v]) => (
            <Row key={k} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EDF0EA', paddingTop: 8 }}>
              <T size={15}>{k}</T>
              <T w="semibold" size={15}>
                {v}
              </T>
            </Row>
          ))}
          {plates.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
              {plates.map((m) => (
                <View key={m.id} style={{ width: '33.33%', padding: 3 }}>
                  <Image source={{ uri: m.photo as string }} accessibilityLabel={`${m.dish || slotName(m.slot)}, ${dateText(new Date(m.date))}`} style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: C.soft }} />
                </View>
              ))}
            </View>
          ) : null}
          <T size={12} color={C.muted}>
            {PILOT ? 'Plus the starch for each day. Hand measures, not weighed amounts. Not a medical record.' : 'Plus a full meal log. Hand measures, not weighed amounts. Not a medical record.'}
          </T>
        </View>

        <Btn label={busy ? 'Making the PDF...' : 'Make the PDF'} icon="document-text" disabled={busy || mine.length === 0} onPress={makePdf} />
        {status ? (
          <T size={14} color={C.deep} center>
            {status}
          </T>
        ) : null}

        <View style={{ gap: 8 }}>
          <T w="semibold">Questions you might ask</T>
          {[PILOT ? 'Is the amount of rice or roti I usually eat right for me?' : `Is ${handsText(avg.grains || store.goalHandfuls, 'fist', 'fists')} of ${store.goalFood.toLowerCase()} a meal right for me?`, 'Is there anything I should change about when I eat?', ...(PILOT ? [] : ["Anything to change when I'm fasting?"])].map((q) => (
            <View key={q} style={{ backgroundColor: C.soft, borderRadius: 14, padding: 12 }}>
              <T size={15}>{q}</T>
            </View>
          ))}
        </View>
        <T center color={C.muted} size={13}>
          Only your own meals. Only you can send it. No readings or medical advice.
        </T>
      </ScrollView>
    </View>
  );
}
