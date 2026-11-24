import React from 'react';
import { View } from 'react-native';
import { BigButton, Icon, Page, S } from '../design';
import { useStore } from '../store';
import { C } from '../theme';
import { T } from '../ui';
import MedsCard from './Meds';
import { nextMed } from './SimpleHome';

/** The private medicine week, like the organizer on the kitchen counter. Only on this phone. */
export default function MedsPage({ onBack, onSettings }: { onBack: () => void; onSettings: () => void }) {
  const store = useStore();
  const med = nextMed(store.prefs);
  return (
    <Page
      title="My medicine"
      onBack={onBack}
      footer={med ? <BigButton label={`Taken with ${med}`} icon="check" onPress={() => store.toggleMed(new Date(), med)} /> : <BigButton label="Reminder times" kind="line" onPress={onSettings} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginTop: 10 }}>
        <Icon name="lock" size={16} color={C.muted} />
        <T w="medium" size={S.small} color={C.muted}>
          Only on this phone. Your family never sees it.
        </T>
      </View>
      <View style={{ padding: 20, gap: 14 }}>
        <MedsCard />
        <T w="medium" size={S.small} color={C.muted}>
          Missed one? Take your medicine the way your doctor told you. This box is only a reminder.
        </T>
      </View>
    </Page>
  );
}
