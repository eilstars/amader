import { Family, Meal } from './types';

export interface WidgetInput {
  family: Family;
  meals: Meal[];
  meId: string;
}

/** What the home and lock screen widgets show. */
export interface WidgetData {
  /** Has this person shared a meal today? */
  eaten: boolean;
  /** How many of the family have shared today. */
  shared: number;
  total: number;
  goalFood: string;
  /** The day this was worked out, so a widget can tell when it has gone stale. */
  day: string;
}

export function widgetData({ family, meals, meId }: WidgetInput, now = new Date()): WidgetData {
  const today = now.toDateString();
  const todays = meals.filter((m) => new Date(m.date).toDateString() === today);
  return {
    eaten: todays.some((m) => m.memberId === meId),
    shared: new Set(todays.map((m) => m.memberId)).size,
    total: family.members.length,
    goalFood: family.goalFood,
    day: today,
  };
}
