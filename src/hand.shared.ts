/** A hand found in a photo. Points are the 21 hand joints, each 0 to 1 across the photo. */
export type Hand = {
  points: { x: number; y: number }[];
  /** Width of this person's closed fist, as a share of the photo's width. */
  fist: number;
  /** Photo width divided by height. */
  aspect: number;
};

/**
 * Turns 21 joints (wrist first, then thumb to little finger) into a Hand.
 * The fist is sized from the knuckle row, which stays the same whether the hand is open or closed.
 */
export function handFrom(points: { x: number; y: number }[], width: number, height: number): Hand | null {
  if (points.length < 21 || !width || !height) return null;
  const px = (i: number) => ({ x: points[i].x * width, y: points[i].y * height });
  const dist = (a: number, b: number) => Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y);
  const knuckles = dist(5, 17); // index knuckle to little finger knuckle
  const palm = dist(0, 9); // wrist to middle knuckle
  // A hand seen side-on has a short knuckle row, so lean on the palm length too.
  const fistPx = Math.max(knuckles * 1.3, palm * 0.8);
  if (fistPx < width * 0.04) return null;
  return { points, fist: fistPx / width, aspect: width / height };
}
