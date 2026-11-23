import { Cheer, Family, Meal, Member } from './types';
import { daysBetween, startOfDay } from './words';

/**
 * Rewards. The health payoff of eating well comes years later, so every share has to feel
 * good today. The family quest (quests.ts) is the one counter people see. Here: a personal streak,
 * badges, and a family board where everyone is best at something. Points are only used inside
 * the board to break ties; nobody sees them.
 */

export const POINTS = {
  meal: 10,
  photo: 5,
  balanced: 10,
  together: 15,
  fasting: 10,
  heart: 2,
  cheer: 5,
  recipe: 20,
} as const;

export interface Badge {
  id: string;
  title: string;
  /** Shown under the badge: how it was earned. */
  how: string;
  icon: string;
}

const STREAK_STEPS = [3, 7, 14, 30, 60, 100, 200, 365];

/** A plate counts as balanced when vegetables are at least as big as grains, and there is some protein. */
export function isBalanced(m: Pick<Meal, 'handfuls' | 'protein' | 'veg' | 'slot'>): boolean {
  if (m.slot === 'fasting' || m.slot === 'snack') return false;
  const g = m.handfuls ?? null;
  const v = m.veg ?? 0;
  const p = m.protein ?? 0;
  if (g === null) return false;
  return v >= Math.max(1, g) && p >= 1;
}

export function pointsFor(meal: Meal, cheers: Cheer[] = []): number {
  if (meal.slot === 'fasting') return POINTS.fasting;
  let total = POINTS.meal;
  if (meal.photo) total += POINTS.photo;
  if (isBalanced(meal)) total += POINTS.balanced;
  if ((meal.withIds?.length ?? 0) > 0 || meal.withOthers) total += POINTS.together;
  void cheers;
  return total;
}

/** Days in a row, ending today or yesterday, with anything shared (fasting counts). */
export function streakOf(meals: Meal[], memberId: string, now = new Date()): number {
  const days = new Set(meals.filter((m) => m.memberId === memberId).map((m) => startOfDay(new Date(m.date)).getTime()));
  let day = startOfDay(now);
  if (!days.has(day.getTime())) day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
  let count = 0;
  while (days.has(day.getTime())) {
    count += 1;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
  }
  return count;
}

/**
 * Days in a row when everyone who has joined shared something. Counted together, so the streak
 * never rests on one person, and a quiet day is a reason to check in rather than a personal loss.
 */
export function familyStreak(meals: Meal[], memberIds: string[], now = new Date()): number {
  if (memberIds.length < 2) return 0;
  const byDay = new Map<number, Set<string>>();
  for (const m of meals) {
    const key = startOfDay(new Date(m.date)).getTime();
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)?.add(m.memberId);
  }
  const full = (d: Date) => memberIds.every((id) => byDay.get(d.getTime())?.has(id));
  let day = startOfDay(now);
  if (!full(day)) day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
  let count = 0;
  while (full(day)) {
    count += 1;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
  }
  return count;
}

/** The next streak to aim for. Small at first, so the first win comes in days, not weeks. */
export function streakGoal(streak: number): number {
  return STREAK_STEPS.find((n) => n > streak) ?? Math.ceil((streak + 1) / 100) * 100;
}

/** What reaching the next streak goal gives. A reward has to beat the effort, so each one is concrete. */
export function streakReward(goal: number): string {
  if (goal <= 3) return 'the Three in a Row badge';
  if (goal <= 7) return 'the One Week badge';
  if (goal <= 14) return 'the Two Weeks badge';
  if (goal <= 30) return 'the Month at the Table badge';
  return 'a new best streak';
}

export interface Score {
  member: Member;
  points: number;
  meals: number;
  balanced: number;
  together: number;
  cheersSent: number;
  heartsSent: number;
  streak: number;
}

export function scores(family: Family, meals: Meal[], cheers: Cheer[], from: Date, to = new Date()): Score[] {
  const inRange = (iso: string) => {
    const d = new Date(iso);
    return d >= from && d <= to;
  };
  return family.members.map((member) => {
    const mine = meals.filter((m) => m.memberId === member.id && inRange(m.date));
    const heartsSent = meals.filter((m) => inRange(m.date) && m.memberId !== member.id && m.hearts.includes(member.id)).length;
    const cheersSent = cheers.filter((c) => c.fromId === member.id && inRange(c.date)).length;
    const points =
      mine.reduce((sum, m) => sum + pointsFor(m), 0) + heartsSent * POINTS.heart + cheersSent * POINTS.cheer;
    return {
      member,
      points,
      meals: mine.filter((m) => m.slot !== 'fasting').length,
      balanced: mine.filter(isBalanced).length,
      together: mine.filter((m) => (m.withIds?.length ?? 0) > 0 || !!m.withOthers).length,
      cheersSent,
      heartsSent,
      // A week that hasn't ended yet counts the streak up to now, not up to Sunday.
      streak: streakOf(meals, member.id, to.getTime() > Date.now() ? new Date() : to),
    };
  });
}

/**
 * The family board. Instead of ranking people top to bottom, each person gets the title
 * they are best at this week, so everyone has something to be proud of.
 */
