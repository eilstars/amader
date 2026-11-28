import * as Speech from 'expo-speech';

/**
 * Reads words aloud in the person's language, for people who don't read much. Uses the phone's own voice,
 * so nothing is sent anywhere. Some phones have no voice for some languages; then nothing is heard.
 */
export function speak(text: string, lang: string) {
  try {
    Speech.stop();
    Speech.speak(text, { language: lang === 'zh-Hant' ? 'zh-TW' : lang, rate: 0.9 });
  } catch {
    // No voice on this phone. The words are still on the screen.
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // Nothing to stop.
  }
}

/** The phone's languages, best first, like ["bn-BD", "en-US"]. */
export function phoneLanguages(): string[] {
  const out: string[] = [];
  const nav = typeof navigator !== 'undefined' ? (navigator as { languages?: readonly string[]; language?: string }) : null;
  if (nav?.languages?.length) out.push(...nav.languages);
  else if (nav?.language) out.push(nav.language);
  try {
    out.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Older engines without Intl.
  }
  return out.filter(Boolean);
}
