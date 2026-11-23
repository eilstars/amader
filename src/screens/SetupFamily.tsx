import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { Row, T, field } from '../ui';
import { BigButton, Dropdown, Icon, Mado, RoundIcon, S, card } from '../design';
import { HomeDays } from './HomeDays';

const HELPERS = ['Sister', 'Brother', 'Husband or wife', 'Cousin', 'Aunt', 'Uncle', 'Friend', 'Other'];
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
  // Others at the table who aren't looked after: siblings, a spouse, a cousin who helps.
  const [helpers, setHelpers] = useState<Person[]>([]);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const named = people.filter((p) => p.name.trim());
  // One person by name; with more than one, just "them".
  const them = named.length === 1 ? named[0].name.trim() : 'them';
  const setHelper = (i: number, change: Partial<Person>) => setHelpers(helpers.map((p, n) => (n === i ? { ...p, ...change } : p)));
  const helpersNamed = helpers.filter((h) => h.name.trim());
  const set = (i: number, change: Partial<Person>) => setPeople(people.map((p, n) => (n === i ? { ...p, ...change } : p)));

  async function go() {
    setBusy(true);
    setError(null);
    try {
      store.setPrefs({
        homeDays,
        sameHome: homeDays.length === 7,
        homeWeekends: false,
        relations: Object.fromEntries([...named, ...helpersNamed].map((p) => [p.name.trim(), p.relation ?? 'Other'])),
      });
      const [first, ...rest] = named;
      await store.createFamily({ myName: myName.trim(), parentName: first.name.trim(), goalFood: 'Rice', goalHandfuls: 2 });
      for (const p of rest) await store.addPerson(p.name.trim()).catch(() => undefined);
      for (const h of helpersNamed) await store.addPerson(h.name.trim(), 'child').catch(() => undefined);
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
      title: named.length === 1 ? `And what does ${them} call you?` : 'And what do they call you?',
      lead: 'You can add brothers, sisters and anyone else who sits at the table.',
      body: (
        <View style={{ gap: 14 }}>
          <TextInput value={myName} onChangeText={setMyName} placeholder="Your name" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} autoFocus />
          <View style={[card, { padding: 14, gap: 10 }]}>
            <T w="bold" size={S.body}>
              Which days are you home with {them}?
            </T>
            <HomeDays value={homeDays} onChange={setHomeDays} />
          </View>
          <View style={[card, { padding: 14, gap: 10 }]}>
            <T w="bold" size={S.body}>
              Anyone else at the table?
            </T>
            <T size={S.small} color={C.muted}>
              Siblings or anyone who helps. They get a seat and an invite. Optional.
            </T>
            {helpers.map((h, i) => (
              <View key={i} style={{ gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: '#EDF0EA', paddingTop: i ? 10 : 0 }}>
                <Row gap={8}>
                  <TextInput value={h.name} onChangeText={(t) => setHelper(i, { name: t })} placeholder="Their name" placeholderTextColor="#9AA79F" style={[field, { flex: 1 }]} autoCapitalize="words" maxLength={24} autoFocus accessibilityLabel={`Name of helper ${i + 1}`} />
                  <Pressable onPress={() => setHelpers(helpers.filter((_, n) => n !== i))} accessibilityRole="button" accessibilityLabel={`Remove helper ${i + 1}`} hitSlop={8}>
                    <Icon name="close" size={18} color={C.muted} />
                  </Pressable>
                </Row>
                <Dropdown label={`Who is ${h.name.trim() || 'this'} to you?`} placeholder="They are my..." value={h.relation} options={HELPERS} onChange={(r) => setHelper(i, { relation: r })} />
              </View>
            ))}
            {named.length + helpers.length < 7 ? (
              <Pressable onPress={() => setHelpers([...helpers, { name: '', relation: null }])} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={18} />
                </View>
                <T w="bold" size={S.body} color={C.deep}>
                  Add a sibling or helper
                </T>
              </Pressable>
            ) : null}
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
