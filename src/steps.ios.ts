import { Pedometer } from 'expo-sensors';

/**
 * Steps the phone counted recently, for the walk quest. A nice "your phone saw it" moment, not a gate:
 * a walk without the phone still counts. The number stays on this phone.
 */
export async function recentSteps(hours = 3): Promise<number | null> {
  try {
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
