# Amader

Same food, right amount, with family. One app for iPhone, Android and the web.

Each person shares one photo of a meal a day, taps how much of one goal food (rice by default) was on the plate, and the family sends hearts. There is a weekly recap and a plain meal summary a parent can bring to a checkup. Amader is not a medical app: no health readings, no projections, no advice.

## The pilot build (starch first)

By default the app is the pilot build: a short, focused version for the 2 week pilot (families get $30 as a thank-you).

- Language comes first, before any words: 37 languages to pick from, with a "From your phone" choice. English, Bangla and Hindi have text so far; the rest fall back to English until the professional translations are in (`src/i18n.ts`).
- Logging is starch first: pick the starch with pictures (rice, roti, bread, noodles, potato, other, none), then the amount in handfuls, pieces or slices, in halves. A photo fills both in as Mado's guess, and the person can fix it right there. The (?) opens a tap-the-food game that shows what a starch is.
- The path: share 5 days so Mado learns the usual, pick a small step, then sabzi first, another step, then easy weeks. Each stop is 5 of 7 days, and two quiet days a week are forgiven.
- One family pot of grains (meals, hearts, days at the step, stops reached, a kept weekly bowl). Grains buy Mado's costumes. No personal points.
- Hidden in the pilot: quests, medicine reminders, fasting mode, recipes, comments, "I ate this too", the old dish logging and the food database. Build with `EXPO_PUBLIC_FULL=1` to bring them all back.
- The doctor page is a plain starch log by day. No nutrient numbers.
- New phone: in Settings, a family member taps "New phone?" next to a person's name and sends the link. It puts that person back in their seat with all their meals, works once, and expires after a day.

### Pilot numbers

After running the newest `supabase/schema.sql`, open the SQL Editor and run `select * from pilot_metrics;`. One row per family: people joined, first meal and first photo times, meals, meals that got a heart or note within 2 hours, whether they came back on day 7 and day 14, photo guesses, guesses that were fixed by hand, and how often the (?) was opened. Phones cannot read this view.

### Check the photo guesses on real plates

Before the pilot, run 20 to 30 real plate photos through the photo guess and see how often it is right. Instructions are at the top of `tools/photo-check.mjs`. It uses the deployed function, so no Anthropic key is needed on your computer.

## What works today

- Welcome, and a sample family you can click through with no setup
- Set the table: the adult child enters two names and picks the goal food
- Join: a parent enters a 6 letter family code and lands on the camera. No account, no form
- Did you eat: take or choose a photo, one tap for the portion, saved
- Our Table: who has eaten today, the family goal bar, the feed, hearts
- Recaps: who came to the table each day, your portions, most loved meal
- Checkup: a 90 day summary of your own meals that only you can share
- Food recognition: the photo is read to name the dish, guess the portion and fill the weekly plate
- Recaps also show your plate for the week as a pie (grains, dal and vegetables, fish and meat, other)
- Reminders: a daily "Did you eat?" that skips days you already shared and stops after a week of silence
- Widgets: "Did you eat?" on the iPhone home screen and lock screen and the Android home screen, with one-tap logging
- Me: family code and invite, change the goal food, reminders, photo reading on or off, delete my data

## Run it on your phone (no Mac needed)

