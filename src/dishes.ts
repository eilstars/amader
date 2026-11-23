/**
 * Meals are logged as dishes, the way families talk about food: "rice, chicken curry and salad".
 * People count each dish in a measure they already know (fists of rice, bowls of curry, handfuls of veg).
 * What is inside a dish (the dal in a curry, the yoghurt in a korma) is worked out here, so nobody
 * has to know what "protein" or "dairy" means. The food groups stay underneath for the plate drawing,
 * the balanced-plate check and the doctor summary.
 */

import { normalizeDish } from './foodwords';

export type DishKind = 'base' | 'main' | 'side' | 'sweet' | 'drink';

export interface PlateItem {
  name: string;
  kind: DishKind;
  /** In the kind's own measure: fists, bowls, handfuls, pieces or cups. 0.5 steps allowed. */
  amount: number;
  /** The food database entry it was picked from, when it was (see foods.ts). */
  food?: string;
}

/** What each kind is called on screen, and how it is counted. */
export const KINDS: Record<DishKind, { label: string; one: string; many: string; icon: 'fist' | 'cup' | 'handful' | 'apple' }> = {
  base: { label: 'Rice, roti or bread', one: 'fist', many: 'fists', icon: 'fist' },
  main: { label: 'Curry, dal, meat or fish', one: 'bowl', many: 'bowls', icon: 'cup' },
  side: { label: 'Vegetables or salad', one: 'handful', many: 'handfuls', icon: 'handful' },
  sweet: { label: 'Fruit or sweet', one: 'piece', many: 'pieces', icon: 'apple' },
  drink: { label: 'Chai, lassi or drink', one: 'cup', many: 'cups', icon: 'cup' },
};
export const KIND_ORDER: DishKind[] = ['base', 'main', 'side', 'sweet', 'drink'];

/**
 * Some foods are counted the way people already count them, not by their kind:
 * slices of bread, pieces of roti, eggs, a whole sandwich. Everything else uses its kind's measure.
 */
const COUNTED: [RegExp, string, string][] = [
  [/\b(sandwich|burger|wrap|sub\b|hot ?dog|kathi roll|frankie|shawarma)/i, 'whole', 'whole'],
  [/\b(bread|toast|cheese|pizza)/i, 'slice', 'slices'],
  [/\b(eggs?|anda|omelet+e?|dim\b)/i, 'egg', 'eggs'],
  [/\b(roti|chapat+i|chapathi|phulka|naan|nan\b|paratha|porota|puri|luchi|tortilla|dosa|idli|bun|bagel)/i, 'piece', 'pieces'],
  [/\b(patty|pattie|kebab|kabab|samosa|singara|pakora|cutlet|chop\b|nugget|sausage|biscuit|cookie|ladoo|laddu|rasgulla|roshogolla|gulab jamun|sandesh|pitha|date|khejur)/i, 'piece', 'pieces'],
];

/** How a dish is counted: "slice", "piece", "egg", or its kind's measure ("fist", "bowl"...). */
export function measureOf(item: Pick<PlateItem, 'name' | 'kind'>): { one: string; many: string; counted: boolean } {
  if (item.kind !== 'drink') {
    const n = `${item.name} ${normalizeDish(item.name)}`;
    for (const [re, one, many] of COUNTED) if (re.test(n)) return { one, many, counted: true };
  }
  const k = KINDS[item.kind];
  return { one: k.one, many: k.many, counted: false };
}

export function amountText(item: Pick<PlateItem, 'name' | 'kind' | 'amount'>): string {
  const k = measureOf(item);
  const n = item.amount;
  if (k.one === 'whole') return n === 0.5 ? 'Half' : n === 1 ? 'One whole' : Number.isInteger(n) ? `${n} whole` : `${Math.floor(n)} and a half`;
  const num = n === 0.5 ? 'Half a' : Number.isInteger(n) ? String(n) : `${Math.floor(n)} and a half`;
  return `${num} ${n <= 1 ? k.one : k.many}`;
}

/** Bread plus a filling, logged part by part: "bread, lettuce, cheese and a patty". */
function isSandwich(items: Pick<PlateItem, 'name' | 'kind'>[]): boolean {
  return items.some((i) => /bread|bun/i.test(i.name)) && items.some((i) => i.kind === 'main' && !/egg|omelet/i.test(i.name));
}

