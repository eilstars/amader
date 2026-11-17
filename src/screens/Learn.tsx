import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { LEARN_NOTE, LESSONS, LEVELS, Lesson, MY_REASONS, THEIR_REASONS } from '../learn';
import { Avatar, Btn, Chip, Puti, Row, T } from '../ui';

const RIGHT = 10;
const TRIED = 4;
const PLEDGE = 5;
const COMBO = 5;
const REPLAY = 2;

/**
 * Learn as a game: your reason at the top, then one card at a time. Guess, see what is at stake
 * for the people you love, pick one small thing to try. Points, combos and levels along the way.
 */
export default function Learn({ onTeach }: { onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { prefs } = store;
  const lessons = LESSONS.filter((l) => !l.ramadan || prefs.ramadan);
  const total = prefs.learnLog.reduce((sum, e) => sum + e.p, 0);
  const level = [...LEVELS].reverse().find((l) => total >= l.at) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.at > total);
  const [index, setIndex] = useState(() => {
    const fresh = lessons.findIndex((l) => !prefs.learned.includes(l.id));
    return fresh === -1 ? 0 : fresh;
  });
  const [combo, setCombo] = useState(0);
  const lesson = lessons[index % lessons.length];
  const seen = lessons.filter((l) => prefs.learned.includes(l.id)).length;
  const caregiver = store.me?.role === 'child' && store.family?.members.some((m) => m.role === 'parent' && m.id !== store.me?.id);

  const earn = (p: number, extra: Partial<typeof prefs> = {}) => store.setPrefs({ learnLog: [...store.prefs.learnLog, { d: new Date().toISOString(), p }].slice(-400), ...extra });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T w="bold" size={28} style={{ lineHeight: 34 }}>
            Learn
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, height: 40 }}>
            <Ionicons name="star" size={18} color={C.leaf} />
            <T w="bold">{total}</T>
            <T size={14} color={C.muted}>
              · {level.name}
            </T>
          </View>
        </Row>
        <Levels total={total} />
        {next ? (
          <T size={14} color={C.deep}>
            {next.at - total} points to {next.name}
          </T>
        ) : null}
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {/* The person being looked after sees their reason first. A caregiver plays first, then sends a reason. */}
        {caregiver ? null : <Reason />}

        <Card
          key={`${lesson.id}-${index}`}
          lesson={lesson}
          number={(index % lessons.length) + 1}
          of={lessons.length}
          replay={prefs.learned.includes(lesson.id)}
          combo={combo}
          pledged={prefs.pledges.includes(lesson.id)}
          onAnswer={(right) => {
            const replay = prefs.learned.includes(lesson.id);
            const nextCombo = right ? combo + 1 : 0;
            setCombo(nextCombo);
            const base = replay ? (right ? REPLAY : 0) : right ? RIGHT : TRIED;
            const bonus = !replay && nextCombo >= 3 ? COMBO : 0;
            earn(base + bonus, replay ? {} : { learned: [...store.prefs.learned, lesson.id] });
            return base + bonus;
          }}
          onPledge={() => earn(PLEDGE, { pledges: [...store.prefs.pledges, lesson.id] })}
          onNext={() => setIndex(index + 1)}
        />

        <T size={14} color={C.muted} center>
          {seen} of {lessons.length} cards seen
        </T>

        {caregiver ? <Reason /> : null}

        <Pressable onPress={onTeach} accessibilityRole="button">
          <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="hand-left" size={22} color={C.leaf} />
            </View>
            <T w="semibold" style={{ flex: 1 }}>
              Play: drag the rice
            </T>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </View>
        </Pressable>

        <T size={12} color={C.muted} center>
          {LEARN_NOTE}
        </T>
      </View>
    </ScrollView>
  );
}

/**
 * The reason. For the person being looked after: what they want to stay healthy for, and the notes
 * their family sent. For a caregiver: a way to tell them why they matter.
 */
