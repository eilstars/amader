import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudBackend, localBackend, webUrl } from './backend';
import { ChosenBy, Backend, Family, Guess, Meal, Member, Photo, Role, Session } from './types';
import { syncReminders } from './reminders';
import { refreshWidgets } from './widgets';
import { MILESTONES, newId, newestFirst, sameDay, slotAt } from './words';

const SESSION = 'amader.session';
const CHECKUP = 'amader.checkup';
const PREFS = 'amader.prefs';

interface Prefs {
  /** Let food recognition look at my photos. */
  guessOn: boolean;
  reminderOn: boolean;
  reminderHour: number;
  /** Let Amader keep my photos and answers to improve recognition. Off unless the person turns it on. */
  improveOn: boolean;
}
const DEFAULT_PREFS: Prefs = { guessOn: true, reminderOn: false, reminderHour: 19, improveOn: false };

interface Store {
  ready: boolean;
  /** True when Supabase keys are set, so families sync across phones. */
  cloud: boolean;
  session: Session | null;
  family: Family | null;
  /** Newest first. */
  meals: Meal[];
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
  createFamily(input: { myName: string; parentName: string; goalFood: string; goalHandfuls: number }): Promise<void>;
  inviteInfo(code: string): Promise<{ parentName: string | null; fromName: string | null } | null>;
  joinFamily(input: { code: string; name: string; role: Role }): Promise<void>;
  loadDemo(): Promise<void>;
  addMeal(photo: Photo | null, handfuls: number | null, guess?: Guess | null, chosenBy?: ChosenBy): Promise<Meal>;
  /** Asks food recognition what is in the photo. Null when it is off or cannot tell. */
  recognize(photo: Photo): Promise<Guess | null>;
  prefs: Prefs;
  setGuessOn(on: boolean): void;
  /** Turning this off also takes back what was already shared. Resolves false if that failed. */
  setImproveOn(on: boolean): Promise<boolean>;
  /** Turns the daily reminder on or off. Resolves false if the phone refused. */
  setReminder(on: boolean, hour?: number): Promise<boolean>;
  /** Set by a widget, reminder or link that should open the camera or log a quick meal. */
  pendingAction: PendingAction | null;
  setPendingAction(action: PendingAction | null): void;
  toggleHeart(mealId: string): void;
  setGoal(goalFood: string, goalHandfuls: number): void;
  /** Sample family only: look at the app as someone else. */
  viewAs(memberId: string): void;
  deleteEverything(): Promise<void>;
  refresh(): Promise<void>;
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
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [checkupDate, setCheckup] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const pull = useCallback(async (s: Session | null) => {
    if (!s) return;
    const data = await backendFor(s).load(s.code);
    if (!data || sessionRef.current?.code !== s.code) return;
    setFamily(data.family);
    setMeals(newestFirst(data.meals));
  }, []);

