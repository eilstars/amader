import React, { useRef, useState } from 'react';
import { DropIn, PopIn } from '../motion';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Hand, findHand } from '../hand';
import { WidgetCard } from './Widget';
import { UNLOCK } from './SimpleHome';
import { DishList, balanceHint } from './Dishes';
import { PlateItem, dishLine, grainOf, itemsFromLine, portionsOf } from '../dishes';
import { plateLine } from '../quests';
import { wornCostume } from '../costumes';
import { homeToday, medKey, useStore } from '../store';
import { MedSlot } from '../reminders';
import { C, F } from '../theme';
import { ChosenBy, Guess, Meal, Photo, Slot, Voice } from '../types';
import { T } from '../ui';
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
  // The plate as dishes. Mado fills it from the photo; the person can change anything.
  const [items, setItems] = useState<PlateItem[]>([]);
  const [medTaken, setMedTaken] = useState(false);
  const [party, setParty] = useState(false);
  const food = store.goalFood;
  const me = store.me;
  const others = (store.family?.members ?? []).filter((m) => m.id !== me?.id);
  // The grain last time, so someone who mostly eats naan does not have to pick it every meal.
  const lastGrain = store.meals.find((m) => m.memberId === me?.id && m.grain)?.grain ?? food;
  // People who live together usually eat together, so they are tagged to start with. One tap removes them.
  const [withIds, setWithIds] = useState<string[]>(() =>
    homeToday(store.prefs) && slotAt(new Date(), store.prefs.times, ramadan) !== 'snack' ? others.filter((m) => m.joined).map((m) => m.id) : [],
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
          const dishes = found.dishes?.length ? found.dishes : found.dish ? itemsFromLine(found.dish, { grains: found.amount, protein: found.protein, veg: found.veg }) : [];
          if (dishes.length) setItems(dishes);
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
  const totals = portionsOf(items);
  const grainName = grainOf(items, lastGrain);

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
        portions: fastingDay ? null : totals,
        items: fastingDay ? null : items,
        guess: photo && guess ? { ...guess, dish: dishLine(items) || guess.dish } : items.length ? { dish: dishLine(items), parts: { grain: 0, veg: 0, protein: 0, other: 0 }, amount: null } : null,
        chosenBy,
        note: text.trim(),
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

  const toggleWith = (id: string) => setWithIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const editItems = (next: PlateItem[]) => {
    touched.current = true;
    setItems(next);
  };
  // Dishes this family often eats come first in the quick picks.
  const recent = [...new Set(store.meals.flatMap((m) => (m.items ?? []).map((i) => i.name)))].slice(0, 8);

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
              const at = items.findIndex((i) => i.kind === 'base');
              setItems(at >= 0 ? items.map((x, i) => (i === at ? { ...x, amount: n } : x)) : [{ name: food, kind: 'base', amount: n }, ...items]);
              setByHand(true);
              setMeasuring(false);
            }}
          />
        </ScrollView>
      );
    }
    const portions = { ...totals, grain: grainName };
    const hint = snack || fasting ? null : balanceHint(items, totals, slot);
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
                  {guessing ? 'Mado is looking...' : `${guess?.sample ? 'Sample guess: ' : ''}${dishLine(items) || guess?.dish || 'A lovely plate'}${touched.current ? '' : '? Fix anything below.'}`}
                </T>
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

            <View style={{ gap: 10 }}>
              <T w="bold" size={S.title}>
                What's on your plate?
              </T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {slots.map((x) => (
                  <Pill key={x} label={slotName(x)} on={slot === x} onPress={() => setSlot(x)} />
                ))}
              </ScrollView>
              {guessing && !items.length ? (
                <T w="medium" size={S.small} color={C.muted}>
                  Mado is reading the dishes...
                </T>
              ) : null}
              <DishList items={items} onChange={editItems} recent={recent} />
            </View>
            {hint || (items.length && isBalanced({ slot, handfuls: totals.grains, protein: totals.protein, veg: totals.veg }) && !snack && !fasting) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mint, borderRadius: 18, padding: 12 }}>
                <Icon name={hint ? 'handful' : 'check'} size={22} color={C.leaf} />
                <T w="medium" size={S.small} color={C.deep} style={{ flex: 1 }}>
                  {hint ?? 'Balanced plate!'}
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

            {others.length ? (
              <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: K.line2, paddingTop: 14 }}>
                <T w="bold" size={S.body}>
                  Who did you eat with?
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {others.map((m) => {
                    const on = withIds.includes(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleWith(m.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`Ate with ${m.name}`}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 12, height: 42, borderRadius: 21, backgroundColor: on ? C.mint : C.white, borderWidth: on ? 2 : 1.5, borderColor: on ? C.leaf : K.line2 }}
                      >
                        <Face member={m} size={32} ring={on ? C.mint : C.white} />
                        <T w="bold" size={S.small} color={C.deep}>
                          {m.name}
                        </T>
                        {on ? <Icon name="check" size={14} color={C.leaf} /> : null}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setMore(true)}
                    accessibilityRole="button"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 42, borderRadius: 21, backgroundColor: C.white, borderWidth: 1.5, borderColor: K.line2, borderStyle: 'dashed' }}
                  >
                    <Icon name="plus" size={16} />
                    <T w="bold" size={S.small} color={C.deep}>
                      Friends or guests
                    </T>
                  </Pressable>
                </View>
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
                  placeholder="Friends or guests at the table (Shila Auntie)"
                  placeholderTextColor="#8A988F"
                  maxLength={80}
                  style={{ height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: K.line2, backgroundColor: C.white, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 17, color: C.ink }}
                />
              </>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Add a voice note" icon="mic" on={false} onPress={() => setMore(true)} />
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
        <DropIn style={{ width: 230, height: 250 }}>
          <View style={{ position: 'absolute', left: 5, top: 0, width: 220, height: 220, borderRadius: 110, backgroundColor: K.table, borderWidth: 9, borderColor: K.tableRim, alignItems: 'center', justifyContent: 'center' }}>
            {saved ? <FoodPlate meal={saved} size={170} /> : null}
          </View>
          <View style={{ position: 'absolute', right: -40, bottom: -6 }}>
            <Mado mood="happy" width={150} flip costume={wornCostume(store.family?.costumes, store.prefs.wear)} />
          </View>
        </DropIn>
        <PopIn delay={450}>
          <T w="bold" size={36} center style={{ lineHeight: 40 }}>
            {saved?.slot === 'fasting' ? 'Fasting day shared' : 'On the table!'}
          </T>
        </PopIn>
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
