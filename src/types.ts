import type { PlateItem } from './dishes';
/**
 * 'parent' is the person the family looks after (shown as "cared for").
 * 'child' is anyone looking after them (shown as "caregiver"). The stored words stay
 * the same so older families keep working.
 */
export type Role = 'parent' | 'child';

/** Fasting is shared like a meal, so a fasting day keeps the streak going. */
export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'suhoor' | 'iftar' | 'fasting';

export interface Member {
  id: string;
  name: string;
  role: Role;
  /** Picks one of the avatar colours. */
  tint: number;
  /** False until this person has opened their invite. */
  joined: boolean;
}

/**
 * The plate by food group, in hand measures: grains in fists, protein in palms, vegetables in handfuls,
 * fruit in pieces (about a fist), dairy in cups. Fruit and dairy are optional, so older meals still work.
 */
export interface Portions {
  grains: number;
  protein: number;
  veg: number;
  fruit?: number;
  dairy?: number;
}

export interface Meal {
  id: string;
  memberId: string;
  /** ISO time the meal was shared. */
  date: string;
  slot: Slot;
  /** Photo address, or null for "no photo". */
  photo: string | null;
  /** Fists of rice, roti or other grains. 0 is none, 4 means "4 or more", null means not answered. */
  handfuls: number | null;
  /** Palms of fish, meat, eggs, dal or paneer. */
  protein?: number | null;
  /** Handfuls of vegetables or salad. */
  veg?: number | null;
  /** Pieces of fruit (one piece is about a fist). */
  fruit?: number | null;
  /** Cups of milk, yoghurt or lassi. */
  dairy?: number | null;
  /** Ids of the family members who sent a heart. */
  hearts: string[];
  /** What the photo looks like, from food recognition. */
  dish?: string | null;
  parts?: Parts | null;
  /** A few words from the person, like "Nani's khichdi". */
  note?: string | null;
  /** Address of a short voice note, or null. */
  voice?: string | null;
  /** Family members who ate this meal together with the person. */
  withIds?: string[];
  /** Anyone else at the table, in the person's own words ("Shila Auntie"). */
  withOthers?: string | null;
  /** A buffet, wedding or dawat plate. */
  party?: boolean;
  /** The grain on this plate ("Rice", "Naan"). Families mix staples from day to day. */
  grain?: string | null;
  /** Set when this person ate a meal someone else shared ("I ate this too"). Its photo is shown. */
  sameAs?: string | null;
  /** The dishes on the plate, each in its own measure ("Rice, 2 fists"). The food group counts above come from these. */
  items?: PlateItem[] | null;
}

/** Rough share of the plate, in percent. */
export interface Parts {
  grain: number;
  veg: number;
  protein: number;
  other: number;
}

/** What food recognition thinks is in a photo. */
export interface Guess {
  dish: string;
  parts: Parts;
  /** Rough fists of grains, 0 to 4, or null when the photo was unclear. */
  amount: number | null;
  /** Rough palms of protein and handfuls of vegetables, when the model could tell. */
  protein?: number | null;
  veg?: number | null;
  fruit?: number | null;
  dairy?: number | null;
  /** For a party plate: each thing on it. */
  items?: string[];
  /** Each dish Mado sees, with its kind and amount in that kind's measure. */
  dishes?: PlateItem[];
  /** True when this is canned sample data, not a real reading of the photo. */
  sample?: boolean;
}

/** A note from one family member to another: "You're doing great, Ammi!" */
export interface Cheer {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  date: string;
  /** The meal it was sent on, if any. A note on a meal shows under it as a comment. */
  mealId?: string | null;
}

/** A family recipe, so it is not lost. */
export interface Recipe {
  id: string;
  addedBy: string;
  title: string;
  /** Whose recipe it is: "Nani", "Ammi". */
  from: string;
  ingredients: string;
  steps: string;
  story?: string | null;
  photo?: string | null;
  voice?: string | null;
  date: string;
}

/** One labelled photo for improving recognition. Only saved for people who turned sharing on. */
export interface Example {
  mealId: string;
  memberId: string;
  code: string;
  goalFood: string;
  guess: Guess | null;
  handfuls: number | null;
  chosenBy: ChosenBy;
}
export type ChosenBy = 'guess' | 'tap' | 'hand';

