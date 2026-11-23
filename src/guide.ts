import { PlateItem, amountText, balanceHint as shapeHint, dishLine } from './dishes';
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
export function balanceHint(items: PlateItem[], rounded?: unknown, slot?: string): string | null {
  if (!items.length) return null;
  const known = items.map((it) => ({ it, n: dishNutrients(it) })).filter((x) => x.n);
  // Too little known to judge by content: fall back to the old reading by name.
  if (known.length < Math.ceil(items.length / 2)) return shapeHint(items, rounded);

  const sum = (k: 'kcal' | 'carbs' | 'protein' | 'fiber') => known.reduce((a, x) => a + (x.n as NonNullable<typeof x.n>)[k], 0);
  const kcal = Math.max(1, sum('kcal'));
  const protein = sum('protein');
  const fiber = sum('fiber');
  const carbShare = (sum('carbs') * 4) / kcal;
  // Vegetables: light, fibre-rich food, or anything logged as a vegetable side (sabzi cooked in oil still counts).
  const isVeg = (x: (typeof known)[number]) => !!x.n?.light || (x.it.kind === 'side' && !/raita|yog|dahi|doi|chutney|pickle|achar|cheese/i.test(x.it.name));
  const lightGrams = known.filter(isVeg).reduce((a, x) => a + (x.n?.grams ?? 0), 0);
  const big = kcal > 350; // a meal, not a small plate

  const low = (n: string) => (/'s\b/.test(n) ? n : n.toLowerCase());
  const cereal = items.some((i) => /oat|porridge|cereal|muesli|granola|pancake|waffle/i.test(i.name));
  const breakfast = slot === 'breakfast' || slot === 'suhoor' || cereal;
  const veg = known.find((x) => isVeg(x) && x.it.kind === 'side')?.it;
  const add = veg ? `another handful of ${low(veg.name)}` : cereal ? 'some fruit, nuts or seeds' : breakfast ? 'a piece of fruit or some tomato and cucumber' : 'a handful of salad or vegetables';
  // Name the meal itself, so the nudge reads as being about this plate, not a rule.
  const sandwich = items.some((i) => /bread|bun/i.test(i.name)) && items.some((i) => i.kind === 'main' && !/egg|omelet/i.test(i.name));
  const mains = items.filter((i) => i.kind !== 'drink' && i.kind !== 'side').slice(0, 2);
  const meal = sandwich ? 'sandwich' : dishLine((mains.length ? mains : items.slice(0, 2)).map((i) => ({ ...i, name: low(i.name) })));
  // The dish that brings most of the starch: the one to swap a little of.
  const starchy = known
    .filter((x) => x.it.kind !== 'drink' && x.it.kind !== 'sweet')
    .sort((a, b) => (b.n?.carbs ?? 0) - (a.n?.carbs ?? 0))[0]?.it;

  if (protein < (big ? 12 : 6)) return breakfast ? `An egg, yoghurt, milk or some nuts with the ${meal} would balance it.` : `Some dal, an egg, beans, meat or fish with the ${meal} would balance it.`;
  if (lightGrams < (big ? 80 : 40) || fiber < (big ? 5 : 2) || carbShare > 0.62) {
    if (starchy && starchy.amount > 1 && carbShare > 0.5) {
      const one = amountText({ ...starchy, amount: 1 }).replace(/^1 /, 'one ').replace(/^One whole/, 'half').toLowerCase();
      return `Try swapping ${one} of ${low(starchy.name)} for ${add}. Same full plate, better balanced.`;
    }
    return `Next time, add ${add} to the ${meal}. Same meal, better balanced.`;
  }
  return null;
}
