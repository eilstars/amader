import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Backend, Cheer, Family, Guess, Meal, Member, Parts, Recipe, Role, Slot, Tick, Voice } from '../types';
import { unitWord } from '../words';

const BUCKET = 'meal-photos';
const VOICE = 'meal-voice';

type MemberRow = { id: string; name: string; role: Role; tint: number; joined: boolean; created_at: string };
type MealRow = {
  id: string;
  member_id: string;
  eaten_at: string;
  slot: Slot;
  photo_url: string | null;
  handfuls: number | null;
  protein: number | null;
  veg: number | null;
  fruit: number | null;
  dairy: number | null;
  dish: string | null;
  parts: Parts | null;
  note: string | null;
  voice_url: string | null;
  with_ids: string[] | null;
  with_others: string | null;
  party: boolean | null;
  grain: string | null;
  same_as: string | null;
  hearts: { member_id: string }[] | null;
};
type CheerRow = { id: string; from_id: string; to_id: string; meal_id: string | null; text: string; created_at: string };
type RecipeRow = { id: string; added_by: string; title: string; from_whom: string; ingredients: string; steps: string; story: string | null; photo_url: string | null; voice_url: string | null; created_at: string };

function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let out = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? chars.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? chars.indexOf(clean[i + 3]) : -1;
    bytes[out++] = (a << 2) | (b >> 4);
    if (c >= 0) bytes[out++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) bytes[out++] = ((c & 3) << 6) | d;
  }
  return bytes.subarray(0, out);
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/**
 * The real backend. Families on different phones see each other.
 * Nobody makes an account: each phone signs in anonymously, and the
 * database only shows a phone the families it has joined (see supabase/schema.sql).
 */
