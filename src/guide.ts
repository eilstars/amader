import { PlateItem, amountText, balanceHint as shapeHint } from './dishes';
import { dishNutrients } from './foods';

/**
 * The gentle hint under "What's on your plate?", worked out from what is in the food, not its name.
 * Any dish the food database or the family knows can be judged: a sandwich, jollof, pho, Nani's khichuri.
 *
 * It looks at three things across the meal, the same three the balanced plate teaches:
 * enough protein, enough vegetables (light, fibre-rich food), and not mostly starch.
 * It suggests one change at a time, and a swap rather than a cut, so the plate stays full.
 * It never shows a number; those are only in the doctor summary.
 */
export function balanceHint(items: PlateItem[], rounded?: unknown): string | null {
  if (!items.length) return null;
  const known = items.map((it) => ({ it, n: dishNutrients(it) })).filter((x) => x.n);
  // Too little known to judge by content: fall back to the old reading by name.
  if (known.length < Math.ceil(items.length / 2)) return shapeHint(items, rounded);

  const sum = (k: 'kcal' | 'carbs' | 'protein' | 'fiber') => known.reduce((a, x) => a + (x.n as NonNullable<typeof x.n>)[k], 0);
  const kcal = Math.max(1, sum('kcal'));
  const protein = sum('protein');
  const fiber = sum('fiber');
  const carbShare = (sum('carbs') * 4) / kcal;
  const lightGrams = known.filter((x) => x.n?.light).reduce((a, x) => a + (x.n?.grams ?? 0), 0);
  const big = kcal > 350; // a meal, not a small plate

  const low = (n: string) => (/'s\b/.test(n) ? n : n.toLowerCase());
  const breakfast = items.some((i) => /oat|porridge|cereal|muesli|granola|pancake|waffle/i.test(i.name));
  const veg = items.find((i) => known.some((x) => x.it === i && x.n?.light) && i.kind === 'side');
  const add = veg ? `another handful of ${low(veg.name)}` : breakfast ? 'some fruit, nuts or seeds' : 'a handful of salad or vegetables';
  // The dish that brings most of the starch: the one to swap a little of.
  const starchy = known
    .filter((x) => x.it.kind !== 'drink' && x.it.kind !== 'sweet')
    .sort((a, b) => (b.n?.carbs ?? 0) - (a.n?.carbs ?? 0))[0]?.it;

  if (protein < (big ? 12 : 6)) return 'Some dal, an egg, yoghurt, beans, meat or fish would balance it.';
  if (lightGrams < (big ? 80 : 40) || fiber < (big ? 5 : 2) || carbShare > 0.62) {
    if (starchy && starchy.amount > 1 && carbShare > 0.5) {
      const one = amountText({ ...starchy, amount: 1 }).replace(/^1 /, 'one ').replace(/^One whole/, 'half').toLowerCase();
      return `Try swapping ${one} of ${low(starchy.name)} for ${add}. Same full plate, better balanced.`;
    }
    return `Next time, ${add} with it. Same meal, better balanced.`;
  }
  return null;
}
