import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudBackend, localBackend, webUrl } from './backend';
import { Backend, Family, Meal, Member, Photo, Role, Session } from './types';
import { MILESTONES, newId, newestFirst, slotAt } from './words';

const SESSION = 'amader.session';
const CHECKUP = 'amader.checkup';

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
  addMeal(photo: Photo | null, handfuls: number | null): Promise<Meal>;
  toggleHeart(mealId: string): void;
  setGoal(goalFood: string, goalHandfuls: number): void;
  /** Sample family only: look at the app as someone else. */
  viewAs(memberId: string): void;
  deleteEverything(): Promise<void>;
  refresh(): Promise<void>;
}

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

  const value = useMemo<Store>(() => {
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

      async addMeal(photo, handfuls) {
        if (!session) throw new Error('No family yet.');
        const now = new Date();
        const draft: Meal = { id: newId(), memberId: session.meId, date: now.toISOString(), slot: slotAt(now), photo: null, handfuls, hearts: [] };
        const saved = await backendFor(session).addMeal(session.code, draft, photo);
        setMeals((list) => newestFirst([saved, ...list.filter((m) => m.id !== saved.id)]));
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
        await AsyncStorage.multiRemove([SESSION, CHECKUP]);
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
  }, [ready, session, family, meals, pendingCode, checkupDate, pull, start]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
