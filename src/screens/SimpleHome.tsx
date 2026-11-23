import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { PutiDressed, wornCostume } from '../costumes';
import { Avatar, Btn, Eyebrow, Row, T } from '../ui';
import { dayName, greeting, sameDay } from '../words';
import MealCard from './MealCard';
import MedsCard from './Meds';
import { NewsCard } from './OurTable';
import { QuestCard } from './Quest';

/** Days of sharing before comments, then the family quest, show up in the simple view. */
export const UNLOCK = { comments: 4, quest: 7 };

/**
 * The simple view, for the person the family looks after. One screen: a big button to share a plate,
 * the family's plates below it, hearts one tap away. No tabs, no points to read. New things appear
 * as the person settles in, and "See everything" is always there for anyone who wants more.
 */
export default function SimpleHome({ onAdd, onMe, onPerson }: { onAdd: () => void; onMe: () => void; onPerson: (id: string) => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [breakAsk, setBreakAsk] = useState(false);
  const { family, me, meals, cheers, prefs } = store;
  if (!family || !me) return null;

  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const iShared = meals.some((m) => m.memberId === me.id && sameDay(new Date(m.date), today));
  const recent = meals.filter((m) => sameDay(new Date(m.date), today) || sameDay(new Date(m.date), yesterday)).slice(0, 12);
  const note = cheers.find((c) => c.toId === me.id && !c.mealId && today.getTime() - new Date(c.date).getTime() < 4 * 86_400_000);
  const from = note ? store.member(note.fromId) : undefined;
  const canComment = store.daysShared >= UNLOCK.comments;
  const questOpen = store.questLive && store.daysShared >= UNLOCK.quest;
  const breakEnds = prefs.breakUntil ? new Date(prefs.breakUntil) : null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={C.leaf}
          onRefresh={async () => {
            setRefreshing(true);
            await store.refresh().catch(() => undefined);
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T w="medium" size={17} color={C.deep}>
              {greeting()},
            </T>
            <T w="bold" size={32} style={{ lineHeight: 38 }}>
              {me.name}
            </T>
          </View>
          <Pressable onPress={onMe} accessibilityRole="button" accessibilityLabel="Settings" style={{ minWidth: 52, height: 52, borderRadius: 26, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, flexDirection: 'row', gap: 6 }}>
            <Ionicons name="settings-outline" size={22} color={C.deep} />
          </Pressable>
        </Row>
        <Row gap={12}>
          <PutiDressed costume={wornCostume(family.costumes, prefs.wear)} mood={iShared ? 'happy' : 'hello'} width={104} />
          <T w="bold" size={24} style={{ flex: 1, lineHeight: 30 }}>
            {store.onBreak ? 'Rest well. Your family is here.' : iShared ? 'Thank you for sharing!' : 'Did you eat?'}
          </T>
        </Row>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Show my plate"
          style={({ pressed }) => ({
            minHeight: 76,
            borderRadius: 24,
            backgroundColor: C.leaf,
            opacity: pressed ? 0.85 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            shadowColor: C.leaf,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          })}
        >
          <Ionicons name="camera" size={32} color={C.white} />
          <T w="bold" size={22} color={C.white}>
            {iShared ? 'Show another plate' : 'Show my plate'}
          </T>
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {breakEnds && store.onBreak ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <T size={16}>Meal reminders are quiet until {dayName(breakEnds)}. Medicine reminders still come.</T>
            <Btn kind="ghost" label="I'm back" icon="sunny" onPress={() => store.takeBreak(null)} />
          </View>
        ) : null}

        {store.news ? <NewsCard /> : null}

        {note && from ? (
          <View style={{ backgroundColor: C.pinkSoft, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar member={from} size={44} />
            <View style={{ flex: 1 }}>
              <T size={18}>{note.text}</T>
              <T size={14} color={C.muted}>
                {from.name}
              </T>
            </View>
            <Ionicons name="heart" size={22} color={C.heart} />
          </View>
        ) : null}

        <MedsCard />

        {questOpen ? <QuestCard /> : null}

        <Eyebrow>Your family's plates</Eyebrow>
        {recent.length ? (
          recent.map((meal) => <MealCard key={meal.id} meal={meal} onPerson={onPerson} canComment={canComment} />)
        ) : (
          <T size={17} color={C.muted}>
            No plates yet today. Yours can be the first.
          </T>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          {!store.onBreak ? (
            breakAsk ? (
              <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
                <T w="semibold" size={17}>
                  Take a break from meal reminders?
                </T>
                <T size={15} color={C.muted}>
                  Your family still sees your plates when you share. Medicine reminders keep coming.
                </T>
                <Row gap={8}>
                  <Btn kind="ghost" label="3 days" onPress={() => store.takeBreak(3).then(() => setBreakAsk(false))} style={{ flex: 1 }} />
                  <Btn kind="ghost" label="1 week" onPress={() => store.takeBreak(7).then(() => setBreakAsk(false))} style={{ flex: 1 }} />
                </Row>
                <Pressable onPress={() => setBreakAsk(false)} accessibilityRole="button" hitSlop={8}>
                  <T w="semibold" center color={C.deep}>
                    Not now
                  </T>
                </Pressable>
              </View>
            ) : (
              <Btn kind="line" icon="moon-outline" label="Take a break" onPress={() => setBreakAsk(true)} />
            )
          ) : null}
          <Btn kind="line" icon="apps-outline" label="See everything" onPress={() => store.setPrefs({ simple: false })} />
        </View>
      </View>
    </ScrollView>
  );
}
