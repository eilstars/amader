import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { BigButton, Icon, IconName, Mado, RoundIcon, S, Sheet, card } from '../design';
import { Key, digits } from '../i18n';
import { PopIn } from '../motion';
import {
  GRAINS,
  STARCHES,
  STOPS,
  StarchId,
  clampAmount,
  halves,
  lastStarch,
  pathOf,
  pathProgress,
  starchById,
  starchOf,
  usualFor,
} from '../starch';
import { AmountArt, FoodArt } from '../starchArt';
import { useStore } from '../store';
import { C } from '../theme';
import { Guess, Photo, Slot } from '../types';
import { T } from '../ui';
import { slotAt } from '../words';
import StarchHelp from './StarchHelp';

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_ICON: Record<string, IconName> = { breakfast: 'sun', lunch: 'sun', dinner: 'moon', snack: 'cup' };

/** "2½ handfuls" in the person's language. */
export function amountLabel(t: (k: Key) => string, lang: string, starch: StarchId, amount: number): string {
  const unit = starchById(starch).unit;
  const one = amount <= 1;
  const word = unit === 'hand' ? t(one ? 'hand' : 'hands') : unit === 'piece' ? t(one ? 'piece' : 'pieces') : t(one ? 'slice' : 'slices');
  return `${digits(halves(amount), lang)} ${word}`;
}

/** "Rice, 2½ handfuls" in the person's language. Empty when nothing was recorded. */
export function starchText(t: (k: Key) => string, lang: string, grain: string | null | undefined, amount: number | null | undefined): string {
  const id = starchOf(grain);
  if (!id || amount === null || amount === undefined) return '';
  if (id === 'none' || amount === 0) return t('none');
  return `${t(id as Key)}, ${amountLabel(t, lang, id, amount)}`;
}

/**
 * Starch-first logging: which starch, how much (in halves), and that's it. A photo is optional; when there is one,
 * Mado guesses the starch and amount and the person fixes it right there. Most days it is one tap, because it starts
 * on what they usually have.
 */