/** What one more tap adds, as a first amount when a dish goes on the plate. */
export function firstAmount(item: Pick<PlateItem, 'name' | 'kind'>, plate: Pick<PlateItem, 'name' | 'kind'>[] = []): number {
  // Lettuce and tomato inside a sandwich are a little, not a whole handful.
  if (item.kind === 'side' && /lettuce|tomato|onion|cucumber|pickle/i.test(item.name) && plate.some((i) => /bread|toast|bun/i.test(i.name))) return 0.5;
  const m = measureOf(item);
  if (m.one === 'slice' && /bread|toast/i.test(item.name)) return 2;
  if (m.counted) return 1;
  return item.kind === 'base' ? 2 : 1;
}

// Words that say what a dish carries. Many languages and spellings, since families name food their own way.
const has = (words: string[]) => new RegExp(`\\b(${words.join('|')})`, 'i');
const BASE = has(['rice', 'bhat', 'bhaat', 'chawal', 'roti', 'chapati', 'chapathi', 'phulka', 'naan', 'nan\\b', 'paratha', 'porota', 'puri', 'luchi', 'bread', 'toast', 'pasta', 'noodle', 'spaghetti', 'tortilla', 'idli', 'dosa', 'upma', 'poha', 'khichdi', 'khichuri', 'kichuri', 'biryani', 'biriyani', 'pulao', 'polao', 'pilaf', 'fried rice', 'couscous', 'injera', 'ugali', 'fufu', 'bun', 'bagel', 'oats', 'oatmeal', 'porridge', 'grits', 'cereal', 'muri', 'chira', 'potato', 'aloo bhaja', 'fries']);
const PROTEIN = has(['chicken', 'murgh', 'mutton', 'lamb', 'goat', 'beef', 'gosht', 'meat', 'keema', 'kebab', 'kabab', 'tikka', 'fish', 'machh', 'mach\\b', 'maach', 'ilish', 'rui', 'salmon', 'tuna', 'prawn', 'shrimp', 'chingri', 'egg', 'dim\\b', 'anda', 'omelet', 'dal\\b', 'daal', 'dahl', 'lentil', 'masoor', 'moong', 'mung', 'toor', 'chana', 'chole', 'chickpea', 'rajma', 'bean', 'sambar', 'paneer', 'tofu', 'soy', 'haleem', 'nihari', 'korma', 'rezala', 'patty', 'pattie', 'burger', 'sausage', 'bacon', 'ham\\b', 'turkey', 'pork', 'steak', 'cheese']);
const DAIRY = has(['paneer', 'yoghurt', 'yogurt', 'dahi', 'doi', 'raita', 'korma', 'makhani', 'butter chicken', 'malai', 'cream', 'kheer', 'payesh', 'payash', 'firni', 'lassi', 'milk', 'dudh', 'cheese', 'kadhi', 'rezala', 'shrikhand', 'rasmalai', 'mishti doi']);
const VEG = has(['sabzi', 'sabji', 'shobji', 'bhaji', 'bhaaji', 'shak', 'saag', 'sag\\b', 'palak', 'spinach', 'gobi', 'cauliflower', 'cabbage', 'bhindi', 'okra', 'dherosh', 'begun', 'baingan', 'brinjal', 'eggplant', 'lau', 'lauki', 'gourd', 'potol', 'karela', 'korola', 'bean', 'peas', 'matar', 'carrot', 'salad', 'veg', 'vegetable', 'kosambari', 'kachumber', 'mixed', 'labra', 'chorchori', 'tomato', 'cucumber', 'broccoli', 'greens', 'lettuce', 'onion', 'pepper', 'pumpkin', 'kumro', 'sambar', 'avial', 'poriyal', 'thoran', 'stir fry', 'jalfrezi']);
const FRUIT = has(['apple', 'banana', 'kola\\b', 'mango', 'aam\\b', 'orange', 'guava', 'peyara', 'papaya', 'pepe', 'grape', 'berries', 'berry', 'melon', 'pear', 'kiwi', 'pomegranate', 'dates', 'khejur', 'litchi', 'lychee', 'jackfruit', 'fruit']);
const SWEET = has(['mithai', 'mishti', 'sweet', 'rasgulla', 'roshogolla', 'gulab jamun', 'jalebi', 'ladoo', 'laddu', 'barfi', 'halwa', 'kheer', 'payesh', 'firni', 'cake', 'biscuit', 'cookie', 'chocolate', 'dessert', 'ice cream', 'pitha', 'sandesh']);
const DRINK = has(['chai', 'tea', 'coffee', 'lassi', 'milk', 'juice', 'borhani', 'shake', 'smoothie', 'water', 'sharbat', 'falooda']);
const PURE_BASE = has(['plain rice', 'white rice', 'brown rice', 'rice$', '^rice', 'bhat$', 'roti', 'chapati', 'phulka', 'naan', 'paratha', 'porota', 'puri', 'luchi', 'bread', 'toast']);