function Reason() {
  const store = useStore();
  const { me, family, prefs, cheers } = store;
  const [sent, setSent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (!me || !family) return null;
  const cared = family.members.find((m) => m.role === 'parent' && m.id !== me.id);

  if (me.role === 'child' && cared) {
    // Once a reason has gone, it folds to one line so it doesn't crowd the cards.
    const before = cheers.find((c) => c.fromId === me.id && c.toId === cared.id && THEIR_REASONS.includes(c.text));
    if (before && !open && !sent) {
      return (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ backgroundColor: C.pinkSoft, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="heart" size={20} color={C.heart} />
          <T size={15} style={{ flex: 1 }} numberOfLines={2}>
            You told {cared.name}: "{before.text}"
          </T>
          <T w="semibold" size={14} color="#8A2942">
            Send another
          </T>
        </Pressable>
      );
    }
    return (
      <View style={{ backgroundColor: C.pinkSoft, borderRadius: 22, padding: 14, gap: 10 }}>
        <Row gap={10}>
          <Avatar member={cared} size={40} />
          <T w="bold" size={19} style={{ flex: 1 }}>
            Tell {cared.name} why you need them healthy
          </T>
        </Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {THEIR_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              on={sent === r}
              onPress={() =>
                store
                  .sendCheer(cared.id, r)
                  .then(() => setSent(r))
                  .catch(() => undefined)
              }
            />
          ))}
        </Row>
        {sent ? (
          <T w="semibold" size={14} color="#8A2942">
            Sent. It will show on {cared.name}'s Learn page.
          </T>
        ) : null}
      </View>
    );
  }

  // Notes from family that say why. The newest three.
  const fromFamily = cheers.filter((c) => c.toId === me.id).slice(0, 3);
  return (
    <View style={{ backgroundColor: C.deep, borderRadius: 22, padding: 16, gap: 12 }}>
      {prefs.why ? (
        <Pressable onPress={() => store.setPrefs({ why: null })} accessibilityRole="button" accessibilityLabel="Change my reason">
          <T size={14} color="#CFE6D9">
            I'm doing this to
          </T>
          <T w="bold" size={24} color={C.white} style={{ lineHeight: 30 }}>
            {prefs.why.charAt(0).toLowerCase() + prefs.why.slice(1)}
          </T>
        </Pressable>
      ) : (
        <>
          <T w="bold" size={20} color={C.white}>
            What do you want to stay healthy for?
          </T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {MY_REASONS.map((r) => (
              <Pressable key={r} onPress={() => store.setPrefs({ why: r })} accessibilityRole="button" style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
                <T w="medium" color={C.white}>
                  {r}
                </T>
              </Pressable>
            ))}
          </Row>
        </>
      )}
      {fromFamily.map((c) => {
        const from = store.member(c.fromId);
        return (
          <Row key={c.id} gap={10}>
            {from ? <Avatar member={from} size={30} /> : null}
            <T size={16} color={C.white} style={{ flex: 1 }}>
              "{c.text}"
            </T>
          </Row>
        );
      })}
    </View>
  );
}

