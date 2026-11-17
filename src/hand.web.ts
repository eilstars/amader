import { Photo } from './types';
import { Hand, handFrom } from './hand.shared';

export type { Hand };

// The detector runs in the browser on the phone itself. The photo never leaves the device for this.
let loading: Promise<any> | null = null;

function detector(): Promise<any> {
  if (!loading) {
    loading = (async () => {
      const base = new URL('mediapipe/', document.baseURI).toString();
      const vision = await import('@mediapipe/tasks-vision');
      const files = await vision.FilesetResolver.forVisionTasks(base + 'wasm');
      return vision.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: base + 'hand_landmarker.task' },
        runningMode: 'IMAGE',
        numHands: 1,
      });
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('photo did not load'));
    img.src = uri;
  });
}

/** Looks for a hand in the photo. Null means no hand, or no detector here: the caller falls back to tapping. */
export async function findHand(photo: Photo): Promise<Hand | null> {
  try {
    const [found, img] = await Promise.all([detector(), load(photo.uri)]);
    const result = found.detect(img);
    const points = result?.landmarks?.[0];
    if (!points) return null;
    return handFrom(points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })), img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  }
}
