import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudBackend, localBackend, webUrl } from './backend';
import { Backend, Cheer, Family, Guess, Meal, Member, NewMeal, NewRecipe, Photo, Recipe, Role, Session, Tick } from './types';
import { QuestProgress, dayKey, questById, questProgress, weekKey } from './quests';
import { MedSlot, pushAddress, syncReminders } from './reminders';
import { refreshWidgets } from './widgets';
import { widgetData } from './widget-data';
import { DEFAULT_TIMES, MILESTONES, MealTimes, newId, newestFirst, sameDay, slotAt } from './words';

const SESSION = 'amader.session';
const CHECKUP = 'amader.checkup';
const PREFS = 'amader.prefs';

export interface Prefs {
  /** Let food recognition look at my photos. Null until the person has been asked. */
  guessOn: boolean | null;
  /** "Did you eat?" after each usual meal. */
  reminderOn: boolean;
  /** A surprise "having a snack?" once a day. */
  nudgesOn: boolean;
  /** Let Amader keep my photos and answers to improve recognition. Null until asked. */
  improveOn: boolean | null;
  times: MealTimes;
  /** Fasting mode is on (any tradition). The name is kept from when it was Ramadan only. */
  ramadan: boolean;
  /** Which fast: Ramadan, Lent, Navratri, Yom Kippur, Ekadashi, or the person's own days. */
  fastKind: string;
  /** Fasting only on these weekdays (Monday = 0). Null or empty means every day of the season. */
  fastDays: number[] | null;
  suhoorHour: number;
  iftarHour: number;
  /** Onboarding finished on this phone. */
  onboarded: boolean;
  /** The "add the widget" card was shown or closed. */
  widgetSeen: boolean;
  /** Lessons already answered, so new ones come first. */
  learned: string[];
  /** Points from Learn, by day, so they count toward this week's points. Kept on this phone. */
  learnLog: { d: string; p: number }[];
  /** Lives in the same home as the person they look after, so they often eat the same meals. */
  sameHome: boolean;
  /** Lives with them only at weekends, like a student who goes home on Saturday and Sunday. */
  homeWeekends: boolean;
  /** The weekdays they are home together (Monday = 0). Any mix: weekends, Fridays, every other day. */
  homeDays: number[];
  /** What each person looked after is to me (Mother, Father...), by their name. Kept on this phone. */
  relations: Record<string, string>;
  /** What this person wants to stay healthy for, in their own words or a tapped choice. */
  why: string | null;
  /** Small things the person said they would try, from Learn. */
  pledges: string[];
  /** Tell me when someone in the family shares a meal or comments on mine. */
  familyAlerts: boolean;
  /**
   * Medicine with meals, like a weekly pill organizer: which meals it goes with, and which
   * compartments were ticked ("2026-11-23:breakfast"). Kept on this phone only. The family never sees it,
   * and no medicine names or doses are asked for.
   */
  meds: { on: boolean; slots: MedSlot[]; taken: string[] };
  /**
   * The simple view: one screen, one big button, the family below. Null means "pick for me":
   * on for the person being looked after, off for the person looking after them.
   */
  simple: boolean | null;
  /** "Take a break": meal reminders stay quiet until this time. Medicine nudges keep going. */
  breakUntil: string | null;
  /** Quest celebrations already shown on this phone, as "week:quest". */
  celebrated: string[];
  /** The costume Mado wears on this phone. Null means the newest one. */
  wear: string | null;
  /** Family plates already played in Guess the plate. */
  guessed: string[];
}
const DEFAULT_PREFS: Prefs = {
  guessOn: null,
  reminderOn: false,
  nudgesOn: false,
  improveOn: null,
  times: DEFAULT_TIMES,
  ramadan: false,
  fastKind: 'Ramadan',
  fastDays: null,
  suhoorHour: 4,
  iftarHour: 18,
  onboarded: false,
  widgetSeen: false,
  learned: [],
  learnLog: [],
  sameHome: false,
  homeWeekends: false,
  homeDays: [],
  relations: {},
  why: null,
  pledges: [],
  familyAlerts: true,
  meds: { on: false, slots: [], taken: [] },
  simple: null,
  breakUntil: null,
  celebrated: [],
  wear: null,
  guessed: [],
};

