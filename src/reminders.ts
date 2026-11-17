import { Platform } from 'react-native';

export const REMINDER_TIMES = [
  { hour: 9, label: 'Morning, 9' },
  { hour: 13, label: 'Lunch, 1' },
  { hour: 19, label: 'Evening, 7' },
  { hour: 21, label: 'Night, 9' },
];

const LINES = [
  'Show the family your plate. One photo is enough.',
  'The table is waiting. What did you have?',
  'A quick photo keeps the family close.',
  'Someone would love to see what you ate today.',
];

/**
 * Sets up the "Did you eat?" reminders for the next 7 days.
 *
 * They are planned one day at a time instead of as one repeating alarm, so that
 * a day when the person already shared is skipped, and so that the app never
 * nags forever: someone who stops opening the app stops hearing from it after a week.
 * Call this again whenever the app opens or a meal is saved.
 *
 * Returns false when reminders could not be turned on (permission refused, or on the web).
 */
export async function syncReminders(on: boolean, hour: number, sharedToday: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const N = await import('expo-notifications');
    await N.cancelAllScheduledNotificationsAsync();
    if (!on) return true;

    const current = await N.getPermissionsAsync();
    const granted = current.granted || (await N.requestPermissionsAsync()).granted;
    if (!granted) return false;

    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('did-you-eat', { name: 'Did you eat?', importance: N.AndroidImportance.DEFAULT });
    }

    const now = new Date();
    for (let day = 0; day < 7; day++) {
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, 0, 0);
      if (when <= now) continue;
      if (day === 0 && sharedToday) continue;
      await N.scheduleNotificationAsync({
        content: { title: 'Did you eat?', body: LINES[(when.getDate() + day) % LINES.length], data: { url: 'amader://add' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'did-you-eat' },
      });
    }
    return true;
  } catch {
    // Expo Go on Android has limited notification support. Reminders work in the installed app.
    return false;
  }
}
