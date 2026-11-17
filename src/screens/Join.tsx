import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { Role } from '../types';
import { Btn, Puti, RoundButton, Row, Soft, T } from '../ui';
import { PolicyLinks } from '../legal';
import { CODE_LENGTH, cleanCode, spacedCode } from '../words';
import { Chip, s } from './SetupFamily';

/** The parent's whole setup: a code, a name that is usually already filled in, one button. */
export default function Join({ onBack, onJoined }: { onBack: () => void; onJoined: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(store.pendingCode ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('parent');
  const [from, setFrom] = useState<string | null>(null);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <RoundButton icon="chevron-back" label="Back" onPress={onBack} />
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T w="bold" size={28}>
              {name.trim() ? `Welcome, ${name.trim()}` : 'Come, sit'}
            </T>
            <T color={C.muted} size={14}>
              {from ? `${from} set the table for you. ` : ''}Once a day, share one photo of a meal. Your family shares theirs too.
            </T>
          </View>
          <Puti mood="happy" width={84} />
        </Row>

        <View style={{ gap: 6 }}>
          <T w="semibold" size={13} color="#3B4B42">
            Family code
          </T>
          <TextInput
            value={spacedCode(code)}
            onChangeText={(t) => setCode(cleanCode(t))}
            placeholder="8 letters"
            placeholderTextColor="#9AA79F"
            style={[s.field, { fontSize: 22, letterSpacing: 4, height: 60 }]}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH + 1}
          />
          {unknown ? (
            <T color="#8A2942" size={13}>
              We can't find that code. Check it with your family.
            </T>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <T w="semibold" size={13} color="#3B4B42">
            What your family calls you
          </T>
          <TextInput value={name} onChangeText={setName} placeholder="Ammi" placeholderTextColor="#9AA79F" style={s.field} autoCapitalize="words" maxLength={24} />
        </View>

        <Row gap={8}>
          <Chip label="I'm a parent" on={role === 'parent'} onPress={() => setRole('parent')} />
          <Chip label="I'm a son or daughter" on={role === 'child'} onPress={() => setRole('child')} />
        </Row>

        <Soft>
          <T size={14} color={C.muted}>
            Only your family sees your plates. Amader asks you before any photo is read by an AI. You can delete everything any time.
          </T>
        </Soft>

        {error ? (
          <T color="#8A2942" size={14}>
            {error}
          </T>
        ) : null}
        <Btn label={busy ? 'Pulling up a chair...' : 'Agree and join'} disabled={!canGo} onPress={go} />
        <T center color={C.muted} size={12}>
          By tapping Agree and join you confirm you're 18 or older, agree to share your meals with this family, and agree to the <PolicyLinks />. Amader isn't a medical device and doesn't give medical advice.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
