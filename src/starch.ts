/**
 * Starch-first logging (2026-11-27). The one thing Amader asks about a meal is the starch:
 * which one (rice, roti, bread...) and how much, in handfuls or pieces, in halves.
 *
 * Everything here is plain logic with no React, so it can be tested on its own:
 * which starch a name means, the person's usual amount, their path, the family's grains and streak,
 * and the plain log for the doctor. Nothing here is medical: no nutrients, no advice.
 */
import type { Family, Meal, Member } from './types';

export type StarchId = 'rice' | 'roti' | 'bread' | 'noodles' | 'potato' | 'other' | 'none';
/** A cupped handful for loose starch (about half a cup of cooked rice), a piece for flatbread, a slice for bread. */
export type StarchUnit = 'hand' | 'piece' | 'slice';

export interface Starch {
  id: StarchId;
  /** The English name stored on the meal (meals.grain). */
  name: string;
  unit: StarchUnit;
  /** Where the amount starts for someone with no history yet. */
  start: number;
}

export const STARCHES: Starch[] = [
  { id: 'rice', name: 'Rice', unit: 'hand', start: 2 },
  { id: 'roti', name: 'Roti', unit: 'piece', start: 2 },
  { id: 'bread', name: 'Bread', unit: 'slice', start: 2 },
  { id: 'noodles', name: 'Noodles', unit: 'hand', start: 2 },
  { id: 'potato', name: 'Potato', unit: 'hand', start: 1 },
  { id: 'other', name: 'Other', unit: 'hand', start: 1 },
  { id: 'none', name: 'None', unit: 'hand', start: 0 },
];

/** Amounts go up and down in halves, from none to 6. */
export const MAX_AMOUNT = 6;
export const STEP = 0.5;

const WORDS: [RegExp, StarchId][] = [
  [/\b(no starch|none|nothing)\b/i, 'none'],
  [/(rice|bhat|bhaat|chawal|biryani|biriyani|pulao|polao|khichuri|khichdi|khichri|fried rice|congee|jollof|arroz|sushi|onigiri)/i, 'rice'],
  [/(roti|chapati|chapatti|naan|nan\b|paratha|porota|puri|luchi|bhatura|kulcha|dosa|tortilla|pita|lavash|injera|pizza|arepa|pupusa|tamale|bhakri|thepla|appam)/i, 'roti'],
  [/(bread|toast|sandwich|bun|bagel|roll|croissant|pav|burger|baguette)/i, 'bread'],
  [/(noodle|pasta|spaghetti|macaroni|mac and cheese|ramen|pho|udon|lo mein|chow mein|pancit|vermicelli|semai|sevai|maggi)/i, 'noodles'],
  [/(potato|aloo|alu\b|fries|chips|hash brown|sweet potato|yam|cassava|plantain)/i, 'potato'],
];

export function starchById(id: StarchId): Starch {
  return STARCHES.find((s) => s.id === id) ?? STARCHES[0];
}

/** Which starch a stored or typed name means. Unknown names are "other", empty is null. */
export function starchOf(name: string | null | undefined): StarchId | null {
  if (!name || !name.trim()) return null;
  const exact = STARCHES.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  if (exact) return exact.id;
  for (const [re, id] of WORDS) if (re.test(name)) return id;
  return 'other';
}

export function unitOf(name: string | null | undefined): StarchUnit {
  const id = starchOf(name);
  return id ? starchById(id).unit : 'hand';
}

/** Rounds to the nearest half and keeps it between none and the most allowed. */
export function clampAmount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_AMOUNT, Math.round(n * 2) / 2));
}

