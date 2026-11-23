import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Face, Icon, Mado, S } from '../design';
import { useStore } from '../store';
import { C, images } from '../theme';
import { T } from '../ui';

/** The first screen: the AMADER fish, the question every family asks, and three ways in. */
export default function Welcome({ onSetup, onJoin, onTeach }: { onSetup: () => void; onJoin: () => void; onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const logoW = Math.min(width - 60, 300);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
      <View style={{ backgroundColor: C.mint, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: insets.top + 36, paddingBottom: 26, alignItems: 'center' }}>
        <Image source={images.logo} style={{ width: logoW, height: logoW * (459 / 660) }} resizeMode="contain" accessibilityLabel="Amader" />
        <T w="medium" size={S.small} color={C.deep} style={{ marginTop: 6 }}>
          Amader means "ours"
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 18 }}>
          <Face member={{ name: 'Ammi', tint: 0 }} size={40} ring={C.mint} />
          <Face member={{ name: 'Nadia', tint: 1 }} size={40} ring={C.mint} />
          <Mado mood="happy" width={74} />
          <Face member={{ name: 'Abbu', tint: 2 }} size={40} ring={C.mint} />
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={20} color={C.heart} fill={C.heart} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 6, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <T w="bold" size={34} style={{ lineHeight: 40 }}>
          Did you eat?
        </T>
        <T size={S.body} color={C.muted}>
          Share your plate, see theirs, and eat the same food in the right amounts, together.
        </T>
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <View style={{ paddingHorizontal: 20, gap: 10, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <BigButton label="Set a family table" icon="table" onPress={onSetup} />
        <BigButton label="I have an invite" icon="people" kind="line" onPress={onJoin} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            hitSlop={8}
            onPress={async () => {
              setBusy(true);
              try {
                await store.loadDemo();
              } finally {
                setBusy(false);
              }
            }}
          >
            <T w="bold" size={S.small} color={C.deep} style={{ textDecorationLine: 'underline' }}>
              {busy ? 'Setting the table...' : 'Try a sample family'}
            </T>
          </Pressable>
          <Pressable onPress={onTeach} accessibilityRole="button" hitSlop={8}>
            <T w="bold" size={S.small} color={C.deep} style={{ textDecorationLine: 'underline' }}>
              The idea in 10 seconds
            </T>
          </Pressable>
        </View>
        <T center color={C.muted} size={13} style={{ marginTop: 8 }}>
          Amader helps with everyday eating. It isn't a medical app and doesn't give medical advice.
        </T>
      </View>
    </ScrollView>
  );
}
