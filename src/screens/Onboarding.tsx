import React, { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { LESSONS } from '../learn';
import { Btn, Puti, Row, T, Thali, TimeRow, Toggle } from '../ui';
import { LessonCard } from './Learn';
import { MiniWidget } from './OurTable';

const STEPS = ['times', 'guess', 'improve', 'remind', 'widget', 'learn'] as const;
type Step = (typeof STEPS)[number];

/**
 * A few questions after joining, one per screen, each with a clear yes and no.
 * Nothing here is required, and everything can be changed later in Settings.
 */
export default function Onboarding() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [refused, setRefused] = useState(false);
  const { prefs } = store;
  const step: Step = STEPS[i];
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : store.setPrefs({ onboarded: true, widgetSeen: true }));
  const name = store.me?.name ?? '';
  const cloud = store.cloud && !store.session?.demo;

  const remind = async (change: Parameters<typeof store.setReminders>[0]) => {
    const ok = await store.setReminders(change);
    setRefused(!!(change.reminderOn || change.nudgesOn) && !ok);
  };

  let body: React.ReactNode = null;
  let title = '';
  let lead = '';
  let mood: 'hello' | 'happy' | 'sleep' = 'hello';
  let actions: React.ReactNode = <Btn label="Next" onPress={next} />;

  if (step === 'times') {
    title = `When do you usually eat, ${name}?`;
    lead = 'Amader picks the right meal for you and checks in at the right time. Change it any time.';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 4 }}>
        <TimeRow icon="sunny-outline" label="Breakfast" hour={prefs.times.breakfast} min={4} max={11} onChange={(h) => store.setPrefs({ times: { ...prefs.times, breakfast: h } })} />
        <TimeRow icon="partly-sunny-outline" label="Lunch" hour={prefs.times.lunch} min={11} max={16} onChange={(h) => store.setPrefs({ times: { ...prefs.times, lunch: h } })} />
        <TimeRow icon="moon-outline" label="Dinner" hour={prefs.times.dinner} min={17} max={23} onChange={(h) => store.setPrefs({ times: { ...prefs.times, dinner: h } })} />
        <View style={{ height: 1, backgroundColor: '#EDF0EA', marginVertical: 6 }} />
        <Toggle title="I'm fasting for Ramadan" help="Meals become suhoor and iftar. Fasting days keep your streak." on={prefs.ramadan} onChange={(on) => store.setPrefs({ ramadan: on })} />
        {prefs.ramadan ? (
          <>
            <TimeRow icon="cloudy-night-outline" label="Suhoor" hour={prefs.suhoorHour} min={2} max={6} onChange={(h) => store.setPrefs({ suhoorHour: h })} />
            <TimeRow icon="moon" label="Iftar" hour={prefs.iftarHour} min={16} max={21} onChange={(h) => store.setPrefs({ iftarHour: h })} />
          </>
        ) : null}
      </View>
    );
  }

  if (step === 'guess') {
    title = 'Can Puti guess what is on your plate?';
    lead = 'Take a photo and Puti names the dish and counts the portions, so you only check and tap share.';
    mood = 'happy';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10 }}>
        <Row gap={12}>
          <Thali size={80} grains={2} protein={1} veg={1} />
          <View style={{ flex: 1, backgroundColor: C.mint, borderRadius: 16, borderTopLeftRadius: 4, padding: 10 }}>
            <T w="semibold">Looks like chicken curry with rice</T>
            <T size={14} color={C.muted}>
              2 fists rice · 1 palm protein · 1 handful veg
            </T>
          </View>
        </Row>
        <T size={14} color={C.muted}>
          To do this, your photo is sent to an AI service (Claude, made by Anthropic). No person at Amader looks at it, and it isn't used for ads. If you say no, you tap the portions yourself and photos only go to your family.
        </T>
      </View>
    );
    actions = (
      <View style={{ gap: 10 }}>
        <Btn label="Yes, guess for me" icon="sparkles" onPress={() => (store.setGuessOn(true), next())} />
        <Btn kind="ghost" label="No, I'll tap it myself" onPress={() => (store.setGuessOn(false), next())} />
      </View>
    );
  }

  if (step === 'improve') {
    title = 'Help Amader learn home cooking?';
    lead = 'Most food apps have never seen a plate of shutki or khichuri. Your own photos can teach Amader what our food looks like.';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 8 }}>
        {[
          ['checkmark-circle', 'Only your own plate photos and the portions you chose'],
          ['close-circle', "Never your family's photos, never your name"],
          ['refresh-circle', 'Turn it off any time and what you shared is removed'],
        ].map(([icon, text]) => (
          <Row key={text} gap={10}>
            <Ionicons name={icon as 'checkmark-circle'} size={22} color={C.leaf} />
            <T style={{ flex: 1 }}>{text}</T>
          </Row>
        ))}
        {!cloud ? (
          <T size={13} color={C.muted}>
            This copy of the app keeps everything on this phone, so nothing is sent yet.
          </T>
        ) : null}
      </View>
    );
    actions = (
      <View style={{ gap: 10 }}>
        <Btn label="Yes, use my photos" icon="heart" onPress={async () => (await store.setImproveOn(true), next())} />
        <Btn kind="ghost" label="No thanks" onPress={async () => (await store.setImproveOn(false), next())} />
      </View>
    );
  }

  if (step === 'remind') {
    title = 'Want a little nudge?';
    lead = 'A friendly "Did you eat?" after your meals, and now and then a surprise snack check. Never more than four a day.';
    mood = 'happy';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 4 }}>
        <View style={{ backgroundColor: C.soft, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="fish" size={20} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="semibold" size={15}>
              Did you eat?
            </T>
            <T size={14} color={C.muted}>
              Chai time? Tell the family what you are having.
            </T>
          </View>
        </View>
        <Toggle title='"Did you eat?" after meals' on={prefs.reminderOn} onChange={(on) => remind({ reminderOn: on })} />
        <Toggle title="Surprise snack checks" on={prefs.nudgesOn} onChange={(on) => remind({ nudgesOn: on })} />
        {refused ? (
          <T size={14} color="#8A2942">
            {Platform.OS === 'web' ? 'Reminders work in the phone app, not in the browser.' : 'Notifications are off for Amader. You can turn them on later in your phone settings.'}
          </T>
        ) : null}
      </View>
    );
  }

  if (step === 'widget') {
    title = 'Put Amader on your home screen';
    lead = 'The widget logs a meal with one tap, without opening the app. It is the easiest way to keep a streak.';
    const steps =
      Platform.OS === 'android'
        ? ['Press and hold an empty spot on your home screen', 'Tap Widgets and find Amader', 'Drag "Did you eat?" onto the screen']
        : Platform.OS === 'ios'
          ? ['Press and hold an empty spot on your home screen', 'Tap the + in the top corner', 'Search Amader, then tap Add Widget']
          : ['Install the Amader app on your phone', 'Press and hold the home screen, then add the Amader widget', 'Tap a number to log a meal'];
    body = (
      <View style={{ backgroundColor: C.deep, borderRadius: 20, padding: 16, gap: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <MiniWidget size={120} />
        </View>
        {steps.map((s, n) => (
          <Row key={s} gap={10}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
              <T w="bold" size={15} color={C.white}>
                {n + 1}
              </T>
            </View>
            <T color={C.white} style={{ flex: 1 }}>
              {s}
            </T>
          </Row>
        ))}
      </View>
    );
    actions = (
      <View style={{ gap: 10 }}>
        <Btn label="Done, I added it" onPress={next} />
        <Btn kind="ghost" label="Maybe later" onPress={next} />
      </View>
    );
  }

  if (step === 'learn') {
    const lesson = LESSONS[0];
    title = 'One thing worth knowing';
    lead = 'Amader has short questions like this one in the Learn tab. Tap your guess.';
    mood = 'happy';
    body = <LessonCard lesson={lesson} onAnswered={() => store.setPrefs({ learned: Array.from(new Set([...prefs.learned, lesson.id])) })} />;
    actions = <Btn label="Let's eat" icon="restaurant" onPress={next} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.mint }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 16, gap: 16 }}>
        <Row gap={6} style={{ justifyContent: 'center' }}>
          {STEPS.map((s, n) => (
            <View key={s} style={{ width: n === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: n <= i ? C.leaf : '#BFDCCB' }} />
          ))}
        </Row>
        <Row gap={10} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T w="bold" size={26} style={{ lineHeight: 32 }}>
              {title}
            </T>
          </View>
          <Puti mood={mood} width={88} />
        </Row>
        <T size={17} color={C.muted}>
          {lead}
        </T>
        {body}
      </ScrollView>
      <View style={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 16, gap: 10 }}>
        {actions}
        {i > 0 ? (
          <T size={14} color={C.muted} center onPress={() => setI(i - 1)} accessibilityRole="button">
            Back
          </T>
        ) : null}
      </View>
    </View>
  );
}
