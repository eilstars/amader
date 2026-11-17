# Amader app

Expo (React Native) app for iPhone, Android and web from one codebase. See README.md for what it does and how to run it.

## Expo changes fast

Read the `expo` major version in `package.json` and check the matching docs (https://docs.expo.dev/versions/v<major>.0.0/) before using an Expo API from memory.

## Commands

```bash
npm start                         # dev server for Expo Go (expo start --go)
npx tsc --noEmit                  # typecheck, run before finishing any change
npx expo export --platform web    # build the web version into dist/
npx expo install <package>        # add packages at versions that match the SDK
npx expo prebuild --no-install    # checks the config plugins run; delete ios/ and android/ afterwards
```

## Layout

- `App.tsx`: fonts, invite links, and which screen shows (welcome, setup, join, main).
- `src/screens/`: one file per screen. Navigation is plain state, no router.
- `src/store.tsx`: all app state and actions.
- `src/backend/`: `local.ts` keeps data on the phone, `supabase.ts` syncs a family. Both follow the `Backend` type in `src/types.ts`.
- `src/ui.tsx`, `src/theme.ts`: shared components and brand colours.
- `supabase/schema.sql`: database tables and privacy rules.
- `supabase/functions/recognize-meal/`: Deno function that reads a meal photo with Claude. The API key stays on the server.
- `src/reminders.ts`: local daily reminders. `src/widgets*.tsx`, `src/widget-layout.ios.tsx`: home and lock screen widgets (native builds only, loaded lazily so Expo Go still starts).

## Product rules

- Not a medical app: no A1C, no readings, no projections, no advice.
- Parent setup stays near zero: a code, a name, one button.
- Brand: leaf green, deep green, rice white, Hind Siliguri. Steel only for plates, pink only for hearts and talk prompts. No red, no heavy yellow.
- Plain English first, broadly South Asian ("Did you eat?", "Ammi"). Puti never scolds and never comments on someone's numbers.
