import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Hand, findHand } from '../hand';
import { useStore } from '../store';
import { C } from '../theme';
import { Guess, Photo } from '../types';
import { Btn, Plate, Puti, Row, T } from '../ui';
import HandMeasure from './HandMeasure';
import { DAY_LETTERS, amountText, sameDay, slotAt, unitHint, weekDays } from '../words';

type Step = 'photo' | 'portion' | 'saved';

/** Photo, one tap for the goal food, done. Three screens, about ten seconds. */
export default function AddMeal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [handfuls, setHandfuls] = useState(store.goalHandfuls);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [guessing, setGuessing] = useState(false);
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

  // Ask what is on the plate while the person looks at the portion screen. Never blocks saving.
  function look(at: Photo) {
    setGuess(null);
    touched.current = false;
    if (!store.prefs.guessOn) return;
    setGuessing(true);
    store
      .recognize(at)
      .then((found) => {
        setGuess(found);
        if (found && found.amount !== null && found.amount >= 1 && !touched.current) setHandfuls(found.amount);
      })
      .finally(() => setGuessing(false));
  }

  const slot = slotAt(new Date());
  const food = store.goalFood;
  const me = store.me;

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
        setPhoto({ uri: asset.uri, base64: asset.base64 ?? null });
      }
      setStep('portion');
    } catch {
      setNote("That didn't work. Try choosing a photo instead.");
    } finally {
      setBusy(false);
    }
  }

  async function save(amount: number | null) {
    setBusy(true);
    setNote(null);
    try {
      await store.addMeal(photo, amount, photo ? guess : null, byHand ? 'hand' : touched.current || !guess || amount === 0 ? 'tap' : 'guess');
      setStep('saved');
    } catch (e) {
      setNote(e instanceof Error ? `We couldn't save that. ${e.message}` : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === 'photo') {
    return (
      <View style={{ flex: 1, backgroundColor: C.night, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color={C.white} />
          </Pressable>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <T w="semibold" size={12} color={C.white}>
              Meal {store.myMealCount + 1} of {store.nextMilestone}
            </T>
          </View>
        </Row>

        <Row style={{ justifyContent: 'space-between', marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={34} color={C.white}>
              Did you eat?
            </T>
            <T color="#C9D8CF">Show us your {slot}.</T>
          </View>
          <Puti mood="hello" width={92} />
        </Row>

        <Pressable
          onPress={() => pick(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Take a photo of your plate"
          style={{ flex: 1, marginVertical: 20, borderRadius: 28, backgroundColor: '#1F3A2D', alignItems: 'center', justifyContent: 'center', gap: 16 }}
        >
          <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <ActivityIndicator color={C.white} /> : <Ionicons name="camera" size={44} color={C.white} />}
            <T w="semibold" size={17} color={C.white}>
              Tap to take a photo
            </T>
          </View>
        </Pressable>

        {note ? (
          <T center color="#F4B6C2" size={14} style={{ marginBottom: 12 }}>
            {note}
          </T>
        ) : null}

        <Row gap={10}>
          <Btn kind="dark" label="Choose a photo" onPress={() => pick(false)} disabled={busy} style={{ flex: 1, alignSelf: 'auto', paddingHorizontal: 8 }} />
          <Btn
            kind="dark"
            label="No photo today"
            onPress={() => {
              setPhoto(null);
              setGuess(null);
              setHand(null);
              setStep('portion');
            }}
            disabled={busy}
            style={{ flex: 1, alignSelf: 'auto', paddingHorizontal: 8 }}
          />
        </Row>
      </View>
    );
  }

  if (step === 'portion') {
    const plan = store.goalHandfuls;
    const line = handfuls === plan ? 'Right on your plan' : handfuls < plan ? 'A lighter plate' : 'A bigger plate today';
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, gap: 14 }}>
        <Row>
          <Pressable onPress={() => setStep('photo')} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color={C.ink} />
          </Pressable>
          <T w="semibold" size={14}>
            {slot[0].toUpperCase() + slot.slice(1)}
          </T>
        </Row>
        {measuring && photo && hand ? (
          <HandMeasure
            photo={photo}
            hand={hand}
            food={food}
            onBack={() => setMeasuring(false)}
            onUse={(n) => {
              touched.current = true;
              setHandfuls(n);
              setByHand(true);
              setMeasuring(false);
            }}
          />
        ) : (
          <>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <T w="bold" size={28} center>
            How much {food.toLowerCase()}?
          </T>
          <T color={C.muted} size={14} center>
            Tap a number. {unitHint(food) === 'Tap a number.' ? '' : unitHint(food)}
          </T>
        </View>

        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          {photo ? (
            <View>
              <Image source={{ uri: photo.uri }} style={{ width: 210, height: 210, borderRadius: 105, borderWidth: 8, borderColor: C.steel, backgroundColor: C.soft }} />
              <View style={{ position: 'absolute', right: -8, bottom: -4 }}>
                <Plate size={84} handfuls={handfuls} />
              </View>
            </View>
          ) : (
            <Plate size={210} handfuls={handfuls} />
          )}
        </View>

        <View style={{ alignItems: 'center' }}>
          <T w="bold" size={20}>
            {amountText(handfuls, food)}
          </T>
          <T color={C.muted} size={14}>
            {byHand ? 'Measured against your own hand' : line}
          </T>
        </View>

        <Row style={{ justifyContent: 'center' }} gap={14}>
          {[1, 2, 3, 4].map((n) => {
            const on = handfuls === n;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  touched.current = true;
                  setByHand(false);
                  setHandfuls(n);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={amountText(n, food)}
                style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 1.5, borderColor: on ? C.leaf : C.line, backgroundColor: on ? C.leaf : C.white, alignItems: 'center', justifyContent: 'center' }}
              >
                <T w="semibold" size={22} color={on ? C.white : C.ink}>
                  {n === 4 ? '4+' : String(n)}
                </T>
              </Pressable>
            );
          })}
        </Row>

        {photo && food.toLowerCase() === 'rice' ? (
          hand ? (
            <Btn kind="ghost" icon="hand-left-outline" label="Measure with my hand" onPress={() => setMeasuring(true)} />
          ) : (
            <T center color={C.muted} size={13}>
              {looking ? 'Looking for your hand in the photo...' : 'Tip: put your hand flat next to the plate in the photo and Amader can measure for you.'}
            </T>
          )
        ) : null}

        {photo && (guessing || guess) ? (
          <View style={{ backgroundColor: C.mint, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Puti mood="hello" width={48} />
            <View style={{ flex: 1 }}>
              {guessing ? (
                <T size={14} color={C.deep}>
                  Puti is looking at your plate...
                </T>
              ) : guess ? (
                <>
                  <T w="semibold" size={14} color={C.deep}>
                    {guess.sample ? 'Sample guess: ' : 'Looks like '}
                    {guess.dish || 'a lovely plate'}
                  </T>
                  <T size={12} color={C.muted}>
                    {guess.sample
                      ? 'Real photo reading turns on once the app is connected to its server.'
                      : guess.amount !== null
                        ? `About ${amountText(Math.max(1, guess.amount), food)}, as a guess. Tap a number to change it.`
                        : 'Tap the number that fits.'}
                  </T>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
        {note ? (
          <T center color="#8A2942" size={14}>
            {note}
          </T>
        ) : null}
        <Btn label={busy ? 'Saving...' : `Save ${slot}`} disabled={busy} onPress={() => save(handfuls)} />
        <Btn kind="line" label={`No ${food.toLowerCase()} this time`} disabled={busy} onPress={() => save(0)} />
          </>
        )}
      </ScrollView>
    );
  }

  // Saved: an instant reward, because the health payoff is slow.
  const count = store.myMealCount;
  const goal = store.nextMilestone;
  const hitMilestone = [10, 30, 50, 100].includes(count);
  const week = weekDays();
  const mine = store.meals.filter((m) => m.memberId === store.session?.meId);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
      <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 28, paddingBottom: 28, alignItems: 'center', gap: 10, paddingHorizontal: 24 }}>
        <Row gap={16}>
          <Puti mood="happy" width={96} />
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: C.white, borderWidth: 8, borderColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={30} color={C.deep} style={{ lineHeight: 34 }}>
              {count}
            </T>
            <T size={11} color={C.muted}>
              of {hitMilestone ? count : goal} meals
            </T>
          </View>
        </Row>
        <T w="bold" size={26} center>
          {hitMilestone ? `${count} meals shared!` : `Lovely plate, ${me?.name ?? ''}!`}
        </T>
        <T color={C.muted} center size={14}>
          {hitMilestone ? 'You earned a new plate badge. The family can see it.' : 'Your family can see it now.'}
        </T>
      </View>

      <View style={{ padding: 24, gap: 16, flex: 1 }}>
        <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 12 }}>
          <T w="semibold" size={12} color={C.leaf} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            Your week so far
          </T>
          <Row style={{ justifyContent: 'space-between' }} gap={4}>
            {week.map((day, i) => {
              const meal = mine.find((m) => sameDay(new Date(m.date), day));
              return (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <Plate size={36} empty={!meal} photo={meal?.photo} handfuls={meal?.handfuls} />
                  <T size={11} color={C.muted}>
                    {DAY_LETTERS[i]}
                  </T>
                </View>
              );
            })}
          </Row>
        </View>
        <View style={{ flex: 1 }} />
        <Btn label="See Our Table" onPress={onClose} />
      </View>
    </ScrollView>
  );
}
