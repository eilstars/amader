import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { LEARN_NOTE, LESSONS } from '../learn';
import { QUESTS, weekKey } from '../quests';
import { CostumeArt, PutiDressed, costumeName, isCostume, wornCostume } from '../costumes';
import { Avatar, Btn, Eyebrow, Row, T } from '../ui';
import { familyStreak } from '../game';
import { sendOnWhatsApp } from '../nudge';
import { dayHeading } from '../words';
import { Card } from './Learn';


/** Ionicons by name, for quest icons kept as plain strings. */
type Icon = keyof typeof Ionicons.glyphMap;

/** The family bar: this week's quest, how far along, and a tick for things a photo can't show. */
export function QuestCard({ onOpen, showPeople }: { onOpen?: () => void; showPeople?: boolean }) {
  const store = useStore();
  const progress = store.quest;
  if (!progress || !store.family) return null;
  const { quest, done, goal, byMember, finished } = progress;
  const share = Math.min(1, done / goal);
  const people = store.family.members.filter((m) => m.joined);

  const body = (
    <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
      <Row gap={10}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={quest.icon as Icon} size={24} color={C.leaf} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="semibold" size={13} color={C.leaf} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            Family quest
          </T>
          <T w="bold" size={19} style={{ lineHeight: 24 }}>
            {quest.name}
          </T>
          <T size={15} color={C.muted}>
            {quest.goal}
          </T>
        </View>
        {onOpen ? <Ionicons name="chevron-forward" size={20} color={C.muted} /> : null}
      </Row>
      <View accessibilityLabel={`${done} of ${goal} for the family`} style={{ height: 14, borderRadius: 7, backgroundColor: C.soft, overflow: 'hidden' }}>
        <View style={{ width: `${share * 100}%`, height: 14, borderRadius: 7, backgroundColor: C.leaf }} />
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T w="semibold" size={15} color={C.deep}>
          {finished ? 'Done! The family did it.' : `${done} of ${goal} for the family`}
        </T>
        <Row gap={4}>
          {isCostume(quest.costume) ? <CostumeArt id={quest.costume} size={26} /> : null}
          <T size={13} color={C.muted}>
            {quest.costumeName}
          </T>
        </Row>
      </Row>
      {showPeople ? (
        <Row gap={10} style={{ flexWrap: 'wrap' }}>
          {people.map((m) => (
            <Row key={m.id} gap={6} style={{ backgroundColor: C.soft, borderRadius: 999, paddingRight: 10 }}>
              <Avatar member={m} size={28} />
              <T w="semibold" size={14}>
                {byMember[m.id] ?? 0}
              </T>
            </Row>
          ))}
        </Row>
      ) : null}
      {quest.how === 'tick' ? <TickButton /> : null}
    </View>
  );
  if (!onOpen) return body;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Family quest: ${quest.name}, ${done} of ${goal}`}>
      {body}
    </Pressable>
  );
}

/**
 * The one counter, pinned at the top of every tab: Puti in the family's costume, this week's
 * quest and how far the family got, and the family streak. Everyone in the family sees the same
 * numbers, because they come from shared plates and ticks. Tap it for the quest.
 */
export function FamilyBar({ onOpen }: { onOpen: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const progress = store.quest;
  if (!progress || !store.family || !store.questLive) return null;
  const { quest, done, goal, finished } = progress;
  const joined = store.family.members.filter((m) => m.joined).map((m) => m.id);
  const streak = familyStreak(store.meals, joined);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${quest.name}: ${Math.min(done, goal)} of ${goal}. Family streak ${streak} days. Open quests.`}
      style={{ backgroundColor: C.deep, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <PutiDressed costume={wornCostume(store.family.costumes, store.prefs.wear)} mood="happy" width={52} />
      <View style={{ flex: 1, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T w="bold" size={15} color={C.white} numberOfLines={1} style={{ flex: 1 }}>
            {quest.name}
          </T>
          <T w="semibold" size={14} color="#C9E4D6">
            {finished ? 'Done!' : `${done} of ${goal}`}
          </T>
        </Row>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, (done / goal) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: C.lightGreen }} />
        </View>
      </View>
      <View style={{ alignItems: 'center', minWidth: 44 }}>
        <Row gap={3}>
          <Ionicons name="flame" size={18} color={C.heart} />
          <T w="bold" size={17} color={C.white}>
            {streak}
          </T>
        </Row>
        <T size={11} color="#C9E4D6">
          together
        </T>
      </View>
    </Pressable>
  );
}