// Dishes that are a whole meal in one: bread or roti wrapped round a filling.
const COMBO = has(['sandwich', 'burger', 'wrap', 'sub\\b', 'hot ?dog', 'kathi roll', 'frankie', 'shawarma', 'pizza', 'taco', 'burrito']);

/** A good first guess at what a dish is, from its name. The person can change it. */
export function kindOf(name: string): DishKind {
  // Read the family's words and the database's together: "bhat" is rice, "macher jhol" is fish curry.
  const n = `${name.trim()} ${normalizeDish(name)}`.trim();
  if (COMBO.test(n)) return 'main';
  // Mashes, fries and vegetable dishes eaten on the side: aloo bhorta, begun bhaja, aloo gobi.
  if (/bhorta|bharta|bhortha|bhaja|bhaji|gobi|gobhi|sabzi|sabji|sobji/i.test(n) && !PROTEIN.test(n)) return 'side';
  if (/raita|chutney|achar|pickle|kachumber/i.test(n)) return 'side';
  if (DRINK.test(n) && !BASE.test(n)) return 'drink';
  if (SWEET.test(n) || (FRUIT.test(n) && !PROTEIN.test(n))) return 'sweet';
  if (PURE_BASE.test(n) && !PROTEIN.test(n)) return 'base';
  if (BASE.test(n) && !PROTEIN.test(n) && !VEG.test(n)) return 'base';
  if (BASE.test(n)) return 'base';
  if (PROTEIN.test(n)) return 'main';
  if (VEG.test(n)) return 'side';
  return 'main';
}

/** Food groups for one dish, in the old hand measures: fists of grain, palms of protein, handfuls of veg, pieces of fruit, cups of dairy. */
function groups(item: PlateItem) {
  const n = item.name;
  const a = item.amount;
  const out = { grains: 0, protein: 0, veg: 0, fruit: 0, dairy: 0 };
  if (COMBO.test(n)) {
    // One sandwich or burger: about a fist of bread, a palm of filling, and whatever salad is inside.
    out.grains = a;
    out.protein = PROTEIN.test(n) || !VEG.test(n) ? a : a * 0.3;
    if (VEG.test(n)) out.veg = a * 0.5;
    if (DAIRY.test(n)) out.dairy = a * 0.5;
    return out;
  }
  const m = measureOf(item);
  if (m.one === 'slice' && /bread|toast/i.test(n)) {
    out.grains = a / 2; // two slices of bread is about a fist
    return out;
  }
  if (m.one === 'slice' && /cheese/i.test(n)) {
    out.dairy = a / 2;
    out.protein = a / 4;
    return out;
  }
  switch (item.kind) {
    case 'base':
      out.grains = a;
      // Biryani and khichuri carry meat or dal and some veg with the rice.
      if (PROTEIN.test(n) && !PURE_BASE.test(n)) out.protein = a * 0.5;
      if (VEG.test(n) && !PURE_BASE.test(n)) out.veg = a * 0.3;
      if (DAIRY.test(n)) out.dairy = a * 0.3;
      break;
    case 'main':
      // A bowl of curry or dal is about a palm of protein, plus whatever cooked in it.
      out.protein = PROTEIN.test(n) || !VEG.test(n) ? a : a * 0.3;
      if (VEG.test(n)) out.veg = a * (PROTEIN.test(n) ? 0.5 : 1);
      if (DAIRY.test(n)) out.dairy = a * 0.5;
      break;
    case 'side':
      out.veg = a;
      if (DAIRY.test(n)) out.dairy = a * 0.5;
      if (PROTEIN.test(n) && !VEG.test(n)) out.protein = a * 0.5;
      break;
    case 'sweet':
      if (FRUIT.test(n)) out.fruit = a;
      if (DAIRY.test(n)) out.dairy = a * 0.5;
      break;
    case 'drink':
      if (DAIRY.test(n)) out.dairy = /chai|tea|coffee/i.test(n) ? a * 0.3 : a;
      if (FRUIT.test(n)) out.fruit = a * 0.5;
      break;
  }
  return out;
}

