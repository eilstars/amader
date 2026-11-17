# Amader

Same food, right amount, with family. One app for iPhone, Android and the web.

Each person shares one photo of a meal a day, taps how much of one goal food (rice by default) was on the plate, and the family sends hearts. There is a weekly recap and a plain meal summary a parent can bring to a checkup. Amader is not a medical app: no health readings, no projections, no advice.

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

How privacy works: nobody makes an account. Each phone signs in anonymously and the database only shows a phone the families it has joined. The family code is the only way in. The rules are in `supabase/schema.sql` and were tested on a local Postgres. Known limits for now: meal photos sit at long random web addresses that are not listed anywhere but are not password protected, and a person who deletes the app or clears their browser loses their seat and has to rejoin as a new member.

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

3. Run `supabase/schema.sql` again if you set up the database before this was added (it adds two columns and is safe to re-run).

Cost: each photo is one request. The function uses Claude Opus 5.5 for the best read of mixed plates, roughly a cent or less per photo. To make it far cheaper, change `MODEL` at the top of `supabase/functions/recognize-meal/index.ts` to `claude-haiku-5-5` and compare the guesses on your own photos.

Without this step the app works the same, just without the guess. The sample family shows a labelled sample guess so the flow can be demoed.

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

Upload the `dist` folder to Netlify (drag and drop works), then set `EXPO_PUBLIC_WEB_URL` in `.env` to that address and export again. Invites then include a link like `https://your-site/?join=ABC123`.

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

## Security notes (review of 2026-11-16)

- Family codes are 8 letters. A phone that types 10 wrong codes in an hour is locked out for an hour (`code_tries`).
- Food recognition only answers a signed-in phone with a seat in a family, 30 photos a day per phone (`recognitions`). This protects the AI bill.
- Photos: private bucket, JPEG only, 3 MB limit. A photo cannot be replaced after sharing, and only the person who added it can remove it.
- A meal can only point at a photo in its own family's folder, and can only be dated within the last two days.
- Deleting: if the server cannot be reached, the app says so and deletes nothing, instead of pretending.
- Worth adding before a public launch: a CAPTCHA on anonymous sign-ins (Supabase supports Turnstile), a way to remove a family member, and a way to change the family code if it leaks.
- Known limit: there are no accounts, so a person who clears their browser data or reinstalls the app comes back as a new member.
