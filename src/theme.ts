// Amader brand, approved 2026-11-12: leaf green, deep green, rice white.
// Steel is only for the plate. Pink is only for hearts and talk prompts.
export const C = {
  leaf: '#1F7A5A',
  deep: '#145A41',
  rice: '#FBFAF6',
  mint: '#E4F1E9',
  lightGreen: '#8CC5A8',
  ink: '#1D2B24',
  muted: '#56675E',
  line: '#D5DDD6',
  soft: '#F1F4EE',
  steel: '#DDE3DF',
  pinkSoft: '#FCEBEE',
  heart: '#E0607E',
  night: '#14241C',
  white: '#FFFFFF',
};

export const F = {
  regular: 'HindSiliguri-Regular',
  medium: 'HindSiliguri-Medium',
  semibold: 'HindSiliguri-SemiBold',
  bold: 'HindSiliguri-Bold',
} as const;

export type Weight = keyof typeof F;

export const fontFiles = {
  [F.regular]: require('../assets/fonts/HindSiliguri-Regular.ttf'),
  [F.medium]: require('../assets/fonts/HindSiliguri-Medium.ttf'),
  [F.semibold]: require('../assets/fonts/HindSiliguri-SemiBold.ttf'),
  [F.bold]: require('../assets/fonts/HindSiliguri-Bold.ttf'),
};

export const images = {
  logo: require('../assets/brand/logo.png'),
  putiHello: require('../assets/brand/puti-hello.png'),
  putiHappy: require('../assets/brand/puti-happy.png'),
  putiSleep: require('../assets/brand/puti-sleep.png'),
};

export const shadow = {
  shadowColor: C.ink,
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
