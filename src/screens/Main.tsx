import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { amountText, fastingToday, slotAt } from '../words';
import { PageHead, T } from '../ui';
import { Icon, IconName, RoundIcon, S, Sheet } from '../design';
import { WidgetCard } from './Widget';
import AddMeal from './AddMeal';
import Me from './Me';
import Teach from './Teach';
import Checkup from './Checkup';
import Learn from './Learn';
import Recipes from './Recipes';
import Home from './Home';
import ParentHome, { UNLOCK } from './SimpleHome';
import MealSheet from './MealSheet';
import QuestRiver, { Celebration } from './QuestRiver';
import Us, { PastWeeks, Person, WeekRecap } from './Us';
import MedsPage from './MedsPage';

type Over = 'add' | 'me' | 'checkup' | 'teach' | 'widget' | 'cards' | 'quest' | 'past' | 'meds' | 'recipes' | { person: string } | { week: number } | null;
type Tab = 'table' | 'us';

/**
 * The app once a family is set: two tabs (Table and Us) with "My plate" in the middle.
 * The person the family looks after gets one simple screen instead. Plates open as pop-ups.
 */
export default function Main({ openCamera }: { openCamera: boolean }) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const [tab, setTab] = useState<Tab>('table');
  // A parent who just joined lands straight on "Did you eat?".
  const [over, setOver] = useState<Over>(openCamera ? 'add' : null);
  const [mealId, setMealId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // The meal a widget just logged, so a slip of the thumb can be undone.
  const [quickId, setQuickId] = useState<string | null>(null);
  const person = (id: string) => {
    setMealId(null);
    setOver({ person: id });
  };

  // A widget or reminder asked for the camera, or logged a meal in one tap.
  const action = store.pendingAction;
  useEffect(() => {
    if (!action) return;
    store.setPendingAction(null);
    if (action.kind === 'add') {
      setOver('add');
      return;
    }
    setTab('table');
    store
      .addMeal({ slot: slotAt(new Date(), store.prefs.times, fastingToday(store.prefs)), photo: null, portions: { grains: action.handfuls, protein: 0, veg: 0 }, chosenBy: 'tap' })
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

  const simple = store.simple;
  const canComment = !simple || store.daysShared >= UNLOCK.comments;
  const close = () => setOver(null);

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <View style={{ flex: 1 }}>
        {simple ? (
          <ParentHome onAdd={() => setOver('add')} onMe={() => setOver('me')} onMeal={setMealId} onPerson={person} onQuest={() => setOver('quest')} onMeds={() => setOver('meds')} />
        ) : tab === 'table' ? (
          <Home onAdd={() => setOver('add')} onMeal={setMealId} onPerson={person} onQuest={() => setOver('quest')} onRecap={() => setOver({ week: new Date().getDay() === 1 ? 1 : 0 })} />
        ) : (
          <Us onMe={() => setOver('me')} onPerson={person} onPast={() => setOver('past')} onRecap={() => setOver({ week: 0 })} onRecipes={() => setOver('recipes')} />
        )}
      </View>

      {simple ? null : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            backgroundColor: C.white,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 18),
            paddingHorizontal: 20,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: C.ink,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -6 },
            elevation: 12,
          }}
        >
          <TabButton icon="table" label="Table" on={tab === 'table'} onPress={() => setTab('table')} />
          <Pressable
            onPress={() => setOver('add')}
            accessibilityRole="button"
            accessibilityLabel="Share my plate"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 58, paddingHorizontal: 24, borderRadius: 29, backgroundColor: C.leaf, marginTop: -28, shadowColor: C.leaf, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <Icon name="camera" size={24} color={C.white} />
            <T w="bold" size={S.body} color={C.white}>
              My plate
            </T>
          </Pressable>
          <TabButton icon="people" label="Us" on={tab === 'us'} onPress={() => setTab('us')} />
        </View>
      )}

      {toast ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + (simple ? 110 : 110), backgroundColor: C.deep, borderRadius: 16, padding: 14 }}>
          <T w="bold" color={C.white} center size={S.small}>
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
                  .catch(() => setToast("We couldn't remove it. Open the plate to remove it."));
              }}
            >
              <T w="bold" color={C.white} center size={S.small} style={{ textDecorationLine: 'underline', marginTop: 6 }}>
                Undo
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Sheet visible={mealId !== null && over === null} onClose={() => setMealId(null)}>
        {mealId ? <MealSheet mealId={mealId} onPerson={person} canComment={canComment} /> : null}
      </Sheet>

      <Modal visible={over !== null} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: C.rice, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>
            {over === 'add' ? <AddMeal onClose={close} /> : null}
            {over === 'me' ? <Me onClose={close} onCheckup={() => setOver('checkup')} onTeach={() => setOver('teach')} onPerson={person} onWidget={() => setOver('widget')} /> : null}
            {over === 'widget' ? (
              <View style={{ flex: 1 }}>
                <PageHead title="Home screen widget" onBack={() => setOver('me')} />
                <View style={{ padding: 16 }}>
                  <WidgetCard
                    onClose={() => {
                      store.setPrefs({ widgetSeen: true });
                      close();
                    }}
                  />
                </View>
              </View>
            ) : null}
            {over === 'teach' ? <Teach onClose={close} /> : null}
            {over === 'cards' ? <Learn onTeach={() => setOver('teach')} onClose={() => setOver('quest')} /> : null}
            {over === 'checkup' ? <Checkup onClose={close} /> : null}
            {over === 'quest' ? <QuestRiver onBack={close} onAdd={() => setOver('add')} onCards={() => setOver('cards')} /> : null}
            {over === 'past' ? <PastWeeks onBack={close} onWeek={(n) => setOver({ week: n })} /> : null}
            {over === 'meds' ? <MedsPage onBack={close} onSettings={() => setOver('me')} /> : null}
            {over === 'recipes' ? (
              <View style={{ flex: 1 }}>
                <Recipes />
                <View style={{ position: 'absolute', right: 16, top: insets.top + 12 }}>
                  <RoundIcon name="close" onPress={close} label="Close" />
                </View>
              </View>
            ) : null}
            {over && typeof over === 'object' && 'week' in over ? <WeekRecap offset={over.week} onBack={close} onQuest={() => setOver('quest')} /> : null}
            {over && typeof over === 'object' && 'person' in over ? <Person memberId={over.person} onBack={close} onMeal={setMealId} /> : null}
          </View>
        </View>
        {/* Plates opened from a person's page pop up over it. */}
        <Sheet visible={mealId !== null && over !== null} onClose={() => setMealId(null)}>
          {mealId ? <MealSheet mealId={mealId} canComment={canComment} /> : null}
        </Sheet>
      </Modal>
      {over === null ? <Celebration /> : null}
    </View>
  );
}

function TabButton({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  const col = on ? C.deep : C.muted;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ alignItems: 'center', width: 72, gap: 2 }}>
      <Icon name={icon} size={26} color={col} />
      <T w="bold" size={S.small} color={col}>
        {label}
      </T>
      <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: on ? C.leaf : 'transparent' }} />
    </Pressable>
  );
}
