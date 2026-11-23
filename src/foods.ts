import type { PlateItem } from './dishes';

/**
 * The food database: about 5,000 foods and dishes from USDA FoodData Central (FNDDS, public domain),
 * with the names families use first ("Roti", "Dal", "Chai"). Built by tools/build-foods.py.
 *
 * It does two jobs. It helps people find a dish as they type, and it gives the doctor summary a rough
 * nutrition estimate. The numbers never show in the app itself: families see dishes and plates, not calories.
 */
type Row = [name: string, kcal: number, carbs: number, fiber: number, sugar: number, protein: number, fat: number, sodium: number, cup: number, piece: number, source: number];

let rows: Row[] | null = null;
let lower: string[] = [];
function all(): Row[] {
  if (!rows) {
    rows = (require('./data/foods.json') as { rows: Row[] }).rows;
    lower = rows.map((r) => r[0].toLowerCase());
  }
  return rows;
}
export const FOOD_SOURCE = 'USDA FoodData Central (FNDDS 2021-2023)';

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);

/** Foods whose name matches what someone is typing. Family names and whole-word matches come first. */
export function searchFoods(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  const qs = words(q);
  if (q.length < 2 || !qs.length) return [];
  const list = all();
  const scored: [number, number][] = [];
  for (let i = 0; i < list.length; i++) {
    const name = lower[i];
    const ws = words(name);
    if (!qs.every((t) => ws.some((w) => w.startsWith(t)))) continue;
    let score = i; // earlier rows are the everyday names
    if (name === q) score -= 1e6;
    else if (name.startsWith(q)) score -= 5e5;
    else if (ws[0].startsWith(qs[0])) score -= 2e5;
    // "roti" should find roti before rotisserie chicken.
    if (!qs.every((t) => ws.includes(t))) score += 3e5;
    score += name.length * 50; // shorter, plainer names first
    scored.push([score, i]);
  }
  return scored
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([, i]) => list[i][0]);
}

/** The database food behind a dish: the one picked, else the same name, else the best search match. */
function find(item: Pick<PlateItem, 'name' | 'food'>): Row | null {
  const list = all();
  const exact = (n?: string) => (n ? list[lower.indexOf(n.toLowerCase())] ?? null : null);
  return exact(item.food) ?? exact(item.name) ?? exact(searchFoods(item.name, 1)[0]);
}

/**
 * Grams for a dish in its own measure. Rough on purpose, and the summary says so.
 * A fist of rice is about three quarters of a cup, or one roti; a bowl of curry is a cup;
 * a handful of vegetables is half a cup; a piece is one usual serving; a cup of chai is a cup.
 */
function grams(item: PlateItem, r: Row): number {
  const cup = r[8];
  const piece = r[9];
  switch (item.kind) {
    case 'base':
      return item.amount * (cup ? cup * 0.75 : piece || 120);
    case 'main':
      return item.amount * (cup || 240);
    case 'side':
      return item.amount * (cup ? cup * 0.5 : 80);
    case 'sweet':
      return item.amount * (piece || (cup ? cup * 0.5 : 100));
    case 'drink':
      return item.amount * (cup || 240);
  }
}

export interface Nutrients {
  kcal: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  fat: number;
  sodium: number;
}
const zero = (): Nutrients => ({ kcal: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, fat: 0, sodium: 0 });

/** A rough estimate for a list of dishes, and how many of them the database knew. */
export function estimate(items: PlateItem[]): { total: Nutrients; known: number; count: number } {
  const total = zero();
  let known = 0;
  for (const it of items) {
    const r = find(it);
    if (!r) continue;
    known++;
    const k = grams(it, r) / 100;
    total.kcal += r[1] * k;
    total.carbs += r[2] * k;
    total.fiber += r[3] * k;
    total.sugar += r[4] * k;
    total.protein += r[5] * k;
    total.fat += r[6] * k;
    total.sodium += r[7] * k;
  }
  return { total, known, count: items.length };
}