/** Today is a day this person eats at home with the people they look after. */
export function homeToday(p: Pick<Prefs, 'sameHome' | 'homeWeekends' | 'homeDays'>, now = new Date()): boolean {
  const d = now.getDay();
  const mon0 = (d + 6) % 7;
  if (p.homeDays?.length) return p.homeDays.includes(mon0);
  if (p.sameHome) return true;
  return !!p.homeWeekends && (d === 0 || d === 6);
}

function onBreak(p: Prefs, now = new Date()): boolean {
  return !!p.breakUntil && new Date(p.breakUntil).getTime() > now.getTime();
}

/** What the phone should remind about. A break quiets meal reminders but never the medicine. */
function planFor(p: Prefs, doneToday: Meal['slot'][], today: Date) {
  const resting = onBreak(p, today);
  return {
    on: p.reminderOn && !resting,
    nudges: p.nudgesOn && !resting,
    times: p.times,
    // Reminders move to fasting times for a whole season. On chosen weekdays only, the usual times stay.
    ramadan: p.ramadan && !(p.fastDays && p.fastDays.length),
    suhoorHour: p.suhoorHour,
    iftarHour: p.iftarHour,
    doneToday,
    ...medsPlan(p, today),
  };
}

/** The key for one organizer compartment: a local date and a meal. */
export function medKey(day: Date, slot: MedSlot): string {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}:${slot}`;
}

function medsPlan(p: Prefs, today: Date) {
  const slots = p.meds.on ? p.meds.slots : [];
  return { meds: slots, medsDone: slots.filter((x) => p.meds.taken.includes(medKey(today, x))) };
}

/** Shown at the top of the table when someone in the family just shared, while the app is open. */
export interface News {
  text: string;
  mealId: string;
  memberId: string;
}

interface Store {
  ready: boolean;
  /** True when Supabase keys are set, so families sync across phones. */
  cloud: boolean;
  session: Session | null;
  family: Family | null;
  /** Newest first. */
  meals: Meal[];
  cheers: Cheer[];
  recipes: Recipe[];
  me: Member | null;
  goalFood: string;
  goalHandfuls: number;
  myMealCount: number;
  nextMilestone: number;
  /** A family code that arrived through an invite link. */
  pendingCode: string | null;
  setPendingCode(code: string | null): void;
  checkupDate: string | null;
  setCheckupDate(date: string | null): void;
  member(id: string): Member | undefined;
  mealTitle(meal: Meal): string;
  inviteMessage: string;
  /** The invite text addressed to one person. */
  inviteFor(name: string | undefined): string;
  createFamily(input: { myName: string; parentName: string; goalFood: string; goalHandfuls: number }): Promise<void>;
  inviteInfo(code: string): Promise<{ parentName: string | null; fromName: string | null; waiting: string[]; helpers?: string[] } | null>;
  /** Look after someone else too. They join with the same family code. */
  addPerson(name: string, role?: Role): Promise<Member>;
  /** Comments on a meal. Goes to whoever shared it, or back to the last person who commented when it's my own meal. */
  comment(mealId: string, text: string): Promise<void>;
  /** The latest "Mom shared lunch", while the app is open. */
  news: News | null;
  clearNews(): void;
  setFamilyAlerts(on: boolean): Promise<boolean>;
  /** Turns medicine nudges on or off, or changes which meals they go with. Resolves false if the phone refused. */
  setMeds(change: Partial<Pick<Prefs['meds'], 'on' | 'slots'>>): Promise<boolean>;
  /** Ticks or unticks one compartment of the week's organizer. */
  toggleMed(day: Date, slot: MedSlot): void;
  joinFamily(input: { code: string; name: string; role: Role }): Promise<void>;
  loadDemo(): Promise<void>;
  addMeal(input: NewMeal): Promise<Meal>;
  /** Asks food recognition what is in the photo. Null when it is off or cannot tell. */
  recognize(photo: Photo, options?: { justAgreed?: boolean; party?: boolean }): Promise<Guess | null>;
  prefs: Prefs;
  setPrefs(change: Partial<Prefs>): void;
  setGuessOn(on: boolean): void;
  /** Turning this off also takes back what was already shared. Resolves false if that failed. */
  setImproveOn(on: boolean): Promise<boolean>;
  /** Turns reminders on or off. Resolves false if the phone refused. */
  setReminders(change: Partial<Pick<Prefs, 'reminderOn' | 'nudgesOn' | 'times' | 'ramadan' | 'fastKind' | 'fastDays' | 'suhoorHour' | 'iftarHour'>>): Promise<boolean>;
  /** Set by a widget, reminder or link that should open the camera or log a quick meal. */
  pendingAction: PendingAction | null;
  setPendingAction(action: PendingAction | null): void;
  toggleHeart(mealId: string): void;
  sendCheer(toId: string, text: string, mealId?: string | null): Promise<void>;
  addRecipe(recipe: NewRecipe): Promise<Recipe>;
  deleteRecipe(recipeId: string): Promise<void>;
  setGoal(goalFood: string, goalHandfuls: number): void;
  /** Sample family only: look at the app as someone else. */
  viewAs(memberId: string): void;
  /** Removes one of my own meals. */
  removeMeal(mealId: string): Promise<void>;
  /**
   * Deletes my meals and photos and leaves. Throws if the server could not be reached, so the person
   * is never told their data is gone when it is not. `onlyThisPhone` skips the server (used when the family cannot be loaded).
   */
  deleteEverything(options?: { onlyThisPhone?: boolean }): Promise<void>;
  refresh(): Promise<void>;
  /** Real-life ticks from the last few weeks, for quests a photo can't show. */
  ticks: Tick[];
  /** This week's family quest and how far along it is. */
  quest: QuestProgress | null;
  /** The family quest runs once at least two people have joined: a team needs a team. */
  questLive: boolean;
  /** I already ticked today's quest. */
  tickedToday: boolean;
  /** Pick this week's quest for the whole family. */
  setQuest(id: string): void;
  tickQuest(on: boolean): void;
  /** The quest is done: Mado gets the costume and this phone stops celebrating. */
  claimCostume(): void;
  /** Showing the simple, one-screen view. */
  simple: boolean;
  /** Different days I have shared a plate on. Things unlock as this grows. */
  daysShared: number;
  onBreak: boolean;
  /** Days of quiet from meal reminders, or null to come back. */
  takeBreak(days: number | null): Promise<void>;
}

export type PendingAction = { kind: 'add' } | { kind: 'quick'; handfuls: number };

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

function backendFor(session: Session | null): Backend {
  if (session?.demo) return localBackend;
  return cloudBackend ?? localBackend;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [checkupDate, setCheckup] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const lastSync = useRef({ remind: '', widget: '' });
  const [news, setNews] = useState<News | null>(null);
  /** Meals already seen on this phone, so only new ones from others become news. Null until the first load. */
  const seen = useRef<Set<string> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const pull = useCallback(async (s: Session | null) => {
    if (!s) return;
    const data = await backendFor(s).load(s.code);
    if (!data || sessionRef.current?.code !== s.code) return;
    if (seen.current) {
      const fresh = data.meals.find((m) => !seen.current?.has(m.id) && m.memberId !== s.meId && Date.now() - new Date(m.date).getTime() < 6 * 3600_000);
      const who = fresh && data.family.members.find((x) => x.id === fresh.memberId);
      if (fresh && who && prefsRef.current.familyAlerts) setNews({ text: `${who.name} just shared ${fresh.slot === 'snack' ? 'a snack' : fresh.slot === 'fasting' ? "that they're fasting" : fresh.slot}`, mealId: fresh.id, memberId: who.id });
    }
    seen.current = new Set(data.meals.map((m) => m.id));
    setFamily(data.family);
    setMeals(newestFirst(data.meals));
    setCheers([...data.cheers].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setRecipes([...data.recipes].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setTicks(data.ticks ?? []);
  }, []);

  const start = useCallback(
    async (s: Session) => {
      seen.current = null;
      await AsyncStorage.setItem(SESSION, JSON.stringify(s));
      sessionRef.current = s;
      setSession(s);
      await pull(s);
    },
    [pull],
  );

  // Open the app where the person left it.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION);
        setCheckup(await AsyncStorage.getItem(CHECKUP));
        const savedPrefs = await AsyncStorage.getItem(PREFS);
        if (savedPrefs) {
          const old = JSON.parse(savedPrefs) as Partial<Prefs> & { reminderHour?: number };
          // People who used the app before onboarding existed have already been through it.
          setPrefsState({ ...DEFAULT_PREFS, onboarded: !!raw, ...old, times: { ...DEFAULT_TIMES, ...(old.times ?? {}) } });
        }
        if (raw) {
          const s = JSON.parse(raw) as Session;
          sessionRef.current = s;
          setSession(s);
          await pull(s).catch(() => undefined);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [pull]);

  // Keep the table fresh: check for new meals every 15 seconds and when the app comes back to the front.
  useEffect(() => {
    if (!session || backendFor(session).mode !== 'cloud') return;
    const timer = setInterval(() => pull(session).catch(() => undefined), 15_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull(session).catch(() => undefined);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [session, pull]);

  // Save this phone's push address so the family can say "Mom shared lunch". Only asks once notifications are allowed.
  useEffect(() => {
    if (!ready || !session || session.demo || backendFor(session).mode !== 'cloud' || !prefs.familyAlerts) return;
    pushAddress(false)
      .then((token) => (token ? backendFor(session).savePushToken(session.code, session.meId, token) : undefined))
      .catch(() => undefined);
  }, [ready, session, prefs.familyAlerts, prefs.reminderOn]);

  // Keep reminders and widgets in step with what the family has shared.
  useEffect(() => {
    if (!ready || !session || !family) return;
    const today = new Date();
    const doneToday = meals.filter((m) => m.memberId === session.meId && sameDay(new Date(m.date), today)).map((m) => m.slot);
    // The table is re-read every 15 seconds. Only touch reminders and widgets when something they show has changed,
    // otherwise the phone would re-plan a week of reminders and redraw the widget four times a minute.
    const widget = widgetData({ family, meals, meId: session.meId }, today);
    const plan = planFor(prefs, doneToday, today);
    const remindKey = JSON.stringify([plan, today.toDateString()]);
    const widgetKey = JSON.stringify(widget);
    if (remindKey !== lastSync.current.remind) {
      lastSync.current.remind = remindKey;
      syncReminders(plan);
    }
    if (widgetKey !== lastSync.current.widget) {
      lastSync.current.widget = widgetKey;
      refreshWidgets({ family, meals, meId: session.meId });
    }
  }, [ready, session, family, meals, prefs]);

  const value = useMemo<Store>(() => {
    const savePrefs = (change: Partial<Prefs>) => {
      const next = { ...prefsRef.current, ...change };
      prefsRef.current = next;
      setPrefsState(next);
      AsyncStorage.setItem(PREFS, JSON.stringify(next));
    };

    const me = family?.members.find((m) => m.id === session?.meId) ?? null;
    const goalFood = family?.goalFood ?? 'Rice';
    const goalHandfuls = family?.goalHandfuls ?? 2;
    const myMealCount = meals.filter((m) => m.memberId === session?.meId && m.slot !== 'fasting').length;
    const nextMilestone = MILESTONES.find((n) => n > myMealCount) ?? (Math.floor(myMealCount / 100) + 1) * 100;
    const member = (id: string) => family?.members.find((m) => m.id === id);
    const parent = family?.members.find((m) => m.role === 'parent' && m.id !== me?.id);
    // The code sits after # so it never reaches the web host's logs or a link preview.
    const link = webUrl && family ? `\n${webUrl}/#join=${family.code}` : '';
    const inviteFor = (name: string | undefined) =>
      family ? `${name ?? 'Hi'}, did you eat? I set up Amader for us. ${webUrl ? 'Tap the link' : 'Open the app'} and enter our family code ${family.code}, then send me a photo of your plate. I'll send mine too.${link}` : '';
    const inviteMessage = inviteFor(parent?.name);
    const quest = family ? questProgress(family, meals, ticks) : null;
    const todayKey = dayKey(new Date());
    const tickedToday = !!quest && quest.quest.how === 'tick' && ticks.some((t) => t.memberId === session?.meId && t.day === todayKey && t.kind === quest.quest.id);
    const daysShared = new Set(meals.filter((m) => m.memberId === session?.meId).map((m) => dayKey(new Date(m.date)))).size;

    return {
      ready,
      cloud: !!cloudBackend,
      session,
      family,
      meals,
      cheers,
      recipes,
      me,
      goalFood,
      goalHandfuls,
      myMealCount,
      nextMilestone,
      pendingCode,
      setPendingCode,
      checkupDate,
      setCheckupDate(date) {
        setCheckup(date);
        if (date) AsyncStorage.setItem(CHECKUP, date);
        else AsyncStorage.removeItem(CHECKUP);
      },
      member,
      mealTitle(meal) {
        const what = meal.slot === 'fasting' ? 'fasting day' : meal.slot;
        if (meal.memberId === session?.meId) return `Your ${what}`;
        return `${member(meal.memberId)?.name ?? 'Someone'}'s ${what}`;
      },
      inviteMessage,
      inviteFor,

      async createFamily(input) {
        await start(await (cloudBackend ?? localBackend).createFamily(input));
      },
      async inviteInfo(code) {
        return (cloudBackend ?? localBackend).inviteInfo(code);
      },
      async joinFamily(input) {
        await start(await (cloudBackend ?? localBackend).joinFamily(input));
        setPendingCode(null);
      },
      async loadDemo() {
        // The sample shows the medicine organizer with a few days already ticked.
        const back = (n: number) => new Date(Date.now() - n * 86_400_000);
        const taken = [1, 2, 3].flatMap((n) => [medKey(back(n), 'breakfast'), ...(n === 2 ? [] : [medKey(back(n), 'dinner')])]);
        savePrefs({ onboarded: true, guessOn: true, improveOn: false, meds: { on: true, slots: ['breakfast', 'dinner'], taken } });
        const s = await localBackend.seedDemo();
        await start(s);
        // The sample family shows what it's like when someone shares: Ammi has a snack a few seconds in.
        setTimeout(async () => {
          if (sessionRef.current?.code !== s.code) return;
          const data = await localBackend.load(s.code);
          const ammi = data?.family.members.find((m) => m.name === 'Ammi');
          if (!ammi) return;
          const snack: Meal = { id: newId(), memberId: ammi.id, date: new Date().toISOString(), slot: 'snack', photo: null, handfuls: 0, protein: 0, veg: 0, fruit: 1, dairy: 1, hearts: [], dish: 'Apple and a cup of yoghurt', grain: null };
          await localBackend.addMeal(s.code, snack, null, null);
          await pull(s);
        }, 7000);
      },

      async addPerson(name, role = 'parent') {
        // Read the session from the ref: setup calls this right after making the family, before a re-render.
        const s = sessionRef.current;
        if (!s) throw new Error('No family yet.');
        const person = await backendFor(s).addPerson(s.code, name.trim().slice(0, 24), role);
        setFamily((f) => (f ? { ...f, members: [...f.members, person] } : f));
        return person;
      },

      async comment(mealId, text) {
        if (!session) return;
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return;
        let to = meal.memberId;
        if (to === session.meId) {
          // Replying on my own meal: it goes back to whoever commented last.
          to = cheers.find((c) => c.mealId === mealId && c.fromId !== session.meId)?.fromId ?? session.meId;
        }
        const cheer: Cheer = { id: newId(), fromId: session.meId, toId: to, text: text.trim().slice(0, 200), date: new Date().toISOString(), mealId };
        if (!cheer.text) return;
        await backendFor(session).sendCheer(session.code, cheer);
        setCheers((list) => [cheer, ...list]);
        if (!session.demo) backendFor(session).notifyFamily(session.code, { kind: 'comment', cheerId: cheer.id });
      },

      async setMeds(change) {
        const meds = { ...prefsRef.current.meds, ...change };
        if (meds.on && !meds.slots.length) meds.slots = ['breakfast', 'dinner'];
        const next = { ...prefsRef.current, meds };
        const today = new Date();
        const doneToday = meals.filter((m) => m.memberId === session?.meId && sameDay(new Date(m.date), today)).map((m) => m.slot);
        const ok = await syncReminders(planFor(next, doneToday, today));
        // The organizer still works without notifications, so it stays on; only the nudge is missing.
        savePrefs({ meds });
        return ok;
      },

      toggleMed(day, slot) {
        const key = medKey(day, slot);
        const taken = prefsRef.current.meds.taken;
        const next = taken.includes(key) ? taken.filter((k) => k !== key) : [...taken, key];
        // Keep about two months of ticks.
        savePrefs({ meds: { ...prefsRef.current.meds, taken: next.sort().slice(-200) } });
      },

      news,
      clearNews() {
        setNews(null);
      },

      async setFamilyAlerts(on) {
        savePrefs({ familyAlerts: on });
        if (!session || session.demo) return true;
        try {
          if (!on) {
            await backendFor(session).savePushToken(session.code, session.meId, null);
            return true;
          }
          const token = await pushAddress(true);
          if (token) await backendFor(session).savePushToken(session.code, session.meId, token);
          return !!token || backendFor(session).mode !== 'cloud';
        } catch {
          return false;
        }
      },

      prefs,
      setPrefs: savePrefs,
      setGuessOn(on) {
        savePrefs({ guessOn: on });
      },
      async setImproveOn(on) {
        if (!on && session) {
          try {
            await backendFor(session).removeExamples(session.meId);
          } catch {
            return false;
          }
        }
        savePrefs({ improveOn: on });
        return true;
      },
      async setReminders(change) {
        const next = { ...prefsRef.current, ...change };
        const today = new Date();
        const doneToday = meals.filter((m) => m.memberId === session?.meId && sameDay(new Date(m.date), today)).map((m) => m.slot);
        const ok = await syncReminders(planFor(next, doneToday, today));
        // If the phone said no, keep the times but show the reminders as off.
        savePrefs(ok ? change : { ...change, reminderOn: false, nudgesOn: false });
        return ok;
      },
      pendingAction,
      setPendingAction,
      async recognize(photo, options) {
        // A photo only goes to the AI service after the person has said yes. The sample family uses a canned guess.
        if (!session || !(session.demo || prefs.guessOn === true || options?.justAgreed)) return null;
        // On this phone only there is no real recognition. Only the sample family shows a sample guess.
        if (backendFor(session).mode === 'local' && !session.demo) return null;
        return backendFor(session).recognize(photo, goalFood, options?.party).catch(() => null);
      },

      async addMeal(input) {
        if (!session) throw new Error('No family yet.');
        const now = new Date();
        const p = input.portions;
        // "I ate this too" is filed at the time of the meal it joins, so it lands on the right day.
        const original = input.sameAs ? meals.find((m) => m.id === input.sameAs) : undefined;
        const when = original && new Date(original.date) <= now && now.getTime() - new Date(original.date).getTime() < 3 * 86400000 ? original.date : now.toISOString();
        const draft: Meal = {
          id: newId(),
          memberId: session.meId,
          date: when,
          slot: input.slot,
          photo: null,
          handfuls: p ? p.grains : null,
          protein: p ? p.protein : null,
          veg: p ? p.veg : null,
          fruit: p ? (p.fruit ?? 0) : null,
          dairy: p ? (p.dairy ?? 0) : null,
          hearts: [],
          dish: input.guess?.dish || original?.dish || null,
          parts: input.guess?.parts ?? null,
          note: input.note?.trim() || null,
          voice: null,
          withIds: input.withIds ?? [],
          withOthers: input.withOthers?.trim() || null,
          party: !!input.party,
          grain: input.grain?.trim() || null,
          sameAs: input.sameAs ?? null,
          items: input.items?.length ? input.items.slice(0, 12).map((i) => ({ name: i.name.trim().slice(0, 40), kind: i.kind, amount: Math.max(0, Math.min(6, i.amount)) })) : null,
        };
        const saved = await backendFor(session).addMeal(session.code, draft, input.photo, input.voice ?? null);
        setMeals((list) => newestFirst([saved, ...list.filter((m) => m.id !== saved.id)]));
        if (input.photo && prefs.improveOn === true && !session.demo) {
          // Never holds up saving the meal.
          backendFor(session)
            .saveExample({
              mealId: saved.id,
              memberId: session.meId,
              code: session.code,
              goalFood,
              guess: input.guess && !input.guess.sample ? input.guess : null,
              handfuls: saved.handfuls,
              chosenBy: input.chosenBy ?? 'tap',
            })
            .catch(() => undefined);
        }
        if (!session.demo) backendFor(session).notifyFamily(session.code, { kind: 'meal', mealId: saved.id });
        if (session.demo) {
          // The sample family answers, so the heart can be seen arriving.
          const other = family?.members.find((m) => m.id !== session.meId);
          if (other) {
            setTimeout(() => {
              localBackend.setHeart(saved.id, other.id, true);
              setMeals((list) => list.map((m) => (m.id === saved.id && !m.hearts.includes(other.id) ? { ...m, hearts: [...m.hearts, other.id] } : m)));
            }, 2500);
          }
        }
        return saved;
      },

      toggleHeart(mealId) {
        if (!session) return;
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return;
        const on = !meal.hearts.includes(session.meId);
        setMeals((list) =>
          list.map((m) => (m.id === mealId ? { ...m, hearts: on ? [...m.hearts, session.meId] : m.hearts.filter((id) => id !== session.meId) } : m)),
        );
        backendFor(session).setHeart(mealId, session.meId, on).catch(() => pull(session));
      },

      async sendCheer(toId, text, mealId) {
        if (!session) return;
        const cheer: Cheer = { id: newId(), fromId: session.meId, toId, text: text.trim().slice(0, 200), date: new Date().toISOString(), mealId: mealId ?? null };
        if (!cheer.text) return;
        await backendFor(session).sendCheer(session.code, cheer);
        setCheers((list) => [cheer, ...list]);
        if (!session.demo) backendFor(session).notifyFamily(session.code, { kind: 'comment', cheerId: cheer.id });
      },

      async addRecipe(input) {
        if (!session) throw new Error('No family yet.');
        const draft: Recipe = {
          id: newId(),
          addedBy: session.meId,
          title: input.title.trim(),
          from: input.from.trim(),
          ingredients: input.ingredients.trim(),
          steps: input.steps.trim(),
          story: input.story?.trim() || null,
          photo: null,
          voice: null,
          date: new Date().toISOString(),
        };
        const saved = await backendFor(session).addRecipe(session.code, draft, input.photo, input.voice);
        setRecipes((list) => [saved, ...list]);
        return saved;
      },

      async deleteRecipe(recipeId) {
        if (!session) return;
        await backendFor(session).deleteRecipe(session.code, recipeId);
        setRecipes((list) => list.filter((r) => r.id !== recipeId));
      },

      setGoal(food, handfuls) {
        if (!session || !family) return;
        const clamped = Math.min(4, Math.max(1, handfuls));
        setFamily({ ...family, goalFood: food, goalHandfuls: clamped });
        backendFor(session).setGoal(session.code, food, clamped).catch(() => pull(session));
      },

      viewAs(memberId) {
        if (!session?.demo) return;
        const next = { ...session, meId: memberId };
        AsyncStorage.setItem(SESSION, JSON.stringify(next));
        setSession(next);
      },

      async removeMeal(mealId) {
        if (!session) return;
        const meal = meals.find((m) => m.id === mealId);
        if (!meal || meal.memberId !== session.meId) return;
        await backendFor(session).deleteMeal(session.code, mealId);
        setMeals((list) => list.filter((m) => m.id !== mealId));
      },

      async deleteEverything(options) {
        if (session && !options?.onlyThisPhone) {
          await backendFor(session).deleteMe(session.code, session.meId);
        }
        await localBackend.clear();
        await AsyncStorage.multiRemove([SESSION, CHECKUP, PREFS]);
        await syncReminders({ on: false, nudges: false, times: DEFAULT_TIMES, ramadan: false, suhoorHour: 4, iftarHour: 18, doneToday: [] });
        prefsRef.current = DEFAULT_PREFS;
        setPrefsState(DEFAULT_PREFS);
        sessionRef.current = null;
        setSession(null);
        setFamily(null);
        setMeals([]);
        setCheers([]);
        setRecipes([]);
        setTicks([]);
        setCheckup(null);
      },

      async refresh() {
        await pull(session);
      },

      ticks,
      quest,
      questLive: (family?.members.filter((m) => m.joined).length ?? 0) >= 2,
      tickedToday,
      setQuest(id) {
        if (!session || !family || !questById(id)) return;
        setFamily({ ...family, quest: id });
        backendFor(session).setQuest(session.code, id).catch(() => pull(session));
      },
      tickQuest(on) {
        if (!session || !quest || quest.quest.how !== 'tick') return;
        const tick: Tick = { memberId: session.meId, day: todayKey, kind: quest.quest.id };
        setTicks((list) => [...list.filter((t) => !(t.memberId === tick.memberId && t.day === tick.day && t.kind === tick.kind)), ...(on ? [tick] : [])]);
        backendFor(session).setTick(session.code, tick, on).catch(() => pull(session));
      },
      claimCostume() {
        if (!session || !family || !quest?.finished) return;
        const key = `${weekKey()}:${quest.quest.id}`;
        savePrefs({ celebrated: [...prefsRef.current.celebrated.filter((k) => k !== key), key].slice(-60) });
        const costume = quest.quest.costume;
        if (family.costumes?.includes(costume)) return;
        setFamily({ ...family, costumes: [...(family.costumes ?? []), costume] });
        backendFor(session).addCostume(session.code, costume).catch(() => pull(session));
      },
      simple: prefs.simple ?? me?.role === 'parent',
      daysShared,
      onBreak: onBreak(prefs),
      async takeBreak(days) {
        const breakUntil = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
        const next = { ...prefsRef.current, breakUntil };
        const today = new Date();
        const doneToday = meals.filter((m) => m.memberId === session?.meId && sameDay(new Date(m.date), today)).map((m) => m.slot);
        savePrefs({ breakUntil });
        await syncReminders(planFor(next, doneToday, today));
      },
    };
  }, [ready, session, family, meals, cheers, recipes, ticks, pendingCode, checkupDate, prefs, pendingAction, news, pull, start]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { slotAt };
