import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CostumeArt, costumeName, isCostume } from '../costumes';
import { BigButton, Face, Icon, Mado, RoundIcon, S, card } from '../design';
import { Key, digits } from '../i18n';
import { PopIn } from '../motion';
import { QUESTS } from '../quests';
import {
  COSTUME_COST,
  GRAINS,
  STOPS,
  Stop,
  familyGrains,
  familyStreak,
  focusMembers,
  halves,
  nextState,
  pathOf,
  pathProgress,
  stepChoices,
} from '../starch';
import { FoodArt } from '../starchArt';
import { useStore } from '../store';
import { C } from '../theme';
import { T } from '../ui';
import { WeekDots } from './StarchLog';

const STOP_TEXT: Record<Stop, [Key, Key]> = {
  usual: ['stopUsual', 'stopUsualText'],
  step: ['stopStep', 'stopStepText'],
  veg: ['stopVeg', 'stopVegText'],
  step2: ['stopStep2', 'stopStep2Text'],
  easy: ['stopEasy', 'stopEasyText'],
};

/**
 * The path and the family's grains on one page. The path is a river of stops: the usual, a step the person picks,
 * sabzi first, another step, then easy weeks. Below it, this week's bowl, the family streak, and what grains buy.
 */
export default function Path({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const { t, lang, family, meals, cheers } = store;
  const insets = useSafeAreaInsets();
  const focus = family ? focusMembers(family.members) : [];
  // A person looked after sees their own path; everyone else starts on the first person they look after.
  const [who, setWho] = useState(() => (store.me && focus.some((m) => m.id === store.me?.id) ? store.me.id : focus[0]?.id ?? store.me?.id ?? ''));
  const person = family?.members.find((m) => m.id === who);
  const state = pathOf(family, who);
  const progress = useMemo(() => pathProgress(meals, who, state), [meals, who, state]);
  const grains = useMemo(() => (family ? familyGrains(family, meals, cheers.length) : null), [family, meals, cheers.length]);
  const streak = useMemo(() => (family ? familyStreak(meals, family.members) : { days: 0, freezesLeft: 2 }), [family, meals]);
  const [choosing, setChoosing] = useState(false);
  const stop = STOPS[state.level];
  const amount = (n: number | null) => (n === null ? '' : digits(halves(n), lang));
  const mine = who === store.me?.id;
  // Choosing a step is the person's own choice. Family can see the path but only they pick.
  const canChoose = mine || !person?.joined;
  const needsStep = progress.held && (STOPS[state.level + 1] === 'step' || STOPS[state.level + 1] === 'step2');

  async function advance(step: number | null) {
    setChoosing(false);
    await store.setPath(who, nextState(state, step));
  }

  if (!family || !person) return null;
  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <RoundIcon name="back" onPress={onBack} label={t('close')} />
          <View style={{ flex: 1 }}>
            <T size={S.small} color={C.muted}>
              {mine ? t('myPath') : t('pathOf', { name: person.name })}
            </T>
            <T w="bold" size={S.title}>
              {t('pathSub')}
            </T>
          </View>
        </View>
        {focus.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {focus.map((m) => (
              <Pressable key={m.id} onPress={() => setWho(m.id)} accessibilityRole="tab" accessibilityState={{ selected: m.id === who }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 14, paddingLeft: 4, minHeight: 44, borderRadius: 22, backgroundColor: m.id === who ? C.leaf : C.white }}>
                <Face member={m} size={34} />
                <T w="bold" size={S.small} color={m.id === who ? C.white : C.deep}>
                  {m.name}
                </T>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* The river: stops from the bottom (start) to the top (easy weeks), Mado at the current one. */}
        <View style={{ gap: 0 }}>
          {[...STOPS].map((s, i) => ({ s, i })).reverse().map(({ s, i }) => {
            const done = i < state.level;
            const here = i === state.level;
            const [title, text] = STOP_TEXT[s];
            const stepAmount = here || done ? state.step : null;
            return (
              <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
                <View style={{ width: 44, alignItems: 'center' }}>
                  <View style={{ width: 14, flex: 1, backgroundColor: i < STOPS.length - 1 ? (i < state.level ? C.lightGreen : C.mint) : 'transparent', borderRadius: 7, marginBottom: -6 }} />
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: done ? C.leaf : here ? C.white : C.white, borderWidth: here ? 3 : done ? 0 : 2, borderColor: here ? C.leaf : C.mint, alignItems: 'center', justifyContent: 'center' }}>
                    {done ? <Icon name="check" size={22} color={C.white} /> : s === 'veg' ? <FoodArt art="sabzi" size={28} /> : s === 'easy' ? <Icon name="sparkle" size={22} /> : <T w="bold" color={C.deep}>{digits(String(i + 1), lang)}</T>}
                  </View>
                  <View style={{ width: 14, flex: 1, backgroundColor: i > 0 ? (i <= state.level ? C.lightGreen : C.mint) : 'transparent', borderRadius: 7, marginTop: -6 }} />
                </View>
                <View style={[here ? card : null, { flex: 1, marginVertical: 6, paddingVertical: here ? 14 : 8, gap: 6 }, here && { borderWidth: 2, borderColor: C.leaf }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T w="bold" size={here ? S.title : S.body} color={done || here ? C.ink : C.muted} style={{ flex: 1 }}>
                      {t(title, { amount: amount(stepAmount) || '?' })}
                    </T>
                    {here ? <Mado width={56} mood="happy" /> : null}
                  </View>
                  {here ? (
                    <>
                      <T size={S.small} color={C.muted}>
                        {t(text, { amount: amount(state.step) })}
                      </T>
                      {s !== 'easy' ? (
                        <>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <T w="bold" size={S.small} color={C.deep}>
                              {t('daysOf', { n: progress.done, m: progress.need })}
                            </T>
                            {progress.usual !== null ? (
                              <T size={S.small} color={C.muted}>
                                {t('usualIs', { amount: amount(progress.usual) })}
                              </T>
                            ) : null}
                          </View>
                          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.mint, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.round((progress.done / progress.need) * 100)}%`, height: 10, backgroundColor: C.leaf, borderRadius: 5 }} />
                          </View>
                          {s !== 'usual' ? <WeekDots week={progress.week} /> : null}
                          {s !== 'usual' ? (
                            <T size={12} color={C.muted}>
                              {t('freezeNote')}
                            </T>
                          ) : null}
                        </>
                      ) : null}
                      {progress.held ? (
                        <PopIn k="held">
                          <View style={{ gap: 8 }}>
                            <T w="bold" size={S.body} color={C.leaf}>
                              {t('held', { n: GRAINS.stop })}
                            </T>
                            {canChoose ? <BigButton label={t('moveOn')} icon="next" onPress={() => (needsStep ? setChoosing(true) : advance(null))} height={52} size={17} /> : null}
                          </View>
                        </PopIn>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {choosing ? (
          <View style={[card, { gap: 10, borderWidth: 2, borderColor: C.leaf }]}>
            <T w="bold" size={S.title}>
              {t('pickStep')}
            </T>
            <T size={S.small} color={C.muted}>
              {t('pickStepSub')}
            </T>
            {stepChoices(progress.usual, state.step).map((n, i, all) => (
              <BigButton key={n} label={i === all.length - 1 && all.length > 1 ? t('keepUsual', { amount: amount(n) }) : amount(n)} kind={i === 0 ? 'primary' : 'line'} onPress={() => advance(n)} height={54} size={18} />
            ))}
          </View>
        ) : null}

        {grains ? (
          <View style={[card, { gap: 12 }]}>
            <T w="bold" size={S.title}>
              {t('bowlTitle')}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Bowl fill={grains.bowl.kept / GRAINS.bowl} />
              <View style={{ flex: 1, gap: 2 }}>
                <T w="bold" size={30} color={C.deep}>
                  {digits(String(grains.bowl.kept), lang)}
                </T>
                <T size={S.small} color={C.muted}>
                  {t('keptOf', { kept: grains.bowl.kept, max: GRAINS.bowl })}
                </T>
                <T size={S.small} color={C.muted}>
                  {t('fullMonday')}
                </T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stat icon="check" big={t('streakDays', { n: streak.days })} small={t('familyStreak')} />
              <Stat icon="calendar" big={t('freezesLeft', { n: streak.freezesLeft })} small="" dashed />
            </View>
            <View style={{ gap: 8 }}>
              <T w="bold" size={S.body}>
                {t('sharedToday')}
              </T>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                {family.members
                  .filter((m) => m.joined)
                  .map((m) => {
                    const today = new Date().toDateString();
                    const did = meals.some((x) => x.memberId === m.id && new Date(x.date).toDateString() === today);
                    return (
                      <View key={m.id} style={{ alignItems: 'center', gap: 2, opacity: did ? 1 : 0.5 }}>
                        <View style={{ borderRadius: 26, borderWidth: 3, borderColor: did ? C.leaf : 'transparent' }}>
                          <Face member={m} size={44} />
                        </View>
                        <T size={13}>{m.name}</T>
                      </View>
                    );
                  })}
              </View>
            </View>
          </View>
        ) : null}

        {grains ? (
          <View style={[card, { gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <T w="bold" size={S.title}>
                {t('spend')}
              </T>
              <T w="bold" size={S.small} color={C.deep}>
                {t('potLine', { n: grains.pot })}
              </T>
            </View>
            {QUESTS.map((q) => q.costume)
              .filter(isCostume)
              .map((c) => {
                const have = family.costumes?.includes(c);
                const afford = grains.pot >= COSTUME_COST;
                return (
                  <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                      <CostumeArt id={c} size={38} />
                    </View>
                    <T w="bold" size={S.body} style={{ flex: 1 }}>
                      {costumeName(c)}
                    </T>
                    {have ? (
                      <T w="bold" size={S.small} color={C.leaf}>
                        {t('have')}
                      </T>
                    ) : (
                      <BigButton label={`${digits(String(COSTUME_COST), lang)}`} icon="sparkle" kind={afford ? 'primary' : 'line'} disabled={!afford} onPress={() => store.buyCostume(c)} height={44} size={15} />
                    )}
                  </View>
                );
              })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, big, small, dashed }: { icon: 'check' | 'calendar'; big: string; small: string; dashed?: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.soft, borderRadius: 16, padding: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: dashed ? C.mint : C.leaf, borderWidth: dashed ? 2 : 0, borderStyle: 'dashed', borderColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={dashed ? C.deep : C.white} />
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold" size={S.body}>
          {big}
        </T>
        {small ? (
          <T size={12} color={C.muted}>
            {small}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** A steel bowl of rice that empties a little for each quiet day past the two free ones. */
function Bowl({ fill }: { fill: number }) {
  const f = Math.max(0, Math.min(1, fill));
  const top = 52 - f * 40;
  return (
    <View style={{ width: 120, height: 90 }} accessibilityLabel={`${Math.round(f * 100)}%`}>
      <View style={{ position: 'absolute', left: 6, right: 6, top: 30, bottom: 0, borderBottomLeftRadius: 60, borderBottomRightRadius: 60, backgroundColor: C.steel, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 6, right: 6, top: Math.max(0, top - 30), bottom: 6, borderBottomLeftRadius: 54, borderBottomRightRadius: 54, backgroundColor: C.rice }} />
      </View>
      {f > 0.7 ? <View style={{ position: 'absolute', left: 14, right: 14, top: 14, height: 34, borderTopLeftRadius: 50, borderTopRightRadius: 50, backgroundColor: C.rice }} /> : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 28, height: 6, borderRadius: 3, backgroundColor: '#C9D1CD' }} />
    </View>
  );
}

/** The path on a home screen: where this person is, how many days so far, and the family's grains. Opens the path. */
export function PathCard({ memberId, onPress, showGrains = true }: { memberId?: string; onPress: () => void; showGrains?: boolean }) {
  const store = useStore();
  const { t, lang, family, meals, cheers } = store;
  const focus = family ? focusMembers(family.members) : [];
  const who = memberId ?? (store.me && focus.some((m) => m.id === store.me?.id) ? store.me.id : focus[0]?.id);
  const person = family?.members.find((m) => m.id === who);
  const state = pathOf(family, who ?? '');
  const progress = useMemo(() => pathProgress(meals, who ?? '', state), [meals, who, state]);
  const grains = useMemo(() => (family ? familyGrains(family, meals, cheers.length) : null), [family, meals, cheers.length]);
  if (!family || !person || !who) return null;
  const stop = STOPS[state.level];
  const [title] = STOP_TEXT[stop];
  const mine = who === store.me?.id;
  const amount = state.step === null ? '?' : digits(halves(state.step), lang);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${mine ? t('myPath') : t('pathOf', { name: person.name })}: ${t(title, { amount })}`} style={[card, { padding: 14, gap: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {mine ? <Mado width={48} mood="happy" /> : <Face member={person} size={40} />}
        <View style={{ flex: 1 }}>
          <T size={S.small} color={C.muted}>
            {mine ? t('myPath') : t('pathOf', { name: person.name })}
          </T>
          <T w="bold" size={S.body} style={{ lineHeight: 22 }}>
            {t(title, { amount })}
          </T>
        </View>
        {grains && showGrains ? (
          <View style={{ alignItems: 'flex-end' }}>
            <T w="bold" size={S.body} color={C.deep}>
              {digits(String(grains.pot), lang)}
            </T>
            <T size={12} color={C.muted}>
              {t('grains')}
            </T>
          </View>
        ) : null}
      </View>
      {stop !== 'easy' ? (
        <>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.mint, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, Math.round((progress.done / progress.need) * 100))}%`, height: 10, backgroundColor: C.leaf, borderRadius: 5 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T w="bold" size={S.small} color={C.deep}>
              {progress.held ? t('held', { n: GRAINS.stop }) : t('daysOf', { n: progress.done, m: progress.need })}
            </T>
            {stop !== 'usual' ? <WeekDots week={progress.week} size={14} /> : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}
