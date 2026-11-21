// Supabase Edge Function: looks at a meal photo and guesses the dish, what is on
// the plate, and roughly how much of the family's goal food there is.
//
// The Anthropic API key lives here on the server (supabase secrets set ANTHROPIC_API_KEY=...).
// It is never shipped inside the app.
//
// Who can call it: only a signed-in phone that has a seat in a family, and at most
// DAILY_LIMIT photos per phone per day. Without these checks anyone holding the app's
// public key could send photos here and run up the AI bill.
//
// Deliberately not medical: no calories, no carbs, no advice. Just what the plate looks like.

import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { createClient } from "npm:@supabase/supabase-js@2";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";

// Opus gives the best read of mixed South Asian plates. If cost matters more than
// accuracy, "claude-haiku-5-5" is far cheaper per photo. Change it here.
const MODEL = "claude-opus-5-5";

const DAILY_LIMIT = 30;
// A hard ceiling on photos read per day across everyone, so the bill has a known maximum
// even if someone makes many fake families. Raise it with: supabase secrets set RECOGNIZE_DAILY_TOTAL=5000
const DAILY_TOTAL = Number(Deno.env.get("RECOGNIZE_DAILY_TOTAL") ?? "1000");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Guess = z.object({
  is_food: z.boolean().describe("False if the photo does not show food or a drink."),
  dish: z.string().describe('Short everyday name of the meal, like "Chicken biryani" or "Dal, rice and sabzi". Empty if unsure.'),
  grain_percent: z.number().describe("Share of the food that is rice, roti, bread, noodles or other grains, 0 to 100."),
  veg_percent: z.number().describe("Share that is vegetables, dal, beans or salad, 0 to 100."),
  protein_percent: z.number().describe("Share that is fish, meat, eggs, paneer or tofu, 0 to 100."),
  other_percent: z.number().describe("Share that is anything else, such as sweets, fried snacks or sauces, 0 to 100."),
  goal_food_amount: z.number().describe("Rough amount of rice, roti or other grains on the plate in closed fists (one fist is about half a cup), whole number 0 to 4."),
  protein_palms: z.number().describe("Rough amount of fish, meat, eggs, dal, paneer or tofu in palms (palm sized portions), whole number 0 to 4."),
  veg_handfuls: z.number().describe("Rough amount of vegetables, sabzi or salad in open handfuls, whole number 0 to 4."),
  fruit_pieces: z.number().describe("Whole fruits or fist-sized portions of cut fruit visible, whole number 0 to 4. Juice does not count."),
  dairy_cups: z.number().describe("Cups of milk, yoghurt, raita or lassi visible, whole number 0 to 4."),
  items: z.array(z.string()).describe("For a buffet or party plate, a short name for each separate food on it, at most 10. Empty for an ordinary plate."),
  confident: z.boolean().describe("False if the photo is too dark, blurry or far away to judge."),
});

const SYSTEM = `You look at a photo of a home meal and describe what is on the plate for a family meal-sharing app.
Many of the families are South Asian, so expect dishes like biryani, khichdi, dal, sabzi, roti, paratha, curry, raita and mithai, and name them the way a family would.
Estimate portions by food group: grains in closed fists (about half a cup each), protein in palms, vegetables in open handfuls, fruit in pieces, dairy in cups.
If the user says it is a party or buffet plate, list each separate food in items.
The four percentages describe the food you can see and should add up to about 100.
Be honest about uncertainty: if you cannot tell, set confident to false rather than guessing.
Never mention calories, carbohydrates, blood sugar, health or advice.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    // Supabase puts these two in every function. The service key never leaves the server.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: who } = await admin.auth.getUser(token);
    const user = who?.user;
    if (!user) return json({ error: "Please open the app again." }, 401);
    const seats = await admin.from("members").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (seats.error || !seats.count) return json({ error: "Join a family first." }, 403);
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const used = await admin.from("recognitions").select("user_id", { count: "exact", head: true }).eq("user_id", user.id).gte("at", since);
    if (used.error) return json({ error: "Something went wrong." }, 500);
    if ((used.count ?? 0) >= DAILY_LIMIT) return json({ guess: null, limit: true });
    const all = await admin.from("recognitions").select("user_id", { count: "exact", head: true }).gte("at", since);
    if (all.error) return json({ error: "Something went wrong." }, 500);
    if ((all.count ?? 0) >= DAILY_TOTAL) return json({ guess: null, limit: true });
    const noted = await admin.from("recognitions").insert({ user_id: user.id });
    if (noted.error) return json({ error: "Something went wrong." }, 500);

    const { image, goal_food, unit, party } = await req.json();
    if (typeof image !== "string" || image.length < 100) return json({ error: "No photo was sent." }, 400);
    // About 3 MB of photo. The app shrinks photos well below this before sending.
    if (image.length > 4_200_000) return json({ error: "That photo is too large." }, 413);
    // These two go into the question the model reads, so only plain words are let through.
    const plain = (value: unknown, fallback: string) =>
      typeof value === "string" && /^[\p{L} ]{1,30}$/u.test(value) ? value : fallback;
    const food = plain(goal_food, "Rice");
    const measure = plain(unit, "handfuls");

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the function's secrets
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(Guess) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            {
              type: "text",
              text: `The family's main grain is ${food}, counted in ${measure}. ${party === true ? "This is a buffet or party plate. " : ""}What is on this plate?`,
            },
          ],
        },
      ],
    });

    // The model can decline a photo. Treat that the same as "could not tell".
    const guess = response.stop_reason === "refusal" ? null : response.parsed_output;
    if (!guess || !guess.is_food) return json({ guess: null });

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    return json({
      guess: {
        dish: guess.dish.trim().slice(0, 60),
        parts: {
          grain: clamp(guess.grain_percent),
          veg: clamp(guess.veg_percent),
          protein: clamp(guess.protein_percent),
          other: clamp(guess.other_percent),
        },
        amount: guess.confident ? Math.max(0, Math.min(4, Math.round(guess.goal_food_amount))) : null,
        protein: guess.confident ? Math.max(0, Math.min(4, Math.round(guess.protein_palms))) : null,
        veg: guess.confident ? Math.max(0, Math.min(4, Math.round(guess.veg_handfuls))) : null,
        fruit: guess.confident ? Math.max(0, Math.min(4, Math.round(guess.fruit_pieces))) : null,
        dairy: guess.confident ? Math.max(0, Math.min(4, Math.round(guess.dairy_cups))) : null,
        items: guess.items.map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, 10),
        confident: guess.confident,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Busy right now. Try again in a moment." }, 429);
    if (error instanceof Anthropic.APIError) return json({ error: "The photo could not be read." }, 502);
    return json({ error: "Something went wrong." }, 500);
  }
});