/** "I walked after a meal": one tap, once a day, and a second tap takes it back. */
export function TickButton() {
  const store = useStore();
  const quest = store.quest?.quest;
  if (!quest || quest.how !== 'tick') return null;
  if (store.tickedToday) {
    return (
      <Pressable onPress={() => store.tickQuest(false)} accessibilityRole="button" accessibilityLabel="Ticked today. Tap to undo." style={{ minHeight: 52, borderRadius: 16, backgroundColor: C.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Ionicons name="checkmark-circle" size={24} color={C.leaf} />
        <T w="semibold" color={C.deep}>
          Done today, +1 for the family
        </T>
      </Pressable>
    );
  }
  return <Btn label={quest.tickLabel ?? 'I did it today'} icon="checkmark" onPress={() => store.tickQuest(true)} />;
}

/** Shown once on each phone when the family finishes the quest. */
export function Celebration() {
  const store = useStore();
  const progress = store.quest;
  const key = progress ? `${weekKey()}:${progress.quest.id}` : '';
  const show = store.questLive && !!progress?.finished && !store.prefs.celebrated.includes(key);
  if (!progress) return null;
  const { quest, done } = progress;
  const people = store.family?.members.filter((m) => (progress.byMember[m.id] ?? 0) > 0) ?? [];
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => store.claimCostume()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,36,28,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxWidth: 420, backgroundColor: C.rice, borderRadius: 28, padding: 22, alignItems: 'center', gap: 12 }}>
          <View style={{ backgroundColor: C.mint, borderRadius: 999, padding: 18 }}>
            <PutiDressed costume={quest.costume} mood="happy" width={180} />
          </View>
          <T w="bold" size={28} center style={{ lineHeight: 34 }}>
            The family did it!
          </T>
          <T size={17} center>
            {quest.name}: {done} together this week. Puti earned the {quest.costumeName.toLowerCase()}.
          </T>
          {people.length ? (
            <Row gap={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {people.map((m) => (
                <Row key={m.id} gap={6} style={{ backgroundColor: C.white, borderRadius: 999, paddingRight: 10 }}>
                  <Avatar member={m} size={30} />
                  <T w="semibold" size={14}>
                    {m.name} {progress.byMember[m.id]}
                  </T>
                </Row>
              ))}
            </Row>
          ) : null}
          <Btn
            label="Put it on Puti"
            icon="sparkles"
            onPress={() => {
              store.setPrefs({ wear: null });
              store.claimCostume();
            }}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * The Quests tab, in place of the old Learn tab. The family quest comes first; the lessons are the
 * "why" behind it. Then a game with real family plates, Puti's wardrobe, and the rest of the cards.
 */
export default function Quests({ onCards, onTeach }: { onCards: () => void; onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const progress = store.quest;
  const family = store.family;
  if (!progress || !family) return null;
  const briefing = progress.quest.briefing.map((id) => LESSONS.find((l) => l.id === id)).filter((l) => !!l);
  const worn = wornCostume(family.costumes, store.prefs.wear);


  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <T w="medium" size={15} color={C.deep}>
              This week, together
            </T>
            <T w="bold" size={28} style={{ lineHeight: 34 }}>
              Quests
            </T>
          </View>
          <PutiDressed costume={worn} mood="happy" width={110} />
        </Row>
        {!store.questLive ? (
          <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 10 }}>
            <T w="bold" size={19}>
              Quests start when your family joins
            </T>
            <T size={15} color={C.muted}>
              A quest is a team goal for the week. Invite someone and you'll fill the bar together, and Puti earns a costume when you finish.
            </T>
            {family.members
              .filter((m) => !m.joined)
              .map((m) => (
                <Btn key={m.id} icon="logo-whatsapp" label={`Send ${m.name} the invite`} onPress={() => sendOnWhatsApp(store.inviteFor(m.name))} />
              ))}
          </View>
        ) : (
          <QuestCard showPeople />
        )}
        {store.questLive ? <Pressable onPress={() => setPicking(!picking)} accessibilityRole="button" hitSlop={8}>
          <T w="semibold" size={15} color={C.deep} style={{ textDecorationLine: 'underline' }}>
            {picking ? 'Close' : 'Pick a different quest for this week'}
          </T>
        </Pressable> : null}
        {picking ? (
          <View style={{ gap: 8 }}>
            {QUESTS.map((q) => {
              const on = q.id === progress.quest.id;
              const earned = family.costumes?.includes(q.costume);
              return (
                <Pressable
                  key={q.id}
                  onPress={() => {
                    store.setQuest(q.id);
                    setPicking(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{ backgroundColor: on ? C.white : 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: on ? C.leaf : 'transparent' }}
                >
                  <Ionicons name={q.icon as Icon} size={22} color={C.leaf} />
                  <View style={{ flex: 1 }}>
                    <T w="semibold">{q.name}</T>
                    <T size={14} color={C.muted}>
                      {q.goal}
                    </T>
                  </View>
                  {earned ? <Ionicons name="checkmark-circle" size={20} color={C.leaf} accessibilityLabel="Costume earned" /> : null}
                </Pressable>
              );
            })}
            <T size={13} color={C.deep}>
              The whole family sees the new quest. Progress starts again from what already counts this week.
            </T>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Eyebrow>Why this week</Eyebrow>
        {briefing.map((lesson, i) => (
          <Card
            key={lesson.id}
            lesson={lesson}
            number={i + 1}
            of={briefing.length}
            replay={store.prefs.learned.includes(lesson.id)}
            combo={0}
            pledged={store.prefs.pledges.includes(lesson.id)}
            onAnswer={() => {
              if (!store.prefs.learned.includes(lesson.id)) store.setPrefs({ learned: [...store.prefs.learned, lesson.id] });
              return 0;
            }}
            onPledge={() => store.setPrefs({ pledges: [...store.prefs.pledges, lesson.id] })}
            onNext={() => undefined}
            hideNext
          />
        ))}

        <GuessThePlate />

        <Wardrobe />

        <Row gap={10}>
          <Btn kind="ghost" icon="albums" label="More cards" onPress={onCards} style={{ flex: 1 }} />
          <Btn kind="ghost" icon="hand-left" label="Drag the rice" onPress={onTeach} style={{ flex: 1 }} />
        </Row>
        <T size={12} color={C.muted} center>
          {LEARN_NOTE}
        </T>
      </View>
    </ScrollView>
  );
}

/**
 * Guess the plate: a recent plate from someone else in the family, and "how many fists of rice?".
 * It trains the eye for portions. The answer is just what they counted, never good or bad.
 */
function GuessThePlate() {
  const store = useStore();
  const meId = store.session?.meId;
  const [picked, setPicked] = useState<number | null>(null);
  const [mealId, setMealId] = useState<string | null>(null);
  const candidates = useMemo(
    () =>
      store.meals.filter(
        (m) => m.memberId !== meId && m.slot !== 'fasting' && m.slot !== 'snack' && !m.sameAs && (m.handfuls ?? 0) > 0 && Date.now() - new Date(m.date).getTime() < 7 * 86_400_000,
      ),
    [store.meals, meId],
  );
  const meal = candidates.find((m) => m.id === mealId) ?? candidates.find((m) => !store.prefs.guessed.includes(m.id));
  if (!meal) return null;
  const who = store.member(meal.memberId);
  const grain = meal.grain ?? store.goalFood;
  const answer = Math.min(4, meal.handfuls ?? 0);
  const answered = picked !== null;

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Guess the plate</Eyebrow>
        <T size={13} color={C.muted}>
          Train your eye for portions
        </T>
      </Row>
      <Row gap={12}>
        {meal.photo ? (
          <Image source={{ uri: meal.photo }} style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: C.soft }} accessibilityLabel={meal.dish ?? 'Meal photo'} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.steel, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="help" size={36} color={C.white} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T w="semibold" size={14} color={C.muted}>
            {who?.name ?? 'Someone'}'s {meal.slot}, {dayHeading(new Date(meal.date)).toLowerCase()}
          </T>
          <T w="bold" size={18}>
            {meal.dish ?? 'A family plate'}
          </T>
          <T size={16}>How many fists of {grain.toLowerCase()}?</T>
        </View>
      </Row>
      <Row gap={8}>
        {[1, 2, 3, 4].map((n) => {
          const isAnswer = answered && n === answer;
          return (
            <Pressable
              key={n}
              disabled={answered}
              onPress={() => {
                setPicked(n);
                setMealId(meal.id);
                store.setPrefs({ guessed: [...store.prefs.guessed, meal.id].slice(-100) });
              }}
              accessibilityRole="button"
              accessibilityLabel={`${n === 4 ? '4 or more' : n} ${n === 1 ? 'fist' : 'fists'}`}
              style={{ flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: isAnswer ? C.leaf : C.line, backgroundColor: isAnswer ? C.mint : C.white, alignItems: 'center', justifyContent: 'center', opacity: answered && !isAnswer && n !== picked ? 0.5 : 1 }}
            >
              <T w="bold" size={20}>
                {n === 4 ? '4+' : n}
              </T>
            </Pressable>
          );
        })}
      </Row>
      {answered ? (
        <View style={{ gap: 10 }}>
          <T size={16}>
            {who?.name ?? 'They'} counted {answer >= 4 ? '4 or more fists' : `${answer} ${answer === 1 ? 'fist' : 'fists'}`}. {picked === answer ? 'Same as you!' : 'Fists are easier to see than they sound. Try another.'}
          </T>
          {candidates.some((m) => m.id !== meal.id && !store.prefs.guessed.includes(m.id)) ? (
            <Btn
              kind="ghost"
              label="Another plate"
              icon="arrow-forward"
              onPress={() => {
                setPicked(null);
                setMealId(null);
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Puti's costumes: the ones the family earned, and which one Puti wears on this phone. */
function Wardrobe() {
  const store = useStore();
  const earned = store.family?.costumes ?? [];
  const worn = wornCostume(earned, store.prefs.wear);
  return (
    <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Puti's wardrobe</Eyebrow>
        <T size={13} color={C.muted}>
          {earned.length} of {QUESTS.length}
        </T>
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {QUESTS.map((q) => {
          const have = earned.includes(q.costume);
          const on = have && worn === q.costume;
          return (
            <Pressable
              key={q.costume}
              disabled={!have}
              onPress={() => store.setPrefs({ wear: on ? 'none' : q.costume })}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !have }}
              accessibilityLabel={have ? `${costumeName(q.costume)}${on ? ', Puti is wearing it' : ''}` : `${costumeName(q.costume)}, finish ${q.name} to earn it`}
              style={{ width: 92, alignItems: 'center', gap: 4, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: on ? C.leaf : C.line, backgroundColor: have ? C.white : C.soft }}
            >
              <View style={{ opacity: have ? 1 : 0.25 }}>{isCostume(q.costume) ? <CostumeArt id={q.costume} size={48} /> : null}</View>
              <T w="semibold" size={12} center numberOfLines={2} color={have ? C.ink : C.muted}>
                {have ? q.costumeName : q.name}
              </T>
            </Pressable>
          );
        })}
      </Row>
      <T size={14} color={C.muted}>
        Finish a family quest to earn its costume. Tap one to dress Puti.
      </T>
    </View>
  );
}
