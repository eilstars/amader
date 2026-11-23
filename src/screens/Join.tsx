import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { Role } from '../types';
import { Row, Soft, T, field } from '../ui';
import { BigButton, Mado, Pill, RoundIcon } from '../design';
import { CODE_LENGTH, cleanCode, spacedCode } from '../words';

/** The whole setup for the person being looked after: a code, a name that is usually already filled in, one button. */
export default function Join({ onBack, onJoined }: { onBack: () => void; onJoined: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(store.pendingCode ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('parent');
  const [from, setFrom] = useState<string | null>(null);
  // Seats saved for people the family looks after. With more than one, they tap their own name.
  const [waiting, setWaiting] = useState<string[]>([]);
  const [unknown, setUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the code is complete, look up who sent it and fill in the name for them.
  useEffect(() => {
    let live = true;
    setUnknown(false);
    setFrom(null);
    if (code.length < CODE_LENGTH || !store.cloud) return;
    store
      .inviteInfo(code)
      .then((info) => {
        if (!live) return;
        if (!info) {
          setUnknown(true);
          return;
        }
        setFrom(info.fromName);
        setWaiting(info.waiting);
        if (info.parentName) {
          setName((current) => current || info.parentName || '');
        } else {
          setRole('child');
        }
      })
      .catch((e) => {
        if (live && e instanceof Error && /wait an hour/i.test(e.message)) setError(e.message);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const canGo = code.length === CODE_LENGTH && name.trim().length > 0 && !busy && !unknown;

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await store.joinFamily({ code, name: name.trim(), role });
      onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.rice }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <RoundIcon name="back" label="Back" onPress={onBack} />
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T w="bold" size={28}>
              {from ? `${from} set a seat for you` : name.trim() ? `Welcome, ${name.trim()}` : 'Come, sit'}
            </T>
            <T color={C.muted} size={16}>
              Share what you eat with one photo. Your family shares theirs too.
            </T>
          </View>
          <Mado mood="happy" width={84} />
        </Row>

        <View style={{ gap: 6 }}>
          <T w="semibold" size={15} color="#3B4B42">
            Family code
          </T>
          <TextInput
            value={spacedCode(code)}
            onChangeText={(t) => setCode(cleanCode(t))}
            placeholder="8 letters"
            placeholderTextColor="#9AA79F"
            style={[field, { fontSize: 24, letterSpacing: 4, height: 62 }]}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH + 1}
          />
          {unknown ? (
            <T color="#8A2942" size={15}>
              We can't find that code. Check it with your family.
            </T>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <T w="semibold" size={15} color="#3B4B42">
            What your family calls you
          </T>
          {waiting.length > 1 ? (
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {waiting.map((w) => (
                <Pill key={w} label={`I'm ${w}`} on={name === w && role === 'parent'} onPress={() => (setName(w), setRole('parent'))} />
              ))}
            </Row>
          ) : null}
          <TextInput value={name} onChangeText={setName} placeholder="Ammi" placeholderTextColor="#9AA79F" style={field} autoCapitalize="words" maxLength={24} />
        </View>

        <View style={{ gap: 8 }}>
          <T w="semibold" size={15} color="#3B4B42">
            Which fits you?
          </T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Pill icon="heart" label="My family looks after me" on={role === 'parent'} onPress={() => setRole('parent')} />
            <Pill icon="people" label="I'm a caregiver" on={role === 'child'} onPress={() => setRole('child')} />
          </Row>
        </View>

        <Soft>
          <T size={15} color={C.muted}>
            Only your family sees your plates. Amader asks you before any photo is read by an AI. You can delete everything any time.
          </T>
        </Soft>

        {error ? (
          <T color="#8A2942" size={14}>
            {error}
          </T>
        ) : null}
        <BigButton label={busy ? 'Pulling up a chair...' : 'Agree and join'} disabled={!canGo} onPress={go} />
        <T center color={C.muted} size={12}>
          By continuing you confirm you're 18 or older. Amader isn't a medical device and doesn't give medical advice.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
