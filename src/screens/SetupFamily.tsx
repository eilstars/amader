import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { Row, T, Toggle, field } from '../ui';
import { BigButton, Icon, Mado, Pill, RoundIcon } from '../design';

const CALLED = ['Mom', 'Dad', 'Ammi', 'Abbu', 'Grandma', 'Grandpa', 'Nani', 'Mama'];

/**
 * A caregiver sets the table, one question per screen. The person they look after
 * only ever enters a code and lands on the camera.
 */
export default function SetupFamily({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState('');
  // More than one person: both parents, or a parent and an in-law. The first gets the seat made with the family.
  const [also, setAlso] = useState<string[]>([]);
  const [myName, setMyName] = useState('');
  // The main grain starts as rice; it can be changed on any meal or in Settings.
  const food = 'Rice';
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const them = also.length ? [parentName.trim(), ...also].join(' and ') : parentName.trim() || 'them';

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await store.createFamily({ myName: myName.trim(), parentName: parentName.trim(), goalFood: food, goalHandfuls: 2 });
      for (const name of also.filter((n) => n !== parentName.trim())) await store.addPerson(name).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const screens = [
    {
      title: 'Who are you looking after?',
      lead: 'What do you call them at home? Pick more than one if you look after both.',
      body: (
        <>
          <TextInput value={parentName} onChangeText={setParentName} placeholder="Mom" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {CALLED.map((n) => {
              const on = parentName === n || also.includes(n);
              return (
                <Pill
                  key={n}
                  label={n}
                  on={on}
                  onPress={() => {
                    if (parentName === n) {
                      // Unpick the first: the next one picked moves up.
                      setParentName(also[0] ?? '');
                      setAlso(also.slice(1));
                    } else if (also.includes(n)) setAlso(also.filter((x) => x !== n));
                    else if (!parentName.trim()) setParentName(n);
                    else if (also.length < 3) setAlso([...also, n]);
                  }}
                />
              );
            })}
          </Row>
        </>
      ),
      ok: parentName.trim().length > 0,
    },
    {
      title: `And what ${also.length ? "do" : "does"} ${them} call you?`,
      lead: 'Others who help can join later.',
      body: (
        <>
          <TextInput value={myName} onChangeText={setMyName} placeholder="Your name" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />
          <View style={{ backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Toggle title={`I live with ${them}`} help="Then one photo can cover a meal you eat together." on={store.prefs.sameHome} onChange={(on) => store.setPrefs({ sameHome: on })} />
          </View>
          <Pressable onPress={() => setAdult(!adult)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }} style={{ marginTop: 4 }}>
            <Row gap={10}>
              <View style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: adult ? C.leaf : C.line, backgroundColor: adult ? C.leaf : C.white, alignItems: 'center', justifyContent: 'center' }}>
                {adult ? <Icon name="check" size={18} color={C.white} /> : null}
              </View>
              <T>I'm 18 or older</T>
            </Row>
          </Pressable>
        </>
      ),
      ok: myName.trim().length > 0 && adult && !busy,
    },
  ];
  const screen = screens[step];
  const last = step === screens.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.rice }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between' }}>
          <RoundIcon name="back" label="Back" onPress={() => (step === 0 ? onBack() : setStep(step - 1))} />
          <Row gap={6}>
            {screens.map((_, n) => (
              <View key={n} style={{ width: n === step ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: n <= step ? C.leaf : '#BFDCCB' }} />
            ))}
          </Row>
          <View style={{ width: 44 }} />
        </Row>
        <Row gap={10} style={{ alignItems: 'flex-end' }}>
          <T w="bold" size={27} style={{ flex: 1, lineHeight: 33 }}>
            {screen.title}
          </T>
          <Mado mood="hello" width={84} />
        </Row>
        <T size={17} color={C.muted}>
          {screen.lead}
        </T>
        {screen.body}
        <View style={{ flex: 1 }} />
        {error ? (
          <T color="#8A2942" size={15}>
            {error}
          </T>
        ) : null}
        <BigButton label={last ? (busy ? 'Setting the table...' : 'Set the table') : 'Next'} disabled={!screen.ok} onPress={() => (last ? go() : setStep(step + 1))} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
