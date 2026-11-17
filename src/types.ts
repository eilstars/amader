export type Role = 'parent' | 'child';
export type Slot = 'breakfast' | 'lunch' | 'dinner';

export interface Member {
  id: string;
  name: string;
  role: Role;
  /** Picks one of the three avatar colours. */
  tint: number;
  /** False until this person has opened their invite. */
  joined: boolean;
}

export interface Meal {
  id: string;
  memberId: string;
  /** ISO time the meal was shared. */
  date: string;
  slot: Slot;
  /** Photo address, or null for "no photo today". */
  photo: string | null;
  /** Handfuls of the goal food. 0 is none, 4 means "4 or more", null means not answered. */
  handfuls: number | null;
  /** Ids of the family members who sent a heart. */
  hearts: string[];
}

export interface Family {
  code: string;
  members: Member[];
  /** The one food the family keeps an eye on. Rice by default. */
  goalFood: string;
  goalHandfuls: number;
}

export interface Session {
  code: string;
  meId: string;
  /** True when the made-up sample family is loaded. */
  demo?: boolean;
}

export interface Photo {
  uri: string;
  base64: string | null;
}

/** Everything the app needs from a server. Two versions exist: on this phone only, and Supabase. */
export interface Backend {
  mode: 'local' | 'cloud';
  createFamily(input: { myName: string; parentName: string; goalFood: string; goalHandfuls: number }): Promise<Session>;
  /** Looks up an invite code before joining. Null if the code is unknown. */
  inviteInfo(code: string): Promise<{ parentName: string | null; fromName: string | null } | null>;
  joinFamily(input: { code: string; name: string; role: Role }): Promise<Session>;
  load(code: string): Promise<{ family: Family; meals: Meal[] } | null>;
  addMeal(code: string, meal: Meal, photo: Photo | null): Promise<Meal>;
  setHeart(mealId: string, memberId: string, on: boolean): Promise<void>;
  setGoal(code: string, goalFood: string, goalHandfuls: number): Promise<void>;
  /** Removes this person's meals and photos. */
  deleteMe(code: string, meId: string): Promise<void>;
}
