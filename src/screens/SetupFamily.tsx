import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { Row, T, field } from '../ui';
import { BigButton, Dropdown, Icon, Mado, RoundIcon, S, card } from '../design';
import { HomeDays } from './HomeDays';

const RELATIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Mother-in-law', 'Father-in-law', 'Other'];
type Person = { name: string; relation: string | null };

/**
 * A caregiver sets the table in two steps. Each person they look after is a name
 * (what they call them at home) and a relation picked from a list. The person
 * they look after only ever enters a code and lands on the camera.
 */
export default function SetupFamily({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [people, setPeople] = useState<Person[]>([{ name: '', relation: null }]);
  const [myName, setMyName] = useState('');
  const [homeDays, setHomeDays] = useState<number[]>([]);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const named = people.filter((p) => p.name.trim());
  const them = named.length ? named.map((p) => p.name.trim()).join(' and ') : 'them';
  const set = (i: number, change: Partial<Person>) => setPeople(people.map((p, n) => (n === i ? { ...p, ...change } : p)));

  async function go() {
    setBusy(true);
    setError(null);
    try {
      store.setPrefs({
        homeDays,
        sameHome: homeDays.length === 7,
        homeWeekends: false,
        relations: Object.fromEntries(named.map((p) => [p.name.trim(), p.relation ?? 'Other'])),
      });
      const [first, ...rest] = named;
      await store.createFamily({ myName: myName.trim(), parentName: first.name.trim(), goalFood: 'Rice', goalHandfuls: 2 });
      for (const p of rest) await store.addPerson(p.name.trim()).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const screens = [
    {
      title: 'Who are you looking after?',
      lead: 'Use the name you call them at home.',
      body: (
        <View style={{ gap: 12 }}>
          {people.map((p, i) => (
            <View key={i} style={[card, { padding: 14, gap: 10 }]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T w="bold" size={S.small} color={C.deep}>
                  {people.length > 1 ? `Person ${i + 1}` : 'Their name'}
                </T>
                {people.length > 1 ? (
                  <Pressable onPress={() => setPeople(people.filter((_, n) => n !== i))} accessibilityRole="button" accessibilityLabel={`Remove person ${i + 1}`} hitSlop={8}>
                    <Icon name="close" size={18} color={C.muted} />
                  </Pressable>
                ) : null}
              </Row>
              <TextInput
                value={p.name}
                onChangeText={(t) => set(i, { name: t })}
                placeholder="Ammi, Mom, Nani..."
                placeholderTextColor="#9AA79F"
                style={field}
                autoCapitalize="words"
                maxLength={24}
                autoFocus={i === people.length - 1}
                accessibilityLabel={`Name of person ${i + 1}`}
              />
              <Dropdown label={`Who is ${p.name.trim() || 'this'} to you?`} placeholder="They are my..." value={p.relation} options={RELATIONS} onChange={(r) => set(i, { relation: r })} />
            </View>
          ))}
          {people.length < 4 ? (
            <Pressable onPress={() => setPeople([...people, { name: '', relation: null }])} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, alignSelf: 'flex-start' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={18} />
              </View>
              <T w="bold" size={S.body} color={C.deep}>
                I look after someone else too
              </T>
            </Pressable>
          ) : null}
        </View>
      ),
      ok: people.every((p) => p.name.trim() && p.relation),
    },
    {
      title: `And what ${named.length > 1 ? 'do' : 'does'} ${them} call you?`,
      lead: 'Others who help can join later.',
      body: (
        <View style={{ gap: 14 }}>
          <TextInput value={myName} onChangeText={setMyName} placeholder="Your name" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />
          <View style={[card, { padding: 14, gap: 10 }]}>
            <T w="bold" size={S.body}>
              Which days are you home with {them}?
            </T>
            <HomeDays value={homeDays} onChange={setHomeDays} />
          </View>
          <Pressable onPress={() => setAdult(!adult)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }}>
            <Row gap={10}>
              <View style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: adult ? C.leaf : C.line, backgroundColor: adult ? C.leaf : C.white, alignItems: 'center', justifyContent: 'center' }}>
                {adult ? <Icon name="check" size={18} color={C.white} /> : null}
              </View>
              <T>I'm 18 or older</T>
            </Row>
          </Pressable>
        </View>
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
