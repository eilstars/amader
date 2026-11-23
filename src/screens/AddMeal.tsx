import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Hand, findHand } from '../hand';
import { WidgetCard } from './Widget';
import { UNLOCK } from './SimpleHome';
import { Stepper } from './MealSheet';
import { plateLine } from '../quests';
import { wornCostume } from '../costumes';
import { medKey, useStore } from '../store';
import { MedSlot } from '../reminders';
import { C, F } from '../theme';
import { ChosenBy, Guess, Meal, Photo, Slot, Voice } from '../types';
import { GOAL_FOODS, T } from '../ui';
import { VoiceRecorder } from '../voice';
import { badgesFor, isBalanced } from '../game';
import HandMeasure from './HandMeasure';
import { BigButton, Chip, Confetti, Face, Faces, FoodPlate, Icon, K, Mado, Pill, RoundIcon, S, card } from '../design';
import { fastingToday, slotAt, slotName } from '../words';

type Step = 'photo' | 'details' | 'saved';

/** Photo (or none), then one page for the whole plate, then a reward. */
export default function AddMeal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const ramadan = fastingToday(store.prefs);
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [slot, setSlot] = useState<Slot>(slotAt(new Date(), store.prefs.times, ramadan));
  const [grains, setGrains] = useState(store.goalHandfuls);
  const [protein, setProtein] = useState(1);
  const [veg, setVeg] = useState(1);
  const [fruit, setFruit] = useState(0);
  const [dairy, setDairy] = useState(0);
  const [medTaken, setMedTaken] = useState(false);
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
  const [fixing, setFixing] = useState(false);
  const [dishText, setDishText] = useState('');
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
          if (found.fruit !== null && found.fruit !== undefined) setFruit(found.fruit);
          if (found.dairy !== null && found.dairy !== undefined) setDairy(found.dairy);
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

  // Medicine that goes with this meal, if the person turned that on and hasn't ticked it yet today.
  const asMed: MedSlot | null = slot === 'suhoor' ? 'breakfast' : slot === 'iftar' ? 'dinner' : slot === 'breakfast' || slot === 'lunch' || slot === 'dinner' ? slot : null;
  const medSlot = asMed && store.prefs.meds.on && store.prefs.meds.slots.includes(asMed) && !store.prefs.meds.taken.includes(medKey(new Date(), asMed)) ? asMed : null;

  async function save(fastingDay = false) {
    setBusy(true);
    setNote(null);
    const chosenBy: ChosenBy = byHand ? 'hand' : touched.current || !guess ? 'tap' : 'guess';
    setBadgesBefore(me ? badgesFor(me.id, store.meals, store.cheers, store.recipes.filter((r) => r.addedBy === me.id).length).map((b) => b.id) : []);
    try {
      const meal = await store.addMeal({
        slot: fastingDay ? 'fasting' : slot,
        photo: fastingDay ? null : photo,
        portions: fastingDay ? null : { grains, protein, veg, fruit, dairy },
        guess: photo && guess ? { ...guess, dish: dishText.trim() || guess.dish } : null,
        chosenBy,
        note: [dishText.trim() && !guess ? dishText.trim() : '', text.trim()].filter(Boolean).join('. '),
        voice,
        withIds,
        withOthers,
        party,
        grain: grainName,
      });
      if (medSlot && medTaken) store.toggleMed(new Date(), medSlot);
      setSaved(meal);
      setStep('saved');
    } catch (e) {
      setNote(e instanceof Error ? `We couldn't save that. ${e.message}` : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const others3 = others.filter((m) => m.joined);
  const toggleWith = (id: string) => setWithIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const count = (set: (n: number) => void) => (n: number) => {
    touched.current = true;
    set(n);
  };

  if (step === 'photo') {
    return (
      <View style={{ flex: 1, backgroundColor: C.rice, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        <RoundIcon name="close" onPress={onClose} label="Close" bg={C.mint} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={36} style={{ lineHeight: 42 }}>
              Did you eat?
            </T>
            <T w="medium" size={S.body} color={C.muted}>
              Snap your plate. Snacks count too.
            </T>
          </View>
          <Mado width={88} />
        </View>

        <Pressable
          onPress={() => pick(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Take a photo of your plate"
          style={{ flex: 1, marginVertical: 18, borderRadius: 32, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', gap: 14 }}
        >
          <View style={{ width: 220, height: 220, borderRadius: 110, backgroundColor: C.white, borderWidth: 10, borderColor: C.steel, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <ActivityIndicator color={C.leaf} /> : <Icon name="camera" size={56} color={C.leaf} />}
            <T w="bold" size={S.body} color={C.deep}>
              Tap to take a photo
            </T>
          </View>
          <T w="medium" size={S.small} color={C.deep} center style={{ paddingHorizontal: 30 }}>
            Tip: put your hand flat next to the plate and Amader can measure the portion for you.
          </T>
        </Pressable>

        {note ? (
          <T center color="#8A2942" size={S.small} style={{ marginBottom: 12 }}>
            {note}
          </T>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BigButton kind="line" icon="image" label="Choose photo" size={S.body} height={56} onPress={() => pick(false)} disabled={busy} style={{ flex: 1 }} />
          <BigButton
            kind="line"
            icon="pencil"
            label="No photo"
            size={S.body}
            height={56}
            onPress={() => {
              setPhoto(null);
              setGuess(null);
              setHand(null);
              setFixing(true);
              setStep('details');
            }}
            disabled={busy}
            style={{ flex: 1 }}
          />
        </View>
        {ramadan ? <BigButton kind="mint" icon="moon" label="I'm fasting today" size={S.body} height={56} onPress={() => save(true)} disabled={busy} style={{ marginTop: 10 }} /> : null}
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
    const portions = { grains, protein, veg, fruit, dairy, grain: grainName };
    const askGuess = !!photo && store.cloud && !store.session?.demo && store.prefs.guessOn === null;
    return (
      <View style={{ flex: 1, backgroundColor: C.rice }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <RoundIcon name="back" onPress={() => setStep('photo')} label="Back" />
              <T w="bold" size={S.title} style={{ flex: 1 }}>
                Your plate
              </T>
              <Pill
                label={party ? 'Party plate' : 'Party?'}
                icon="sparkle"
                on={party}
                onPress={() => {
                  const next = !party;
                  setParty(next);
                  if (photo && (store.prefs.guessOn === true || store.session?.demo)) look(photo, false, next);
                }}
              />
            </View>
            <View style={{ alignItems: 'center' }}>
              <FoodPlate size={180} photo={photo?.uri} portions={portions} />
            </View>
            {photo && (guessing || guess) ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 999, paddingLeft: 8, paddingRight: 8, paddingVertical: 4, maxWidth: '100%' }}>
                <Mado width={40} />
                <T w="bold" size={S.small} style={{ flexShrink: 1 }}>
                  {guessing ? 'Mado is looking...' : `${guess?.sample ? 'Sample guess: ' : ''}${dishText || guess?.dish || 'A lovely plate'}?`}
                </T>
                {!guessing && !fixing ? (
                  <Pressable onPress={() => setFixing(true)} accessibilityRole="button" hitSlop={6} style={{ backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <T w="bold" size={S.small} color={C.deep}>
                      Not quite
                    </T>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {askGuess ? (
              <View style={[card, { gap: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Mado width={40} />
                  <T w="bold" size={S.body} style={{ flex: 1 }}>
                    Can Mado guess your plate?
                  </T>
                </View>
                <T w="medium" size={S.small} color={C.muted}>
                  Your photo is sent to an AI service (Claude, made by Anthropic) that reads it. Your family sees your photos either way. Change this any time in Settings.
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <BigButton label="No thanks" kind="line" height={48} size={S.body} onPress={() => store.setGuessOn(false)} style={{ flex: 1 }} />
                  <BigButton
                    label="Yes"
                    height={48}
                    size={S.body}
                    onPress={() => {
                      store.setGuessOn(true);
                      look(photo!, true);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}

            {fixing ? (
              <View style={{ gap: 12 }}>
                <T w="bold" size={S.title}>
                  What's on your plate?
                </T>
                <TextInput
                  value={dishText}
                  onChangeText={setDishText}
                  placeholder="Dal, rice and sabzi"
                  placeholderTextColor="#8A988F"
                  maxLength={80}
                  accessibilityLabel="What is on the plate"
                  style={{ height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 17, color: C.ink }}
                />
                <View style={{ gap: 6 }}>
                  <T w="bold" size={S.small} color={C.muted}>
                    Grain
                  </T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {GOAL_FOODS.map((g) => (
                      <Pill key={g} label={g} on={grainName === g} onPress={() => setGrainName(g)} food={g === 'Rice' ? 'rice' : g === 'Bread' ? 'bread' : g === 'Roti' || g === 'Naan' || g === 'Tortilla' ? 'roti' : undefined} />
                    ))}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <T w="bold" size={S.small} color={C.muted}>
                    Also on the plate
                  </T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Pill label="Fruit" food="fruit" on={fruit > 0} onPress={() => count(setFruit)(fruit > 0 ? 0 : 1)} />
                    <Pill label="Dairy" food="dairy" on={dairy > 0} onPress={() => count(setDairy)(dairy > 0 ? 0 : 1)} />
                  </View>
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T w="bold" size={S.title}>
                Count with your hand
              </T>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {slots.map((x) => (
                <Pill key={x} label={slotName(x)} on={slot === x} onPress={() => setSlot(x)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stepper icon="fist" value={grains} unit={`${grains === 1 ? 'fist' : 'fists'} ${grainName.toLowerCase()}`} onChange={(n) => (setByHand(false), count(setGrains)(n))} />
              <Stepper icon="palm" value={protein} unit={protein === 1 ? 'palm protein' : 'palms protein'} onChange={count(setProtein)} />
              <Stepper icon="handful" value={veg} unit={veg === 1 ? 'handful veg' : 'handfuls veg'} onChange={count(setVeg)} />
            </View>
            {fruit > 0 || dairy > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {fruit > 0 ? <Stepper icon="apple" value={fruit} unit={fruit === 1 ? 'piece fruit' : 'pieces fruit'} onChange={count(setFruit)} /> : null}
                {dairy > 0 ? <Stepper icon="cup" value={dairy} unit={dairy === 1 ? 'cup dairy' : 'cups dairy'} onChange={count(setDairy)} /> : null}
              </View>
            ) : !fixing ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Fruit" icon="plus" on={false} onPress={() => count(setFruit)(1)} />
                <Pill label="Dairy" icon="plus" on={false} onPress={() => count(setDairy)(1)} />
              </View>
            ) : null}
            {!snack && !fasting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mint, borderRadius: 18, padding: 12 }}>
                <Icon name={balanced ? 'check' : 'handful'} size={22} color={C.leaf} />
                <T w="medium" size={S.small} color={C.deep} style={{ flex: 1 }}>
                  {balanced ? 'Balanced plate!' : veg < Math.max(1, grains) ? 'One more handful of veg makes it balanced.' : 'A palm of protein makes it balanced.'}
                </T>
              </View>
            ) : null}
            {photo && hand ? (
              <BigButton kind="mint" icon="palm" label={byHand ? 'Measured with your hand' : 'Measure with my hand'} height={52} size={S.body} onPress={() => setMeasuring(true)} />
            ) : photo && looking ? (
              <T w="medium" size={S.small} color={C.muted}>
                Looking for your hand in the photo...
              </T>
            ) : null}

            {medSlot ? (
              <Pressable
                onPress={() => setMedTaken(!medTaken)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: medTaken }}
                style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, medTaken && { backgroundColor: C.mint }]}
              >
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: medTaken ? C.leaf : C.white, borderWidth: 2, borderColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
                  {medTaken ? <Icon name="check" size={18} color={C.white} /> : null}
                </View>
                <T w="bold" size={S.body} style={{ flex: 1 }}>
                  I took my medicine with this meal
                </T>
                <Icon name="pill" size={22} color={C.leaf} />
              </Pressable>
            ) : null}

            {others3.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: K.line2, paddingTop: 14 }}>
                <T w="bold" size={S.body} style={{ flex: 1 }}>
                  Ate with
                </T>
                {others3.map((m) => {
                  const on = withIds.includes(m.id);
                  return (
                    <Pressable key={m.id} onPress={() => toggleWith(m.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Ate with ${m.name}`} style={{ borderRadius: 24, borderWidth: 3, borderColor: on ? C.leaf : 'transparent', opacity: on ? 1 : 0.55 }}>
                      <Face member={m} size={36} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {withIds.length && photo ? (
              <T w="medium" size={S.small} color={C.muted}>
                They'll see this photo and can tap "I ate this too" with their own portion.
              </T>
            ) : null}

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={photo ? 'A note for the family: who cooked it?' : 'A note for the family'}
              placeholderTextColor="#8A988F"
              maxLength={280}
              multiline
              accessibilityLabel="Note for the family"
              style={{ minHeight: 52, borderRadius: 18, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 14, fontFamily: F.medium, fontSize: 17, color: C.ink, textAlignVertical: 'top' }}
            />
            {more ? (
              <>
                <VoiceRecorder value={voice} onChange={setVoice} />
                <TextInput
                  value={withOthers}
                  onChangeText={setWithOthers}
                  placeholder="Anyone else at the table? (friends, Auntie)"
                  placeholderTextColor="#8A988F"
                  maxLength={80}
                  style={{ height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 17, color: C.ink }}
                />
              </>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Voice note" icon="mic" on={false} onPress={() => setMore(true)} />
                <Pill label="Someone else" icon="plus" on={false} onPress={() => setMore(true)} />
              </View>
            )}
            {note ? (
              <T center color="#8A2942" size={S.small}>
                {note}
              </T>
            ) : null}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
          <BigButton label={busy ? 'Sharing...' : 'Put it on the table'} disabled={busy} onPress={() => save()} />
        </View>
      </View>
    );
  }

  // Saved: the reward arrives now, because the health payoff is slow. One moment: the plate lands on the table.
  const meId = me?.id ?? '';
  const badgesNow = badgesFor(meId, store.meals, store.cheers, store.recipes.filter((r) => r.addedBy === meId).length);
  const fresh = badgesNow.filter((b) => !badgesBefore.includes(b.id));
  const q = store.quest;
  const showQuest = saved && q && store.questLive && (!store.simple || store.daysShared >= UNLOCK.quest);
  return (
    <View style={{ flex: 1, backgroundColor: C.mint }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 30, paddingBottom: insets.bottom + 110, paddingHorizontal: 20, alignItems: 'center', gap: 14 }}>
        <Confetti points={[[8, 120, 20], [86, 140, -30], [16, 300, 50], [84, 330, 10], [26, 70, -60], [70, 70, 35]]} />
        {saved && isBalanced(saved) ? <Chip text="Balanced plate" bg={C.leaf} color={C.white} /> : saved?.slot === 'fasting' ? <Chip text="Fasting day" icon="moon" /> : null}
        <View style={{ width: 230, height: 250 }}>
          <View style={{ position: 'absolute', left: 5, top: 0, width: 220, height: 220, borderRadius: 110, backgroundColor: K.table, borderWidth: 9, borderColor: K.tableRim, alignItems: 'center', justifyContent: 'center' }}>
            {saved ? <FoodPlate meal={saved} size={170} /> : null}
          </View>
          <View style={{ position: 'absolute', right: -40, bottom: -6 }}>
            <Mado mood="happy" width={150} flip costume={wornCostume(store.family?.costumes, store.prefs.wear)} />
          </View>
        </View>
        <T w="bold" size={36} center style={{ lineHeight: 40 }}>
          {saved?.slot === 'fasting' ? 'Fasting day shared' : 'On the table!'}
        </T>
        {others.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Faces members={others.slice(0, 4)} size={28} ring={C.mint} />
            <T w="medium" size={S.body} color={C.muted}>
              Your family can see it
            </T>
          </View>
        ) : null}

        {showQuest && q ? (
          <View style={[card, { alignSelf: 'stretch', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={q.quest.how === 'tick' ? 'walk' : 'check'} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="bold" size={S.body} style={{ lineHeight: 21 }}>
                  {q.quest.how === 'tick' ? (store.tickedToday ? 'Ticked today. Thank you!' : `${q.quest.goal}?`) : plateLine(q.quest, saved!)}
                </T>
                <T w="medium" size={S.small} color={C.muted}>
                  {q.quest.name}: {q.done} of {q.goal} for the family
                </T>
              </View>
              {q.quest.how === 'tick' && saved?.slot !== 'fasting' ? (
                <BigButton label={store.tickedToday ? 'Undo' : 'Yes'} kind="mint" height={44} size={S.small} onPress={() => store.tickQuest(!store.tickedToday)} />
              ) : null}
            </View>
          </View>
        ) : null}

        {fresh.map((b) => (
          <View key={b.id} style={[card, { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="medal" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="bold" size={S.body}>
                New badge: {b.title}
              </T>
              <T w="medium" size={S.small} color={C.muted}>
                {b.how}
              </T>
            </View>
          </View>
        ))}

        {/* Now and then, not every meal: the second plate, then every sixth, until it's added. */}
        {!store.prefs.widgetSeen && !widgetLater && (store.myMealCount === 2 || store.myMealCount % 6 === 0) ? (
          <View style={{ alignSelf: 'stretch' }}>
            <WidgetCard onClose={() => store.setPrefs({ widgetSeen: true })} onLater={() => setWidgetLater(true)} />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
        <BigButton label="Done" onPress={onClose} />
      </View>
    </View>
  );
}
