import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backend, Cheer, Family, Meal, Member, Photo, Recipe, Session, Voice } from '../types';
import { CODE_LENGTH, newId } from '../words';

const FAMILY = 'amader.family';
const MEALS = 'amader.meals';
const PHOTO = 'amader.photo.';
const CHEERS = 'amader.cheers';
const RECIPES = 'amader.recipes';
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
  return Array.from({ length: CODE_LENGTH }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

/** Keeps everything on this phone. Used until Supabase keys are added, and for the sample family. */
export const localBackend: Backend & { seedDemo(): Promise<Session>; clear(): Promise<void> } = {
  mode: 'local',

  async createFamily({ myName, parentName, goalFood, goalHandfuls, myRole }) {
    const me: Member = { id: newId(), name: myName, role: myRole ?? 'child', tint: 1, joined: true };
    const parent: Member = { id: newId(), name: parentName, role: 'parent', tint: 0, joined: false };
    const family: Family = { code: newCode(), members: [parent, me], goalFood, goalHandfuls };
    await write(FAMILY, family);
    await write(MEALS, []);
    await write(CHEERS, []);
    await write(RECIPES, []);
    return { code: family.code, meId: me.id };
  },

  async inviteInfo() {
    // Without a server there is nothing to look up. The person types their own name.
    return { parentName: null, fromName: null, waiting: [] };
  },

  async addPerson(_code, name) {
    const family = await read<Family>(FAMILY);
    if (!family) throw new Error('No family yet.');
    const person: Member = { id: newId(), name, role: 'parent', tint: family.members.length % 4, joined: false };
    family.members.push(person);
    await write(FAMILY, family);
    return person;
  },

  // On this phone only there is no one else to tell.
  async savePushToken() {},
  async notifyFamily() {},

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
    let meals = (await read<Meal[]>(MEALS)) ?? [];
    const cheers = (await read<Cheer[]>(CHEERS)) ?? [];
    const recipes = (await read<Recipe[]>(RECIPES)) ?? [];
    const withPhotos = meals.filter((m) => m.photo === 'stored');
    if (withPhotos.length) {
      const pairs = await AsyncStorage.multiGet(withPhotos.map((m) => PHOTO + m.id));
      const byId = new Map(pairs.map(([key, value]) => [key.slice(PHOTO.length), value]));
      meals = meals.map((m) => (m.photo === 'stored' ? { ...m, photo: byId.get(m.id) ?? null } : m));
    }
    return { family, meals, cheers, recipes };
  },

  async addMeal(_code, meal, photo: Photo | null, voice: Voice | null) {
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
    const saved = { ...meal, voice: voice?.uri ?? null };
    meals.push({ ...saved, photo: stored });
    const old = meals.filter((m) => m.photo === 'stored').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(KEEP_PHOTOS);
    for (const m of old) {
      m.photo = null;
      await AsyncStorage.removeItem(PHOTO + m.id);
    }
    await write(MEALS, meals);
    return { ...saved, photo: shown };
  },

  async recognize(_photo, _food, party) {
    // Recognition runs on the server so the API key never ships in the app.
    // On this phone only, show a clearly labelled sample so the flow can be seen.
    await new Promise((done) => setTimeout(done, 900));
    if (party) {
      return {
        dish: 'Dawat plate',
        parts: { grain: 45, veg: 15, protein: 30, other: 10 },
        amount: 3,
        protein: 2,
        veg: 1,
        items: ['Chicken biryani', 'Shami kabab', 'Raita', 'Salad', 'Firni'],
        sample: true,
      };
    }
    return { dish: 'Dal, rice and sabzi', parts: { grain: 40, veg: 35, protein: 15, other: 10 }, amount: 2, protein: 1, veg: 1, sample: true };
  },

  async setHeart(mealId, memberId, on) {
    const meals = (await read<Meal[]>(MEALS)) ?? [];
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    meal.hearts = meal.hearts.filter((id) => id !== memberId);
    if (on) meal.hearts.push(memberId);
    await write(MEALS, meals);
  },

  async sendCheer(_code, cheer) {
    const cheers = (await read<Cheer[]>(CHEERS)) ?? [];
    cheers.push(cheer);
    await write(CHEERS, cheers);
  },

  async addRecipe(_code, recipe, photo, voice) {
    const recipes = (await read<Recipe[]>(RECIPES)) ?? [];
    const saved: Recipe = {
      ...recipe,
      photo: photo ? (photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri) : null,
      voice: voice?.uri ?? null,
    };
    recipes.push(saved);
    try {
      await write(RECIPES, recipes);
    } catch {
      // Phone storage is full: keep the words, drop the picture.
      recipes[recipes.length - 1] = { ...saved, photo: null };
      await write(RECIPES, recipes);
    }
    return saved;
  },

  async deleteRecipe(_code, recipeId) {
    const recipes = (await read<Recipe[]>(RECIPES)) ?? [];
    await write(RECIPES, recipes.filter((r) => r.id !== recipeId));
  },

  async setGoal(_code, goalFood, goalHandfuls) {
    const family = await read<Family>(FAMILY);
    if (!family) return;
    await write(FAMILY, { ...family, goalFood, goalHandfuls });
  },

  async saveExample() {
    // Nothing leaves this phone in on-phone mode.
  },

  async removeExamples() {},

  async deleteMeal(_code, mealId) {
    const meals = (await read<Meal[]>(MEALS)) ?? [];
    await write(MEALS, meals.filter((m) => m.id !== mealId));
    await AsyncStorage.removeItem(PHOTO + mealId);
  },

  async deleteMe() {
    await this.clear();
  },

  async clear() {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k === FAMILY || k === MEALS || k === CHEERS || k === RECIPES || k.startsWith(PHOTO)));
  },

  /** A made-up family with three weeks of meals, notes and a recipe, for showing the app. */
  async seedDemo() {
    await this.clear();
    const ammi: Member = { id: newId(), name: 'Ammi', role: 'parent', tint: 0, joined: true };
    const nadia: Member = { id: newId(), name: 'Nadia', role: 'child', tint: 1, joined: true };
    const tanvir: Member = { id: newId(), name: 'Tanvir', role: 'child', tint: 2, joined: true };
    const abbu: Member = { id: newId(), name: 'Abbu', role: 'parent', tint: 3, joined: true };
    const family: Family = { code: 'SAMPLE24', members: [ammi, abbu, nadia, tanvir], goalFood: 'Rice', goalHandfuls: 2 };
    const meals: Meal[] = [];
    const now = new Date();
    const at = (back: number, hour: number, minute: number) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, hour, minute).toISOString();
    type Dish = [string, number, number, number, Meal['parts'], number?, number?];
    const dishes: Dish[] = [
      ['Dal, rice and sabzi', 2, 1, 2, { grain: 40, veg: 40, protein: 10, other: 10 }, 0, 1],
      ['Chicken biryani', 3, 1, 0, { grain: 60, veg: 5, protein: 30, other: 5 }],
      ['Fish curry and rice', 2, 1, 1, { grain: 45, veg: 15, protein: 35, other: 5 }],
      ['Khichdi with salad', 2, 1, 2, { grain: 50, veg: 35, protein: 10, other: 5 }],
      ['Roti, sabzi and dal', 1, 1, 2, { grain: 30, veg: 50, protein: 15, other: 5 }, 1, 1],
      ['Bhuna khichuri and egg', 3, 1, 1, { grain: 55, veg: 15, protein: 25, other: 5 }],
      ['Pasta with chicken and salad', 2, 1, 2, { grain: 40, veg: 35, protein: 20, other: 5 }],
      ['Eggs on toast', 1, 1, 0, { grain: 45, veg: 0, protein: 45, other: 10 }, 1, 1],
    ];
    const meal = (who: Member, back: number, hour: number, slot: Meal['slot'], i: number, extra: Partial<Meal> = {}): Meal => {
      const [dish, g, p, v, parts, fruit = 0, dairy = 0] = dishes[i % dishes.length];
      const grain = /Roti/.test(dish) ? 'Roti' : /Pasta/.test(dish) ? 'Pasta' : /toast/.test(dish) ? 'Bread' : 'Rice';
      return { id: newId(), memberId: who.id, date: at(back, hour, (i * 7) % 60), slot, photo: null, handfuls: g, protein: p, veg: v, fruit, dairy, hearts: [], dish, parts, grain, ...extra };
    };
    for (let back = 0; back <= 20; back++) {
      // Ammi: dinner almost every day, the streak runs back 12 days.
      if (back <= 12 || back % 3 !== 0) {
        const m = meal(ammi, back, 20, 'dinner', back, { hearts: back % 2 === 0 ? [nadia.id, tanvir.id] : [nadia.id] });
        if (back === 2) Object.assign(m, { withIds: [abbu.id, nadia.id], note: 'Nadia came home for dinner!' });
        if (back === 1) {
          // Dinner at home together: Ammi shares one plate, Abbu says "I ate this too" with his own portion.
          Object.assign(m, { withIds: [abbu.id, nadia.id], note: 'Dinner at home, all of us' });
          meals.push({ ...meal(abbu, back, 20, 'dinner', back), date: at(back, 20, 40), dish: m.dish, sameAs: m.id, withIds: [ammi.id, nadia.id], handfuls: 3, protein: 1, veg: 1, hearts: [] });
        }
        if (back === 0 && now.getHours() < 20) continue;
        meals.push(m);
      }
      if (back % 2 === 0 && back > 0) meals.push(meal(abbu, back, 13, 'lunch', back + 1, { hearts: [ammi.id] }));
      if (back !== 3 && back !== 9 && back > 0) meals.push(meal(nadia, back, 12, 'lunch', back + 4, { hearts: [ammi.id] }));
      if (back % 3 !== 0 && back > 0) meals.push(meal(tanvir, back, 19, 'dinner', back + 2, { hearts: back % 4 === 0 ? [ammi.id] : [] }));
      if (back === 4) meals.push(meal(ammi, back, 16, 'snack', 0, { dish: 'Chai and two biscuits', handfuls: 0, protein: 0, veg: 0, parts: null, note: 'With Shila Auntie', withOthers: 'Shila Auntie' }));
      if (back === 6) meals.push(meal(tanvir, back, 21, 'dinner', 1, { dish: 'Wedding dawat', party: true, handfuls: 3, protein: 2, veg: 0, note: "Rafi bhai's walima" }));
    }
    // Comments on meals: a note sent on a meal shows under it.
    const lastDinner = meals.find((m) => m.memberId === ammi.id && m.slot === 'dinner');
    const comments: Cheer[] = lastDinner
      ? [
          { id: newId(), fromId: tanvir.id, toId: ammi.id, text: 'So much sabzi! Proud of you', date: new Date(new Date(lastDinner.date).getTime() + 20 * 60000).toISOString(), mealId: lastDinner.id },
          { id: newId(), fromId: ammi.id, toId: tanvir.id, text: 'Your Abbu cooked it', date: new Date(new Date(lastDinner.date).getTime() + 35 * 60000).toISOString(), mealId: lastDinner.id },
        ]
      : [];
    const cheers: Cheer[] = [
      ...comments,
      { id: newId(), fromId: nadia.id, toId: ammi.id, text: "You're doing great, Ammi! 12 days in a row.", date: at(0, 9, 5) },
      { id: newId(), fromId: tanvir.id, toId: ammi.id, text: 'That fish curry looked so good. Save me some?', date: at(1, 21, 0) },
      { id: newId(), fromId: ammi.id, toId: nadia.id, text: 'Eat properly, not just coffee!', date: at(2, 8, 30) },
    ];
    const recipes: Recipe[] = [
      {
        id: newId(),
        addedBy: nadia.id,
        title: 'Nani\'s bhuna khichuri',
        from: 'Nani',
        ingredients: '2 cups rice\n1 cup moong dal\n1 onion, sliced\n2 green chillies\n1 tsp turmeric\nGhee\nSalt',
        steps: 'Dry roast the moong dal until it smells nutty.\nWash the rice and dal together.\nFry the onion in ghee until golden, add chillies and turmeric.\nAdd rice and dal, fry for two minutes.\nAdd four cups of hot water and salt. Cover and cook on low.',
        story: 'Nani made this every time it rained in Sylhet. Ammi says the secret is roasting the dal properly.',
        photo: null,
        voice: null,
        date: at(5, 18, 0),
      },
    ];
    await write(FAMILY, family);
    await write(MEALS, meals);
    await write(CHEERS, cheers);
    await write(RECIPES, recipes);
    return { code: family.code, meId: nadia.id, demo: true };
  },
};
