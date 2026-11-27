// Supabase Edge Function: the daily cleanup that keeps Amader's promise in the privacy policy.
//
// - Nothing is deleted by age while a family uses Amader. People delete meals themselves, or leave.
// - A family table with no meals and no new members for IDLE_DAYS (default 365) is deleted:
//   its members, meals, photos and hearts.
//   Before that, the photos people chose to share with "Help Amader learn our food" are copied into
//   the private `dataset` bucket and `dataset` table, with no name, family or sign-in attached.
//   This is how the learning photos outlive the family, as the privacy policy says.
// - Anonymous sign-ins that never joined a family, or left, are deleted after 30 days.
// - The abuse counters (wrong codes, photos read) are trimmed to 1 and 2 days, and expired new-phone links are removed.
//
// It runs once a day from pg_cron (see supabase/cleanup-schedule.sql). It is deployed with
// --no-verify-jwt, so it checks its own secret instead: CLEANUP_SECRET, set with
//   npx supabase secrets set CLEANUP_SECRET=<a long random string>
// Without the right secret it does nothing.
//
// Photos are removed through the Storage API, never with SQL: deleting rows in storage.objects
// would leave the files behind.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "meal-photos";
const DATASET = "dataset";
const IDLE_DAYS = Math.max(30, Number(Deno.env.get("IDLE_DAYS") ?? "365"));
const ORPHAN_SIGN_IN_DAYS = 30;
// Stops one run from going on forever if something is very wrong. The next day carries on.
const MAX_BATCHES = 50;

/** Compares two strings in constant time, so the secret cannot be guessed one letter at a time. */
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CLEANUP_SECRET") ?? "";
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 20 || !same(given, secret)) return new Response("Not allowed", { status: 401 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const done = { families: 0, photos: 0, kept: 0, signIns: 0, errors: [] as string[] };
  const cutoff = new Date(Date.now() - IDLE_DAYS * 86_400_000).toISOString();

  /**
   * Copies a family's "Help Amader learn our food" examples into the dataset, with a new random id and
   * no member, meal, family or sign-in. Returns how many were kept, or -1 if anything failed.
   * Only examples whose person still had the setting on exist at all: turning it off deletes them.
   */
  async function keepExamples(code: string): Promise<number> {
    const rows = await admin
      .from("examples")
      .select("meal_id, photo_path, goal_food, guess, handfuls, chosen_by, created_at, members!inner(family_code)")
      .eq("members.family_code", code);
    if (rows.error) return -1;
    let kept = 0;
    for (const ex of rows.data ?? []) {
      const file = await admin.storage.from(BUCKET).download(ex.photo_path as string);
      // A photo already removed has nothing to keep. Anything else is a real failure.
      if (file.error) {
        if (/not.?found/i.test(file.error.message)) continue;
        return -1;
      }
      const id = crypto.randomUUID();
      const up = await admin.storage.from(DATASET).upload(`${id}.jpg`, file.data, { contentType: "image/jpeg", upsert: false });
      if (up.error) return -1;
      const row = await admin.from("dataset").insert({
        id,
        goal_food: ex.goal_food,
        guess: ex.guess,
        handfuls: ex.handfuls,
        chosen_by: ex.chosen_by,
        // Month only, so the date cannot be matched back to a family's feed.
        shared_month: (ex.created_at as string).slice(0, 7),
      });
      if (row.error) return -1;
      // Done with this one. Removing it here means a run that stops halfway never copies it twice.
      const gone = await admin.from("examples").delete().eq("meal_id", ex.meal_id);
      if (gone.error) return -1;
      kept += 1;
    }
    return kept;
  }

  // 1. Family tables nobody has used for IDLE_DAYS. Keep the opted-in learning photos without names,
  //    then empty the photo folder and delete the family (members, meals, hearts and examples go with it).
  const stale = await admin.rpc("stale_families", { p_before: cutoff });
  if (stale.error) done.errors.push(`families: ${stale.error.message}`);
  for (const fam of (stale.data ?? []) as { code: string; folder: string }[]) {
    const kept = await keepExamples(fam.code);
    if (kept < 0) {
      done.errors.push("families: learning photos could not be kept, so the family was left for tomorrow");
      continue;
    }
    done.kept += kept;
    let ok = true;
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const listed = await admin.storage.from(BUCKET).list(fam.folder, { limit: 100 });
      if (listed.error) {
        ok = false;
        break;
      }
      const names = (listed.data ?? []).map((f) => `${fam.folder}/${f.name}`);
      if (!names.length) break;
      const gone = await admin.storage.from(BUCKET).remove(names);
      if (gone.error) {
        ok = false;
        break;
      }
      done.photos += names.length;
    }
    if (!ok) {
      done.errors.push("families: a photo folder could not be emptied");
      continue;
    }
    const del = await admin.from("families").delete().eq("code", fam.code);
    if (del.error) done.errors.push(`families: ${del.error.message}`);
    else done.families += 1;
  }

  // 2. Abuse counters. The join functions already trim code_tries; this covers quiet days.
  await admin.from("code_tries").delete().lt("tried_at", new Date(Date.now() - 86_400_000).toISOString());
  await admin.from("recognitions").delete().lt("at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  // New-phone links work for one day. Expired ones are removed so they never pile up.
  await admin.from("rejoin_tokens").delete().lt("expires_at", new Date().toISOString());

  // 3. Anonymous sign-ins with no seat at any family, older than 30 days.
  const seated = await admin.from("members").select("user_id").not("user_id", "is", null);
  if (seated.error) {
    done.errors.push(`sign-ins: ${seated.error.message}`);
  } else {
    const keep = new Set((seated.data ?? []).map((m) => m.user_id as string));
    const before = Date.now() - ORPHAN_SIGN_IN_DAYS * 86_400_000;
    for (let page = 1; page <= MAX_BATCHES; page++) {
      const list = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (list.error) {
        done.errors.push(`sign-ins: ${list.error.message}`);
        break;
      }
      const users = list.data.users;
      for (const u of users) {
        // Only anonymous phones. If accounts are ever added, they are never touched here.
        if (!u.is_anonymous || keep.has(u.id) || new Date(u.created_at).getTime() > before) continue;
        const del = await admin.auth.admin.deleteUser(u.id);
        if (del.error) done.errors.push(`sign-ins: ${del.error.message}`);
        else done.signIns += 1;
      }
      if (users.length < 1000) break;
    }
  }

  // Counts only. No names, codes or ids are logged.
  console.log(JSON.stringify(done));
  return new Response(JSON.stringify(done), {
    status: done.errors.length ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
