import { Image, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { Photo } from './types';
import { Hand, handFrom } from './hand.shared';

export type { Hand };

// iPhone: Apple's Vision framework, through the small module in modules/amader-hand.
// It is only present in a real build (not Expo Go). Android phones fall back to tapping for now.
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<{ detect(uri: string): Promise<{ x: number; y: number }[] | null> }>('AmaderHand') : null;

function sizeOf(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
}

/** Looks for a hand in the photo. Null means no hand, or no detector here: the caller falls back to tapping. */
export async function findHand(photo: Photo): Promise<Hand | null> {
  if (!native) return null;
  try {
    const [points, size] = await Promise.all([native.detect(photo.uri), sizeOf(photo.uri)]);
    if (!points) return null;
    return handFrom(points, size.width, size.height);
  } catch {
    return null;
  }
}
