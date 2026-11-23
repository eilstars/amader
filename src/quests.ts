import { Family, Meal, Tick } from './types';
import { weekDays } from './words';

/**
 * Family quests: one theme a week that the whole family works on together, like a team quest.
 * Doing counts, not reading: a quest is filled by plates that fit it, or by a tick for something
 * a photo can't show. The lessons are the "why" behind each one. Finishing earns Mado a costume.
 *
 * Every quest adds something rather than cutting something out, because plans to eat more of a
 * good thing work about twice as well as plans to cut a bad one.
 */
export type CostumeId = 'chef' | 'crown' | 'cap' | 'apple' | 'garland';

export interface Quest {
  id: string;
  /** Shown everywhere: "Veg Week". */
  name: string;
  /** What to do, in one line. */
  goal: string;
  icon: string;
  costume: CostumeId;
  costumeName: string;
  /** Counted from plates, or ticked by hand. */
  how: 'plate' | 'tick';
  /** For a plate quest: does this meal count? */
  counts?: (meal: Meal) => boolean;
  /** For a tick quest: the button text. */
  tickLabel?: string;
  /** Lesson ids from learn.ts that explain why this matters. */
  briefing: string[];
}

const realMeal = (m: Meal) => m.slot !== 'fasting';

export const QUESTS: Quest[] = [
  {
    id: 'half-veg',
    name: 'Veg Week',
    goal: 'Fill half the plate with vegetables',
    icon: 'leaf',
    costume: 'chef',
    costumeName: 'Chef hat',
    how: 'plate',
    counts: (m) => realMeal(m) && m.slot !== 'snack' && (m.veg ?? 0) >= Math.max(1, m.handfuls ?? 0),
    briefing: ['fist', 'half', 'kids'],
  },
  {
    id: 'walk',
    name: 'Walk Week',
    goal: 'A short walk after a meal',
    icon: 'walk',
    costume: 'cap',
    costumeName: 'Walking cap',
    how: 'tick',
    tickLabel: 'I walked after a meal',
    briefing: ['walk', 'half', 'takes'],
  },
  {
    id: 'fruit',
    name: 'Fruit Week',
    goal: 'Whole fruit with a meal or as a snack',
    icon: 'nutrition',
    costume: 'apple',
    costumeName: 'Apple hat',
    how: 'plate',
    counts: (m) => realMeal(m) && (m.fruit ?? 0) > 0,
    briefing: ['fruit', 'soda', 'tea'],
  },
  {
    id: 'veg-first',
    name: 'Veg First Week',
    goal: 'Eat the vegetables before the rice or bread',
    icon: 'arrow-up-circle',
    costume: 'crown',
    costumeName: 'Leaf crown',
    how: 'tick',
    tickLabel: 'I ate my vegetables first',
    briefing: ['order', 'slow', 'hidden'],
  },
  {
    id: 'together',
    name: 'Together Week',
    goal: 'Share a meal with someone',
    icon: 'people',
    costume: 'garland',
    costumeName: 'Marigold garland',
    how: 'plate',
    counts: (m) => realMeal(m) && ((m.withIds?.length ?? 0) > 0 || !!m.withOthers || !!m.sameAs),
    briefing: ['kids', 'southasian', 'takes'],
  },
];

export function questById(id: string | null | undefined): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** A key for the week that starts on this Monday, like "2026-11-23". */
export function weekKey(days = weekDays(0)): string {
  const d = days[0];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** This week's quest: the one the family picked, or the next in the rotation. */
export function currentQuest(family: Family, now = new Date()): Quest {
  const picked = questById(family.quest);
  if (picked) return picked;
  const monday = weekDays(0, now)[0];
  const week = Math.floor(monday.getTime() / (7 * 86_400_000));
  return QUESTS[((week % QUESTS.length) + QUESTS.length) % QUESTS.length];
}

/** How many plates or ticks fill the bar: three per person who has joined, at least six. */
export function questGoal(family: Family): number {
  return Math.max(6, 3 * family.members.filter((m) => m.joined).length);
}

export interface QuestProgress {
  quest: Quest;
  done: number;
  goal: number;
  /** Who put in what, so everyone's part shows. */
  byMember: Record<string, number>;
  finished: boolean;
}

/** Progress for this week. A tick quest counts at most one tick per person per day. */
export function questProgress(family: Family, meals: Meal[], ticks: Tick[], now = new Date()): QuestProgress {
  const quest = currentQuest(family, now);
  const days = weekDays(0, now);
  const start = days[0].getTime();
  const end = start + 7 * 86_400_000;
  const byMember: Record<string, number> = {};
  if (quest.how === 'plate' && quest.counts) {
    for (const m of meals) {
      const t = new Date(m.date).getTime();
      if (t >= start && t < end && quest.counts(m)) byMember[m.memberId] = (byMember[m.memberId] ?? 0) + 1;
    }
  } else {
    const keys = new Set(days.map(dayKey));
    for (const t of ticks) if (t.kind === quest.id && keys.has(t.day)) byMember[t.memberId] = (byMember[t.memberId] ?? 0) + 1;
  }
  const done = Object.values(byMember).reduce((a, b) => a + b, 0);
  const goal = questGoal(family);
  return { quest, done, goal, byMember, finished: done >= goal };
}

/**
 * Mado's line right after a plate is shared: about this plate and this week's quest.
 * Never a judgement, always what counted or one small idea for next time.
 */
export function plateLine(quest: Quest, meal: Meal): string {
  if (meal.slot === 'fasting') return 'Fasting days keep the family going too.';
  if (quest.how === 'plate' && quest.counts) {
    if (quest.counts(meal)) return `That plate counts for ${quest.name}! +1 for the family.`;
    if (quest.id === 'half-veg') return 'Next time, one more handful of vegetables and it counts for Veg Week.';
    if (quest.id === 'fruit') return 'A piece of fruit with your next meal counts for Fruit Week.';
    if (quest.id === 'together') return 'Eating with someone? Tag them and it counts for Together Week.';
  }
  return `${quest.goal}? Tick it below and it counts for ${quest.name}.`;
}
