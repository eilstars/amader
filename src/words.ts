import { Meal, Role, Slot } from './types';

export const MILESTONES = [10, 30, 50, 100];
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_MS = 86_400_000;

export function newId(): string {
  // RFC 4122 version 4 id, fine for meal and member ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** When the person usually eats, in hours (24 hour clock). Set during onboarding and in Me. */
export interface MealTimes {
  breakfast: number;
  lunch: number;
  dinner: number;
}
export const DEFAULT_TIMES: MealTimes = { breakfast: 8, lunch: 13, dinner: 20 };

/** The meal closest to now, used only to pre-select a choice the person can change. */
export function slotAt(date: Date, times: MealTimes = DEFAULT_TIMES, ramadan = false): Slot {
  const h = date.getHours() + date.getMinutes() / 60;
  if (ramadan) return h < 10 ? 'suhoor' : h >= 17 ? 'iftar' : 'snack';
  const options: [Slot, number][] = [
    ['breakfast', times.breakfast],
    ['lunch', times.lunch],
    ['dinner', times.dinner],
  ];
  const [best, gap] = options.reduce<[Slot, number]>((acc, [slot, at]) => (Math.abs(h - at) < acc[1] ? [slot, Math.abs(h - at)] : acc), ['snack', 99]);
  return gap <= 2.5 ? best : 'snack';
}

/**
 * Fasting days, for any faith or none: a season (Ramadan, Lent, Navratri) or the person's own weekdays.
 * On a fasting day the meals become "Before dawn" and "Break fast".
 */
export const FAST_KINDS = ['Ramadan', 'Lent', 'Navratri', 'Yom Kippur', 'Ekadashi', 'My own days'];
export function fastingToday(p: { ramadan: boolean; fastDays?: number[] | null }, date = new Date()): boolean {
  if (!p.ramadan) return false;
  if (!p.fastDays || !p.fastDays.length) return true;
  // fastDays are Monday = 0 ... Sunday = 6, like the week strip.
  return p.fastDays.includes((date.getDay() + 6) % 7);
}

export const SLOT_NAMES: Record<Slot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  suhoor: 'Before dawn',
  iftar: 'Break fast',
  fasting: 'Fasting today',
};

export function slotName(slot: Slot): string {
  return SLOT_NAMES[slot] ?? 'Meal';
}

export function hourText(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  return `${h} ${hour < 12 || hour === 24 ? 'AM' : 'PM'}`;
}

/** What people call each role on screen. */
export function roleName(role: Role): string {
  return role === 'parent' ? 'Cared for' : 'Caregiver';
}

