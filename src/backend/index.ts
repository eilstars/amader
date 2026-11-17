import { Backend } from '../types';
import { localBackend } from './local';
import { makeSupabaseBackend } from './supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** With Supabase keys in .env, families sync across phones. Without them, everything stays on this phone. */
export const cloudBackend: Backend | null = url && key ? makeSupabaseBackend(url, key) : null;
export { localBackend };

/** Where the web version of the app lives, so invites can be a plain link. Optional. */
export const webUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');