export default function StarchLog({ onClose, onPath }: { onClose: () => void; onPath: () => void }) {
  const store = useStore();
  const { t, lang, meals, family } = store;
  const insets = useSafeAreaInsets();
  const me = store.me;
  const meId = me?.id ?? '';
  const [slot, setSlot] = useState<Slot>(() => {
    const s = slotAt(new Date(), store.prefs.times, false);
    return SLOTS.includes(s) ? s : 'dinner';
  });
  const [starch, setStarch] = useState<StarchId>(() => lastStarch(meals, meId) ?? (starchOf(store.goalFood) ?? 'rice'));
  const [amount, setAmount] = useState(() => usualFor(meals, meId, lastStarch(meals, meId) ?? (starchOf(store.goalFood) ?? 'rice')));
  const [vegFirst, setVegFirst] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [looking, setLooking] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ grains: number } | null>(null);
  const touched = useRef(false);

  const state = pathOf(family, meId);
  const stop = STOPS[state.level];
  const askVeg = state.level >= 2;
  const usual = usualFor(meals, meId, starch);
  const others = (family?.members ?? []).filter((m) => m.id !== meId && m.joined).map((m) => m.name);
  const askGuess = store.cloud && !store.session?.demo && store.prefs.guessOn === null;

  function pickStarch(id: StarchId) {
    touched.current = true;
    setStarch(id);
    setAmount(id === 'none' ? 0 : usualFor(meals, meId, id));
  }

  function look(at: Photo, justAgreed = false) {
    if (!store.session?.demo && store.prefs.guessOn !== true && !justAgreed) return;
    setLooking(true);
    store
      .recognize(at, { justAgreed })
      .then((found) => {
        setGuess(found);
        const id = starchOf(found?.starch ?? null);
        if (found && id && !touched.current) {
          setStarch(id);
          if (found.starchAmount !== null && found.starchAmount !== undefined) setAmount(clampAmount(found.starchAmount));
          store.logEvent('photo_guess');
        }
      })
      .finally(() => setLooking(false));
  }

  async function takePhoto(camera: boolean) {
    setNote(null);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNote(t('cameraOff'));
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      // Shrinking also strips where the photo was taken (GPS). If it fails, the original is never used.
      const small = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
      const taken = { uri: small.uri, base64: small.base64 ?? null };
      touched.current = false;
      setPhoto(taken);
      look(taken);
    } catch {
      setNote(t('photoFail'));
    }
  }

  async function share() {
    setBusy(true);
    setNote(null);
    const before = pathProgress(meals, meId, state).week[6];
    try {
      const meal = await store.addMeal({
        slot,
        photo,
        portions: null,
        guess,
        grain: starchById(starch).name,
        starchAmount: starch === 'none' ? 0 : amount,
        vegFirst: askVeg ? vegFirst : null,
        chosenBy: guess?.starch && !touched.current ? 'guess' : 'tap',
      });
      const guessed = starchOf(guess?.starch ?? null);
      if (guessed && (guessed !== starch || (guess?.starchAmount ?? null) !== amount)) store.logEvent('photo_fixed');
      const after = pathProgress([meal, ...meals], meId, state).week[6];
      setSaved({ grains: GRAINS.meal + (before !== 'yes' && after === 'yes' && stop !== 'usual' ? GRAINS.dayAtStep : 0) });
    } catch {
      setNote(t('saveFail'));
    } finally {
      setBusy(false);
    }
  }

  if (saved) return <Saved grains={saved.grains} others={others} onPath={onPath} onClose={onClose} />;

  const fixable = !!guess?.starch;
  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + 120, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={SLOT_ICON[slot] ?? 'sun'} size={28} />
          <T w="bold" size={26} style={{ flex: 1 }}>
            {t(slot as Key)}
          </T>
          <RoundIcon name="close" onPress={onClose} label={t('close')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SLOTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: s === slot }}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: s === slot ? C.leaf : C.white, borderWidth: s === slot ? 0 : 1.5, borderColor: C.line }}
            >
              <Icon name={SLOT_ICON[s]} size={18} color={s === slot ? C.white : C.deep} />
              <T w="bold" size={S.small} color={s === slot ? C.white : C.deep}>
                {t(s as Key)}
              </T>
            </Pressable>
          ))}
        </ScrollView>

        {photo ? (
          <View style={[card, { padding: 0, overflow: 'hidden' }]}>
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 200 }} resizeMode="cover" accessibilityLabel="Your plate" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
              {looking ? <ActivityIndicator color={C.leaf} /> : <Mado width={52} mood="happy" />}
              <T w="bold" size={S.body} style={{ flex: 1 }}>
                {looking ? t('madoLooking') : fixable ? t('madoGuess') : ''}
              </T>
              <RoundIcon name="close" onPress={() => { setPhoto(null); setGuess(null); }} label={t('noPhoto')} bg={C.soft} />
            </View>
          </View>
        ) : null}
        {/* The first photo asks before anything leaves the phone for the AI. Until then, and after a no, nothing is sent. */}
        {photo && askGuess ? (
          <View style={[card, { gap: 10 }]}>
            <T w="bold" size={S.body}>
              {t('askGuessTitle')}
            </T>
            <T size={S.small} color={C.muted}>
              {t('askGuessText')}
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <BigButton label={t('noThanks')} kind="line" height={48} size={S.body} onPress={() => store.setGuessOn(false)} style={{ flex: 1 }} />
              <BigButton
                label={t('yes')}
                height={48}
                size={S.body}
                onPress={() => {
                  store.setGuessOn(true);
                  look(photo, true);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}
        {photo ? null : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BigButton label={t('takePhoto')} icon="camera" kind="mint" onPress={() => takePhoto(true)} style={{ flex: 1 }} height={56} size={17} />
            <RoundIcon name="image" onPress={() => takePhoto(false)} label={t('choosePhoto')} bg={C.mint} size={56} />
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T w="bold" size={S.title}>
            {t('whichStarch')}
          </T>
          <Pressable
            onPress={() => {
              setHelp(true);
              store.logEvent('help_opened');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('whatIsStarch')}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}
          >
            <T w="bold" size={26} color={C.deep}>
              ?
            </T>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {STARCHES.filter((s) => s.id !== 'none').map((s) => (
            <StarchTile key={s.id} id={s.id} label={t(s.id as Key)} on={starch === s.id} onPress={() => pickStarch(s.id)} />
          ))}
        </View>
        <Pressable
          onPress={() => pickStarch('none')}
          accessibilityRole="button"
          accessibilityState={{ selected: starch === 'none' }}
          style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderWidth: 3, borderColor: starch === 'none' ? C.leaf : C.white, backgroundColor: starch === 'none' ? C.mint : C.white }]}
        >
          <FoodArt art="none" size={40} />
          <T w="bold" size={S.body}>
            {t('none')}
          </T>
        </Pressable>

        {starch !== 'none' ? (
          <View style={[card, { alignItems: 'center', gap: 8 }]}>
            <PopIn k={`${starch}`}>
              <AmountArt starch={starch} amount={amount} size={52} />
            </PopIn>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Pressable
                onPress={() => { touched.current = true; setAmount((a) => clampAmount(a - 0.5)); }}
                accessibilityRole="button"
                accessibilityLabel={t('less')}
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: C.leaf, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="minus" size={30} color={C.leaf} />
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <T w="bold" size={44} color={C.deep} style={{ lineHeight: 50 }}>
                  {digits(halves(amount), lang)}
                </T>
                <T size={S.body} color={C.muted}>
                  {amountLabel(t, lang, starch, amount).split(' ').slice(1).join(' ')}
                </T>
              </View>
              <Pressable
                onPress={() => { touched.current = true; setAmount((a) => clampAmount(a + 0.5)); }}
                accessibilityRole="button"
                accessibilityLabel={t('more')}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="plus" size={30} color={C.white} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => setAmount(usual)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: C.mint }}
            >
              <Icon name="repeat" size={20} />
              <T w="bold" size={S.body} color={C.deep}>
                {t('usual')} {digits(halves(usual), lang)}
              </T>
            </Pressable>
          </View>
        ) : null}

        {askVeg ? (
          <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }]}>
            <FoodArt art="sabzi" size={44} />
            <T w="bold" size={18} style={{ flex: 1 }}>
              {t('vegFirstQ')}
            </T>
            <Pressable onPress={() => setVegFirst(true)} accessibilityRole="button" accessibilityLabel={t('yes')} accessibilityState={{ selected: vegFirst === true }} style={round(vegFirst === true)}>
              <Icon name="check" size={24} color={vegFirst === true ? C.white : C.leaf} />
            </Pressable>
            <Pressable onPress={() => setVegFirst(false)} accessibilityRole="button" accessibilityLabel={t('notToday')} accessibilityState={{ selected: vegFirst === false }} style={round(vegFirst === false)}>
              <Icon name="minus" size={22} color={vegFirst === false ? C.white : C.muted} />
            </Pressable>
          </View>
        ) : null}

        {note ? (
          <T size={S.body} color={C.deep}>
            {note}
          </T>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16 }}>
        <BigButton label={busy ? t('sharing') : fixable && !touched.current ? t('looksRight') : t('share')} icon="check" onPress={share} disabled={busy || !me} height={64} />
      </View>

      <Sheet visible={help} onClose={() => setHelp(false)} height="92%">
        <StarchHelp onClose={() => setHelp(false)} />
      </Sheet>
    </View>
  );
}

