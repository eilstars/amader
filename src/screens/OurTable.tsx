import React, { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Meal } from '../types';
import { shareText } from '../share';
import { Avatar, Btn, Card, Eyebrow, Hero, Plate, Puti, Row, Soft, T, Tag } from '../ui';
import { dayName, daysBetween, greeting, portionLine, sameDay, timeText, weekDays, whenText, spacedCode } from '../words';

export default function OurTable({ onAdd, onMe }: { onAdd: () => void; onMe: () => void }) {
  const store = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { family, me, meals } = store;
  if (!family || !me) return null;

  const today = new Date();
  const todayOf = (memberId: string) => meals.find((m) => m.memberId === memberId && sameDay(new Date(m.date), today));
  const sharedToday = family.members.filter((m) => todayOf(m.id)).length;
  const iShared = !!todayOf(me.id);
  const waiting = family.members.filter((m) => !m.joined);

  // This week, together: everyone shares one meal a day.
  const week = weekDays();
  const weekMeals = meals.filter((m) => new Date(m.date) >= week[0]);
  const weekDone = new Set(weekMeals.map((m) => `${m.memberId}-${new Date(m.date).toDateString()}`)).size;
  const weekGoal = family.members.length * 7;

  // Something to talk about: the parent's newest meal, shown to the children.
  const parent = family.members.find((m) => m.role === 'parent' && m.id !== me.id);
  const parentLast = parent ? meals.find((m) => m.memberId === parent.id) : undefined;
  const quietDays = parentLast ? daysBetween(new Date(parentLast.date), today) : null;

  const feed = meals.slice(0, 30);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
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
      <Hero>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T w="medium" size={14} color={C.deep}>
              {greeting()}, {me.name}
            </T>
            <T w="bold" size={26}>
              Our Table
            </T>
          </View>
          <Pressable onPress={onMe} accessibilityRole="button" accessibilityLabel="Me and settings">
            <View style={{ borderWidth: 2, borderColor: C.white, borderRadius: 24 }}>
              <Avatar member={me} size={42} />
            </View>
          </Pressable>
        </Row>
      </Hero>

      <View style={{ padding: 20, gap: 16 }}>
        {store.session?.demo ? (
          <Soft>
            <T size={13} color={C.muted}>
              This is a sample family. Nothing here is real. Change who you are in the top right corner.
            </T>
          </Soft>
        ) : null}

        <Card style={{ gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T w="bold" size={19}>
              Did you eat?
            </T>
            <Tag text={`${sharedToday} of ${family.members.length} today`} />
          </Row>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1.5, borderColor: '#B9D6C6', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6 }}>
            {family.members.map((m) => {
              const meal = todayOf(m.id);
              return (
                <View key={m.id} style={{ alignItems: 'center', flex: 1, gap: 2 }}>
                  <View>
                    <Plate size={64} empty={!meal} photo={meal?.photo} handfuls={meal?.handfuls} />
                    <View style={{ position: 'absolute', right: -6, bottom: -4, borderWidth: 2, borderColor: C.white, borderRadius: 14 }}>
                      <Avatar member={m} size={24} />
                    </View>
                  </View>
                  <T w="semibold" size={13} style={{ marginTop: 6 }} numberOfLines={1}>
                    {m.id === me.id ? 'You' : m.name}
                  </T>
                  <T size={11} color={C.muted} center numberOfLines={1}>
                    {meal ? `${meal.slot[0].toUpperCase()}${meal.slot.slice(1)}, ${timeText(meal.date)}` : m.joined ? 'Not yet' : 'Invited'}
                  </T>
                </View>
              );
            })}
          </View>
          {!iShared ? <Btn label="Show my plate" icon="camera-outline" onPress={onAdd} /> : null}
        </Card>

        {waiting.length > 0 && me.role === 'child' ? (
          <Card style={{ gap: 10 }}>
            <Eyebrow>Family code</Eyebrow>
            <Row style={{ justifyContent: 'space-between' }}>
              <T w="bold" size={28} style={{ letterSpacing: 4 }}>
                {spacedCode(family.code)}
              </T>
              <Puti mood="hello" width={64} />
            </Row>
            <T size={14} color={C.muted}>
              {waiting[0].name} hasn't joined yet. Send the code. All {waiting[0].name} does is enter it and take a photo.
            </T>
            <Btn
              kind="ghost"
              icon="paper-plane-outline"
              label={copied ? 'Copied. Paste it in WhatsApp' : `Send ${waiting[0].name} the invite`}
              onPress={async () => {
                const how = await shareText(store.inviteMessage).catch(() => null);
                if (how === 'copied') setCopied(true);
              }}
            />
            {!store.cloud ? (
              <T size={12} color={C.muted}>
                Heads up: this copy of the app is not connected to a server yet, so phones can't see each other. See the README to connect Supabase.
              </T>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>This week, together</Eyebrow>
            <T size={12} color={C.muted}>
              {weekDone} of {weekGoal}
            </T>
          </Row>
          <T w="semibold">Everyone shares one meal a day</T>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.soft, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.leaf, width: `${Math.min(100, Math.round((weekDone / Math.max(1, weekGoal)) * 100))}%` }} />
          </View>
        </Card>

        {me.role === 'child' && parent && parentLast && quietDays !== null && quietDays <= 1 ? (
          <Soft pink>
            <Row>
              <Puti mood="happy" width={56} />
              <View style={{ flex: 1 }}>
                <T w="semibold" size={14}>
                  Puti says, ask about this
                </T>
                <T size={13} color="#5B4A4F">
                  {parent.name} shared {parentLast.slot} {quietDays === 0 ? 'today' : 'yesterday'}. How did it turn out?
                </T>
              </View>
            </Row>
          </Soft>
        ) : null}

        {me.role === 'child' && parent && parentLast && quietDays !== null && quietDays >= 3 ? (
          <Soft pink>
            <T w="semibold" size={14}>
              {parent.name}'s been quiet since {dayName(new Date(parentLast.date))}
            </T>
            <T size={13} color="#5B4A4F">
              That happens. A call usually means more than a reminder, and we won't message {parent.name} about it.
            </T>
          </Soft>
        ) : null}

        {feed.length === 0 ? (
          <Soft>
            <T color={C.muted} size={14}>
              The table is empty. Share the first plate and the family will see it here.
            </T>
          </Soft>
        ) : (
          feed.map((meal) => <MealCard key={meal.id} meal={meal} />)
        )}
      </View>
    </ScrollView>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const store = useStore();
  const who = store.member(meal.memberId);
  const mine = store.session ? meal.hearts.includes(store.session.meId) : false;
  const portion = portionLine(meal.handfuls, store.goalFood);
  const own = meal.memberId === store.session?.meId;
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Card style={{ gap: 12 }}>
      {meal.photo ? <Image source={{ uri: meal.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: C.soft }} resizeMode="cover" /> : null}
      <Row>
        {meal.photo ? who ? <Avatar member={who} size={40} /> : null : <Plate size={48} handfuls={meal.handfuls} />}
        <View style={{ flex: 1 }}>
          <T w="semibold">{meal.dish ? meal.dish : store.mealTitle(meal)}</T>
          <T size={13} color={C.muted}>
            {meal.dish ? `${store.mealTitle(meal)} · ` : ''}
            {whenText(meal.date)}
            {portion ? ` · ${portion}` : ''}
          </T>
        </View>
        <Pressable
          onPress={() => store.toggleHeart(meal.id)}
          accessibilityRole="button"
          accessibilityLabel={mine ? 'Take back heart' : 'Send a heart'}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.pinkSoft, borderRadius: 999, paddingHorizontal: 12, minHeight: 40 }}
        >
          <Ionicons name={mine ? 'heart' : 'heart-outline'} size={20} color={C.heart} />
          {meal.hearts.length > 0 ? (
            <T w="semibold" size={14} color="#8A2942">
              {meal.hearts.length}
            </T>
          ) : null}
        </Pressable>
      </Row>
      {own ? (
        asking ? (
          <Row style={{ justifyContent: 'flex-end' }} gap={16}>
            <T size={13} color={failed ? '#8A2942' : C.muted} style={{ flex: 1 }}>
              {failed ? "We couldn't remove it. Try again." : 'Remove this meal for everyone?'}
            </T>
            <Pressable onPress={() => setAsking(false)} accessibilityRole="button" hitSlop={8}>
              <T w="semibold" size={13} color={C.deep}>
                Keep
              </T>
            </Pressable>
            <Pressable onPress={() => store.removeMeal(meal.id).catch(() => setFailed(true))} accessibilityRole="button" hitSlop={8}>
              <T w="semibold" size={13} color="#8A2942">
                Remove
              </T>
            </Pressable>
          </Row>
        ) : (
          <Pressable onPress={() => setAsking(true)} accessibilityRole="button" accessibilityLabel="Remove this meal" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
            <T size={13} color={C.muted}>
              Remove
            </T>
          </Pressable>
        )
      ) : null}
    </Card>
  );
}
