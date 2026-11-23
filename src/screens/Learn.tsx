import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { LEARN_NOTE, LESSONS, Lesson } from '../learn';
import { Btn, MadoPic, RoundButton, Row, T } from '../ui';


/**
 * Learn as a game: your reason at the top, then one card at a time. Guess, see what is at stake
 * for the people you love, pick one small thing to try. No points: the family quest is the game.
 */
export default function Learn({ onTeach, onClose }: { onTeach: () => void; onClose?: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { prefs } = store;
  const lessons = LESSONS.filter((l) => !l.ramadan || prefs.ramadan);
  const [index, setIndex] = useState(() => {
    const fresh = lessons.findIndex((l) => !prefs.learned.includes(l.id));
    return fresh === -1 ? 0 : fresh;
  });
  const lesson = lessons[index % lessons.length];
  const seen = lessons.filter((l) => prefs.learned.includes(l.id)).length;


  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {onClose ? <RoundButton icon="chevron-back" label="Back" onPress={onClose} /> : null}
          <T w="bold" size={28} style={{ lineHeight: 34, flex: 1 }}>
            Cards
          </T>
        </Row>
        <T size={15} color={C.deep}>
          {seen} of {lessons.length} cards seen
        </T>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Card
          key={`${lesson.id}-${index}`}
          lesson={lesson}
          number={(index % lessons.length) + 1}
          of={lessons.length}
          replay={prefs.learned.includes(lesson.id)}
          combo={0}
          pledged={prefs.pledges.includes(lesson.id)}
          onAnswer={() => {
            const replay = prefs.learned.includes(lesson.id);
            if (!replay) store.setPrefs({ learned: [...store.prefs.learned, lesson.id] });
            return 0;
          }}
          onPledge={() => store.setPrefs({ pledges: [...store.prefs.pledges, lesson.id] })}
          onNext={() => setIndex(index + 1)}
        />



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

export function Card({
  lesson,
  number,
  of,
  replay,
  combo,
  pledged,
  onAnswer,
  onPledge,
  onNext,
  hideNext,
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
  /** For a fixed set of cards shown one under another, with no "next". */
  hideNext?: boolean;
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
            <MadoPic mood={right ? 'happy' : 'hello'} width={64} />
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
                label="I'll try it"
                kind="primary"
                onPress={() => {
                  setTried(true);
                  onPledge();
                }}
                style={{ minHeight: 48 }}
              />
            )}
          </View>
          {hideNext ? null : <Btn kind="ghost" label="Next card" icon="arrow-forward" onPress={onNext} />}
        </View>
      ) : null}
    </View>
  );
}