function round(on: boolean) {
  return { width: 52, height: 52, borderRadius: 26, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: on ? C.leaf : C.white, borderWidth: on ? 0 : 2, borderColor: C.steel };
}

function StarchTile({ id, label, on, onPress }: { id: StarchId; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={[card, { width: '31%', height: 104, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: on ? C.leaf : C.white, backgroundColor: on ? C.mint : C.white }]}
    >
      <FoodArt art={id} size={56} />
      <T w="bold" size={S.body}>
        {label}
      </T>
    </Pressable>
  );
}

function Saved({ grains, others, onPath, onClose }: { grains: number; others: string[]; onPath: () => void; onClose: () => void }) {
  const store = useStore();
  const { t, lang, meals, family } = store;
  const insets = useSafeAreaInsets();
  const meId = store.me?.id ?? '';
  const state = pathOf(family, meId);
  const progress = useMemo(() => pathProgress(meals, meId, state), [meals, meId, state]);
  const stop = STOPS[state.level];
  useEffect(() => {
    // Close by itself after a while, so a parent who puts the phone down comes back to the home screen.
    const timer = setTimeout(onClose, 20_000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <View style={{ flex: 1, backgroundColor: C.rice, alignItems: 'center', paddingTop: insets.top + 36, paddingHorizontal: 20, gap: 16 }}>
      <PopIn k="saved">
        <Mado width={170} mood="happy" />
      </PopIn>
      <T w="bold" size={S.display} center>
        {t('sharedTitle')}
      </T>
      {others.length ? (
        <T size={S.body} color={C.muted} center>
          {t('willSee', { names: others.join(', ') })}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 }}>
        <Icon name="sparkle" size={22} color={C.leaf} />
        <T w="bold" size={20} color={C.deep}>
          {t('grainsPlus', { n: grains })}
        </T>
      </View>
      {stop !== 'usual' && stop !== 'easy' ? (
        <View style={[card, { width: '100%', gap: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T w="bold" size={S.body}>
              {stop === 'veg' ? t('stopVeg') : t('stepLine', { amount: state.step !== null ? digits(halves(state.step), lang) : '' })}
            </T>
            <T size={S.small} color={C.muted}>
              {t('daysOf', { n: progress.done, m: progress.need })}
            </T>
          </View>
          <WeekDots week={progress.week} />
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      <View style={{ width: '100%', gap: 10, paddingBottom: insets.bottom + 16 }}>
        <BigButton label={t('seePath')} icon="next" onPress={onPath} height={60} />
        <BigButton label={t('done')} kind="line" onPress={onClose} height={52} size={17} />
      </View>
    </View>
  );
}

/** The last seven days, oldest first: green done, dashed freeze, grey missed, ringed today. */
export function WeekDots({ week, size = 32 }: { week: ('yes' | 'no' | 'freeze' | 'none' | 'today')[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: size < 32 ? 4 : 0 }}>
      {week.map((d, i) => (
        <View
          key={i}
          accessibilityLabel={d}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: d === 'yes' ? C.leaf : d === 'freeze' ? C.mint : d === 'no' ? C.steel : C.white,
            borderWidth: d === 'freeze' ? 2 : d === 'today' || d === 'none' ? 2 : 0,
            borderStyle: d === 'freeze' ? 'dashed' : 'solid',
            borderColor: d === 'freeze' ? C.leaf : C.steel,
          }}
        />
      ))}
    </View>
  );
}