1. Install Node.js 20 or newer on your computer (https://nodejs.org).
2. Install the free "Expo Go" app on your phone (App Store or Play Store).
3. In this folder run:

   ```bash
   npm install
   npm start
   ```

   (`npm start` opens in Expo Go. `npm run dev-client` is for the installed development build.)

4. Scan the QR code. iPhone: use the Camera app. Android: use the scanner inside Expo Go. Phone and computer must be on the same wifi. If it will not connect, run `npx expo start --tunnel` instead.

To see it in a browser instead, run `npm run web`.

## Make two phones see each other (Supabase, about 10 minutes)

Without this step the app keeps everything on one phone.

1. Create a free project at https://supabase.com.
2. Authentication, Sign In / Providers: turn on "Allow anonymous sign-ins".
3. SQL Editor: paste all of `supabase/schema.sql` and press Run.
4. Project Settings, API: copy the Project URL and the anon public key.
5. Copy `.env.example` to `.env`, paste the two values, and restart `npm start`.

Now set the table on one phone, and enter the family code on another.

How privacy works: nobody makes an account. Each phone signs in anonymously and the database only shows a phone the families it has joined. The family code is the only way in. The rules are in `supabase/schema.sql` and were tested on a local Postgres. Known limits for now: meal photos sit at long random web addresses that are not listed anywhere but are not password protected, and a person who deletes the app or clears their browser needs a "New phone?" link from someone in the family to get their seat back.

## Turn on food recognition (about 5 minutes, after Supabase is set up)

The photo is read by Claude on the server, so the API key never ships inside the app. It names the dish, estimates the share of grains, vegetables and protein, and guesses the portion of the goal food. It never mentions calories, carbs or health. People can turn it off under Me.

1. Get an API key at https://console.anthropic.com.
2. Install the Supabase CLI, then in this folder:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy recognize-meal
   ```

3. Run `supabase/schema.sql` again if you set up the database before this was added. It is safe to re-run, and it adds the newer pieces: protein and vegetable portions, notes, voice notes (`meal-voice` bucket), who you ate with, notes between family members, the recipe book, fruit and dairy, "I ate this too", and push addresses for family notifications.

Cost: each photo is one request. The function uses Claude Opus 5.5 for the best read of mixed plates, roughly a cent or less per photo. To make it far cheaper, change `MODEL` at the top of `supabase/functions/recognize-meal/index.ts` to `claude-haiku-5-5` and compare the guesses on your own photos.

Without this step the app works the same, just without the guess. The sample family shows a labelled sample guess so the flow can be demoed.

## "Mom shared lunch" notifications

When someone shares a meal, everyone else in the family gets a notification, and when someone comments on a meal, the person who shared it does. This runs in a second Edge Function that reads push addresses with the service key, so no phone can see another phone's address.

1. Deploy it: `npx supabase functions deploy notify-family`
2. Build the app with EAS once (`npx eas init` adds `extra.eas.projectId` to `app.json`). Expo needs that id to hand out push addresses.
3. Test on two real phones. Push does not work in a simulator or in the browser. In the browser the table shows "Ammi just shared a snack" while it is open.

Each phone can turn this off in Settings under Reminders.

## Reminders and widgets

Reminders are in Me. They work in the installed app. Expo Go on Android has limited notification support, and browsers have none.

Widgets cannot run inside Expo Go, because they are native code. They need a real build of the app:

```bash
npx eas-cli@latest build --profile development --platform android   # needs no paid account
npx eas-cli@latest build --profile development --platform ios       # needs the Apple Developer account
```

After installing that build, long-press the home screen and add "Did you eat?". On iPhone it is also offered for the lock screen (circle, rectangle and inline). Android has no lock screen widgets for apps on most phones. Tapping a widget opens the camera; on the wider widget the numbers log a meal in one tap.

Status: the widget code typechecks, bundles, and the native widget targets generate for both platforms, but it has not been run on a real phone yet. Expect a round of fixes the first time it is installed.

## Give parents a link instead of an app install

The web version runs in any phone browser, so a parent can join from a WhatsApp link with nothing to install.

```bash
npx expo export --platform web
```

Upload the `dist` folder to Netlify (drag and drop works), then set `EXPO_PUBLIC_WEB_URL` in `.env` to that address and export again. Invites then include a link like `https://your-site/#join=ABC123`.

## Put it in the App Store and Play Store later

This needs an Apple Developer account ($99 a year) and a Google Play account ($25 once), but still no Mac: Expo builds in the cloud.

```bash
npx eas-cli@latest build --platform all
npx eas-cli@latest submit
```

## Not built yet

- Push notifications from the server ("Ammi shared dinner", "a heart arrived"). Today's reminders are set by the phone itself
- Taking a break from sharing, and keeping one meal private
- Paid plans (plan: RevenueCat over Apple and Google in-app purchase, one subscription covers the family)
- Before a public launch: a privacy policy that covers photos and the "Help Amader learn our food" opt-in, and a DMCA agent for photo uploads

## Photos and the dataset

- Meal photos sit in a private Supabase bucket. Only a signed-in phone in the family can open them, through links that stop working after an hour. If you ran an older `schema.sql`, run the new one again and the bucket becomes private.
- "Help Amader learn our food" in Me is off by default. When a person turns it on, each new meal with a photo adds one row to the `examples` table: what the app guessed, the portion they saved, and how they chose it (kept the guess, tapped, or measured by hand). Only you can read that table, from the Supabase dashboard.
- The photo is not copied. Each row points at the family's own photo and is removed when the meal is removed, when the person turns the setting off, or when they leave.
- The checkup screen shows the person's recent plate photos to hold up at an appointment. The shared text summary has no photos in it.

## Automatic deletion (about 10 minutes, after Supabase is set up)

Nothing is deleted by age while a family uses Amader. People remove meals themselves, or leave. A small function runs once a day and deletes:

- family tables with no meals and no new members for 12 months, with their members, meals, photos and hearts. First, the photos people shared with "Help Amader learn our food" are copied into the private `dataset` bucket and `dataset` table, under a new random id with no name, family or sign-in. That is the lasting learning set
- anonymous sign-ins that are not in any family, after 30 days
- the wrong-code and photo-reading counters, after 1 and 2 days

1. Make a long random secret, for example with `openssl rand -hex 32`.
2. In this folder:

   ```bash
   npx supabase secrets set CLEANUP_SECRET=the-secret-from-step-1
   npx supabase functions deploy cleanup --no-verify-jwt
   ```

   (`--no-verify-jwt` is needed because the daily job calls it with that secret instead of a sign-in. The function refuses any call without the secret.)
3. Run `supabase/schema.sql` again (it adds the `dataset` table and bucket and a lookup the function uses).
4. Open `supabase/cleanup-schedule.sql`, put in your project ref and the same secret, and run it in the SQL editor. Do not save the filled-in copy in this repo.
5. Check the next day: `select * from cron.job_run_details order by start_time desc limit 5;`

To change the idle time, set `IDLE_DAYS` with `npx supabase secrets set IDLE_DAYS=...`, change `IDLE_MONTHS` in `src/legal.tsx`, and update the privacy policy. Untested against a real Supabase project so far; the database part was tested on a local Postgres.

## Privacy policy and terms

Drafts for a lawyer to review are in `legal/`. `python3 scripts/build-legal.py` (needs `pip install markdown`) turns them into `public/privacy.html`, `public/terms.html` and `public/health-data.html`, which are published next to the web app. The app links to them from the welcome, setup, join and Me screens (`src/legal.tsx`). Fill in every `[bracket]` before real families use the app. On the phone app the links need `EXPO_PUBLIC_WEB_URL` set; without it they show as plain text.

## Security notes (review of 2026-11-16)

- Family codes are 8 letters. A phone that types 10 wrong codes in an hour is locked out for an hour (`code_tries`).
- Food recognition only answers a signed-in phone with a seat in a family, 30 photos a day per phone (`recognitions`). This protects the AI bill.
- Photos: private bucket, JPEG only, 3 MB limit. A photo cannot be replaced after sharing, and only the person who added it can remove it.
- A meal can only point at a photo in its own family's folder, and can only be dated within the last two days.
- Deleting: if the server cannot be reached, the app says so and deletes nothing, instead of pretending.
- Worth adding before a public launch: a CAPTCHA on anonymous sign-ins (Supabase supports Turnstile), a way to remove a family member, and a way to change the family code if it leaks.
- Known limit: there are no accounts, so a person who clears their browser data or reinstalls the app comes back as a new member.

## Where data goes (second review, 2026-11-16)

| What | Where it goes | When |
| --- | --- | --- |
| Names, meals, portions, hearts | Your Supabase project | Always, once Supabase is connected |
| Meal photos | Your Supabase project, private bucket | When a photo is shared |
| Voice notes, notes to family, recipes | Your Supabase project. Voice notes sit in a private `meal-voice` bucket in the family's folder | When the person shares one |
| WhatsApp nudges | WhatsApp, only the text the person chose to send. Amader never stores phone numbers | Only when the person taps the WhatsApp button |
| Doctor summary PDF | Made on the phone. Goes only where the person sends it | Only when the person taps "Make the PDF" |
| Meal photos | Anthropic (Claude), through your Supabase function | Only after the person taps "Yes, guess". Asked once, off until then |
| Hand position in a photo | Nowhere. Worked out on the phone and thrown away, never saved | Never leaves the device |
| Location | Nowhere. Photos are re-saved before upload, which strips GPS. If that step fails the photo is not used | Never |
| Family code | Supabase only. Invite links carry it after a `#`, which browsers do not send to the web host or to link previews | |

## Keys: which are secret

- `ANTHROPIC_API_KEY`: secret. It goes in exactly one place, `npx supabase secrets set`. Never in `.env`, never in Netlify, never in a file in this repo.
- Supabase `service_role` key: secret. The app never needs it. Do not paste it anywhere outside the Supabase dashboard.
- Supabase URL and anon key: public by design. They are inside every copy of the app. The database rules are what protect the data, not this key.
- Anything named `EXPO_PUBLIC_...` is shipped inside the app for anyone to read. Never put a secret in a variable with that prefix.

## Also changed in the second review

- Photos are stored in a folder with a random name, not the family code, so a copied photo link cannot be used to join the family.
- Table permissions are listed one by one at the end of `schema.sql`. Phones cannot read other members' sign-in ids or change a family's code, and a phone that is not signed in can do nothing.
- The recognition function has a hard daily ceiling across everyone (`RECOGNIZE_DAILY_TOTAL`, default 1000 photos), so the AI bill has a known maximum.
- `public/_headers` sets a content security policy and related headers for the Netlify site.
