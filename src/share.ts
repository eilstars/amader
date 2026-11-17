import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/** Opens the share sheet. On browsers without one, copies the text instead. */
export async function shareText(text: string): Promise<'shared' | 'copied'> {
  if (Platform.OS === 'web') {
    const nav = (globalThis as { navigator?: { share?: (data: { text: string }) => Promise<void> } }).navigator;
    if (nav?.share) {
      try {
        await nav.share({ text });
        return 'shared';
      } catch {
        // The person closed the share sheet, or it is not allowed here. Copy instead.
      }
    }
    await Clipboard.setStringAsync(text);
    return 'copied';
  }
  await Share.share({ message: text });
  return 'shared';
}
