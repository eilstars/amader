import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Btn, Card, RoundButton, Row, T } from '../ui';
import { PolicyLinks } from '../legal';
import { amountText } from '../words';

const PARENT_NAMES = ['Ammi', 'Amma', 'Abbu', 'Mummy', 'Papa', 'Mom', 'Dad'];
export const GOAL_FOODS = ['Rice', 'Roti', 'Sweets', 'Chai'];

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, on && { backgroundColor: C.leaf, borderColor: C.leaf }]}>
      <T w="medium" size={14} color={on ? C.white : C.ink}>
        {label}
      </T>
    </Pressable>
  );
}

export function Stepper({ value, onChange, food }: { value: number; onChange: (n: number) => void; food: string }) {
  return (
    <Row gap={10}>
      <Pressable style={s.step} onPress={() => onChange(Math.max(1, value - 1))} accessibilityLabel="Less">
        <Ionicons name="remove" size={18} color={C.ink} />
      </Pressable>
      <T w="semibold" style={{ minWidth: 92, textAlign: 'center' }}>
        {amountText(value, food)}
      </T>
      <Pressable style={s.step} onPress={() => onChange(Math.min(4, value + 1))} accessibilityLabel="More">
        <Ionicons name="add" size={18} color={C.ink} />
      </Pressable>
    </Row>
  );
}

export default function SetupFamily({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [myName, setMyName] = useState('');
  const [parentName, setParentName] = useState('Ammi');
  const [food, setFood] = useState('Rice');
  const [handfuls, setHandfuls] = useState(2);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parent = parentName.trim() || 'your parent';
  const canGo = myName.trim().length > 0 && parentName.trim().length > 0 && adult && !busy;

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await store.createFamily({ myName: myName.trim(), parentName: parentName.trim(), goalFood: food, goalHandfuls: handfuls });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <RoundButton icon="chevron-back" label="Back" onPress={onBack} />
        <View style={{ gap: 6 }}>
          <T w="bold" size={28}>
            Set the table for {parent}
          </T>
          <T color={C.muted} size={14}>
            You fill this in. {parent} only enters a code and lands on the camera.
          </T>
        </View>

        <View style={{ gap: 6 }}>
          <T w="semibold" size={13} color="#3B4B42">
            Your name
          </T>
          <TextInput value={myName} onChangeText={setMyName} placeholder="Nadia" placeholderTextColor="#9AA79F" style={s.field} autoCapitalize="words" maxLength={24} />
        </View>

        <View style={{ gap: 8 }}>
          <T w="semibold" size={13} color="#3B4B42">
            What you call them
          </T>
          <TextInput value={parentName} onChangeText={setParentName} placeholder="Ammi" placeholderTextColor="#9AA79F" style={s.field} autoCapitalize="words" maxLength={24} />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {PARENT_NAMES.map((n) => (
              <Chip key={n} label={n} on={parentName === n} onPress={() => setParentName(n)} />
            ))}
          </Row>
        </View>

        <Card style={{ gap: 12 }}>
          <View>
            <T w="bold" size={18}>
              One food to keep an eye on
            </T>
            <T color={C.muted} size={13}>
              The only thing anyone is asked after a photo. You share yours too, so nobody is the only one being watched.
            </T>
          </View>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {GOAL_FOODS.map((f) => (
              <Chip key={f} label={f} on={food === f} onPress={() => setFood(f)} />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', backgroundColor: C.soft, borderRadius: 14, padding: 12 }}>
            <T color={C.muted} size={14}>
              A usual plate
            </T>
            <Stepper value={handfuls} onChange={setHandfuls} food={food} />
          </Row>
        </Card>

        <Pressable onPress={() => setAdult(!adult)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }}>
          <Row gap={10}>
            <View style={[s.check, adult && { backgroundColor: C.leaf, borderColor: C.leaf }]}>{adult ? <Ionicons name="checkmark" size={16} color={C.white} /> : null}</View>
            <T size={14} style={{ flex: 1 }}>I'm 18 or older and I agree to the Terms and privacy policies</T>
          </Row>
        </Pressable>
        <T size={12} color={C.muted}>
          Read the <PolicyLinks />. Meals and photos are shared only with your family table.
        </T>

        {error ? (
          <T color="#8A2942" size={14}>
            {error}
          </T>
        ) : null}
        <Btn label={busy ? 'Setting the table...' : 'Set the table'} disabled={!canGo} onPress={go} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const s = StyleSheet.create({
  field: {
    height: 52,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: F.regular,
    fontSize: 16,
    backgroundColor: C.white,
    color: C.ink,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
