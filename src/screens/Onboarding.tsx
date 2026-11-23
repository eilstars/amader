import React, { useState } from 'react';
import { FadeUp } from '../motion';
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
          <FadeUp delay={120}>
          <Question
            icon="sparkle"
            title="Let Mado read your plate"
            text="Snap and done. Mado names the dish and counts the portions for you, so sharing takes one tap."
            fine="Your photo is sent to an AI service (Claude, by Anthropic). No person at Amader looks at it."
            value={guess}
            onChange={(v) => {
              setGuess(v);
              if (!v) setLearn(false);
            }}
          />
          </FadeUp>
          <FadeUp delay={240}>
          <Question
            icon="book"
            title="Teach Mado your food"
            text="Keep your plate photos so Mado learns the dishes from your kitchen. Your saved plates also fill the summary you can show your doctor."
            fine="Only your own photos. You can stop and remove them any time in Settings."
            value={learn}
            onChange={setLearn}
            locked={guess === false ? 'Turn on Mado reading your plate first.' : undefined}
          />
          </FadeUp>
          <FadeUp delay={360}>
          <Question
            icon="sun"
            title="Gentle reminders"
            text={'A friendly "Did you eat?" after mealtimes, and a note when family shares a plate.'}
            value={remind}
            onChange={setRemind}
          />
          </FadeUp>
          {refused ? (
            <T size={S.small} color={C.deep}>
              Notifications are off for Amader on this phone. You can turn them on in your phone settings. Tap the button again to go on without them.
            </T>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
        <BigButton label={busy ? 'One moment...' : done ? 'Share my first plate' : 'Answer all three'} icon="camera" disabled={!done || busy} onPress={finish} />
      </View>
    </View>
  );
}

function Question({ icon, title, text, fine, value, onChange, locked }: { icon: IconName; title: string; text: string; fine?: string; value: Answer; onChange: (v: boolean) => void; locked?: string }) {
  return (
    <View style={[card, { padding: 14, gap: 10, opacity: locked ? 0.55 : 1 }, value === true && { borderWidth: 2, borderColor: C.leaf }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T w="bold" size={S.body} style={{ lineHeight: 21 }}>
            {title}
          </T>
          <T size={S.small} color={C.deep}>
            {locked ?? text}
          </T>
          {fine && !locked ? (
            <T size={12} color={C.muted}>
              {fine}
            </T>
          ) : null}
        </View>
      </View>
      {locked ? null : value === null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => onChange(true)} accessibilityRole="button" accessibilityLabel={`Yes: ${title}`} style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 24, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <T w="bold" size={S.body} color={C.white}>
              Yes, please
            </T>
          </Pressable>
          <Pressable onPress={() => onChange(false)} accessibilityRole="button" accessibilityLabel={`Skip: ${title}`} hitSlop={10}>
            <T w="medium" size={S.small} color={C.muted}>
              Skip
            </T>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {value ? <Icon name="check" size={18} color={C.leaf} /> : null}
          <T w="bold" size={S.small} color={value ? C.leaf : C.muted} style={{ flex: 1 }}>
            {value ? 'On' : 'Skipped'}
          </T>
          <Pressable onPress={() => onChange(!value)} accessibilityRole="button" hitSlop={10}>
            <T w="bold" size={S.small} color={C.deep} style={{ textDecorationLine: 'underline' }}>
              {value ? 'Undo' : 'Turn on'}
            </T>
          </Pressable>
        </View>
      )}
    </View>
  );
}
