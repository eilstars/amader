import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MedSlot } from '../reminders';
import { medKey, useStore } from '../store';
import { C } from '../theme';
import { Row, T } from '../ui';
import { sameDay, startOfDay, weekDays } from '../words';

const LABEL: Record<MedSlot, string> = { breakfast: 'Morning', lunch: 'Noon', dinner: 'Evening' };
const ORDER: MedSlot[] = ['breakfast', 'lunch', 'dinner'];

/**
 * The week's medicine, drawn like the plastic organizer on the kitchen counter: a column per day,
 * a compartment per meal. Tap today's box once it's taken. Missed boxes just stay empty, never red.
 * Only on this phone: the family doesn't see it.
 */
export default function MedsCard() {
  const store = useStore();
  const { meds } = store.prefs;
  if (!meds.on || !meds.slots.length) return null;
  const days = weekDays(0);
  const today = startOfDay(new Date());
  const slots = ORDER.filter((s) => meds.slots.includes(s));
  const todayLeft = slots.filter((s) => !meds.taken.includes(medKey(today, s))).length;

  return (
    <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
      <Row gap={10}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="medical" size={20} color={C.leaf} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="bold" size={18}>
            Medicine with meals
          </T>
          <T size={14} color={C.muted}>
            {todayLeft === 0 ? 'All done for today.' : "Tap today's box when you've taken it."}
          </T>
        </View>
      </Row>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 58, gap: 6, paddingTop: 22 }}>
          {slots.map((s) => (
            <View key={s} style={{ height: 40, justifyContent: 'center' }}>
              <T size={13} w="semibold" color={C.muted}>
                {LABEL[s]}
              </T>
            </View>
          ))}
        </View>
        {days.map((d) => {
          const isToday = sameDay(d, today);
          const future = d > today;
          return (
            <View key={d.toISOString()} style={{ flex: 1, gap: 6, alignItems: 'stretch' }}>
              <T center size={13} w={isToday ? 'bold' : 'medium'} color={isToday ? C.deep : C.muted} style={{ height: 16 }}>
                {'SMTWTFS'[d.getDay()]}
              </T>
              {slots.map((s) => {
                const taken = meds.taken.includes(medKey(d, s));
                return (
                  <Pressable
                    key={s}
                    disabled={future}
                    onPress={() => store.toggleMed(d, s)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: taken, disabled: future }}
                    accessibilityLabel={`${LABEL[s]} medicine, ${d.toDateString()}`}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: taken ? C.leaf : isToday ? C.mint : '#F3F5F2',
                      borderWidth: isToday && !taken ? 2 : 0,
                      borderColor: C.leaf,
                      opacity: future ? 0.45 : 1,
                    }}
                  >
                    {taken ? <Ionicons name="checkmark" size={20} color={C.white} /> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