export function makeSupabaseBackend(url: string, anonKey: string): Backend {
  const db: SupabaseClient = createClient(url, anonKey, {
    auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  async function signedIn() {
    const { data } = await db.auth.getSession();
    if (data.session) return;
    const { error } = await db.auth.signInAnonymously();
    fail(error);
  }

  // Photos are private. The app asks for short-lived links and reuses them until they are close to running out,
  // so the feed does not reload every picture each time it refreshes.
  const links = new Map<string, { url: string; until: number }>();
  const LINK_SECONDS = 3600;

  /** The saved value is a file path. Older rows saved a full public address, so cut the path out of those. */
  function pathOf(saved: string): string {
    for (const bucket of [BUCKET, VOICE]) {
      const mark = `/${bucket}/`;
      const at = saved.indexOf(mark);
      if (at >= 0) return saved.slice(at + mark.length).split('?')[0];
    }
    return saved;
  }

  async function sign(paths: string[], bucket = BUCKET): Promise<void> {
    const now = Date.now();
    const need = [...new Set(paths)].filter((p) => (links.get(bucket + ':' + p)?.until ?? 0) < now + 5 * 60_000);
    if (!need.length) return;
    const { data } = await db.storage.from(bucket).createSignedUrls(need, LINK_SECONDS);
    (data ?? []).forEach((row) => {
      if (row.path && row.signedUrl) links.set(bucket + ':' + row.path, { url: row.signedUrl, until: now + LINK_SECONDS * 1000 });
    });
  }
  const linkOf = (saved: string | null, bucket = BUCKET) => (saved ? (links.get(bucket + ':' + pathOf(saved))?.url ?? null) : null);

  /** Voice notes are recorded as m4a on phones and webm in browsers. Both are stored under .m4a so the rules can check the name. */
  async function uploadVoice(path: string, voice: Voice) {
    const blob = await (await fetch(voice.uri)).blob();
    const type = blob.type && blob.type.startsWith('audio/') ? blob.type : 'audio/mp4';
    const up = await db.storage.from(VOICE).upload(path, blob, { contentType: type, upsert: false });
    fail(up.error);
  }

  async function uploadPhoto(path: string, photo: { uri: string; base64: string | null }) {
    const body = photo.base64 ? base64ToBytes(photo.base64) : await (await fetch(photo.uri)).arrayBuffer();
    const up = await db.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
    fail(up.error);
  }

  // Each family's photos sit in a folder with a random name, separate from the family code.
  const folders = new Map<string, string>();
  async function folderOf(code: string): Promise<string> {
    const known = folders.get(code);
    if (known) return known;
    const { data, error } = await db.from('families').select('folder').eq('code', code).maybeSingle();
    fail(error);
    if (!data?.folder) throw new Error('We could not find your family table.');
    folders.set(code, data.folder as string);
    return data.folder as string;
  }

  return {
    mode: 'cloud',

    async createFamily({ myName, parentName, goalFood, goalHandfuls }) {
      await signedIn();
      const { data, error } = await db.rpc('create_family', {
        p_my_name: myName,
        p_parent_name: parentName,
        p_goal_food: goalFood,
        p_goal_handfuls: goalHandfuls,
      });
      fail(error);
      return { code: data.code as string, meId: data.me_id as string };
    },

    async inviteInfo(code) {
      await signedIn();
      const { data, error } = await db.rpc('invite_info', { p_code: code });
      fail(error);
      if (!data) return null;
      return { parentName: (data.parent_name as string) ?? null, fromName: (data.from_name as string) ?? null, waiting: ((data.waiting as string[] | null) ?? []).filter(Boolean) };
    },

    async addPerson(code, name) {
      await signedIn();
      const { data, error } = await db.rpc('add_person', { p_code: code, p_name: name });
      fail(error);
      const row = data as MemberRow;
      return { id: row.id, name: row.name, role: row.role, tint: row.tint, joined: row.joined };
    },

    async savePushToken(_code, meId, token) {
      await signedIn();
      const { error } = await db.rpc('save_push_token', { p_member: meId, p_token: token });
      fail(error);
    },

    async notifyFamily(_code, event) {
      // Best effort: a meal is saved whether or not the family hears about it right away.
      try {
        await signedIn();
        await db.functions.invoke('notify-family', { body: event.kind === 'meal' ? { meal_id: event.mealId } : { cheer_id: event.cheerId } });
      } catch {
        // ignore
      }
    },

    async joinFamily({ code, name, role }) {
      await signedIn();
      const { data, error } = await db.rpc('join_family', { p_code: code, p_name: name, p_role: role });
      fail(error);
      if (!data) throw new Error('We could not find that family code.');
      return { code: data.code as string, meId: data.me_id as string };
    },

    async load(code) {
      await signedIn();
      const fam = await db.from('families').select('code, goal_food, goal_handfuls, folder, quest, costumes').eq('code', code).maybeSingle();
      fail(fam.error);
      if (!fam.data) return null;
      folders.set(code, fam.data.folder as string);
      const mem = await db.from('members').select('id, name, role, tint, joined, created_at').eq('family_code', code).order('created_at');
      fail(mem.error);
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
      const tickSince = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10);
      const [mealRows, cheerRows, recipeRows, tickRows] = await Promise.all([
        db
          .from('meals')
          .select('id, member_id, eaten_at, slot, photo_url, handfuls, protein, veg, fruit, dairy, dish, parts, note, voice_url, with_ids, with_others, party, grain, same_as, hearts(member_id)')
          .eq('family_code', code)
          .gte('eaten_at', since)
          .order('eaten_at', { ascending: false }),
        db.from('cheers').select('id, from_id, to_id, meal_id, text, created_at').eq('family_code', code).gte('created_at', since).order('created_at', { ascending: false }),
        db.from('recipes').select('id, added_by, title, from_whom, ingredients, steps, story, photo_url, voice_url, created_at').eq('family_code', code).order('created_at', { ascending: false }),
        db.from('ticks').select('member_id, day, kind').eq('family_code', code).gte('day', tickSince),
      ]);
      fail(tickRows.error);
      const ticks: Tick[] = ((tickRows.data ?? []) as { member_id: string; day: string; kind: string }[]).map((t) => ({ memberId: t.member_id, day: t.day, kind: t.kind }));
      fail(mealRows.error);
      fail(cheerRows.error);
      fail(recipeRows.error);
      const members: Member[] = ((mem.data ?? []) as MemberRow[]).map((m) => ({ id: m.id, name: m.name, role: m.role, tint: m.tint, joined: m.joined }));
      const family: Family = { code: fam.data.code, members, goalFood: fam.data.goal_food, goalHandfuls: fam.data.goal_handfuls, quest: (fam.data.quest as string | null) ?? null, costumes: (fam.data.costumes as string[] | null) ?? [] };
      const rows = (mealRows.data ?? []) as unknown as MealRow[];
      const recipeList = (recipeRows.data ?? []) as RecipeRow[];
      await Promise.all([
        sign([...rows.filter((m) => m.photo_url).map((m) => pathOf(m.photo_url as string)), ...recipeList.filter((r) => r.photo_url).map((r) => pathOf(r.photo_url as string))]),
        sign([...rows.filter((m) => m.voice_url).map((m) => pathOf(m.voice_url as string)), ...recipeList.filter((r) => r.voice_url).map((r) => pathOf(r.voice_url as string))], VOICE),
      ]);
      const meals: Meal[] = rows.map((m) => ({
        id: m.id,
        memberId: m.member_id,
        date: m.eaten_at,
        slot: m.slot,
        photo: linkOf(m.photo_url),
        handfuls: m.handfuls,
        protein: m.protein,
        veg: m.veg,
        fruit: m.fruit,
        dairy: m.dairy,
        dish: m.dish,
        parts: m.parts,
        note: m.note,
        voice: linkOf(m.voice_url, VOICE),
        withIds: m.with_ids ?? [],
        withOthers: m.with_others,
        party: !!m.party,
        grain: m.grain,
        sameAs: m.same_as,
        hearts: (m.hearts ?? []).map((h) => h.member_id),
      }));
      const cheers: Cheer[] = ((cheerRows.data ?? []) as CheerRow[]).map((c) => ({ id: c.id, fromId: c.from_id, toId: c.to_id, mealId: c.meal_id, text: c.text, date: c.created_at }));
      const recipes: Recipe[] = recipeList.map((r) => ({
        id: r.id,
        addedBy: r.added_by,
        title: r.title,
        from: r.from_whom,
        ingredients: r.ingredients,
        steps: r.steps,
        story: r.story,
        photo: linkOf(r.photo_url),
        voice: linkOf(r.voice_url, VOICE),
        date: r.created_at,
      }));
      return { family, meals, cheers, recipes, ticks };
    },

    async setQuest(code, quest) {
      await signedIn();
      const { error } = await db.from('families').update({ quest }).eq('code', code);
      fail(error);
    },

    async addCostume(code, costume) {
      await signedIn();
      const { data, error } = await db.from('families').select('costumes').eq('code', code).maybeSingle();
      fail(error);
      const have = ((data?.costumes as string[] | null) ?? []);
      if (have.includes(costume)) return;
      const up = await db.from('families').update({ costumes: [...have, costume] }).eq('code', code);
      fail(up.error);
    },

    async setTick(code, tick, on) {
      await signedIn();
      if (on) {
        const { error } = await db.from('ticks').insert({ family_code: code, member_id: tick.memberId, day: tick.day, kind: tick.kind });
        if (error && error.code !== '23505') fail(error);
      } else {
        const { error } = await db.from('ticks').delete().eq('member_id', tick.memberId).eq('day', tick.day).eq('kind', tick.kind);
        fail(error);
      }
    },

    async addMeal(code, meal, photo, voice) {
      await signedIn();
      const folder = await folderOf(code);
      let photoPath: string | null = null;
      let voicePath: string | null = null;
      if (photo) {
        photoPath = `${folder}/${meal.id}.jpg`;
        await uploadPhoto(photoPath, photo);
        await sign([photoPath]);
      }
      if (voice) {
        voicePath = `${folder}/${meal.id}.m4a`;
        await uploadVoice(voicePath, voice);
        await sign([voicePath], VOICE);
      }
      const { error } = await db.from('meals').insert({
        id: meal.id,
        family_code: code,
        member_id: meal.memberId,
        eaten_at: meal.date,
        slot: meal.slot,
        photo_url: photoPath,
        handfuls: meal.handfuls,
        protein: meal.protein ?? null,
        veg: meal.veg ?? null,
        fruit: meal.fruit ?? null,
        dairy: meal.dairy ?? null,
        dish: meal.dish ?? null,
        parts: meal.parts ?? null,
        note: meal.note ?? null,
        voice_url: voicePath,
        with_ids: meal.withIds ?? [],
        with_others: meal.withOthers ?? null,
        party: !!meal.party,
        grain: meal.grain ?? null,
        same_as: meal.sameAs ?? null,
      });
      fail(error);
      return { ...meal, photo: photoPath ? (linkOf(photoPath) ?? photo?.uri ?? null) : null, voice: voicePath ? (linkOf(voicePath, VOICE) ?? voice?.uri ?? null) : null };
    },

    async sendCheer(code, cheer) {
      await signedIn();
      const { error } = await db.from('cheers').insert({ id: cheer.id, family_code: code, from_id: cheer.fromId, to_id: cheer.toId, meal_id: cheer.mealId ?? null, text: cheer.text });
      fail(error);
    },

    async addRecipe(code, recipe, photo, voice) {
      await signedIn();
      const folder = await folderOf(code);
      const photoPath = photo ? `${folder}/recipes/${recipe.id}.jpg` : null;
      const voicePath = voice ? `${folder}/recipes/${recipe.id}.m4a` : null;
      if (photo && photoPath) await uploadPhoto(photoPath, photo);
      if (voice && voicePath) await uploadVoice(voicePath, voice);
      const { error } = await db.from('recipes').insert({
        id: recipe.id,
        family_code: code,
        added_by: recipe.addedBy,
        title: recipe.title,
        from_whom: recipe.from,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        story: recipe.story ?? null,
        photo_url: photoPath,
        voice_url: voicePath,
      });
      fail(error);
      if (photoPath) await sign([photoPath]);
      if (voicePath) await sign([voicePath], VOICE);
      return { ...recipe, photo: photoPath ? linkOf(photoPath) : null, voice: voicePath ? linkOf(voicePath, VOICE) : null };
    },

    async deleteRecipe(code, recipeId) {
      await signedIn();
      const folder = await folderOf(code);
      await db.storage.from(BUCKET).remove([`${folder}/recipes/${recipeId}.jpg`]);
      await db.storage.from(VOICE).remove([`${folder}/recipes/${recipeId}.m4a`]);
      const { error } = await db.from('recipes').delete().eq('id', recipeId);
      fail(error);
    },

    async recognize(photo, goalFood, party) {
      if (!photo.base64) return null;
      await signedIn();
      const { data, error } = await db.functions.invoke('recognize-meal', {
        body: { image: photo.base64, goal_food: goalFood, unit: unitWord(goalFood), party: !!party },
      });
      if (error || !data?.guess) return null;
      return data.guess as Guess;
    },

    async setHeart(mealId, memberId, on) {
      await signedIn();
      if (on) {
        const { error } = await db.from('hearts').insert({ meal_id: mealId, member_id: memberId });
        // 23505 means the heart is already there, which is fine.
        if (error && error.code !== '23505') fail(error);
      } else {
        const { error } = await db.from('hearts').delete().eq('meal_id', mealId).eq('member_id', memberId);
        fail(error);
      }
    },

    async setGoal(code, goalFood, goalHandfuls) {
      await signedIn();
      const { error } = await db.from('families').update({ goal_food: goalFood, goal_handfuls: goalHandfuls }).eq('code', code);
      fail(error);
    },

    async saveExample(example) {
      await signedIn();
      const { error } = await db.from('examples').insert({
        meal_id: example.mealId,
        member_id: example.memberId,
        photo_path: `${await folderOf(example.code)}/${example.mealId}.jpg`,
        goal_food: example.goalFood,
        guess: example.guess,
        handfuls: example.handfuls,
        chosen_by: example.chosenBy,
      });
      if (error && error.code !== '23505') fail(error);
    },

    async removeExamples(meId) {
      await signedIn();
      const { error } = await db.from('examples').delete().eq('member_id', meId);
      fail(error);
    },

    async deleteMeal(code, mealId) {
      await signedIn();
      // The photo goes first. If that fails the meal stays, so nothing is left behind without its owner.
      const folder = await folderOf(code);
      const gone = await db.storage.from(BUCKET).remove([`${folder}/${mealId}.jpg`]);
      fail(gone.error);
      const quiet = await db.storage.from(VOICE).remove([`${folder}/${mealId}.m4a`]);
      fail(quiet.error);
      const { error } = await db.from('meals').delete().eq('id', mealId);
      fail(error);
    },

    async deleteMe(_code, meId) {
      await signedIn();
      const mine = await db.from('meals').select('id, photo_url, voice_url').eq('member_id', meId);
      fail(mine.error);
      const recipes = await db.from('recipes').select('id, photo_url, voice_url').eq('added_by', meId);
      fail(recipes.error);
      const rows = [...(mine.data ?? []), ...(recipes.data ?? [])] as { photo_url: string | null; voice_url: string | null }[];
      const photos = rows.filter((m) => m.photo_url).map((m) => pathOf(m.photo_url as string));
      const voices = rows.filter((m) => m.voice_url).map((m) => pathOf(m.voice_url as string));
      // Files go first, 100 at a time. If any batch fails, stop: the person is told and can try again,
      // instead of being told everything is gone while files remain.
      for (const [bucket, paths] of [[BUCKET, photos], [VOICE, voices]] as const) {
        for (let i = 0; i < paths.length; i += 100) {
          const gone = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
          fail(gone.error);
        }
      }
      const { error } = await db.rpc('delete_me', { p_member: meId });
      fail(error);
      await db.auth.signOut();
    },
  };
}
