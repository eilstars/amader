import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Icon, IconName, Mado, S, card } from '../design';
import { useStore } from '../store';
import { C } from '../theme';
import { T } from '../ui';

type Answer = boolean | null;

/**
 * Three quick questions after joining, on one screen. Each needs an explicit yes or no thanks:
 * nothing is switched on for the person. Everything can be changed later in Settings.
 * It ends on the camera, because the first plate is what starts the family's loop.
 */
export default function Onboarding() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [remind, setRemind] = useState<Answer>(null);
  const [guess, setGuess] = useState<Answer>(null);
  const [learn, setLearn] = useState<Answer>(null);
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = store.me?.name ?? '';
  const done = remind !== null && guess !== null && learn !== null;

  async function finish() {
    setBusy(true);
    store.setGuessOn(guess === true);
    if (learn && guess) await store.setImproveOn(true).catch(() => false);
    await store.setFamilyAlerts(remind === true).catch(() => undefined);
    if (remind) {
      const ok = await store.setReminders({ reminderOn: true, nudgesOn: false }).catch(() => false);
      if (!ok && Platform.OS !== 'web' && !refused) {
        // Say why once; a second tap goes on without reminders.
        setRefused(true);
        setBusy(false);
        return;
      }
    }
    store.setPrefs({ onboarded: true });
    store.setPendingAction({ kind: 'add' });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={S.small} color={C.deep}>
              {name ? `Welcome, ${name}` : 'Welcome'}
            </T>
            <T w="bold" size={S.display} style={{ lineHeight: 36 }}>
              Three quick questions
            </T>
            <T w="medium" size={S.small} color={C.deep}>
              You can change any of these later in Settings.
            </T>
          </View>
          <Mado mood="happy" width={84} />
        </View>

        <View style={{ padding: 20, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <Question
            icon="sun"
            title="Gentle reminders?"
            text={'A friendly "Did you eat?" after mealtimes, and a note when family shares a plate.'}
            value={remind}
            onChange={setRemind}
          />
          <Question
            icon="sparkle"
            title="Can Mado guess your plate?"
            text="Your photo is sent to an AI service (Claude, by Anthropic) to count the portions. No person at Amader looks at it. Say no and you tap the counts yourself."
            value={guess}
            onChange={(v) => {
              setGuess(v);
              if (!v) setLearn(false);
            }}
          />
          <Question
            icon="book"
            title="Help Mado learn our food?"
            text="Keep your photos and fixes so Mado gets better at dishes from home. Only with your yes, and you can stop any time."
            value={learn}
            onChange={setLearn}
            locked={guess === false ? 'Only if Mado guesses your plate.' : undefined}
          />
          {refused ? (
            <T size={S.small} color={C.deep}>
              Notifications are off for Amader on this phone. You can turn them on in your phone settings. Tap the button again to go on without them.
            </T>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16, maxWidth: 440, alignSelf: 'center', width: '100%' }}>
        <BigButton label={busy ? 'One moment...' : done ? 'Share my first plate' : 'Answer all three'} icon="camera" disabled={!done || busy} onPress={finish} />
      </View>
    </View>
  );
}

function Question({ icon, title, text, value, onChange, locked }: { icon: IconName; title: string; text: string; value: Answer; onChange: (v: boolean) => void; locked?: string }) {
  const choice = (label: string, v: boolean) => {
    const on = value === v;
    return (
      <Pressable
        onPress={() => onChange(v)}
        disabled={!!locked}
        accessibilityRole="radio"
        accessibilityState={{ checked: on, disabled: !!locked }}
        style={{ flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: on ? (v ? C.leaf : C.deep) : C.white, borderWidth: on ? 0 : 1.5, borderColor: '#D8E2DC' }}
      >
        {on ? <Icon name="check" size={16} color={C.white} /> : null}
        <T w="bold" size={S.small + 1} color={on ? C.white : C.deep}>
          {label}
        </T>
      </Pressable>
    );
  };
  return (
    <View style={[card, { padding: 14, gap: 10, opacity: locked ? 0.55 : 1 }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T w="bold" size={S.body} style={{ lineHeight: 21 }}>
            {title}
          </T>
          <T size={S.small} color={C.muted}>
            {locked ?? text}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {choice('Yes', true)}
        {choice('No thanks', false)}
      </View>
    </View>
  );
}