/** The whole plate in food groups, rounded to the 0 to 4 steps the rest of the app uses. */
export function portionsOf(items: PlateItem[]) {
  const sum = { grains: 0, protein: 0, veg: 0, fruit: 0, dairy: 0 };
  for (const it of items) {
    const g = groups(it);
    (Object.keys(sum) as (keyof typeof sum)[]).forEach((k) => (sum[k] += g[k]));
  }
  const r = (n: number) => Math.max(0, Math.min(4, Math.round(n)));
  // Anything there at all counts as at least one, so a small bowl of dal still shows.
  const atLeast = (n: number) => (n > 0 && n < 0.5 ? 1 : r(n));
  return { grains: atLeast(sum.grains), protein: atLeast(sum.protein), veg: atLeast(sum.veg), fruit: atLeast(sum.fruit), dairy: atLeast(sum.dairy) };
}

/** The grain to show on the plate drawing ("Rice", "Roti"...), from the first rice, roti or bread dish. */
export function grainOf(items: PlateItem[], fallback: string): string {
  const base = items.find((i) => i.kind === 'base');
  if (!base) return fallback;
  const n = base.name.toLowerCase();
  if (/roti|chapat|phulka|paratha|porota|puri|luchi/.test(n)) return 'Roti';
  if (/naan|\bnan\b/.test(n)) return 'Naan';
  if (/bread|toast|bun|bagel/.test(n)) return 'Bread';
  if (/pasta|spaghetti/.test(n)) return 'Pasta';
  if (/noodle/.test(n)) return 'Noodles';
  if (/tortilla/.test(n)) return 'Tortilla';
  if (/potato|aloo|fries/.test(n)) return 'Potato';
  return 'Rice';
}

/** "Rice, chicken curry and salad" */
export function dishLine(items: PlateItem[]): string {
  const names = items.map((i) => i.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? '';
  const low = (n: string) => (/^[A-Z][a-z]/.test(n) && !/'s\b/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n);
  return `${[names[0], ...names.slice(1, -1).map(low)].join(', ')} and ${low(names[names.length - 1])}`;
}

/** Splits a guessed dish line ("Dal, rice and sabzi") into dishes, for photos read before dishes existed. */
export function itemsFromLine(line: string, amounts?: { grains?: number | null; protein?: number | null; veg?: number | null }): PlateItem[] {
  const names = line
    .split(/,| and | with | & |\+/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  return names.map((raw) => {
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const kind = kindOf(name);
    const guessed = kind === 'base' ? amounts?.grains : kind === 'main' ? amounts?.protein : kind === 'side' ? amounts?.veg : null;
    return { name, kind, amount: guessed && guessed > 0 ? guessed : 1 };
  });
}

/** Quick picks for someone typing nothing: everyday dishes from many kitchens. Family favourites come first on screen. */
export const COMMON: string[] = ['Rice', 'Roti', 'Dal', 'Chicken curry', 'Fish curry', 'Sabzi', 'Salad', 'Egg', 'Raita', 'Naan', 'Biryani', 'Paneer', 'Bread', 'Pasta', 'Fruit', 'Chai'];

/**
 * A gentle hint about what would balance the plate, in the family's own dishes.
 * When there's plenty of rice or bread, it suggests a swap, never a cut: the plate stays just as full.
 */
export function balanceHint(items: PlateItem[], _rounded?: unknown): string | null {
  if (!items.length) return null;
  // Raw sums, not the rounded plate: a lettuce leaf in a sandwich shouldn't count as a full handful.
  const p = { grains: 0, protein: 0, veg: 0 };
  for (const it of items) {
    const g = groups(it);
    p.grains += g.grains;
    p.protein += g.protein;
    p.veg += g.veg;
  }
  if (p.veg >= Math.max(1, p.grains) && p.protein > 0) return null;
  if (p.protein === 0) return 'A bowl of dal, an egg, meat or fish would balance it.';
  const veg = items.find((i) => i.kind === 'side');
  const add = veg ? `another handful of ${veg.name.toLowerCase()}` : 'a handful of salad or vegetables';
  const combo = items.some((i) => COMBO.test(i.name)) || isSandwich(items);
  if (combo) return `Next time, ${add} on the side, or more lettuce and tomato inside. Same full plate, better balanced.`;
  const base = items.filter((i) => i.kind === 'base' || /bread|toast/i.test(i.name)).sort((a, b) => b.amount - a.amount)[0];
  if (base && p.grains > p.veg && base.amount > 1) {
    const one = amountText({ ...base, amount: 1 }).replace(/^1 /, 'one ').toLowerCase();
    return `Try swapping ${one} of ${base.name.toLowerCase()} for ${add}. Same full plate, better balanced.`;
  }
  return `${add.charAt(0).toUpperCase() + add.slice(1)} would balance it.`;
}
