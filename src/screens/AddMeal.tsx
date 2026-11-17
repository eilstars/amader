import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Hand, findHand } from '../hand';
import { GrainArt, PlateCard, ProteinArt, VegArt } from '../food';
import { WidgetCard } from './Widget';
import { useStore } from '../store';
import { C, F } from '../theme';
import { ChosenBy, Guess, Meal, Photo, Slot, Voice } from '../types';
import { Avatar, Btn, Chip, DayRing, Eyebrow, GOAL_FOODS, HandCount, Puti, Row, T } from '../ui';
import { VoiceRecorder } from '../voice';
import { badgesFor, isBalanced, pointsFor, streakGoal, streakOf, streakReward } from '../game';
import HandMeasure from './HandMeasure';
import { DAY_LETTERS, sameDay, slotAt, slotName, weekDays } from '../words';

type Step = 'photo' | 'details' | 'saved';

/** Photo (or none), then one page for the whole plate, then a reward. */
export default function AddMeal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const ramadan = store.prefs.ramadan;
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [slot, setSlot] = useState<Slot>(slotAt(new Date(), store.prefs.times, ramadan));
  const [grains, setGrains] = useState(store.goalHandfuls);
  const [protein, setProtein] = useState(1);
  const [veg, setVeg] = useState(1);
  const [party, setParty] = useState(false);
  const food = store.goalFood;
  const me = store.me;
  const others = (store.family?.members ?? []).filter((m) => m.id !== me?.id);
  // The grain last time, so someone who mostly eats naan does not have to pick it every meal.
  const lastGrain = store.meals.find((m) => m.memberId === me?.id && m.grain)?.grain ?? food;
  const [grainName, setGrainName] = useState(lastGrain);
  // People who live together usually eat together, so they are tagged to start with. One tap removes them.
  const [withIds, setWithIds] = useState<string[]>(() =>
    store.prefs.sameHome && slotAt(new Date(), store.prefs.times, ramadan) !== 'snack' ? others.filter((m) => m.joined).map((m) => m.id) : [],
  );
  const [more, setMore] = useState(false);
  const [widgetLater, setWidgetLater] = useState(false);
  const [withOthers, setWithOthers] = useState('');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<Voice | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [guessing, setGuessing] = useState(false);
  const [saved, setSaved] = useState<Meal | null>(null);
  const [badgesBefore, setBadgesBefore] = useState<string[]>([]);
  const touched = useRef(false);
  // The hand in the photo, if there is one. It becomes the ruler for the portion.
  const [hand, setHand] = useState<Hand | null>(null);
  const [looking, setLooking] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [byHand, setByHand] = useState(false);
  const shot = useRef(0);

  function findRuler(at: Photo) {
    const mine = ++shot.current;
    setHand(null);
    setByHand(false);
    setLooking(true);
    findHand(at)
      .then((found) => {
        if (mine === shot.current) setHand(found);
      })
      .finally(() => {
        if (mine === shot.current) setLooking(false);
      });
  }

  // Ask what is on the plate while the person fills in the rest. Never blocks saving.
  function look(at: Photo, justAgreed = false, asParty = party) {
    setGuess(null);
    if (!justAgreed && !store.session?.demo && store.prefs.guessOn !== true) return;
    setGuessing(true);
    store
      .recognize(at, { justAgreed, party: asParty })
      .then((found) => {
        setGuess(found);
        if (found && !touched.current) {
          if (found.amount !== null && found.amount !== undefined) setGrains(found.amount);
          if (found.protein !== null && found.protein !== undefined) setProtein(found.protein);
          if (found.veg !== null && found.veg !== undefined) setVeg(found.veg);
        }
      })
      .finally(() => setGuessing(false));
  }

  async function pick(camera: boolean) {
    setNote(null);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNote('The camera is turned off for Amader. You can choose a photo instead.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setBusy(true);
      try {
        // Shrink the photo so it sends quickly on a slow connection.
        const small = await manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
        const taken = { uri: small.uri, base64: small.base64 ?? null };
        setPhoto(taken);
        look(taken);
        findRuler(taken);
      } catch {
        // The original file can carry where it was taken (GPS) inside it. Shrinking strips that out,
        // so if shrinking fails the original is never used.
        setNote("We couldn't prepare that photo. Try another one, or share without a photo.");
        return;
      }
      setStep('details');
    } catch {
      setNote("That didn't work. Try choosing a photo instead.");
    } finally {
      setBusy(false);
    }
  }

  const fasting = slot === 'fasting';
  const snack = slot === 'snack';
  const draft = { slot, handfuls: fasting ? null : grains, protein: fasting ? null : protein, veg: fasting ? null : veg };
  const balanced = isBalanced(draft);
  const preview = pointsFor({ ...draft, id: '', memberId: '', date: '', photo: photo ? 'x' : null, hearts: [], withIds, withOthers: withOthers || null });

  async function save(fastingDay = false) {
    setBusy(true);
    setNote(null);
    const chosenBy: ChosenBy = byHand ? 'hand' : touched.current || !guess ? 'tap' : 'guess';
    setBadgesBefore(me ? badgesFor(me.id, store.meals, store.cheers, store.recipes.filter((r) => r.addedBy === me.id).length).map((b) => b.id) : []);
    try {
      const meal = await store.addMeal({
        slot: fastingDay ? 'fasting' : slot,
        photo: fastingDay ? null : photo,
        portions: fastingDay ? null : { grains, protein, veg },
        guess: photo ? guess : null,
        chosenBy,
        note: text,
        voice,
        withIds,
        withOthers,
        party,
        grain: grainName,
      });
      setSaved(meal);
      setStep('saved');
    } catch (e) {
      setNote(e instanceof Error ? `We couldn't save that. ${e.message}` : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const close = (
    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="close" size={24} color={C.white} />
    </Pressable>
  );

  if (step === 'photo') {
    return (
      <View style={{ flex: 1, backgroundColor: C.night, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 22 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {close}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <T w="semibold" size={14} color={C.white}>
              Meal {store.myMealCount + 1} of {store.nextMilestone}
            </T>
          </View>
        </Row>

        <Row style={{ justifyContent: 'space-between', marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={36} color={C.white}>
              Did you eat?
            </T>
            <T color="#C9D8CF" size={18}>
              Snap your plate. Snacks count too.
            </T>
          </View>
          <Puti mood="hello" width={92} />
        </Row>

        <Pressable
          onPress={() => pick(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Take a photo of your plate"
          style={{ flex: 1, marginVertical: 18, borderRadius: 28, backgroundColor: '#1F3A2D', alignItems: 'center', justifyContent: 'center', gap: 14 }}
        >
          <View style={{ width: 210, height: 210, borderRadius: 105, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <ActivityIndicator color={C.white} /> : <Ionicons name="camera" size={48} color={C.white} />}
            <T w="semibold" size={19} color={C.white}>
              Tap to take a photo
            </T>
          </View>
          <T size={14} color="#C9D8CF" center style={{ paddingHorizontal: 30 }}>
            Tip: put your hand flat next to the plate and Amader can measure the portion for you.
          </T>
        </Pressable>

        {note ? (
          <T center color="#F4B6C2" size={15} style={{ marginBottom: 12 }}>
            {note}
          </T>
        ) : null}

        <Row gap={10}>
          <Btn kind="dark" icon="images-outline" label="Choose photo" onPress={() => pick(false)} disabled={busy} style={{ flex: 1, alignSelf: 'auto', paddingHorizontal: 8 }} />
          <Btn
            kind="dark"
            icon="create-outline"
            label="Say or type it"
            onPress={() => {
              setPhoto(null);
              setGuess(null);
              setHand(null);
              setMore(true);
              setStep('details');
            }}
            disabled={busy}
            style={{ flex: 1, alignSelf: 'auto', paddingHorizontal: 8 }}
          />
        </Row>
        {ramadan ? (
          <Btn kind="dark" icon="moon-outline" label="I'm fasting today" onPress={() => save(true)} disabled={busy} style={{ marginTop: 10 }} />
        ) : null}
      </View>
    );
  }

  if (step === 'details') {
    const slots: Slot[] = ramadan ? ['suhoor', 'iftar', 'snack'] : ['breakfast', 'lunch', 'dinner', 'snack'];
    if (measuring && photo && hand) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
          <HandMeasure
            photo={photo}
            hand={hand}
            food={food}
            onBack={() => setMeasuring(false)}
            onUse={(n) => {
              touched.current = true;
              setGrains(n);
              setByHand(true);
              setMeasuring(false);
            }}
          />
        </ScrollView>
      );
    }
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24, paddingHorizontal: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Row>
          <Pressable onPress={() => setStep('photo')} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>
          <T w="bold" size={24} style={{ flex: 1 }}>
            Your plate
          </T>
          <View style={{ backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <T w="bold" size={15} color={C.deep}>
              +{preview} points
            </T>
          </View>
        </Row>

        {/* The plate itself: the photo, or a drawing that changes as the portions change. */}
        <Row gap={14} style={{ alignItems: 'center' }}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={{ width: 132, height: 132, borderRadius: 66, borderWidth: 7, borderColor: C.steel, backgroundColor: C.soft }} />
          ) : (
            <PlateCard size={132} grains={grains} protein={protein} veg={veg} party={party} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
            {photo && (guessing || guess) ? (
              <View style={{ backgroundColor: C.mint, borderRadius: 16, padding: 10 }}>
                <T w="semibold" size={15} color={C.deep}>
                  {guessing ? 'Puti is looking...' : `${guess?.sample ? 'Sample guess: ' : 'Looks like '}${guess?.dish || 'a lovely plate'}`}
                </T>
                {guess?.items?.length ? (
                  <T size={13} color={C.muted}>
                    {guess.items.join(', ')}
                  </T>
                ) : !guessing ? (
                  <T size={13} color={C.muted}>
                    {guess?.sample ? 'Real photo reading turns on once the app is connected.' : 'Amounts below are a guess. Change them if they are off.'}
                  </T>
                ) : null}
              </View>
            ) : (
              <T size={15} color={C.muted}>
                {photo ? 'Count what was on the plate with your hands.' : 'No photo? No problem. Count it with your hands, or just say it below.'}
              </T>
            )}
            <Chip
              label={party ? 'Party plate' : 'Party or buffet?'}
              icon="sparkles-outline"
              on={party}
              onPress={() => {
                const next = !party;
                setParty(next);
                if (photo && (store.prefs.guessOn === true || store.session?.demo)) look(photo, false, next);
              }}
            />
          </View>
        </Row>

        {photo && store.cloud && !store.session?.demo && store.prefs.guessOn === null ? (
          <View style={{ backgroundColor: C.mint, borderRadius: 16, padding: 14, gap: 10 }}>
            <T w="semibold" color={C.deep}>
              Want Puti to guess what's on your plate?
            </T>
            <T size={14} color={C.muted}>
              Your photo is sent to an AI service (Claude, made by Anthropic) that reads it. Your family sees your photos either way. Change this any time in settings.
            </T>
            <Row gap={10}>
              <Btn kind="ghost" label="No thanks" onPress={() => store.setGuessOn(false)} style={{ flex: 1, alignSelf: 'auto', backgroundColor: C.white, minHeight: 48 }} />
              <Btn
                label="Yes, guess"
                onPress={() => {
                  store.setGuessOn(true);
                  look(photo, true);
                }}
                style={{ flex: 1, alignSelf: 'auto', minHeight: 48 }}
              />
            </Row>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Eyebrow>Which meal?</Eyebrow>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {slots.map((x) => (
              <Chip key={x} label={slotName(x)} on={slot === x} onPress={() => setSlot(x)} />
            ))}
          </Row>
        </View>

        <View style={{ gap: 8 }}>
          <Eyebrow>{snack ? 'How much? (optional for snacks)' : 'How much? Count with your hands'}</Eyebrow>
          <HandCount
            label={grainName}
            unit={['fist', 'fists']}
            art={<GrainArt kind={grainName} size={40} />}
            value={grains}
            onChange={(n) => {
              touched.current = true;
              setByHand(false);
              setGrains(n);
            }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
            {GOAL_FOODS.map((g) => (
              <Chip key={g} label={g} on={grainName === g} onPress={() => setGrainName(g)} />
            ))}
          </ScrollView>
          {photo && hand ? (
            <Btn kind="ghost" icon="hand-left-outline" label={byHand ? 'Measured with your hand' : 'Measure with my hand'} onPress={() => setMeasuring(true)} />
          ) : photo && looking ? (
            <T size={14} color={C.muted}>
              Looking for your hand in the photo...
            </T>
          ) : null}
          <HandCount label="Protein" unit={['palm', 'palms']} art={<ProteinArt size={40} />} value={protein} onChange={(n) => { touched.current = true; setProtein(n); }} />
          <HandCount label="Vegetables" unit={['handful', 'handfuls']} art={<VegArt size={40} />} value={veg} onChange={(n) => { touched.current = true; setVeg(n); }} />
          {!snack ? (
            <Row gap={8} style={{ paddingHorizontal: 4 }}>
              <Ionicons name={balanced ? 'checkmark-circle' : 'bulb-outline'} size={20} color={C.leaf} />
              <T size={15} color={C.deep} style={{ flex: 1 }}>
                {balanced ? 'Balanced plate! +10 bonus points.' : veg < Math.max(1, grains) ? 'One more handful of vegetables makes it balanced (+10).' : 'A palm of protein makes it balanced (+10).'}
              </T>
            </Row>
          ) : null}
        </View>

        {others.length ? (
          <View style={{ gap: 8 }}>
            <Eyebrow>Who ate with you?</Eyebrow>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {others.map((m) => (
                <Chip key={m.id} label={m.name} on={withIds.includes(m.id)} onPress={() => setWithIds((list) => (list.includes(m.id) ? list.filter((x) => x !== m.id) : [...list, m.id]))} />
              ))}
            </Row>
            {withIds.length && photo ? (
              <T size={14} color={C.muted}>
                They'll see this photo and can tap "I ate this too" with their own portion. No second photo needed.
              </T>
            ) : null}
          </View>
        ) : null}

        {more ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={photo ? 'A few words (optional)' : 'What did you eat?'}
              placeholderTextColor="#8A988F"
              maxLength={280}
              multiline
              style={{ minHeight: 56, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.regular, fontSize: 17, color: C.ink, textAlignVertical: 'top' }}
            />
            <VoiceRecorder value={voice} onChange={setVoice} />
            <TextInput
              value={withOthers}
              onChangeText={setWithOthers}
              placeholder="Anyone else at the table? (friends, Auntie)"
              placeholderTextColor="#8A988F"
              maxLength={80}
              style={{ minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 17, color: C.ink }}
            />
          </View>
        ) : (
          <Pressable onPress={() => setMore(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <Ionicons name="add-circle-outline" size={24} color={C.leaf} />
            <T w="semibold" color={C.deep}>
              Add a note or a voice message
            </T>
          </Pressable>
        )}

        {note ? (
          <T center color="#8A2942" size={15}>
            {note}
          </T>
        ) : null}
        <Btn label={busy ? 'Sharing...' : `Share ${slotName(slot).toLowerCase()} with family`} icon="send" disabled={busy} onPress={() => save()} />
      </ScrollView>
    );
  }

  // Saved: the reward has to arrive now, because the health payoff is slow.
  const meId = me?.id ?? '';
  const streak = streakOf(store.meals, meId);
  const goal = streakGoal(streak);
  const earned = saved ? pointsFor(saved) : 0;
  const badgesNow = badgesFor(meId, store.meals, store.cheers, store.recipes.filter((r) => r.addedBy === meId).length);
  const fresh = badgesNow.filter((b) => !badgesBefore.includes(b.id));
  const week = weekDays();
  const mine = store.meals.filter((m) => m.memberId === meId);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
      <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 24, paddingBottom: 24, alignItems: 'center', gap: 8, paddingHorizontal: 22 }}>
        <Row gap={14}>
          <Puti mood="happy" width={96} />
          <View style={{ width: 118, height: 118, borderRadius: 59, backgroundColor: C.white, borderWidth: 8, borderColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={34} color={C.deep} style={{ lineHeight: 38 }}>
              +{earned}
            </T>
            <T size={13} color={C.muted}>
              points
            </T>
          </View>
        </Row>
        <T w="bold" size={28} center>
          {saved?.slot === 'fasting' ? 'Fasting day shared' : `Lovely plate, ${me?.name ?? ''}!`}
        </T>
        <Row gap={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <View style={{ backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flame" size={18} color={C.heart} />
            <T w="semibold" size={16}>
              {streak} {streak === 1 ? 'day' : 'days'} in a row
            </T>
          </View>
          {saved && isBalanced(saved) ? (
            <View style={{ backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="leaf" size={18} color={C.leaf} />
              <T w="semibold" size={16}>
                Balanced plate
              </T>
            </View>
          ) : null}
        </Row>
      </View>

      <View style={{ padding: 20, gap: 14, flex: 1 }}>
        {fresh.map((b) => (
          <View key={b.id} style={{ backgroundColor: C.deep, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={28} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="bold" size={18} color={C.white}>
                New badge: {b.title}
              </T>
              <T size={14} color="#C9D8CF">
                {b.how}. Your family can see it.
              </T>
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>Your week</Eyebrow>
            <T size={14} color={C.muted}>
              Next goal: {goal} days
            </T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }} gap={2}>
            {week.map((day, i) => {
              const that = mine.filter((m) => sameDay(new Date(m.date), day));
              return <DayRing key={i} letter={DAY_LETTERS[i]} count={that.filter((m) => m.slot !== 'fasting').length} fasting={that.some((m) => m.slot === 'fasting')} today={sameDay(day, new Date())} />;
            })}
          </Row>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.soft, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (streak / goal) * 100)}%`, height: 10, borderRadius: 5, backgroundColor: C.leaf }} />
          </View>
          <T size={15} color={C.muted}>
            {goal - streak} more {goal - streak === 1 ? 'day' : 'days'} to unlock {streakReward(goal)}.
          </T>
        </View>

        {/* Now and then, not every meal: the second plate, then every sixth, until it's added. */}
        {!store.prefs.widgetSeen && !widgetLater && (store.myMealCount === 2 || store.myMealCount % 6 === 0) ? (
          <WidgetCard onClose={() => store.setPrefs({ widgetSeen: true })} onLater={() => setWidgetLater(true)} />
        ) : null}

        {others.length ? (
          <Row gap={8} style={{ alignItems: 'center' }}>
            {others.slice(0, 4).map((m) => (
              <Avatar key={m.id} member={m} size={34} />
            ))}
            <T size={15} color={C.muted} style={{ flex: 1 }}>
              {others.map((m) => m.name).join(', ')} can see it now.
            </T>
          </Row>
        ) : null}
        <View style={{ flex: 1 }} />
        <Btn label="See Our Table" onPress={onClose} />
      </View>
    </ScrollView>
  );
}
