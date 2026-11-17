import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { amountText } from '../words';
import { T } from '../ui';
import OurTable from './OurTable';
import Recap from './Recap';
import AddMeal from './AddMeal';
import Me from './Me';
import Teach from './Teach';
import Checkup from './Checkup';

type Sheet = 'add' | 'me' | 'checkup' | 'teach' | null;

export default function Main({ openCamera }: { openCamera: boolean }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'table' | 'recap'>('table');
  // A parent who just joined lands straight on "Did you eat?".
  const [sheet, setSheet] = useState<Sheet>(openCamera ? 'add' : null);
  const store = useStore();
  const [toast, setToast] = useState<string | null>(null);
  // The meal a widget just logged, so a slip of the thumb can be undone.
  const [quickId, setQuickId] = useState<string | null>(null);

  // A widget or reminder asked for the camera, or logged a meal in one tap.
  const action = store.pendingAction;
  useEffect(() => {
    if (!action) return;
    store.setPendingAction(null);
    if (action.kind === 'add') {
      setSheet('add');
      return;
    }
    setTab('table');
    store
      .addMeal(null, action.handfuls)
      .then((meal) => {
        setQuickId(meal.id);
        setToast(`Logged ${amountText(action.handfuls, store.goalFood)}. Your family can see it.`);
      })
      .catch(() => setToast("We couldn't log that. Open the camera to try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      setQuickId(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <View style={{ flex: 1 }}>
        {tab === 'table' ? <OurTable onAdd={() => setSheet('add')} onMe={() => setSheet('me')} /> : <Recap onCheckup={() => setSheet('checkup')} />}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          backgroundColor: C.white,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 14),
          paddingHorizontal: 24,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: C.ink,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        }}
      >
        <TabButton icon="restaurant-outline" label="Our Table" on={tab === 'table'} onPress={() => setTab('table')} />
        <Pressable
          onPress={() => setSheet('add')}
          accessibilityRole="button"
          accessibilityLabel="Share a meal"
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: C.leaf,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -30,
            shadowColor: C.leaf,
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Ionicons name="camera-outline" size={28} color={C.white} />
        </Pressable>
        <TabButton icon="pie-chart-outline" label="Recaps" on={tab === 'recap'} onPress={() => setTab('recap')} />
      </View>

      {toast ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 110, backgroundColor: C.deep, borderRadius: 16, padding: 14 }}>
          <T w="semibold" color={C.white} center size={14}>
            {toast}
          </T>
          {quickId ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                const id = quickId;
                setQuickId(null);
                store
                  .removeMeal(id)
                  .then(() => setToast('Removed.'))
                  .catch(() => setToast("We couldn't remove it. You can remove it from Our Table."));
              }}
            >
              <T w="bold" color={C.white} center size={14} style={{ textDecorationLine: 'underline', marginTop: 6 }}>
                Undo
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Modal visible={sheet !== null} animationType="slide" onRequestClose={() => setSheet(null)} presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: sheet === 'add' ? C.night : C.rice, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>
            {sheet === 'add' ? <AddMeal onClose={() => setSheet(null)} /> : null}
            {sheet === 'me' ? <Me onClose={() => setSheet(null)} onCheckup={() => setSheet('checkup')} onTeach={() => setSheet('teach')} /> : null}
            {sheet === 'teach' ? <Teach onClose={() => setSheet(null)} /> : null}
            {sheet === 'checkup' ? <Checkup onClose={() => setSheet(null)} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TabButton({ icon, label, on, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ alignItems: 'center', minWidth: 76, gap: 2 }}>
      <Ionicons name={icon} size={22} color={on ? C.deep : C.muted} />
      <T w={on ? 'semibold' : 'medium'} size={12} color={on ? C.deep : C.muted}>
        {label}
      </T>
    </Pressable>
  );
}
