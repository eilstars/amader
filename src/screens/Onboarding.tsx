import React, { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PlateCard } from '../food';
import { useStore } from '../store';
import { C } from '../theme';
import { MY_REASONS, THEIR_REASONS } from '../learn';
import { Btn, Chip, Puti, Row, T, TimeRow, Toggle } from '../ui';

// Kept short on purpose. The widget tip comes later, after a meal or two; sharing photos to improve Amader lives in Settings.
const STEPS = ['times', 'guess', 'remind', 'learn'] as const;
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
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : store.setPrefs({ onboarded: true }));
  // Reminders start on. The person sees both switches and can turn either off before going on.
  const [remindOn, setRemindOn] = useState(true);
  const [nudgeOn, setNudgeOn] = useState(true);
  const name = store.me?.name ?? '';
  const [sent, setSent] = useState<string | null>(null);

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
    lead = 'So reminders come at the right time.';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 4 }}>
        <TimeRow icon="sunny-outline" label="Breakfast" hour={prefs.times.breakfast} min={4} max={11} onChange={(h) => store.setPrefs({ times: { ...prefs.times, breakfast: h } })} />
        <TimeRow icon="partly-sunny-outline" label="Lunch" hour={prefs.times.lunch} min={11} max={16} onChange={(h) => store.setPrefs({ times: { ...prefs.times, lunch: h } })} />
        <TimeRow icon="moon-outline" label="Dinner" hour={prefs.times.dinner} min={17} max={23} onChange={(h) => store.setPrefs({ times: { ...prefs.times, dinner: h } })} />
      </View>
    );
  }

  if (step === 'guess') {
    title = 'Can Puti guess what is on your plate?';
    lead = 'Take a photo. Puti counts the portions, you check and share.';
    mood = 'happy';
    body = (
      <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10 }}>
        <Row gap={12}>
          <PlateCard size={84} grains={2} protein={1} veg={1} />
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

  if (step === 'remind') {
    title = 'Want a little nudge?';
    lead = 'A friendly "Did you eat?" after meals. Never more than four a day.';
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
              Tea time? Tell the family what you are having.
            </T>
          </View>
        </View>
        <Toggle title='"Did you eat?" after meals' on={remindOn} onChange={setRemindOn} />
        <Toggle title="Surprise snack checks" on={nudgeOn} onChange={setNudgeOn} />
        {refused ? (
          <T size={14} color="#8A2942">
            {Platform.OS === 'web' ? 'Reminders work in the phone app, not in the browser.' : 'Notifications are off for Amader. You can turn them on later in your phone settings.'}
          </T>
        ) : null}
      </View>
    );
    actions = (
      <Btn
        label={remindOn || nudgeOn ? 'Turn on reminders' : 'Next'}
        icon={remindOn || nudgeOn ? 'notifications' : undefined}
        onPress={async () => {
          if (remindOn || nudgeOn) {
            const ok = await store.setReminders({ reminderOn: remindOn, nudgesOn: nudgeOn });
            if (!ok && Platform.OS !== 'web') {
              setRefused(true);
              return;
            }
          }
          setRefused(false);
          next();
        }}
      />
    );
  }

  if (step === 'learn') {
    // The reason is the motivation. Learn keeps it in front of them.
    const cared = store.family?.members.find((m) => m.role === 'parent' && m.id !== store.me?.id);
    if (store.me?.role === 'child' && cared) {
      title = `Why do you need ${cared.name} healthy?`;
      lead = `Pick one. ${cared.name} sees it on their Learn page.`;
      mood = 'happy';
      body = (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {THEIR_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              on={sent === r}
              onPress={() => {
                setSent(r);
                store.sendCheer(cared.id, r).catch(() => setSent(null));
              }}
            />
          ))}
        </Row>
      );
    } else {
      title = 'What do you want to stay healthy for?';
      lead = 'Pick one. It stays on your Learn page.';
      mood = 'happy';
      body = (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {MY_REASONS.map((r) => (
            <Chip key={r} label={r} on={prefs.why === r} onPress={() => store.setPrefs({ why: r })} />
          ))}
        </Row>
      );
    }
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
