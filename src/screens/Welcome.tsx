import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PlateCard } from '../food';
import { useStore } from '../store';
import { C, images } from '../theme';
import { Avatar, Btn, Puti, Row, T } from '../ui';

/** The first screen: a family around one thali, and the question every family asks. */
export default function Welcome({ onSetup, onJoin, onTeach }: { onSetup: () => void; onJoin: () => void; onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const seat = (name: string, tint: number, style: object, heart?: boolean) => (
    <View style={[{ position: 'absolute', alignItems: 'center' }, style]}>
      <View style={{ borderWidth: 3, borderColor: C.white, borderRadius: 30 }}>
        <Avatar member={{ name, tint }} size={50} />
      </View>
      {heart ? (
        <View style={{ position: 'absolute', top: -8, right: -10, width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="heart" size={15} color={C.heart} />
        </View>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.mint }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Image source={images.logo} style={{ width: 112, height: 78 }} resizeMode="contain" accessibilityLabel="Amader" />
        <T size={14} color={C.deep} style={{ textAlign: 'right' }}>
          Amader means "ours"
        </T>
      </Row>

      {/* The table: one thali, the family around it. */}
      <View style={{ height: 270, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="A family around one plate">
        <View style={{ width: 250, height: 250, borderRadius: 125, backgroundColor: '#D3E8DC', alignItems: 'center', justifyContent: 'center' }}>
          <PlateCard size={190} grains={1} protein={1} veg={2} />
        </View>
        {seat('Ammi', 0, { top: 6, left: '14%' }, true)}
        {seat('Nadia', 1, { top: 20, right: '12%' })}
        {seat('Tanvir', 3, { bottom: 24, left: '8%' }, true)}
        <View style={{ position: 'absolute', bottom: 0, right: '4%' }}>
          <Puti mood="happy" width={104} />
        </View>
      </View>

      <View style={{ gap: 8, marginTop: 4 }}>
        <T w="bold" size={36} style={{ lineHeight: 42 }}>
          Did you eat?
        </T>
        <T size={18} color={C.muted}>
          Every family asks it. Amader turns the answer into a habit: share your plate, see theirs, and eat the same food in the right amounts, together.
        </T>
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />

      <View style={{ gap: 10 }}>
        <Btn label="I look after someone" icon="heart" onPress={onSetup} />
        <Btn kind="ghost" label="I have a family code" icon="key" onPress={onJoin} style={{ backgroundColor: C.white }} />
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
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
            <T w="semibold" color={C.deep} style={{ textDecorationLine: 'underline' }}>
              {busy ? 'Setting the table...' : 'Try a sample family'}
            </T>
          </Pressable>
          <Pressable onPress={onTeach} accessibilityRole="button" hitSlop={8}>
            <T w="semibold" color={C.deep} style={{ textDecorationLine: 'underline' }}>
              The idea in 10 seconds
            </T>
          </Pressable>
        </Row>
        <T center color={C.muted} size={13} style={{ marginTop: 6 }}>
          Amader helps with everyday eating. It isn't a medical device and doesn't give medical advice.
        </T>
      </View>
    </ScrollView>
  );
}
