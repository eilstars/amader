import { Platform } from 'react-native';

/**
 * Steps the phone counted recently, for the walk quest. A nice "your phone saw it" moment, not a gate:
 * a walk without the phone still counts. Only iPhone can look back in time; Android and the web return null.
 * The number stays on this phone.
 */
export async function recentSteps(hours = 3): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const { Pedometer } = await import('expo-sensors');
    if (!(await Pedometer.isAvailableAsync())) return null;
    const perm = await Pedometer.requestPermissionsAsync();
    if (!perm.granted) return null;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600_000);
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    return steps;
  } catch {
    return null;
  }
}
