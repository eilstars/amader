import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { LEARN_NOTE, LESSONS, Lesson } from '../learn';
import { Puti, Row, T } from '../ui';

/** Small ideas as questions. Guess first, then see why. New ones come first. */
export default function Learn({ onTeach }: { onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const learned = store.prefs.learned;
  const lessons = LESSONS.filter((l) => !l.ramadan || store.prefs.ramadan);
  // Keep the order steady while the person is on the screen, so a card does not jump away after answering.
  const [order] = useState(() => [...lessons].sort((a, b) => Number(learned.includes(a.id)) - Number(learned.includes(b.id))));
  const seen = lessons.filter((l) => learned.includes(l.id)).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 10 }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T w="bold" size={28} style={{ lineHeight: 34 }}>
              Learn
            </T>
            <T size={16} color={C.muted}>
              One small idea at a time. Tap your guess, there are no wrong answers here.
            </T>
          </View>
          <Puti mood="hello" width={84} />
        </Row>
        <Row gap={8}>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: C.white, overflow: 'hidden' }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.leaf, width: `${Math.round((seen / Math.max(1, lessons.length)) * 100)}%` }} />
          </View>
          <T w="semibold" size={14} color={C.deep}>
            {seen} of {lessons.length}
          </T>
        </Row>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Pressable onPress={onTeach} accessibilityRole="button">
          <View style={{ backgroundColor: C.deep, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="hand-left" size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="semibold" color={C.white}>
                Drag the rice
              </T>
              <T size={14} color="#CFE6D9">
                See the whole idea on a plate in ten seconds.
              </T>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.white} />
          </View>
        </Pressable>

        {order.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} done={learned.includes(lesson.id)} onAnswered={() => !learned.includes(lesson.id) && store.setPrefs({ learned: [...store.prefs.learned, lesson.id] })} />
        ))}

        <T size={13} color={C.muted} center>
          {LEARN_NOTE}
        </T>
      </View>
    </ScrollView>
  );
}

export function LessonCard({ lesson, done, onAnswered }: { lesson: Lesson; done?: boolean; onAnswered?: () => void }) {
  const [picked, setPicked] = useState<number | null>(done ? lesson.answer : null);
  const answered = picked !== null;
  const right = picked === lesson.answer;
  return (
    <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 10, borderWidth: 1, borderColor: answered ? C.lightGreen : '#E6EBE6' }}>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={lesson.icon as keyof typeof Ionicons.glyphMap} size={20} color={C.leaf} />
        </View>
        <T w="semibold" size={18} style={{ flex: 1 }}>
          {lesson.ask}
        </T>
      </Row>
      {lesson.options.map((o, i) => {
        const isAnswer = answered && i === lesson.answer;
        const isWrongPick = answered && i === picked && !right;
        return (
          <Pressable
            key={o}
            disabled={answered}
            onPress={() => {
              setPicked(i);
              onAnswered?.();
            }}
            accessibilityRole="button"
            style={{ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: isAnswer ? C.leaf : C.line, backgroundColor: isAnswer ? C.mint : isWrongPick ? C.soft : C.white, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <T size={17} style={{ flex: 1 }} w={isAnswer ? 'semibold' : 'regular'}>
              {o}
            </T>
            {isAnswer ? <Ionicons name="checkmark-circle" size={22} color={C.leaf} /> : null}
          </Pressable>
        );
      })}
      {answered ? (
        <View style={{ gap: 8 }}>
          {!done ? (
            <T w="semibold" color={C.deep}>
              {right ? 'You knew it!' : 'Most people guess that too.'}
            </T>
          ) : null}
          <T size={16}>{lesson.why}</T>
          <View style={{ backgroundColor: C.mint, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8 }}>
            <Ionicons name="bulb" size={20} color={C.leaf} />
            <T size={15} style={{ flex: 1 }}>
              <T w="semibold" size={15}>
                Try this:{' '}
              </T>
              {lesson.tryThis}
            </T>
          </View>
        </View>
      ) : null}
    </View>
  );
}
