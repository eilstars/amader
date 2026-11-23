import React, { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DairyArt, FruitArt, GrainArt, PlateCard, ProteinArt, VegArt } from '../food';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Meal } from '../types';
import { Avatar, Btn, HandCount, Row, T } from '../ui';
import { VoicePlayer } from '../voice';
import { isBalanced } from '../game';
import { daysBetween, plateLine, slotName, timeText } from '../words';

/**
 * One shared meal, compact so a week fits on a screen. Tap the picture to see it big.
 * Every meal gets a picture: the photo, or a thali drawn from the portions.
 */
/** `canComment` is off in the simple view until someone has shared for a few days: hearts first, words later. */
export default function MealCard({ meal, onPerson, canComment = true }: { meal: Meal; onPerson?: (id: string) => void; canComment?: boolean }) {
  const store = useStore();
  const who = store.member(meal.memberId);
  const meId = store.session?.meId;
  const mine = meId ? meal.hearts.includes(meId) : false;
  const own = meal.memberId === meId;
  const [big, setBig] = useState(false);
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const together = [...(meal.withIds ?? []).map((id) => (id === meId ? 'you' : store.member(id)?.name)).filter(Boolean), meal.withOthers].filter(Boolean) as string[];
  const fasting = meal.slot === 'fasting';
  const balanced = isBalanced(meal);
  // "I ate this too": show the photo of the meal it points at.
  const original = meal.sameAs ? store.meals.find((m) => m.id === meal.sameAs) : undefined;
  const photo = meal.photo ?? original?.photo ?? null;
  // The numbers are on the picture when there is no photo, so the line is only needed under a photo.
  const line = photo ? plateLine(meal, store.goalFood) : null;
  // Tagged at someone else's table and not logged yet: one tap to say "I ate this too".
  const canJoin =
    !!meId && !own && !fasting && !meal.sameAs && (meal.withIds ?? []).includes(meId) && daysBetween(new Date(meal.date), new Date()) <= 1 && !store.meals.some((m) => m.memberId === meId && m.sameAs === meal.id);
  const [joining, setJoining] = useState(false);
  const [mine3, setMine3] = useState({ grains: meal.handfuls ?? 1, protein: meal.protein ?? 1, veg: meal.veg ?? 1, fruit: meal.fruit ?? 0, dairy: meal.dairy ?? 0 });
  // Comments: notes sent on this meal, oldest first, like a chat under the plate.
  const comments = store.cheers.filter((c) => c.mealId === meal.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);

  async function join() {
    setJoinBusy(true);
    setJoinFailed(false);
    try {
      await store.addMeal({
        slot: meal.slot,
        photo: null,
        portions: mine3,
        sameAs: meal.id,
        grain: meal.grain ?? undefined,
        withIds: [meal.memberId, ...(meal.withIds ?? []).filter((id) => id !== meId)],
        chosenBy: 'tap',
      });
      setJoining(false);
    } catch {
      setJoinFailed(true);
    } finally {
      setJoinBusy(false);
    }
  }

  const picture = photo ? (
    <Image source={{ uri: photo }} accessibilityLabel={meal.dish || 'Meal photo'} style={big ? { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: C.soft } : { width: 76, height: 76, borderRadius: 14, backgroundColor: C.soft }} />
  ) : (
    <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
      <PlateCard size={76} grains={meal.handfuls} protein={meal.protein} veg={meal.veg} fruit={meal.fruit} dairy={meal.dairy} grain={meal.grain ?? store.goalFood} party={meal.party} fasting={fasting} />
    </View>
  );

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 10, gap: 8, borderWidth: 1, borderColor: '#E6EBE6' }}>
      {big ? (
        <Pressable onPress={() => setBig(false)} accessibilityRole="button" accessibilityLabel="Make the photo small">
          {picture}
        </Pressable>
      ) : null}
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        {!big ? (
          <Pressable onPress={() => photo && setBig(true)} accessibilityRole={photo ? 'button' : undefined} accessibilityLabel={photo ? 'See the photo big' : undefined}>
            {picture}
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Pressable onPress={() => who && onPerson?.(who.id)} disabled={!onPerson || !who} accessibilityRole={onPerson ? 'button' : undefined}>
            <Row gap={6}>
              {who ? <Avatar member={who} size={22} /> : null}
              <T w="semibold" size={16} numberOfLines={1} style={{ flexShrink: 1 }}>
                {own ? 'You' : who?.name ?? 'Someone'}
              </T>
              <T size={14} color={C.muted}>
                · {fasting ? 'Fasting' : slotName(meal.slot)}, {timeText(meal.date)}
              </T>
            </Row>
          </Pressable>
          {meal.dish ? (
            <T w="medium" size={16} numberOfLines={2}>
              {meal.dish}
            </T>
          ) : null}
          {fasting ? (
            <T size={14} color={C.muted}>
              Fasting today. Ramadan mubarak.
            </T>
          ) : line ? (
            <T size={14} color={C.muted}>
              {line}
            </T>
          ) : null}
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 2 }}>
            {balanced ? <Pill icon="leaf" text="Balanced plate" /> : null}
            {meal.party ? <Pill icon="sparkles" text="Party plate" /> : null}
            {together.length ? <Pill icon="people" text={`With ${together.join(', ')}`} pink /> : null}
          </Row>
        </View>
        <Pressable
          onPress={() => store.toggleHeart(meal.id)}
          accessibilityRole="button"
          accessibilityLabel={mine ? 'Take back heart' : 'Send a heart'}
          hitSlop={8}
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: C.pinkSoft, borderRadius: 16, width: 52, minHeight: 52 }}
        >
          <Ionicons name={mine ? 'heart' : 'heart-outline'} size={24} color={C.heart} />
          {meal.hearts.length > 0 ? (
            <T w="semibold" size={13} color="#8A2942" style={{ lineHeight: 16 }}>
              {meal.hearts.length}
            </T>
          ) : null}
        </Pressable>
      </Row>
      {meal.note ? (
        <View style={{ backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T size={15}>"{meal.note}"</T>
        </View>
      ) : null}
      {comments.length ? (
        <View style={{ gap: 6, paddingLeft: 4 }}>
          {comments.map((c) => {
            const from = store.member(c.fromId);
            return (
              <Row key={c.id} gap={8} style={{ alignItems: 'flex-start' }}>
                {from ? <Avatar member={from} size={24} /> : null}
                <T size={15} style={{ flex: 1 }}>
                  <T w="semibold" size={15}>
                    {c.fromId === meId ? 'You' : from?.name ?? 'Someone'}
                  </T>{' '}
                  {c.text}
                </T>
              </Row>
            );
          })}
        </View>
      ) : null}
      {writing ? (
        <Row gap={8}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={own ? 'Reply' : `Say something to ${who?.name ?? 'them'}`}
            placeholderTextColor="#8A988F"
            maxLength={200}
            autoFocus
            style={{ flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.regular, fontSize: 16, color: C.ink }}
          />
          <Pressable
            disabled={sending || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            onPress={async () => {
              setSending(true);
              setSendFailed(false);
              try {
                await store.comment(meal.id, draft);
                setDraft('');
                setWriting(false);
              } catch {
                setSendFailed(true);
              } finally {
                setSending(false);
              }
            }}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: draft.trim() ? C.leaf : C.soft, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="send" size={20} color={draft.trim() ? C.white : C.muted} />
          </Pressable>
        </Row>
      ) : null}
      {sendFailed ? (
        <T size={14} color="#8A2942">
          That didn't send. Please try again.
        </T>
      ) : null}
      {meal.voice ? <VoicePlayer uri={meal.voice} label={`${who?.name ?? 'their'} voice note`} /> : null}
      {canJoin && !joining ? <Btn kind="ghost" icon="restaurant" label="I ate this too" onPress={() => setJoining(true)} style={{ minHeight: 48 }} /> : null}
      {joining ? (
        <View style={{ gap: 8, backgroundColor: C.soft, borderRadius: 14, padding: 10 }}>
          <T w="semibold">How much did you have?</T>
          <HandCount label={meal.grain ?? store.goalFood} unit={['fist', 'fists']} art={<GrainArt kind={meal.grain ?? store.goalFood} size={36} />} value={mine3.grains} onChange={(n) => setMine3({ ...mine3, grains: n })} />
          <HandCount label="Protein" unit={['palm', 'palms']} art={<ProteinArt size={36} />} value={mine3.protein} onChange={(n) => setMine3({ ...mine3, protein: n })} />
          <HandCount label="Vegetables" unit={['handful', 'handfuls']} art={<VegArt size={36} />} value={mine3.veg} onChange={(n) => setMine3({ ...mine3, veg: n })} />
          <HandCount label="Fruit" unit={['piece', 'pieces']} art={<FruitArt size={36} />} value={mine3.fruit} onChange={(n) => setMine3({ ...mine3, fruit: n })} />
          <HandCount label="Dairy" unit={['cup', 'cups']} art={<DairyArt size={36} />} value={mine3.dairy} onChange={(n) => setMine3({ ...mine3, dairy: n })} />
          {joinFailed ? (
            <T size={14} color="#8A2942">
              That didn't save. Please try again.
            </T>
          ) : null}
          <Btn label={joinBusy ? 'Saving...' : 'Share my plate'} disabled={joinBusy} onPress={join} />
        </View>
      ) : null}
      <Row style={{ justifyContent: 'space-between' }}>
        {!writing && canComment ? (
          <Pressable onPress={() => setWriting(true)} accessibilityRole="button" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
            <Ionicons name="chatbubble-outline" size={18} color={C.leaf} />
            <T w="semibold" size={14} color={C.deep}>
              {comments.length ? 'Reply' : 'Comment'}
            </T>
          </Pressable>
        ) : (
          <View />
        )}
        {own ? (
          asking ? (
            <Row gap={16}>
              <T size={13} color={failed ? '#8A2942' : C.muted}>
                {failed ? "Couldn't remove it." : 'Remove for everyone?'}
              </T>
              <Pressable onPress={() => setAsking(false)} accessibilityRole="button" hitSlop={8}>
                <T w="semibold" size={14} color={C.deep}>
                  Keep
                </T>
              </Pressable>
              <Pressable onPress={() => store.removeMeal(meal.id).catch(() => setFailed(true))} accessibilityRole="button" hitSlop={8}>
                <T w="semibold" size={14} color="#8A2942">
                  Remove
                </T>
              </Pressable>
            </Row>
          ) : (
            <Pressable onPress={() => setAsking(true)} accessibilityRole="button" accessibilityLabel="Remove this meal" hitSlop={8}>
              <T size={13} color={C.muted}>
                Remove
              </T>
            </Pressable>
          )
        ) : null}
      </Row>
    </View>
  );
}

function Pill({ icon, text, pink }: { icon: keyof typeof Ionicons.glyphMap; text: string; pink?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pink ? C.pinkSoft : C.mint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Ionicons name={icon} size={13} color={pink ? C.heart : C.leaf} />
      <T size={13} w="medium" color={pink ? '#8A2942' : C.deep} numberOfLines={1}>
        {text}
      </T>
    </View>
  );
}
