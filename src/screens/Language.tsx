import React, { useMemo, useState } from 'react';
import { I18nManager, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Icon, Mado, S, card } from '../design';
import { LANGS, Lang, langOf, phoneLang } from '../i18n';
import { phoneLanguages, speak } from '../speak';
import { useStore } from '../store';
import { C } from '../theme';
import { T } from '../ui';

/**
 * The very first screen: pick a language. Every name is written in its own script, the phone's language is
 * offered first, the button answers in the language tapped, and a speaker reads the choice aloud.
 */
export default function Language({ onDone }: { onDone?: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const fromPhone = useMemo(() => phoneLang(phoneLanguages()), []);
  const [pick, setPick] = useState<Lang>(() => (store.prefs.lang ? langOf(store.prefs.lang) : fromPhone ?? LANGS[0]));
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = LANGS.filter((l) => (query ? l.native.toLowerCase().includes(query) || l.english.toLowerCase().includes(query) : l.code !== fromPhone?.code));

  function choose(l: Lang) {
    setPick(l);
    speak(l.native, l.code);
  }

  function done() {
    store.setPrefs({ lang: pick.code });
    // Right-to-left languages lay the app out right to left from the next start.
    if (I18nManager.isRTL !== !!pick.rtl) {
      try {
        I18nManager.allowRTL(!!pick.rtl);
        I18nManager.forceRTL(!!pick.rtl);
      } catch {
        // The web build has no layout switch; text still reads in the right direction.
      }
    }
    onDone?.();
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.rice, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mado width={92} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="globe" size={26} />
              <T w="bold" size={S.title}>
                Language
              </T>
            </View>
            <T size={S.small} color={C.muted}>
              ভাষা · भाषा · Idioma · 语言 · لغة · Langue
            </T>
          </View>
          <Pressable onPress={() => speak(pick.native, pick.code)} accessibilityRole="button" accessibilityLabel="Listen" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="speaker" size={26} />
          </Pressable>
        </View>
        <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0, height: 52 }]}>
          <Icon name="search" size={22} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search · খুঁজুন · Buscar · 搜索"
            placeholderTextColor={C.muted}
            accessibilityLabel="Search languages"
            style={{ flex: 1, fontSize: 18, color: C.ink, paddingVertical: 0 }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110, gap: 10 }} keyboardShouldPersistTaps="handled">
        {!query && fromPhone ? (
          <View style={{ gap: 6 }}>
            <T size={S.small} color={C.muted}>
              From your phone
            </T>
            <LangTile lang={fromPhone} on={pick.code === fromPhone.code} onPress={() => choose(fromPhone)} wide />
          </View>
        ) : null}
        <T size={S.small} color={C.muted}>
          {query ? `${list.length} found` : `${LANGS.length} languages, more coming`}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {list.map((l) => (
            <LangTile key={l.code} lang={l} on={pick.code === l.code} onPress={() => choose(l)} />
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16 }}>
        <BigButton label={pick.go} icon={pick.rtl ? 'back' : 'next'} onPress={done} height={64} />
      </View>
    </View>
  );
}

function LangTile({ lang, on, onPress, wide }: { lang: Lang; on: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${lang.native}, ${lang.english}`}
      style={[
        card,
        { padding: 10, paddingHorizontal: 14, minHeight: wide ? 68 : 64, justifyContent: 'center', borderWidth: 3, borderColor: on ? C.leaf : C.white, backgroundColor: on ? C.mint : C.white },
        wide ? { width: '100%', flexDirection: 'row', alignItems: 'center' } : { width: '48.5%' },
      ]}
    >
      <View style={{ flex: wide ? 1 : undefined }}>
        <T w="bold" size={wide ? S.title : 18} style={{ textAlign: lang.rtl ? 'right' : 'left', writingDirection: lang.rtl ? 'rtl' : 'ltr' }}>
          {lang.native}
        </T>
        <T size={13} color={C.muted} style={{ textAlign: lang.rtl ? 'right' : 'left' }}>
          {lang.english}
        </T>
      </View>
      {on ? (
        <View style={{ position: wide ? 'relative' : 'absolute', top: wide ? 0 : 8, right: wide ? 0 : 8, width: wide ? 32 : 22, height: wide ? 32 : 22, borderRadius: 16, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={wide ? 18 : 13} color={C.white} />
        </View>
      ) : null}
    </Pressable>
  );
}