/** "1 fist rice · 1 palm protein · 2 handfuls veg" */
export function plateLine(meal: Pick<Meal, 'handfuls' | 'protein' | 'veg' | 'slot'> & { grain?: string | null; fruit?: number | null; dairy?: number | null }, fallback = 'rice'): string | null {
  if (meal.slot === 'fasting') return null;
  const grain = meal.grain || fallback;
  const bits: string[] = [];
  const g = meal.handfuls;
  if (g !== null && g !== undefined) bits.push(g <= 0 ? `no ${grain.toLowerCase()}` : `${g >= 4 ? '4+' : g} ${g === 1 ? 'fist' : 'fists'} ${grain.toLowerCase()}`);
  const p = meal.protein;
  if (p !== null && p !== undefined && p > 0) bits.push(`${p >= 4 ? '4+' : p} ${p === 1 ? 'palm' : 'palms'} protein`);
  const v = meal.veg;
  if (v !== null && v !== undefined && v > 0) bits.push(`${v >= 4 ? '4+' : v} ${v === 1 ? 'handful' : 'handfuls'} veg`);
  const f = meal.fruit;
  if (f && f > 0) bits.push(`${f >= 4 ? '4+' : f} fruit`);
  const d = meal.dairy;
  if (d && d > 0) bits.push(`${d >= 4 ? '4+' : d} ${d === 1 ? 'cup' : 'cups'} dairy`);
  return bits.length ? bits.join(' · ') : null;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** The seven days, Monday to Sunday, of the week holding today, shifted by `offset` weeks. */
export function weekDays(offset = 0, from = new Date()): Date[] {
  const today = startOfDay(from);
  const sinceMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - sinceMonday + offset * 7);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export function timeText(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${((h + 11) % 12) + 1}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dateText(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function dayName(d: Date): string {
  return DAYS[d.getDay()];
}

export function whenText(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const ago = daysBetween(d, now);
  if (ago === 0) return `Today, ${timeText(iso)}`;
  if (ago === 1) return `Yesterday, ${timeText(iso)}`;
  if (ago < 7) return `${dayName(d)}, ${timeText(iso)}`;
  return `${dateText(d)}, ${timeText(iso)}`;
}

export function newestFirst(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Family codes are 8 letters and numbers. Long enough that they cannot be guessed. */
export const CODE_LENGTH = 8;

export function cleanCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

/** "ABCD EFGH", easier to read out and type. */
export function spacedCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

const UNITS: Record<string, [string, string, boolean]> = {
  rice: ['handful', 'handfuls', true],
  roti: ['roti', 'rotis', false],
  sweets: ['sweet', 'sweets', false],
  chai: ['cup', 'cups', true],
};

/** "2 handfuls", "1 roti", "4+ cups". */
export function amountText(count: number, food: string): string {
  const unit = UNITS[food.toLowerCase()] ?? UNITS.rice;
  if (count >= 4) return `4+ ${unit[1]}`;
  return `${count} ${count === 1 ? unit[0] : unit[1]}`;
}

/** "2 handfuls of rice", "1 roti", "no chai". */
export function portionLine(handfuls: number | null, food: string): string | null {
  if (handfuls === null || handfuls === undefined) return null;
  const f = food.toLowerCase();
  if (handfuls <= 0) return `no ${f}`;
  const unit = UNITS[f] ?? UNITS.rice;
  return unit[2] ? `${amountText(handfuls, food)} of ${f}` : amountText(handfuls, food);
}

export function unitHint(food: string): string {
  const f = food.toLowerCase();
  if (f === 'rice') return 'One handful is one cupped palm.';
  if (f === 'chai') return 'Count the cups today.';
  return 'Tap a number.';
}

/** "handfuls", "rotis", "cups". */
export function unitWord(food: string): string {
  return (UNITS[food.toLowerCase()] ?? UNITS.rice)[1];
}

/** "This week", "Last week", or "Nov 3 to Nov 9". */
export function weekLabel(offset: number, days: Date[]): string {
  if (offset === 0) return 'This week';
  if (offset === -1) return 'Last week';
  return `${dateText(days[0])} to ${dateText(days[6])}`;
}

/** Meals inside the seven days. */
export function inWeek<M extends { date: string }>(list: M[], days: Date[]): M[] {
  const end = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate() + 1);
  return list.filter((m) => {
    const d = new Date(m.date);
    return d >= days[0] && d < end;
  });
}

/** For each day: how many meals, and whether it was a fasting day. */
export function dayCounts(list: Meal[], days: Date[]): { count: number; fasting: boolean }[] {
  return days.map((d) => {
    const that = list.filter((m) => sameDay(new Date(m.date), d));
    return { count: that.filter((m) => m.slot !== 'fasting').length, fasting: that.some((m) => m.slot === 'fasting') };
  });
}

/** "Today", "Yesterday", "Monday, Nov 10". */
export function dayHeading(d: Date, now = new Date()): string {
  const ago = daysBetween(d, now);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  return `${dayName(d)}, ${dateText(d)}`;
}

/** An average in hand measures, rounded to the nearest half: "1 palm", "1.5 fists", "about 2 handfuls". */
export function handsText(n: number, one: string, many: string): string {
  const r = Math.round(n * 2) / 2;
  return `${r} ${r === 1 ? one : many}`;
}
