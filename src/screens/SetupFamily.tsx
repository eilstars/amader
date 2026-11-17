import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Btn, Chip, GOAL_FOODS, Puti, RoundButton, Row, T, field } from '../ui';

const CALLED = ['Ammi', 'Abbu', 'Nani', 'Dadi', 'Mom', 'Dad', 'Amma', 'Papa'];

/**
 * A caregiver sets the table, one question per screen. The person they look after
 * only ever enters a code and lands on the camera.
 */
export default function SetupFamily({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState('');
  const [myName, setMyName] = useState('');
  const [food, setFood] = useState('Rice');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const them = parentName.trim() || 'them';

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await store.createFamily({ myName: myName.trim(), parentName: parentName.trim(), goalFood: food, goalHandfuls: 2 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const screens = [
    {
      title: 'Who are you looking after?',
      lead: 'What do you call them at home? This is the name the family will see.',
      body: (
        <>
          <TextInput value={parentName} onChangeText={setParentName} placeholder="Ammi" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {CALLED.map((n) => (
              <Chip key={n} label={n} on={parentName === n} onPress={() => setParentName(n)} />
            ))}
          </Row>
        </>
      ),
      ok: parentName.trim().length > 0,
    },
    {
      title: `And what does ${them} call you?`,
      lead: `You are ${them}'s caregiver here. Brothers, sisters, cousins and anyone else who helps can join too.`,
      body: <TextInput value={myName} onChangeText={setMyName} placeholder="Nadia" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />,
      ok: myName.trim().length > 0,
    },
    {
      title: 'What fills most plates?',
      lead: 'Grains are counted in fists, protein in palms and vegetables in handfuls. This is the grain word everyone will see.',
      body: (
        <>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {GOAL_FOODS.map((f) => (
              <Chip key={f} label={f} on={food === f} onPress={() => setFood(f)} />
            ))}
          </Row>
          <Pressable onPress={() => setAdult(!adult)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }} style={{ marginTop: 12 }}>
            <Row gap={10}>
              <View style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: adult ? C.leaf : C.line, backgroundColor: adult ? C.leaf : C.white, alignItems: 'center', justifyContent: 'center' }}>
                {adult ? <Ionicons name="checkmark" size={18} color={C.white} /> : null}
              </View>
              <T>I'm 18 or older</T>
            </Row>
          </Pressable>
        </>
      ),
      ok: adult && !busy,
    },
  ];
  const screen = screens[step];
  const last = step === screens.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.mint }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between' }}>
          <RoundButton icon="chevron-back" label="Back" onPress={() => (step === 0 ? onBack() : setStep(step - 1))} />
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
          <Puti mood={step === 2 ? 'happy' : 'hello'} width={84} />
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
        <Btn label={last ? (busy ? 'Setting the table...' : 'Set the table') : 'Next'} disabled={!screen.ok} onPress={() => (last ? go() : setStep(step + 1))} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
