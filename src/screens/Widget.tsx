import React from 'react';
import { Platform, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme';
import { Btn, Row, T } from '../ui';

/** Asks once to put the "Did you eat?" widget on the home screen, with the steps for this phone. */
export function WidgetCard({ onClose, onLater }: { onClose: () => void; onLater?: () => void }) {
  const steps =
    Platform.OS === 'android'
      ? ['Press and hold an empty spot on your home screen', 'Tap Widgets, then find Amader', 'Drag "Did you eat?" onto the screen']
      : Platform.OS === 'ios'
        ? ['Press and hold an empty spot on your home screen', 'Tap the + in the top corner', 'Search Amader and tap Add Widget']
        : ['Install the Amader app on your phone', 'Press and hold the home screen, then add the Amader widget', 'Log a meal with one tap, without opening the app'];
  return (
    <View style={{ backgroundColor: C.deep, borderRadius: 22, padding: 14, gap: 10 }}>
      <Row gap={12}>
        <MiniWidget />
        <View style={{ flex: 1 }}>
          <T w="bold" size={18} color={C.white}>
            Put "Did you eat?" on your home screen
          </T>
          <T size={14} color="#CFE6D9">
            One tap logs a meal. No need to open the app.
          </T>
        </View>
      </Row>
      {steps.map((step, i) => (
        <Row key={i} gap={10}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={14} color={C.white}>
              {i + 1}
            </T>
          </View>
          <T size={15} color={C.white} style={{ flex: 1 }}>
            {step}
          </T>
        </Row>
      ))}
      <Btn kind="dark" label="Done, I added it" onPress={onClose} />
      {onLater ? (
        <T w="semibold" size={15} color="#CFE6D9" center onPress={onLater} accessibilityRole="button" style={{ paddingVertical: 6 }}>
          Not now
        </T>
      ) : null}
    </View>
  );
}

/** A small drawing of the home screen widget. */
export function MiniWidget({ size = 84 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: C.rice, padding: size * 0.09, justifyContent: 'space-between' }}>
      <T w="bold" size={size * 0.13} color={C.deep} style={{ lineHeight: size * 0.17 }}>
        Did you eat?
      </T>
      <Row gap={size * 0.05}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={{ flex: 1, height: size * 0.26, borderRadius: size * 0.08, backgroundColor: n === 2 ? C.leaf : C.mint, alignItems: 'center', justifyContent: 'center' }}>
            <T w="bold" size={size * 0.12} color={n === 2 ? C.white : C.deep} style={{ lineHeight: size * 0.15 }}>
              {n}
            </T>
          </View>
        ))}
      </Row>
      <View style={{ height: size * 0.2, borderRadius: size * 0.1, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera" size={size * 0.13} color={C.white} />
      </View>
    </View>
  );
}
