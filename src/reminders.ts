import { Platform } from 'react-native';
import { Slot } from './types';
import { MealTimes } from './words';

export interface ReminderPlan {
  /** "Did you eat?" after each usual meal time. */
  on: boolean;
  /** A surprise nudge once a day at a random time in the afternoon ("Having a snack?"). */
  nudges: boolean;
  times: MealTimes;
  /** In Ramadan the reminders move to suhoor and iftar. */
  ramadan: boolean;
  suhoorHour: number;
  iftarHour: number;
  /** Meals already shared today, so their reminders are skipped. */
  doneToday: Slot[];
}

const AFTER: Record<string, string[]> = {
  breakfast: ['Good morning! What was breakfast?', 'Show the family your breakfast. One photo is enough.'],
  lunch: ['Did you eat lunch?', 'The table is waiting. What did you have for lunch?'],
  dinner: ['Did you eat? Share your dinner plate.', 'Someone would love to see your dinner tonight.'],
  suhoor: ['Suhoor done? Share it so the family knows you are set for the day.'],
  iftar: ['Iftar mubarak! Share your iftar plate with the family.'],
};

const SURPRISE = [
  'Having a snack? Share it, snacks count too.',
  'Tea or coffee time? Tell the family what you are having.',
  'Quick check from Puti: did you eat yet?',
  'Your family is at the table. Pop in and send a heart.',
];

/**
 * Plans the next 7 days of reminders. Planned one day at a time instead of as repeating
 * alarms, so a meal already shared is skipped, and so the app goes quiet after a week if
 * the person stops opening it. Call again whenever the app opens or a meal is saved.
 *
 * Returns false when reminders could not be turned on (permission refused, or on the web).
 */
export async function syncReminders(plan: ReminderPlan): Promise<boolean> {
  if (Platform.OS === 'web') return !plan.on && !plan.nudges;
  try {
    const N = await import('expo-notifications');
    await N.cancelAllScheduledNotificationsAsync();
    if (!plan.on && !plan.nudges) return true;

    const current = await N.getPermissionsAsync();
    const granted = current.granted || (await N.requestPermissionsAsync()).granted;
    if (!granted) return false;

    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('did-you-eat', { name: 'Did you eat?', importance: N.AndroidImportance.DEFAULT });
    }

    const slots: [Slot, number][] = plan.ramadan
      ? [
          ['suhoor', plan.suhoorHour + 0.5],
          ['iftar', plan.iftarHour + 0.75],
        ]
      : [
          ['breakfast', plan.times.breakfast + 0.75],
          ['lunch', plan.times.lunch + 0.75],
          ['dinner', plan.times.dinner + 0.75],
        ];

    const now = new Date();
    const schedule = async (when: Date, body: string) => {
      if (when <= now) return;
      await N.scheduleNotificationAsync({
        content: { title: 'Did you eat?', body, data: { url: 'amader://add' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'did-you-eat' },
      });
    };

    for (let day = 0; day < 7; day++) {
      const at = (hours: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, Math.floor(hours), Math.round((hours % 1) * 60), 0);
      if (plan.on) {
        for (const [slot, hours] of slots) {
          if (day === 0 && plan.doneToday.includes(slot)) continue;
          const lines = AFTER[slot] ?? AFTER.dinner;
          await schedule(at(hours), lines[(day + Math.floor(hours)) % lines.length]);
        }
      }
      if (plan.nudges && !plan.ramadan) {
        // Somewhere between 3:00 and 5:30 PM, different every day, so it feels like a friend checking in.
        const minutes = 15 * 60 + Math.floor(Math.random() * 150);
        if (!(day === 0 && plan.doneToday.includes('snack'))) await schedule(at(minutes / 60), SURPRISE[(day + minutes) % SURPRISE.length]);
      }
    }
    return true;
  } catch {
    // Expo Go on Android has limited notification support. Reminders work in the installed app.
    return false;
  }
}
