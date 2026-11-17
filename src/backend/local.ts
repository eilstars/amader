import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backend, Family, Meal, Member, Photo, Session } from '../types';
import { newId } from '../words';

const FAMILY = 'amader.family';
const MEALS = 'amader.meals';
const PHOTO = 'amader.photo.';
/** Phone storage is small, so only the newest photos are kept in this mode. */
const KEEP_PHOTOS = 30;

async function read<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function write(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newCode(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

/** Keeps everything on this phone. Used until Supabase keys are added, and for the sample family. */
export const localBackend: Backend & { seedDemo(): Promise<Session>; clear(): Promise<void> } = {
  mode: 'local',

  async createFamily({ myName, parentName, goalFood, goalHandfuls }) {
    const me: Member = { id: newId(), name: myName, role: 'child', tint: 1, joined: true };
    const parent: Member = { id: newId(), name: parentName, role: 'parent', tint: 0, joined: false };
    const family: Family = { code: newCode(), members: [parent, me], goalFood, goalHandfuls };
    await write(FAMILY, family);
    await write(MEALS, []);
    return { code: family.code, meId: me.id };
  },

  async inviteInfo() {
    // Without a server there is nothing to look up. The person types their own name.
    return { parentName: null, fromName: null };
  },

  async joinFamily({ code, name, role }) {
    const me: Member = { id: newId(), name, role, tint: role === 'parent' ? 0 : 1, joined: true };
    const family: Family = { code, members: [me], goalFood: 'Rice', goalHandfuls: 2 };
    await write(FAMILY, family);
    await write(MEALS, []);
    return { code, meId: me.id };
  },

  async load() {
    const family = await read<Family>(FAMILY);
    if (!family) return null;
    const meals = (await read<Meal[]>(MEALS)) ?? [];
    const withPhotos = meals.filter((m) => m.photo === 'stored');
    if (withPhotos.length) {
      const pairs = await AsyncStorage.multiGet(withPhotos.map((m) => PHOTO + m.id));
      const byId = new Map(pairs.map(([key, value]) => [key.slice(PHOTO.length), value]));
      return { family, meals: meals.map((m) => (m.photo === 'stored' ? { ...m, photo: byId.get(m.id) ?? null } : m)) };
    }
    return { family, meals };
  },

  async addMeal(_code, meal, photo: Photo | null) {
    const meals = (await read<Meal[]>(MEALS)) ?? [];
    let shown: string | null = null;
    let stored: string | null = null;
    if (photo) {
      shown = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
      try {
        await AsyncStorage.setItem(PHOTO + meal.id, shown);
        stored = 'stored';
      } catch {
        stored = null; // Storage is full. The meal is still saved without its photo.
      }
    }
    meals.push({ ...meal, photo: stored });
    const old = meals.filter((m) => m.photo === 'stored').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(KEEP_PHOTOS);
    for (const m of old) {
      m.photo = null;
      await AsyncStorage.removeItem(PHOTO + m.id);
    }
    await write(MEALS, meals);
    return { ...meal, photo: shown };
  },

  async recognize() {
    // Recognition runs on the server so the API key never ships in the app.
    // On this phone only, show a clearly labelled sample so the flow can be seen.
    await new Promise((done) => setTimeout(done, 900));
    return { dish: 'Dal, rice and sabzi', parts: { grain: 40, veg: 35, protein: 15, other: 10 }, amount: 2, sample: true };
  },

  async setHeart(mealId, memberId, on) {
    const meals = (await read<Meal[]>(MEALS)) ?? [];
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    meal.hearts = meal.hearts.filter((id) => id !== memberId);
    if (on) meal.hearts.push(memberId);
    await write(MEALS, meals);
  },

  async setGoal(_code, goalFood, goalHandfuls) {
    const family = await read<Family>(FAMILY);
    if (!family) return;
    await write(FAMILY, { ...family, goalFood, goalHandfuls });
  },

  async deleteMe() {
    await this.clear();
  },

  async clear() {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k === FAMILY || k === MEALS || k.startsWith(PHOTO)));
  },

  /** A made-up family with two weeks of meals, for showing the app. */
  async seedDemo() {
    await this.clear();
    const ammi: Member = { id: newId(), name: 'Ammi', role: 'parent', tint: 0, joined: true };
    const nadia: Member = { id: newId(), name: 'Nadia', role: 'child', tint: 1, joined: true };
    const tanvir: Member = { id: newId(), name: 'Tanvir', role: 'child', tint: 2, joined: true };
    const family: Family = { code: 'SAMPLE', members: [ammi, nadia, tanvir], goalFood: 'Rice', goalHandfuls: 2 };
    const meals: Meal[] = [];
    const now = new Date();
    const at = (back: number, hour: number, minute: number) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, hour, minute).toISOString();
    const ammiHandfuls = [2, 2, 3, 2, 2, 1, 2, 3, 2, 2, 2, 4, 2, 2];
    const dishes: [string, Meal['parts']][] = [
      ['Dal, rice and sabzi', { grain: 40, veg: 40, protein: 10, other: 10 }],
      ['Chicken biryani', { grain: 60, veg: 5, protein: 30, other: 5 }],
      ['Fish curry and rice', { grain: 45, veg: 15, protein: 35, other: 5 }],
      ['Khichdi', { grain: 55, veg: 35, protein: 5, other: 5 }],
      ['Roti, sabzi and dal', { grain: 35, veg: 50, protein: 10, other: 5 }],
    ];
    const dish = (i: number) => ({ dish: dishes[i % dishes.length][0], parts: dishes[i % dishes.length][1] });
    for (let back = 1; back <= 13; back++) {
      if (back !== 5) {
        meals.push({ id: newId(), memberId: ammi.id, date: at(back, 20, 10), slot: 'dinner', photo: null, handfuls: ammiHandfuls[back], hearts: back % 2 === 0 ? [nadia.id, tanvir.id] : [nadia.id], ...dish(back) });
      }
      if (back !== 3 && back !== 9) {
        meals.push({ id: newId(), memberId: nadia.id, date: at(back, 12, 30), slot: 'lunch', photo: null, handfuls: back % 3 === 0 ? 1 : 2, hearts: [ammi.id], ...dish(back + 2) });
      }
      if (back % 3 !== 0) {
        meals.push({ id: newId(), memberId: tanvir.id, date: at(back, 19, 40), slot: 'dinner', photo: null, handfuls: 3, hearts: back % 4 === 0 ? [ammi.id] : [], ...dish(back + 3) });
      }
    }
    const breakfast = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 15);
    if (breakfast < now) {
      meals.push({ id: newId(), memberId: tanvir.id, date: breakfast.toISOString(), slot: 'breakfast', photo: null, handfuls: 0, hearts: [] });
    }
    await write(FAMILY, family);
    await write(MEALS, meals);
    return { code: family.code, meId: nadia.id, demo: true };
  },
};
