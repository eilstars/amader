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
- Me: family code and invite, change the goal food, delete my data

## Run it on your phone (no Mac needed)

1. Install Node.js 20 or newer on your computer (https://nodejs.org).
2. Install the free "Expo Go" app on your phone (App Store or Play Store).
3. In this folder run:

   ```bash
   npm install
   npm start
   ```

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

- Push notifications ("Did you eat?" reminders, a heart arrived)
- Taking a break from sharing, and keeping one meal private
- The plate-as-pie recap of food groups (needs food recognition)
- Paid plans
- Before a public launch: private photo storage, a privacy policy, and a DMCA agent for photo uploads
