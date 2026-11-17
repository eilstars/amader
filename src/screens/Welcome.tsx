import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C, images } from '../theme';
import { Btn, Card, Hero, Plate, Puti, Row, T } from '../ui';
import { PolicyLinks } from '../legal';

export default function Welcome({ onSetup, onJoin, onTeach }: { onSetup: () => void; onJoin: () => void; onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
      <Hero>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Image source={images.logo} style={{ width: 168, height: 117 }} resizeMode="contain" accessibilityLabel="Amader" />
            <T color={C.muted} size={14}>
              It means "ours".{'\n'}Meals we share together.
            </T>
          </View>
          <Puti mood="hello" width={110} />
        </Row>
      </Hero>

      <View style={{ padding: 24, gap: 16, flex: 1 }}>
        <T w="bold" size={24}>
          Who's joining the table?
        </T>

        <Pressable onPress={onSetup} accessibilityRole="button">
          <Card selected>
            <Row gap={14}>
              <Plate size={56} />
              <View style={{ flex: 1 }}>
                <T w="semibold" size={17}>
                  Set the table for my family
                </T>
                <T color={C.muted} size={14}>
                  You fill this in. Your parent only enters a code and lands on the camera.
                </T>
              </View>
            </Row>
          </Card>
        </Pressable>

        <Pressable onPress={onJoin} accessibilityRole="button">
          <Card>
            <Row gap={14}>
              <Plate size={56} handfuls={1} />
              <View style={{ flex: 1 }}>
                <T w="semibold" size={17}>
                  My family sent me an invite
                </T>
                <T color={C.muted} size={14}>
                  Enter the family code. No account, no forms.
                </T>
              </View>
            </Row>
          </Card>
        </Pressable>

        <Pressable onPress={onTeach} accessibilityRole="button">
          <Card>
            <Row gap={14}>
              <Plate size={56} handfuls={4} />
              <View style={{ flex: 1 }}>
                <T w="semibold" size={17}>
                  Feel the idea in ten seconds
                </T>
                <T color={C.muted} size={14}>
                  Drag the rice on a plate and see what changes.
                </T>
              </View>
            </Row>
          </Card>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Btn
          kind="ghost"
          label={busy ? 'Setting the table...' : 'Look around with a sample family'}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await store.loadDemo();
            } finally {
              setBusy(false);
            }
          }}
        />
        <T center color={C.muted} size={12}>
          Amader helps with everyday eating. It isn't a medical device and doesn't give medical advice.
        </T>
        <T center color={C.muted} size={12}>
          <PolicyLinks />
        </T>
      </View>
    </ScrollView>
  );
}