function Card({
  lesson,
  number,
  of,
  replay,
  combo,
  pledged,
  onAnswer,
  onPledge,
  onNext,
}: {
  lesson: Lesson;
  number: number;
  of: number;
  replay: boolean;
  combo: number;
  pledged: boolean;
  onAnswer: (right: boolean) => number;
  onPledge: () => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [won, setWon] = useState(0);
  const [tried, setTried] = useState(pledged);
  const answered = picked !== null;
  const right = picked === lesson.answer;

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 16, gap: 12, borderWidth: 2, borderColor: answered ? (right ? C.leaf : C.lightGreen) : '#E6EBE6' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T w="semibold" size={14} color={C.muted}>
          Card {number} of {of}
        </T>
        {combo >= 2 ? (
          <Row gap={4}>
            <Ionicons name="flame" size={16} color={C.heart} />
            <T w="bold" size={14} color="#8A2942">
              {combo} in a row
            </T>
          </Row>
        ) : null}
      </Row>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={lesson.icon as keyof typeof Ionicons.glyphMap} size={22} color={C.leaf} />
        </View>
        <T w="bold" size={21} style={{ flex: 1, lineHeight: 28 }}>
          {lesson.ask}
        </T>
      </Row>

      {lesson.options.map((o, i) => {
        const isAnswer = answered && i === lesson.answer;
        const wrongPick = answered && i === picked && !right;
        return (
          <Pressable
            key={o}
            disabled={answered}
            onPress={() => {
              setPicked(i);
              setWon(onAnswer(i === lesson.answer));
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 58,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: isAnswer ? C.leaf : wrongPick ? C.line : C.line,
              backgroundColor: isAnswer ? C.mint : pressed ? C.soft : C.white,
              opacity: answered && !isAnswer && !wrongPick ? 0.5 : 1,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            })}
          >
            <T w={isAnswer ? 'bold' : 'medium'} size={18} style={{ flex: 1 }}>
              {o}
            </T>
            {isAnswer ? <Ionicons name="checkmark-circle" size={26} color={C.leaf} /> : null}
          </Pressable>
        );
      })}

      {answered ? (
        <View style={{ gap: 12 }}>
          <Row gap={12}>
            <Puti mood={right ? 'happy' : 'hello'} width={64} />
            <View style={{ flex: 1 }}>
              <T w="bold" size={19} color={C.deep}>
                {right ? 'You knew it!' : 'Most people guess that too.'}
              </T>
              {won > 0 ? (
                <T w="bold" size={16} color={C.leaf}>
                  +{won} points{!replay && combo >= 3 ? ' with a combo' : ''}
                </T>
              ) : null}
            </View>
          </Row>
          <T size={17}>{lesson.why}</T>
          {lesson.stake ? (
            <View style={{ backgroundColor: C.pinkSoft, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10 }}>
              <Ionicons name="heart" size={20} color={C.heart} />
              <T w="semibold" size={16} style={{ flex: 1 }}>
                {lesson.stake}
              </T>
            </View>
          ) : null}
          <View style={{ backgroundColor: C.mint, borderRadius: 16, padding: 12, gap: 10 }}>
            <T w="semibold" size={16}>
              {lesson.tryThis}
            </T>
            {tried ? (
              <Row gap={6}>
                <Ionicons name="checkmark-circle" size={20} color={C.leaf} />
                <T w="semibold" color={C.deep}>
                  On your list this week
                </T>
              </Row>
            ) : (
              <Btn
                label={`I'll try it  +${PLEDGE}`}
                kind="primary"
                onPress={() => {
                  setTried(true);
                  onPledge();
                }}
                style={{ minHeight: 48 }}
              />
            )}
          </View>
          <Btn kind="ghost" label="Next card" icon="arrow-forward" onPress={onNext} />
        </View>
      ) : null}
    </View>
  );
}

/** The road from Curious to Table Teacher, as stepping stones. */
function Levels({ total }: { total: number }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      {LEVELS.map((l, i) => {
        const done = total >= l.at;
        return (
          <React.Fragment key={l.name}>
            {i > 0 ? <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: done ? C.leaf : '#BFDCCB' }} /> : null}
            <View accessibilityLabel={`${l.name}${done ? ', reached' : ''}`} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: done ? C.leaf : C.white, borderWidth: 2, borderColor: done ? C.leaf : '#BFDCCB', alignItems: 'center', justifyContent: 'center' }}>
              {done ? <Ionicons name="star" size={14} color={C.white} /> : <T size={12} w="bold" color={C.muted}>{i + 1}</T>}
            </View>
          </React.Fragment>
        );
      })}
    </Row>
  );
}