  const start = useCallback(
    async (s: Session) => {
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
        if (savedPrefs) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(savedPrefs) as Partial<Prefs>) });
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

  // Keep reminders and widgets in step with what the family has shared.
  useEffect(() => {
    if (!ready || !session || !family) return;
    const today = new Date();
    const mine = meals.filter((m) => m.memberId === session.meId);
    const sharedToday = mine.some((m) => sameDay(new Date(m.date), today));
    syncReminders(prefs.reminderOn, prefs.reminderHour, sharedToday);
    refreshWidgets({ family, meals, meId: session.meId });
  }, [ready, session, family, meals, prefs.reminderOn, prefs.reminderHour]);

  const value = useMemo<Store>(() => {
    const savePrefs = (next: Prefs) => {
      setPrefs(next);
      AsyncStorage.setItem(PREFS, JSON.stringify(next));
    };

    const me = family?.members.find((m) => m.id === session?.meId) ?? null;
    const goalFood = family?.goalFood ?? 'Rice';
    const goalHandfuls = family?.goalHandfuls ?? 2;
    const myMealCount = meals.filter((m) => m.memberId === session?.meId).length;
    const nextMilestone = MILESTONES.find((n) => n > myMealCount) ?? (Math.floor(myMealCount / 100) + 1) * 100;
    const member = (id: string) => family?.members.find((m) => m.id === id);
    const parent = family?.members.find((m) => m.role === 'parent' && m.id !== me?.id);
    const link = webUrl && family ? `\n${webUrl}/?join=${family.code}` : '';
    const inviteMessage = family
      ? `${parent?.name ?? 'Hi'}, did you eat? I set up Amader for us. ${webUrl ? 'Tap the link' : 'Open the app'} and enter our family code ${family.code}, then send me a photo of your plate. I'll send mine too.${link}`
      : '';

    return {
      ready,
      cloud: !!cloudBackend,
      session,
      family,
      meals,
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
        if (meal.memberId === session?.meId) return `Your ${meal.slot}`;
        return `${member(meal.memberId)?.name ?? 'Someone'}'s ${meal.slot}`;
      },
      inviteMessage,

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
        await start(await localBackend.seedDemo());
      },

      prefs,
      setGuessOn(on) {
        savePrefs({ ...prefs, guessOn: on });
      },
      async setImproveOn(on) {
        if (!on && session) {
          try {
            await backendFor(session).removeExamples(session.meId);
          } catch {
            return false;
          }
        }
        savePrefs({ ...prefs, improveOn: on });
        return true;
      },
      async setReminder(on, hour) {
        const reminderHour = hour ?? prefs.reminderHour;
        if (!on) {
          savePrefs({ ...prefs, reminderOn: false, reminderHour });
          return true;
        }
        const today = new Date();
        const sharedToday = meals.some((m) => m.memberId === session?.meId && sameDay(new Date(m.date), today));
        const ok = await syncReminders(true, reminderHour, sharedToday);
        savePrefs({ ...prefs, reminderOn: ok, reminderHour });
        return ok;
      },
      pendingAction,
      setPendingAction,
      async recognize(photo) {
        if (!session || !prefs.guessOn) return null;
        // On this phone only there is no real recognition. Only the sample family shows a sample guess.
        if (backendFor(session).mode === 'local' && !session.demo) return null;
        return backendFor(session).recognize(photo, goalFood).catch(() => null);
      },

      async addMeal(photo, handfuls, guess, chosenBy = 'tap') {
        if (!session) throw new Error('No family yet.');
        const now = new Date();
        const draft: Meal = { id: newId(), memberId: session.meId, date: now.toISOString(), slot: slotAt(now), photo: null, handfuls, hearts: [], dish: guess?.dish || null, parts: guess?.parts ?? null };
        const saved = await backendFor(session).addMeal(session.code, draft, photo);
        setMeals((list) => newestFirst([saved, ...list.filter((m) => m.id !== saved.id)]));
        if (photo && prefs.improveOn && !session.demo) {
          // Never holds up saving the meal.
          backendFor(session)
            .saveExample({ mealId: saved.id, memberId: session.meId, code: session.code, goalFood, guess: guess && !guess.sample ? guess : null, handfuls, chosenBy })
            .catch(() => undefined);
        }
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

      async deleteEverything() {
        if (session) {
          await backendFor(session).deleteMe(session.code, session.meId).catch(() => undefined);
        }
        await localBackend.clear();
        await AsyncStorage.multiRemove([SESSION, CHECKUP, PREFS]);
        await syncReminders(false, 19, false);
        setPrefs(DEFAULT_PREFS);
        sessionRef.current = null;
        setSession(null);
        setFamily(null);
        setMeals([]);
        setCheckup(null);
      },

      async refresh() {
        await pull(session);
      },
    };
  }, [ready, session, family, meals, pendingCode, checkupDate, prefs, pendingAction, pull, start]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