/** "2½", "½", "0". Digits stay Western here; the words file swaps scripts. */
export function halves(n: number): string {
  const a = clampAmount(n);
  const whole = Math.floor(a);
  const half = a - whole >= 0.5;
  if (!whole && half) return '½';
  return `${whole}${half ? '½' : ''}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Monday of the week a date falls in, at midnight. */
export function weekStart(d: Date): Date {
  const mon0 = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - mon0);
}

/** A meal that tells us about starch: a real meal (not a fast) with an amount, or "no starch". */
export function isStarchMeal(m: Meal): boolean {
  if (m.slot === 'fasting') return false;
  return m.handfuls !== null && m.handfuls !== undefined;
}

export interface Day {
  key: string;
  /** Shared anything at all this day, a fasting day included. */
  shared: boolean;
  /** The biggest starch amount at one meal this day, or null when no amount was logged. */
  most: number | null;
  /** Started a meal with a few bites of vegetables. */
  vegFirst: boolean;
}

/** One person's days, keyed by local date. */
export function daysOf(meals: Meal[], memberId: string): Map<string, Day> {
  const out = new Map<string, Day>();
  for (const m of meals) {
    if (m.memberId !== memberId) continue;
    const key = dayKey(new Date(m.date));
    const day = out.get(key) ?? { key, shared: false, most: null, vegFirst: false };
    day.shared = true;
    if (isStarchMeal(m)) day.most = Math.max(day.most ?? 0, m.handfuls ?? 0);
    if (m.vegFirst) day.vegFirst = true;
    out.set(key, day);
  }
  return out;
}

/**
 * The person's usual: the middle of their biggest-meal amounts over the last two weeks,
 * to the nearest half. Null until there are three days to go on.
 */
export function usualOf(meals: Meal[], memberId: string, now = new Date()): number | null {
  const from = dayKey(addDays(now, -14));
  const amounts = [...daysOf(meals, memberId).values()]
    .filter((d) => d.key >= from && d.most !== null && d.most > 0)
    .map((d) => d.most as number)
    .sort((a, b) => a - b);
  if (amounts.length < 3) return null;
  const mid = amounts.length / 2;
  const median = amounts.length % 2 ? amounts[Math.floor(mid)] : (amounts[mid - 1] + amounts[mid]) / 2;
  return clampAmount(median);
}

/** What this person usually has of one starch, for the "Same as usual" tap. */
export function usualFor(meals: Meal[], memberId: string, starch: StarchId): number {
  const recent = meals.filter((m) => m.memberId === memberId && isStarchMeal(m) && starchOf(m.grain) === starch).slice(0, 10);
  if (!recent.length) return starchById(starch).start;
  const sorted = recent.map((m) => m.handfuls as number).sort((a, b) => a - b);
  return clampAmount(sorted[Math.floor(sorted.length / 2)]);
}

/** The starch this person picked last, so most days need no tap at all. */
export function lastStarch(meals: Meal[], memberId: string): StarchId | null {
  const m = meals.find((x) => x.memberId === memberId && isStarchMeal(x) && x.grain);
  return m ? starchOf(m.grain) : null;
}

// ---------- the path ----------

/** Each stop on the path, in order. A stop is held on 5 of the last 7 days. */
export type Stop = 'usual' | 'step' | 'veg' | 'step2' | 'easy';
export const STOPS: Stop[] = ['usual', 'step', 'veg', 'step2', 'easy'];
export const HOLD_DAYS = 5;

export interface PathState {
  /** Index into STOPS. */
  level: number;
  /** The amount the person chose for a step stop, at most this at any one meal. */
  step: number | null;
  /** The local day this stop began. Only days from here count. */
  since: string;
}

export function pathOf(family: Pick<Family, 'path'> | null | undefined, memberId: string): PathState {
  const raw = family?.path?.[memberId];
  if (raw && typeof raw.level === 'number' && raw.level >= 0 && raw.level < STOPS.length) {
    return { level: raw.level, step: typeof raw.step === 'number' ? clampAmount(raw.step) : null, since: typeof raw.since === 'string' ? raw.since : '0000-00-00' };
  }
  return { level: 0, step: null, since: '0000-00-00' };
}

export interface PathProgress {
  stop: Stop;
  /** Days that count toward this stop in the last 7 (or, for "usual", days logged). */
  done: number;
  need: number;
  held: boolean;
  /** One mark per day of the last 7, oldest first: 'yes', 'no', 'freeze' (a quiet day that didn't count against), 'none' (not started yet). */
  week: ('yes' | 'no' | 'freeze' | 'none' | 'today')[];
  /** For the first stop: the usual amount so far. */
  usual: number | null;
}

/** Did this day count toward the stop? */
function counts(stop: Stop, day: Day | undefined, state: PathState): boolean {
  if (!day || !day.shared) return false;
  if (stop === 'usual') return day.most !== null;
  if (stop === 'step' || stop === 'step2') return day.most !== null && state.step !== null && day.most <= state.step;
  if (stop === 'veg') return day.vegFirst;
  return day.shared;
}

export function pathProgress(meals: Meal[], memberId: string, state: PathState, now = new Date()): PathProgress {
  const stop = STOPS[state.level];
  const days = daysOf(meals, memberId);
  const today = dayKey(now);
  const week: PathProgress['week'] = [];
  let done = 0;
  let quiet = 0;
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(addDays(now, -i));
    if (key < state.since) {
      week.push('none');
      continue;
    }
    const ok = counts(stop, days.get(key), state);
    if (ok) {
      done++;
      week.push('yes');
    } else if (key === today) {
      week.push('today');
    } else if (!days.get(key)?.shared && quiet < 2) {
      // Two quiet days a week are forgiven: a wedding, a trip, a bad day.
      quiet++;
      week.push('freeze');
    } else {
      week.push('no');
    }
  }
  if (stop === 'usual') {
    // The first stop is just logging: five days with a starch amount, any five since starting.
    const logged = [...days.values()].filter((d) => d.key >= state.since && d.most !== null).length;
    return { stop, done: Math.min(logged, HOLD_DAYS), need: HOLD_DAYS, held: logged >= HOLD_DAYS, week, usual: usualOf(meals, memberId, now) };
  }
  if (stop === 'easy') return { stop, done, need: 3, held: false, week, usual: usualOf(meals, memberId, now) };
  return { stop, done, need: HOLD_DAYS, held: done >= HOLD_DAYS, week, usual: usualOf(meals, memberId, now) };
}

/** The steps a person can choose from: half less, one less, or keep the usual. Never below half a handful. */
export function stepChoices(usual: number | null, current: number | null): number[] {
  const base = current ?? usual ?? 2;
  const set = new Set([clampAmount(base - 0.5), clampAmount(base - 1), clampAmount(base)].filter((n) => n >= 0.5));
  return [...set].sort((a, b) => b - a);
}

/** The state after the person moves on. Step stops keep the chosen amount. */
export function nextState(state: PathState, step: number | null, now = new Date()): PathState {
  const level = Math.min(STOPS.length - 1, state.level + 1);
  const stop = STOPS[level];
  return { level, step: stop === 'step' || stop === 'step2' ? (step ?? state.step) : state.step, since: dayKey(now) };
}

// ---------- the family's grains, bowl and streak ----------

/** Grains for each thing the family does. Team points only: nobody has a personal score. */
export const GRAINS = { meal: 10, heart: 5, comment: 5, dayAtStep: 20, stop: 100, bowl: 100, missed: 15 } as const;
export const COSTUME_COST = 300;

/** The people the family is looking after. If none of them has joined yet, everyone who has. */
export function focusMembers(members: Member[]): Member[] {
  const cared = members.filter((m) => m.role === 'parent' && m.joined);
  return cared.length ? cared : members.filter((m) => m.joined);
}

/** Days this week before today when someone looked after shared nothing. Two a week are free. */
export function bowlFor(meals: Meal[], members: Member[], week: Date, now = new Date()): { kept: number; missed: number; frozen: number; days: number } {
  const start = weekStart(week);
  const focus = focusMembers(members);
  const byMember = focus.map((m) => daysOf(meals, m.id));
  const today = dayKey(now);
  let missed = 0;
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(start, i));
    if (key >= today) break;
    days++;
    if (byMember.some((d) => !d.get(key)?.shared)) missed++;
  }
  const frozen = Math.min(2, missed);
  return { kept: Math.max(0, GRAINS.bowl - GRAINS.missed * (missed - frozen)), missed, frozen, days };
}

export interface Grains {
  /** Grains the family can spend right now. */
  pot: number;
  /** Earned in total, before spending. */
  earned: number;
  spent: number;
  /** This week's bowl. */
  bowl: { kept: number; missed: number; frozen: number; days: number };
  /** Grains the last meal earned, for the "saved" screen. */
  perMeal: number;
}

export function familyGrains(family: Family, meals: Meal[], cheerCount: number, now = new Date()): Grains {
  // Meals: at most three a day per person count, so nobody farms grains by sharing ten snacks.
  const perDay = new Map<string, number>();
  let earned = 0;
  let hearts = 0;
  for (const m of meals) {
    const key = `${m.memberId}:${dayKey(new Date(m.date))}`;
    const n = (perDay.get(key) ?? 0) + 1;
    perDay.set(key, n);
    if (n <= 3) earned += GRAINS.meal;
    hearts += m.hearts.filter((h) => h !== m.memberId).length;
  }
  earned += hearts * GRAINS.heart + cheerCount * GRAINS.comment;
  // Days at a step, and stops held, for everyone the family looks after.
  for (const m of family.members) {
    const state = pathOf(family, m.id);
    earned += state.level * GRAINS.stop;
    const stop = STOPS[state.level];
    if (stop === 'step' || stop === 'step2' || stop === 'veg') {
      const days = daysOf(meals, m.id);
      for (const d of days.values()) if (d.key >= state.since && counts(stop, d, state)) earned += GRAINS.dayAtStep;
    }
  }
  // Past weeks' bowls, back to the family's first meal.
  const first = meals.length ? new Date(meals[meals.length - 1].date) : now;
  const thisWeek = weekStart(now);
  for (let w = weekStart(first); w < thisWeek; w = addDays(w, 7)) {
    earned += bowlFor(meals, family.members, w, addDays(w, 7)).kept;
  }
  const spent = (family.costumes?.length ?? 0) * COSTUME_COST;
  return { pot: Math.max(0, earned - spent), earned, spent, bowl: bowlFor(meals, family.members, now, now), perMeal: GRAINS.meal };
}

/**
 * Days in a row that everyone looked after shared something. A missed day uses one of the week's
 * two freezes instead of breaking the run. Today only adds once it's done.
 */
export function familyStreak(meals: Meal[], members: Member[], now = new Date()): { days: number; freezesLeft: number } {
  const focus = focusMembers(members);
  if (!focus.length) return { days: 0, freezesLeft: 2 };
  const byMember = focus.map((m) => daysOf(meals, m.id));
  const all = (key: string) => byMember.every((d) => d.get(key)?.shared);
  const used = new Map<string, number>();
  let days = all(dayKey(now)) ? 1 : 0;
  for (let i = 1; i < 400; i++) {
    const d = addDays(now, -i);
    const key = dayKey(d);
    if (all(key)) {
      days++;
      continue;
    }
    const wk = dayKey(weekStart(d));
    const n = used.get(wk) ?? 0;
    // Before anyone ever shared, the run is over.
    const anyEarlier = meals.some((m) => dayKey(new Date(m.date)) < key);
    if (n < 2 && anyEarlier) {
      used.set(wk, n + 1);
      continue;
    }
    break;
  }
  const thisWeek = dayKey(weekStart(now));
  return { days, freezesLeft: Math.max(0, 2 - (used.get(thisWeek) ?? 0)) };
}

// ---------- for the doctor ----------

export interface DoctorRow {
  day: string;
  /** "Rice, 2½ handfuls" per meal, in the order eaten. */
  meals: { slot: Meal['slot']; text: string }[];
}

export function amountWords(name: string | null | undefined, amount: number | null | undefined): string {
  const id = starchOf(name);
  if (amount === null || amount === undefined || !id) return 'not recorded';
  if (id === 'none' || amount === 0) return 'no starch';
  const unit = starchById(id).unit;
  const n = halves(amount);
  const one = amount <= 1;
  const word = unit === 'hand' ? (one ? 'handful' : 'handfuls') : unit === 'piece' ? (one ? 'piece' : 'pieces') : one ? 'slice' : 'slices';
  return `${id === 'other' ? (name ?? 'Other') : starchById(id).name}, ${n} ${word}`;
}

/** A plain list of what starch was eaten, by day, for the last two weeks. No nutrients, no judgements. */
export function doctorRows(meals: Meal[], memberId: string, now = new Date(), days = 14): DoctorRow[] {
  const from = dayKey(addDays(now, -(days - 1)));
  const rows = new Map<string, DoctorRow>();
  const mine = meals.filter((m) => m.memberId === memberId && dayKey(new Date(m.date)) >= from).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const m of mine) {
    const key = dayKey(new Date(m.date));
    const row = rows.get(key) ?? { day: key, meals: [] };
    row.meals.push({ slot: m.slot, text: m.slot === 'fasting' ? 'fasting' : amountWords(m.grain, m.handfuls) });
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

/** One plain sentence about the usual, for the top of the doctor's page. */
export function doctorSummary(meals: Meal[], memberId: string, now = new Date()): string[] {
  const out: string[] = [];
  const recent = meals.filter((m) => m.memberId === memberId && isStarchMeal(m) && now.getTime() - new Date(m.date).getTime() < 14 * 86_400_000);
  const counts = new Map<string, number>();
  for (const m of recent) {
    const id = starchOf(m.grain);
    if (id && id !== 'none') counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (main) {
    const id = main[0] as StarchId;
    const amount = usualFor(meals, memberId, id);
    out.push(`Main starch: ${starchById(id).name.toLowerCase()}, usually about ${amountWords(starchById(id).name, amount).split(', ')[1]} at a meal.`);
  }
  const days = [...daysOf(meals, memberId).values()].filter((d) => now.getTime() - new Date(d.key).getTime() < 14 * 86_400_000);
  const veg = days.filter((d) => d.vegFirst).length;
  if (veg) out.push(`Started a meal with vegetables on ${veg} of ${days.length} days.`);
  out.push(`${recent.length} meals recorded in the last 14 days. Amounts are the person's own estimate in their hand, not weighed.`);
  return out;
}
