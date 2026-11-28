import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { BigButton, Icon, Mado, S, card } from '../design';
import { Key } from '../i18n';
import { speak } from '../speak';
import { Art, FoodArt } from '../starchArt';
import { useStore } from '../store';
import { C } from '../theme';
import { T } from '../ui';

const FOODS: { art: Art; key: Key; starch: boolean }[] = [
  { art: 'rice', key: 'rice', starch: true },
  { art: 'roti', key: 'roti', starch: true },
  { art: 'dal', key: 'dal', starch: false },
  { art: 'potato', key: 'potato', starch: true },
  { art: 'fish', key: 'fish', starch: false },
  { art: 'bread', key: 'bread', starch: true },
  { art: 'sabzi', key: 'sabzi', starch: false },
  { art: 'noodles', key: 'noodles', starch: true },
  { art: 'corn', key: 'corn', starch: true },
];
const STARCH_COUNT = FOODS.filter((f) => f.starch).length;

/**
 * "What is a starch?" as a little game instead of a lesson: tap each food, starches get a green check,
 * the rest fade. No red, no "wrong". Then tap the hand and the roti to see a whole and a half.
 */
export default function StarchHelp({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const t = store.t;
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [halfHand, setHalfHand] = useState(false);
  const [halfRoti, setHalfRoti] = useState(false);
  const found = FOODS.filter((f) => f.starch && tapped.has(f.art)).length;

  function tap(f: (typeof FOODS)[number]) {
    setTapped((s) => new Set(s).add(f.art));
    speak(`${t(f.key)}. ${f.starch ? t('isStarch') : t('notStarch')}`, store.lang);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mado width={76} mood="happy" />
        <T w="bold" size={S.title} style={{ flex: 1, lineHeight: 28 }}>
          {t('helpTitle')}
        </T>
        <Pressable
          onPress={() => speak(`${t('helpTitle')} ${t('tapEach')}`, store.lang)}
          accessibilityRole="button"
          accessibilityLabel={t('listen')}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="speaker" size={26} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={S.body} color={C.muted} style={{ flex: 1 }}>
          {t('tapEach')}
        </T>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${found} / ${STARCH_COUNT}`}>
          {Array.from({ length: STARCH_COUNT }, (_, i) => (
            <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i < found ? C.leaf : C.steel }} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {FOODS.map((f) => {
          const on = tapped.has(f.art);
          const yes = on && f.starch;
          const no = on && !f.starch;
          return (
            <Pressable
              key={f.art}
              onPress={() => tap(f)}
              accessibilityRole="button"
              accessibilityLabel={`${t(f.key)}${on ? `, ${f.starch ? t('isStarch') : t('notStarch')}` : ''}`}
              style={[
                card,
                { width: '31%', height: 108, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: yes ? C.leaf : no ? C.soft : C.white, backgroundColor: yes ? C.mint : no ? C.soft : C.white },
                no && { shadowOpacity: 0, elevation: 0 },
              ]}
            >
              <FoodArt art={f.art} size={58} faded={no} />
              <T w="bold" size={S.body}>
                {t(f.key)}
              </T>
              {on ? (
                <View style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: yes ? C.leaf : '#C9D1CD', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={yes ? 'check' : 'minus'} size={16} color={C.white} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <T w="bold" size={S.body}>
        {t('countLikeThis')}
      </T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Flip half={halfHand} onPress={() => setHalfHand((h) => !h)} art="hand" label={`${halfHand ? '½' : '1'} ${t('hand')}`} />
        <Flip half={halfRoti} onPress={() => setHalfRoti((h) => !h)} art="roti" label={`${halfRoti ? '½' : '1'} ${t('piece')}`} />
      </View>

      <BigButton label={t('gotIt')} icon="check" onPress={onClose} height={60} style={{ marginTop: 6 }} />
    </ScrollView>
  );
}

function Flip({ half, onPress, art, label }: { half: boolean; onPress: () => void; art: Art; label: string }) {
  const w = art === 'hand' ? 76 : 64;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[card, { flex: 1, minHeight: 116, alignItems: 'center', justifyContent: 'center', gap: 2 }]}>
      <View style={{ width: half ? w / 2 : w, height: 64, overflow: 'hidden' }}>
        <FoodArt art={art} size={64} />
      </View>
      <T w="bold" size={18} color={C.deep}>
        {label}
      </T>
    </Pressable>
  );
}
