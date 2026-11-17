// Supabase Edge Function: the daily cleanup that keeps Amader's promise in the privacy policy.
//
// - Meals older than KEEP_DAYS (default 365) are deleted, photo first, then the row.
//   Hearts and "Help Amader learn our food" examples go with the meal.
// - A family table with no meals and no new members for KEEP_DAYS is deleted, with any photos left in its folder.
// - Anonymous sign-ins that never joined a family, or left, are deleted after 30 days.
// - The abuse counters (wrong codes, photos read) are trimmed to 1 and 2 days.
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
const KEEP_DAYS = Math.max(30, Number(Deno.env.get("KEEP_DAYS") ?? "365"));
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

/** Meals saved by older versions hold a full photo address. Cut the path out of those. */
function pathOf(saved: string): string {
  const mark = `/${BUCKET}/`;
  const at = saved.indexOf(mark);
  return at >= 0 ? saved.slice(at + mark.length).split("?")[0] : saved;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CLEANUP_SECRET") ?? "";
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 20 || !same(given, secret)) return new Response("Not allowed", { status: 401 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const done = { meals: 0, photos: 0, families: 0, signIns: 0, errors: [] as string[] };
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();

  // 1. Old meals. Photos go first; a meal row is only deleted once its photo is gone,
  //    so a failed photo delete is retried tomorrow instead of leaving a file nobody can find.
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const old = await admin.from("meals").select("id, photo_url").lt("eaten_at", cutoff).limit(100);
    if (old.error) {
      done.errors.push(`meals: ${old.error.message}`);
      break;
    }
    const rows = old.data ?? [];
    if (!rows.length) break;
    const paths = rows.filter((m) => m.photo_url).map((m) => pathOf(m.photo_url as string));
    if (paths.length) {
      const gone = await admin.storage.from(BUCKET).remove(paths);
      if (gone.error) {
        done.errors.push(`photos: ${gone.error.message}`);
        break;
      }
      done.photos += paths.length;
    }
    const del = await admin.from("meals").delete().in("id", rows.map((m) => m.id));
    if (del.error) {
      done.errors.push(`meals: ${del.error.message}`);
      break;
    }
    done.meals += rows.length;
    if (rows.length < 100) break;
  }

  // 2. Family tables nobody has used for KEEP_DAYS. Empty the photo folder, then delete the family
  //    (members, meals, hearts and examples go with it).
  const stale = await admin.rpc("stale_families", { p_before: cutoff });
  if (stale.error) done.errors.push(`families: ${stale.error.message}`);
  for (const fam of (stale.data ?? []) as { code: string; folder: string }[]) {
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

  // 3. Abuse counters. The join functions already trim code_tries; this covers quiet days.
  await admin.from("code_tries").delete().lt("tried_at", new Date(Date.now() - 86_400_000).toISOString());
  await admin.from("recognitions").delete().lt("at", new Date(Date.now() - 2 * 86_400_000).toISOString());

  // 4. Anonymous sign-ins with no seat at any family, older than 30 days.
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
