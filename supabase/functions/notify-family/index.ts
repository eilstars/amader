// Supabase Edge Function: tells the family when someone shares a meal or comments on one.
//
// "Mom shared lunch" goes to everyone else in the family who has notifications on.
// "Nadia commented on your lunch" goes to the person who shared the meal.
//
// Who can call it: only the person who shared the meal, or who wrote the comment. The message
// is built here from the database, never from text the app sends, so it cannot be used to
// send anything else. Push addresses are read with the service key and never leave the server.
//
// Notifications go through Expo's push service, then Apple or Google. They carry only a first name and the meal
// time, never what was eaten, a note's words or a photo.
// Expo push service (https://docs.expo.dev/push-notifications/sending-notifications/).

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "a snack",
  suhoor: "suhoor",
  iftar: "iftar",
  // Fasting is religious information, so a lock screen never says it.
  fasting: "an update",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: who } = await admin.auth.getUser(token);
    const user = who?.user;
    if (!user) return json({ error: "Please open the app again." }, 401);

    const { meal_id, cheer_id } = await req.json();
    const uuid = /^[0-9a-f-]{36}$/i;
    let to: { push_token: string | null }[] = [];
    let title = "";
    let body = "";
    let data: Record<string, string> = {};

    if (typeof meal_id === "string" && uuid.test(meal_id)) {
      const { data: meal } = await admin.from("meals").select("id, family_code, member_id, slot, dish, created_at").eq("id", meal_id).maybeSingle();
      if (!meal) return json({ sent: 0 });
      const { data: owner } = await admin.from("members").select("id, name, user_id").eq("id", meal.member_id).maybeSingle();
      if (!owner || owner.user_id !== user.id) return json({ error: "Not your meal." }, 403);
      // Only for a meal just shared, so an old meal can't be used to ping the family again and again.
      if (Date.now() - new Date(meal.created_at).getTime() > 10 * 60_000) return json({ sent: 0 });
      const others = await admin.from("members").select("push_token").eq("family_code", meal.family_code).neq("id", owner.id).not("push_token", "is", null);
      to = others.data ?? [];
      title = `${owner.name} shared ${SLOT[meal.slot] ?? "a meal"}`;
      // What was eaten stays inside the app. Lock screens, Expo, Apple and Google only see who shared.
      body = "Send a heart?";
      data = { meal: meal.id };
    } else if (typeof cheer_id === "string" && uuid.test(cheer_id)) {
      const { data: cheer } = await admin.from("cheers").select("id, from_id, to_id, meal_id, text, created_at").eq("id", cheer_id).maybeSingle();
      if (!cheer) return json({ sent: 0 });
      const { data: from } = await admin.from("members").select("id, name, user_id").eq("id", cheer.from_id).maybeSingle();
      if (!from || from.user_id !== user.id) return json({ error: "Not your note." }, 403);
      if (Date.now() - new Date(cheer.created_at).getTime() > 10 * 60_000) return json({ sent: 0 });
      if (cheer.to_id === cheer.from_id) return json({ sent: 0 });
      const target = await admin.from("members").select("push_token").eq("id", cheer.to_id).not("push_token", "is", null);
      to = target.data ?? [];
      title = cheer.meal_id ? `${from.name} commented on your meal` : `A note from ${from.name}`;
      // The note itself is read in the app, not on the lock screen or by the push services.
      body = "Open Amader to read it.";
      data = cheer.meal_id ? { meal: cheer.meal_id } : {};
    } else {
      return json({ error: "Nothing to send." }, 400);
    }

    const messages = to
      .map((m) => m.push_token)
      .filter((t): t is string => !!t && /^ExponentPushToken\[[\w-]+\]$/.test(t))
      .map((t) => ({ to: t, title, body, data, sound: "default" }));
    if (!messages.length) return json({ sent: 0 });
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    return json({ sent: res.ok ? messages.length : 0 });
  } catch {
    return json({ error: "Something went wrong." }, 500);
  }
});
