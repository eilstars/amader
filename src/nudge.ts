import { Linking, Platform } from 'react-native';
import { shareText } from './share';

/**
 * Opens WhatsApp with a message ready to send. The person picks who it goes to inside WhatsApp,
 * so Amader never needs or keeps anyone's phone number. Falls back to the share sheet.
 */
export async function sendOnWhatsApp(text: string): Promise<'whatsapp' | 'shared' | 'copied'> {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  try {
    if (Platform.OS === 'web') {
      const opened = typeof window !== 'undefined' ? window.open(url, '_blank', 'noopener,noreferrer') : null;
      if (opened !== null) return 'whatsapp';
      return shareText(text);
    }
    await Linking.openURL(url);
    return 'whatsapp';
  } catch {
    return shareText(text);
  }
}

/** Warm, short messages. Never "you forgot", always an invitation. */
export function nudgeText(toName: string, kind: 'ask' | 'proud' | 'together', link: string): string {
  const tail = link ? `\n${link}` : '';
  if (kind === 'proud') return `${toName}, I saw your plates on Amader this week. I'm proud of you!${tail}`;
  if (kind === 'together') return `${toName}, I'm eating now. Send me a photo of your plate on Amader and we'll eat together.${tail}`;
  return `${toName}, did you eat? Show me your plate on Amader, I shared mine.${tail}`;
}
