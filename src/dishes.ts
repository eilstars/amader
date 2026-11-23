/**
 * Meals are logged as dishes, the way families talk about food: "rice, chicken curry and salad".
 * People count each dish in a measure they already know (fists of rice, bowls of curry, handfuls of veg).
 * What is inside a dish (the dal in a curry, the yoghurt in a korma) is worked out here, so nobody
 * has to know what "protein" or "dairy" means. The food groups stay underneath for the plate drawing,
 * the balanced-plate check and the doctor summary.
 */

export type DishKind = 'base' | 'main' | 'side' | 'sweet' | 'drink';

export interface PlateItem {
  name: string;
  kind: DishKind;
  /** In the kind's own measure: fists, bowls, handfuls, pieces or cups. 0.5 steps allowed. */
  amount: number;
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

export function amountText(item: Pick<PlateItem, 'kind' | 'amount'>): string {
  const k = KINDS[item.kind];
  const n = item.amount;
  const num = n === 0.5 ? 'Half a' : Number.isInteger(n) ? String(n) : `${Math.floor(n)} and a half`;
  return `${num} ${n <= 1 ? k.one : k.many}`;
}

// Words that say what a dish carries. Many languages and spellings, since families name food their own way.
const has = (words: string[]) => new RegExp(`\\b(${words.join('|')})`, 'i');
const BASE = has(['rice', 'bhat', 'bhaat', 'chawal', 'roti', 'chapati', 'chapathi', 'phulka', 'naan', 'nan\\b', 'paratha', 'porota', 'puri', 'luchi', 'bread', 'toast', 'pasta', 'noodle', 'spaghetti', 'tortilla', 'idli', 'dosa', 'upma', 'poha', 'khichdi', 'khichuri', 'kichuri', 'biryani', 'biriyani', 'pulao', 'polao', 'pilaf', 'fried rice', 'couscous', 'injera', 'ugali', 'fufu', 'bun', 'bagel', 'oats', 'cereal', 'muri', 'chira', 'potato', 'aloo bhaja', 'fries']);
const PROTEIN = has(['chicken', 'murgh', 'mutton', 'lamb', 'goat', 'beef', 'gosht', 'meat', 'keema', 'kebab', 'kabab', 'tikka', 'fish', 'machh', 'mach\\b', 'maach', 'ilish', 'rui', 'salmon', 'tuna', 'prawn', 'shrimp', 'chingri', 'egg', 'dim\\b', 'anda', 'omelet', 'dal\\b', 'daal', 'dahl', 'lentil', 'masoor', 'moong', 'mung', 'toor', 'chana', 'chole', 'chickpea', 'rajma', 'bean', 'sambar', 'paneer', 'tofu', 'soy', 'haleem', 'nihari', 'korma', 'rezala']);
const DAIRY = has(['paneer', 'yoghurt', 'yogurt', 'dahi', 'doi', 'raita', 'korma', 'makhani', 'butter chicken', 'malai', 'cream', 'kheer', 'payesh', 'payash', 'firni', 'lassi', 'milk', 'dudh', 'cheese', 'kadhi', 'rezala', 'shrikhand', 'rasmalai', 'mishti doi']);
const VEG = has(['sabzi', 'sabji', 'shobji', 'bhaji', 'bhaaji', 'shak', 'saag', 'sag\\b', 'palak', 'spinach', 'gobi', 'cauliflower', 'cabbage', 'bhindi', 'okra', 'dherosh', 'begun', 'baingan', 'brinjal', 'eggplant', 'lau', 'lauki', 'gourd', 'potol', 'karela', 'korola', 'bean', 'peas', 'matar', 'carrot', 'salad', 'veg', 'vegetable', 'kosambari', 'kachumber', 'mixed', 'labra', 'chorchori', 'tomato', 'cucumber', 'broccoli', 'greens', 'pumpkin', 'kumro', 'sambar', 'avial', 'poriyal', 'thoran', 'stir fry', 'jalfrezi']);
const FRUIT = has(['apple', 'banana', 'kola\\b', 'mango', 'aam\\b', 'orange', 'guava', 'peyara', 'papaya', 'pepe', 'grape', 'berries', 'berry', 'melon', 'pear', 'kiwi', 'pomegranate', 'dates', 'khejur', 'litchi', 'lychee', 'jackfruit', 'fruit']);
const SWEET = has(['mithai', 'mishti', 'sweet', 'rasgulla', 'roshogolla', 'gulab jamun', 'jalebi', 'ladoo', 'laddu', 'barfi', 'halwa', 'kheer', 'payesh', 'firni', 'cake', 'biscuit', 'cookie', 'chocolate', 'dessert', 'ice cream', 'pitha', 'sandesh']);
const DRINK = has(['chai', 'tea', 'coffee', 'lassi', 'milk', 'juice', 'borhani', 'shake', 'smoothie', 'water', 'sharbat', 'falooda']);
const PURE_BASE = has(['plain rice', 'white rice', 'brown rice', 'rice$', '^rice', 'bhat$', 'roti', 'chapati', 'phulka', 'naan', 'paratha', 'porota', 'puri', 'luchi', 'bread', 'toast']);

/** A good first guess at what a dish is, from its name. The person can change it. */
export function kindOf(name: string): DishKind {
  const n = name.trim();
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
