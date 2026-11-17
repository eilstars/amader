import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Backend, Family, Guess, Meal, Member, Parts, Role, Slot } from '../types';
import { unitWord } from '../words';

const BUCKET = 'meal-photos';

type MemberRow = { id: string; name: string; role: Role; tint: number; joined: boolean; created_at: string };
type MealRow = { id: string; member_id: string; eaten_at: string; slot: Slot; photo_url: string | null; handfuls: number | null; dish: string | null; parts: Parts | null; hearts: { member_id: string }[] | null };

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
      return { parentName: (data.parent_name as string) ?? null, fromName: (data.from_name as string) ?? null };
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
      const fam = await db.from('families').select('code, goal_food, goal_handfuls').eq('code', code).maybeSingle();
      fail(fam.error);
      if (!fam.data) return null;
      const mem = await db.from('members').select('id, name, role, tint, joined, created_at').eq('family_code', code).order('created_at');
      fail(mem.error);
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
      const mealRows = await db
        .from('meals')
        .select('id, member_id, eaten_at, slot, photo_url, handfuls, dish, parts, hearts(member_id)')
        .eq('family_code', code)
        .gte('eaten_at', since)
        .order('eaten_at', { ascending: false });
      fail(mealRows.error);
      const members: Member[] = ((mem.data ?? []) as MemberRow[]).map((m) => ({ id: m.id, name: m.name, role: m.role, tint: m.tint, joined: m.joined }));
      const family: Family = { code: fam.data.code, members, goalFood: fam.data.goal_food, goalHandfuls: fam.data.goal_handfuls };
      const meals: Meal[] = ((mealRows.data ?? []) as unknown as MealRow[]).map((m) => ({
        id: m.id,
        memberId: m.member_id,
        date: m.eaten_at,
        slot: m.slot,
        photo: m.photo_url,
        handfuls: m.handfuls,
        dish: m.dish,
        parts: m.parts,
        hearts: (m.hearts ?? []).map((h) => h.member_id),
      }));
      return { family, meals };
    },

    async addMeal(code, meal, photo) {
      await signedIn();
      let photoUrl: string | null = null;
      if (photo) {
        const path = `${code}/${meal.id}.jpg`;
        const body = photo.base64 ? base64ToBytes(photo.base64) : await (await fetch(photo.uri)).arrayBuffer();
        const up = await db.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
        fail(up.error);
        photoUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { error } = await db.from('meals').insert({
        id: meal.id,
        family_code: code,
        member_id: meal.memberId,
        eaten_at: meal.date,
        slot: meal.slot,
        photo_url: photoUrl,
        handfuls: meal.handfuls,
        dish: meal.dish ?? null,
        parts: meal.parts ?? null,
      });
      fail(error);
      return { ...meal, photo: photoUrl };
    },

    async recognize(photo, goalFood) {
      if (!photo.base64) return null;
      await signedIn();
      const { data, error } = await db.functions.invoke('recognize-meal', {
        body: { image: photo.base64, goal_food: goalFood, unit: unitWord(goalFood) },
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

    async deleteMe(code, meId) {
      await signedIn();
      const mine = await db.from('meals').select('id, photo_url').eq('member_id', meId);
      const paths = (mine.data ?? []).filter((m) => m.photo_url).map((m) => `${code}/${m.id}.jpg`);
      if (paths.length) await db.storage.from(BUCKET).remove(paths);
      const { error } = await db.rpc('delete_me', { p_member: meId });
      fail(error);
      await db.auth.signOut();
    },
  };
}
