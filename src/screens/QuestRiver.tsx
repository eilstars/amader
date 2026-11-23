import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { CostumeArt } from '../costumes';
import { BigButton, Chip, Confetti, Faces, Icon, K, Mado, RoundIcon, S, Sheet, card } from '../design';
import { sendOnWhatsApp } from '../nudge';
import { QUESTS, dayKey, weekKey } from '../quests';
import { useStore } from '../store';
import { C } from '../theme';
import { Member } from '../types';
import { T } from '../ui';
import { sameDay, startOfDay, weekDays } from '../words';

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const XS = [0.66, 0.4, 0.2, 0.42, 0.7, 0.42, 0.58];

/** The quest opened up: the week as a river, a stone a day, Mado at today, the costume at the end. */
export default function QuestRiver({ onBack, onAdd, onCards }: { onBack: () => void; onAdd: () => void; onCards: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [picking, setPicking] = useState(false);
  const q = store.quest;
  const family = store.family;
  if (!q || !family) return null;
  const W = Math.min(width, 480);
  const days = weekDays(0);
  const today = startOfDay(new Date());
  const todayI = days.findIndex((d) => sameDay(d, today));
  const step = 86;
  const pts = days.map((_, i) => [W * XS[i], 40 + i * step] as [number, number]);

  // Who put something in on each day.
  const whoOn = (d: Date): Member[] => {
    const ids = new Set<string>();
    if (q.quest.how === 'tick') store.ticks.filter((t) => t.kind === q.quest.id && t.day === dayKey(d)).forEach((t) => ids.add(t.memberId));
    else store.meals.filter((m) => sameDay(new Date(m.date), d) && q.quest.counts?.(m)).forEach((m) => ids.add(m.memberId));
    return family.members.filter((m) => ids.has(m.id));
  };

  const pathTo = (n: number) => pts.slice(0, n + 1).reduce((acc, [x, y], i) => (i === 0 ? `M${x} ${y - 40}` + ` L${x} ${y}` : `${acc} C${pts[i - 1][0]} ${pts[i - 1][1] + step / 2}, ${x} ${y - step / 2}, ${x} ${y}`), '');
  const H = 40 + 6 * step + 60;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${pathTo(6)}" fill="none" stroke="${K.pale}" stroke-width="54" stroke-linecap="round"/><path d="${pathTo(Math.max(0, todayI))}" fill="none" stroke="${C.lightGreen}" stroke-width="54" stroke-linecap="round"/></svg>`;

  return (
    <View style={{ flex: 1, backgroundColor: C.mint }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 }}>
          <RoundIcon name="back" onPress={onBack} label="Back to the table" />
          <View style={{ flex: 1 }}>
            <T w="bold" size={S.title} style={{ lineHeight: 26 }}>
              {q.quest.name}
            </T>
            <T w="medium" size={S.small} color={C.deep}>
              {q.quest.goal} · {q.done} of {q.goal}
            </T>
          </View>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={{ backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <T w="bold" size={S.small} color={C.deep}>
              Change
            </T>
          </Pressable>
        </View>
        <Pressable onPress={onCards} accessibilityRole="button" style={{ marginLeft: 18, marginTop: 10, alignSelf: 'flex-start' }}>
          <Chip text="Why it matters: guess first" icon="book" />
        </Pressable>

        <View style={{ width: W, height: H, alignSelf: 'center', marginTop: 8 }}>
          <SvgXml xml={xml} width={W} height={H} />
          {days.map((d, i) => {
            const [x, y] = pts[i];
            const people = whoOn(d);
            if (i === todayI) {
              return (
                <View key={i} style={{ position: 'absolute', left: x - 50, top: y - 40, width: 100, alignItems: 'center' }}>
                  <Mado mood="happy" width={88} />
                  <View style={{ backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2, marginTop: -2 }}>
                    <T w="bold" size={S.small} color={C.deep}>
                      Today
                    </T>
                  </View>
                </View>
              );
            }
            if (i === 6) {
              return (
                <View key={i} style={{ position: 'absolute', left: x - 36, top: y - 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.white, borderWidth: 4, borderColor: q.finished ? C.leaf : C.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
                    <CostumeArt id={q.quest.costume} size={50} />
                  </View>
                  <T w="bold" size={S.small} color={C.deep}>
                    Sunday{'\n'}
                    {q.quest.costumeName}
                  </T>
                </View>
              );
            }
            const past = i < todayI;
            const done = people.length > 0;
            return (
              <View key={i} style={{ position: 'absolute', left: x - 26, top: y - 26, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: done ? C.leaf : C.white, borderWidth: 4, borderColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Icon name="check" size={16} color={C.white} /> : null}
                  <T w="bold" size={12} color={done ? C.white : past ? C.muted : C.muted} style={{ lineHeight: 14 }}>
                    {DAY[i]}
                  </T>
                </View>
                {people.length ? <Faces members={people} size={22} ring={C.mint} /> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 18, right: 18, bottom: insets.bottom + 18 }}>
        {q.quest.how === 'tick' ? (
          <BigButton label={store.tickedToday ? 'Ticked today. Thank you!' : q.quest.tickLabel ?? 'Done today'} icon="check" kind={store.tickedToday ? 'mint' : 'primary'} onPress={() => store.tickQuest(!store.tickedToday)} />
        ) : (
          <BigButton label="Share a plate for it" icon="camera" onPress={onAdd} />
        )}
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} height="88%">
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, gap: 10 }}>
          <T w="bold" size={S.title}>
            This week's quest
          </T>
          <T w="medium" size={S.small} color={C.muted}>
            Everyone does it together. Pick one for the family.
          </T>
          {QUESTS.map((x) => {
            const on = x.id === q.quest.id;
            const won = (family.costumes ?? []).includes(x.costume);
            return (
              <Pressable
                key={x.id}
                onPress={() => {
                  store.setQuest(x.id);
                  setPicking(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[card, { padding: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, on && { backgroundColor: C.mint, borderWidth: 2.5, borderColor: C.leaf }]}
              >
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: on ? C.white : C.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <CostumeArt id={x.costume} size={42} />
                </View>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                    {x.name}
                  </T>
                  <T w="medium" size={S.small} color={C.muted}>
                    {x.goal}
                  </T>
                  <T w="bold" size={S.small} color={C.deep}>
                    Win: {x.costumeName}
                    {won ? ' (won)' : ''}
                  </T>
                </View>
                {on ? <Icon name="check" size={22} color={C.leaf} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

/** The week's quest is done: a full screen moment, once per phone. */
export function Celebration() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const progress = store.quest;
  const key = progress ? `${weekKey()}:${progress.quest.id}` : '';
  const show = store.questLive && !!progress?.finished && !store.prefs.celebrated.includes(key);
  if (!progress) return null;
  const { quest, done } = progress;
  const people = store.family?.members.filter((m) => (progress.byMember[m.id] ?? 0) > 0) ?? [];
  return (
    <Modal visible={show} animationType="fade" onRequestClose={() => store.claimCostume()}>
      <View style={{ flex: 1, backgroundColor: C.mint, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        <Confetti points={[[8, 120, 20], [86, 140, -30], [18, 360, 50], [82, 380, 10], [28, 90, -60], [72, 90, 35], [8, 260, 80], [90, 280, -15], [50, 70, 15]]} />
        <View style={{ alignItems: 'center', gap: 14, flex: 1, justifyContent: 'center' }}>
          <Chip text={`${done} of ${progress.goal} together`} bg={C.leaf} color={C.white} />
          <View style={{ width: 210, height: 210, borderRadius: 105, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 14, borderColor: 'rgba(255,255,255,0.5)' }}>
            <Mado mood="happy" width={150} costume={quest.costume} />
          </View>
          <T w="bold" size={36} center style={{ lineHeight: 40 }}>
            {quest.name} done!
          </T>
          <T size={S.body} color={C.deep} center>
            You did it together {done} times.{'\n'}Mado earned the {quest.costumeName.toLowerCase()}.
          </T>
          {people.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Faces members={people} size={32} ring={C.mint} />
              <T w="bold" size={S.small} color={C.deep}>
                Everyone helped
              </T>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <BigButton
            label="Put it on Mado"
            icon="sparkle"
            onPress={() => {
              store.setPrefs({ wear: null });
              store.claimCostume();
            }}
          />
          <BigButton label="Tell the family" icon="whatsapp" kind="line" onPress={() => sendOnWhatsApp(`We finished ${quest.name} on Amader! Mado earned the ${quest.costumeName.toLowerCase()}.`)} />
        </View>
      </View>
    </Modal>
  );
}