export interface Family {
  code: string;
  members: Member[];
  /** The main grain the family eats. Rice by default. */
  goalFood: string;
  /** Fists of grains that feel right for one meal. */
  goalHandfuls: number;
  /** This week's family quest, if someone picked one. Otherwise the app picks by week. */
  quest?: string | null;
  /** Mado's costumes the family has earned by finishing quests, oldest first. */
  costumes?: string[];
}

/** A real-life quest tick a photo can't show, like "we walked after dinner". */
export interface Tick {
  memberId: string;
  /** Local date, YYYY-MM-DD. */
  day: string;
  kind: string;
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

/** A recorded voice note waiting to be sent. */
export interface Voice {
  uri: string;
  /** Length in seconds. */
  seconds: number;
}

export type NewMeal = {
  slot: Slot;
  photo: Photo | null;
  portions: Portions | null;
  guess?: Guess | null;
  chosenBy?: ChosenBy;
  note?: string;
  voice?: Voice | null;
  withIds?: string[];
  withOthers?: string;
  party?: boolean;
  grain?: string;
  sameAs?: string | null;
  /** The dishes, when the person logged them as dishes. */
  items?: PlateItem[] | null;
};

export type NewRecipe = Omit<Recipe, 'id' | 'addedBy' | 'date' | 'photo' | 'voice'> & { photo: Photo | null; voice: Voice | null };

/** Everything the app needs from a server. Two versions exist: on this phone only, and Supabase. */
export interface Backend {
  mode: 'local' | 'cloud';
  createFamily(input: { myName: string; parentName: string; goalFood: string; goalHandfuls: number; myRole?: Role }): Promise<Session>;
  /** Looks up an invite code before joining. Null if the code is unknown. */
  inviteInfo(code: string): Promise<{ parentName: string | null; fromName: string | null; waiting: string[] } | null>;
  joinFamily(input: { code: string; name: string; role: Role }): Promise<Session>;
  /** Adds another person the family looks after. They get their own seat and join with the same code. */
  addPerson(code: string, name: string): Promise<Member>;
  /** Saves this phone's push address so the family can tell it when someone eats or comments. */
  savePushToken(code: string, meId: string, token: string | null): Promise<void>;
  /** Asks the server to tell the rest of the family about a meal or a comment. Never throws. */
  notifyFamily(code: string, event: { kind: 'meal'; mealId: string } | { kind: 'comment'; cheerId: string }): Promise<void>;
  load(code: string): Promise<{ family: Family; meals: Meal[]; cheers: Cheer[]; recipes: Recipe[]; ticks: Tick[] } | null>;
  setQuest(code: string, quest: string | null): Promise<void>;
  /** Adds a costume the family just earned. Safe to call twice. */
  addCostume(code: string, costume: string): Promise<void>;
  setTick(code: string, tick: Tick, on: boolean): Promise<void>;
  addMeal(code: string, meal: Meal, photo: Photo | null, voice: Voice | null): Promise<Meal>;
  /** Looks at a photo and guesses what is on the plate. Null when it cannot tell or is not available. */
  recognize(photo: Photo, goalFood: string, party?: boolean): Promise<Guess | null>;
  setHeart(mealId: string, memberId: string, on: boolean): Promise<void>;
  sendCheer(code: string, cheer: Cheer): Promise<void>;
  addRecipe(code: string, recipe: Recipe, photo: Photo | null, voice: Voice | null): Promise<Recipe>;
  deleteRecipe(code: string, recipeId: string): Promise<void>;
  setGoal(code: string, goalFood: string, goalHandfuls: number): Promise<void>;
  /** Keeps a photo and the person's own answer to help improve recognition. Only called after they opted in. */
  saveExample(example: Example): Promise<void>;
  /** Takes back everything this person shared to improve recognition. */
  removeExamples(meId: string): Promise<void>;
  /** Removes one of this person's own meals and its photo. */
  deleteMeal(code: string, mealId: string): Promise<void>;
  /** Removes this person's meals and photos. */
  deleteMe(code: string, meId: string): Promise<void>;
}
