import { Meal, Slot } from './types';

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

export function slotAt(date: Date): Slot {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  return 'dinner';
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

export function cleanCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
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