export function boardTitles(list: Score[]): Map<string, string> {
  const titles = new Map<string, string>();
  const categories: [keyof Score, string][] = [
    ['streak', 'Longest streak'],
    ['balanced', 'Most balanced plates'],
    ['cheersSent', 'Biggest cheerleader'],
    ['together', 'Most meals together'],
    ['meals', 'Most meals shared'],
    ['heartsSent', 'Most hearts sent'],
  ];
  const left = [...list];
  for (const [key, title] of categories) {
    if (!left.length) break;
    const best = [...left].sort((a, b) => (b[key] as number) - (a[key] as number))[0];
    if ((best[key] as number) <= 0) continue;
    titles.set(best.member.id, title);
    left.splice(left.indexOf(best), 1);
  }
  for (const s of left) titles.set(s.member.id, s.points > 0 ? 'Showing up' : 'Saving a seat');
  return titles;
}

export function badgesFor(memberId: string, meals: Meal[], cheers: Cheer[], recipesAdded: number, now = new Date()): Badge[] {
  const mine = meals.filter((m) => m.memberId === memberId);
  const shared = mine.filter((m) => m.slot !== 'fasting').length;
  const best = bestStreak(meals, memberId);
  const list: Badge[] = [];
  if (shared >= 1) list.push({ id: 'first', title: 'First Bite', how: 'Shared a first meal', icon: 'restaurant' });
  if (best >= 3) list.push({ id: 's3', title: 'Three in a Row', how: '3 days in a row', icon: 'flame' });
  if (best >= 7) list.push({ id: 's7', title: 'One Week', how: '7 days in a row', icon: 'flame' });
  if (best >= 14) list.push({ id: 's14', title: 'Two Weeks', how: '14 days in a row', icon: 'flame' });
  if (best >= 30) list.push({ id: 's30', title: 'Month at the Table', how: '30 days in a row', icon: 'trophy' });
  if (mine.filter(isBalanced).length >= 5) list.push({ id: 'bal5', title: 'Half Veggies', how: '5 balanced plates', icon: 'leaf' });
  if (mine.filter((m) => (m.withIds?.length ?? 0) > 0 || m.withOthers).length >= 3) list.push({ id: 'tog3', title: 'Shared Table', how: '3 meals eaten together', icon: 'people' });
  if (mine.some((m) => m.slot === 'fasting')) list.push({ id: 'fast', title: 'Fasting Day', how: 'Shared a fasting day', icon: 'moon' });
  if (cheers.filter((c) => c.fromId === memberId).length >= 3) list.push({ id: 'cheer3', title: 'Cheerleader', how: 'Sent 3 notes', icon: 'heart' });
  if (recipesAdded >= 1) list.push({ id: 'recipe', title: 'Keeper of Recipes', how: 'Saved a family recipe', icon: 'book' });
  if (shared >= 50) list.push({ id: 'm50', title: 'Fifty Plates', how: '50 meals shared', icon: 'star' });
  void now;
  return list;
}

export function bestStreak(meals: Meal[], memberId: string): number {
  const days = [...new Set(meals.filter((m) => m.memberId === memberId).map((m) => startOfDay(new Date(m.date)).getTime()))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && daysBetween(new Date(prev), new Date(d)) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Plate balance over some meals, as averages per meal in hand measures. */
export function plateAverage(meals: Meal[]): { grains: number; protein: number; veg: number; counted: number } {
  const real = meals.filter((m) => m.slot !== 'fasting' && m.slot !== 'snack' && m.handfuls !== null && m.handfuls !== undefined);
  if (!real.length) return { grains: 0, protein: 0, veg: 0, counted: 0 };
  const sum = (f: (m: Meal) => number) => real.reduce((acc, m) => acc + f(m), 0) / real.length;
  return {
    grains: sum((m) => m.handfuls ?? 0),
    protein: sum((m) => m.protein ?? 0),
    veg: sum((m) => m.veg ?? 0),
    counted: real.length,
  };
}

/**
 * One gentle idea, chosen from what the plates actually looked like. Never "you must".
 * Always something small to try, and why it helps, in plain words.
 */
export function nextIdea(avg: { grains: number; protein: number; veg: number; counted: number }, grain = 'rice'): { title: string; body: string } {
  const g = grain.toLowerCase();
  if (avg.counted === 0) return { title: 'Start with one plate', body: 'Share one meal and Puti will find one small idea for next week.' };
  if (avg.veg < avg.grains) {
    return {
      title: `Try vegetables first, then ${g}`,
      body: `This week your plates had more ${g} than vegetables. Eating the vegetables or salad first, then the ${g}, helps the body take the ${g} in more slowly. Same food, just a different order.`,
    };
  }
  if (avg.protein < 1) {
    return {
      title: 'Add one palm of protein',
      body: 'Eggs, beans, lentils, fish or meat. A palm of protein keeps you full for longer, so the next snack comes later.',
    };
  }
  if (avg.grains > 2.5) {
    return {
      title: `Swap one fist of ${g} for vegetables`,
      body: `Keep the plate just as full. Moving one fist from ${g} to vegetables is the smallest change with the biggest effect.`,
    };
  }
  return {
    title: 'Your plates look balanced',
    body: 'Half vegetables, a quarter grains, a quarter protein. Try a ten minute walk after dinner this week, it helps the body use the meal.',
  };
}

/** Points earned in Learn since a date. Kept on this phone. */
export function learnPointsSince(log: { d: string; p: number }[], from: Date): number {
  return log.filter((e) => new Date(e.d) >= from).reduce((sum, e) => sum + e.p, 0);
}
