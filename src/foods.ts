import { PlateItem, measureOf } from './dishes';
import type { FamilyDish } from './types';
import { normalizeDish } from './foodwords';

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
  const asTyped = query.trim().toLowerCase();
  const norm = normalizeDish(asTyped);
  // Search what they meant ("macher jhol" → "fish curry"), but keep exact database names as typed.
  const q = norm && !exactRow(asTyped) ? norm : asTyped;
  const first = rank(q, limit);
  return first.length || q === asTyped ? first : rank(asTyped, limit);
}

// "Tortillas" finds tortilla, "potatoes" finds potato.
const stem = (w: string) => (w.length > 4 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

function rank(query: string, limit: number): string[] {
  const qs = words(query).map(stem);
  const q = qs.join(' ');
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
    if (!qs.every((t) => ws.includes(t) || ws.includes(`${t}s`))) score += 3e5;
    score += name.length * 50; // shorter, plainer names first
    scored.push([score, i]);
  }
  return scored
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([, i]) => list[i][0]);
}

// Dishes the family taught Amader, as rows built from their parts. Set by the store.
let taught = new Map<string, Row>();
export function setFamilyDishes(dishes: FamilyDish[]) {
  const next = new Map<string, Row>();
  for (const d of [...dishes].reverse()) {
    const parts = d.parts.map((p) => ({ r: exactRow(p.food), share: Math.max(1, Math.min(3, p.share)) })).filter((p): p is { r: Row; share: number } => !!p.r);
    if (!parts.length) continue;
    const total = parts.reduce((a, p) => a + p.share, 0);
    const n = [0, 0, 0, 0, 0, 0, 0];
    parts.forEach((p) => n.forEach((_, i) => (n[i] += (p.r[i + 1] as number) * (p.share / total))));
    next.set(d.name.toLowerCase(), [d.name, ...(n as [number, number, number, number, number, number, number]), 240, 0, 3]);
  }
  taught = next;
}

/** Whether a whole typed line is one dish the database knows, like "mac and cheese". */
export function isOneDish(line: string): boolean {
  const n = line.trim().toLowerCase();
  return !!(taught.get(n) ?? exactRow(n) ?? exactRow(normalizeDish(n)));
}

function exactRow(n?: string): Row | null {
  if (!n) return null;
  const list = all();
  return list[lower.indexOf(n.toLowerCase())] ?? null;
}

// When nothing matches, a plain stand-in for the kind of dish, so every plate still gets an estimate.
const STAND_IN: Record<PlateItem['kind'], string> = { base: 'Rice', main: 'Curry', side: 'Mixed vegetables', sweet: 'Cake', drink: 'Chai' };

/**
 * The database food behind a dish, and how sure Amader is: one the family taught, the one picked,
 * the same name, the name in database words ("macher jhol" → fish curry), a search match,
 * and last a stand-in for its kind ("guess").
 */
function lookup(item: Pick<PlateItem, 'name' | 'food' | 'kind'>): { r: Row; sure: boolean } | null {
  const name = item.name.trim().toLowerCase();
  const norm = normalizeDish(name);
  const r = taught.get(name) ?? exactRow(item.food) ?? exactRow(name) ?? exactRow(norm) ?? exactRow(stem(name)) ?? exactRow(searchFoods(name, 1)[0]);
  if (r) return { r, sure: true };
  const guess = item.kind ? exactRow(STAND_IN[item.kind]) : null;
  return guess ? { r: guess, sure: false } : null;
}
function find(item: Pick<PlateItem, 'name' | 'food' | 'kind'>): Row | null {
  return lookup(item)?.r ?? null;
}

/** Whether Amader can tell what's in a dish, from the database or from the family, rather than guessing. */
export function knowsDish(item: Pick<PlateItem, 'name' | 'food' | 'kind'>): boolean {
  return !!lookup(item)?.sure;
}

/**
 * Grams for a dish in its own measure. Rough on purpose, and the summary says so.
 * A fist of rice is about three quarters of a cup, or one roti; a bowl of curry is a cup;
 * a handful of vegetables is half a cup; a piece is one usual serving; a cup of chai is a cup.
 */
function grams(item: PlateItem, r: Row): number {
  const cup = r[8];
  const piece = r[9];
  if (measureOf(item).counted) return item.amount * (piece || (cup ? cup * 0.5 : 100));
  switch (item.kind) {
    case 'base':
      return item.amount * (cup ? cup * 0.75 : piece || 120);
    case 'main':
      return item.amount * (cup || 240);
    case 'side':
      return item.amount * 80; // a handful of vegetables is about one 80 g portion
    case 'sweet':
      return item.amount * (piece || (cup ? cup * 0.5 : 100));
    case 'drink':
      return item.amount * (cup || 240);
  }
}

/** One dish's estimate, or null when Amader doesn't know what's in it. */
export function dishNutrients(item: PlateItem): (Nutrients & { grams: number; light: boolean }) | null {
  const r = find(item);
  if (!r) return null;
  const g = grams(item, r);
  const k = g / 100;
  // "Light" foods fill the plate with few calories and some fiber: vegetables, salad, most fruit.
  const light = r[1] < 70 && r[3] >= 1 && item.kind !== 'drink';
  return { kcal: r[1] * k, carbs: r[2] * k, fiber: r[3] * k, sugar: r[4] * k, protein: r[5] * k, fat: r[6] * k, sodium: r[7] * k, grams: g, light };
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
    const hit = lookup(it);
    if (!hit) continue;
    const r = hit.r;
    if (hit.sure) known++;
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
