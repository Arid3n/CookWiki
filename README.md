# CookWiki

CookWiki is a personal food library for Expo / React Native. Every food stores its values per 100 g, and each food can have variants (for example a different preparation).

- **Library:** browse, search (including natural-language search through Gemini), pin foods and filter by tags.
- **Chat:** a Gemini chat that can save foods and variants straight into your library.
- **Label scan:** photograph a nutrition label and Gemini extracts the values.
- **Calculator:** a floating calculator, and portion math on each food (grams in, macros out).
- **Offline read cache:** the library is cached in local SQLite. Reading works offline; writes need a connection and show an offline message otherwise.

Stack: Expo 54, expo-router, Supabase (auth and database), expo-sqlite, zustand, Jest.

## Setup

1. Install dependencies: `npm install`
2. Supply the Supabase project values as environment variables, for example in a `.env` file (git-ignored): `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (read in `lib/supabase.ts`).
3. In the Supabase SQL editor, run `supabase/migrations/0001_library.sql`.
4. Start the app: `npx expo start`
5. Sign in (or sign up) on the login screen.
6. Open Settings and paste your Gemini API key. It is stored on the device in SecureStore only.

The camera permission text comes from `app.json` (the `expo-image-picker` plugin). If the camera permission prompt does not appear in Expo Go, build a development client (`eas.json` has a `development` profile).

## Tests

```bash
npm test
npx tsc --noEmit
```

## Fonts

The display font Harmera (`assets/fonts/harmera.ttf`) is free for personal use only
(source: 1001fonts.com). This app is a personal tool; do not redistribute the font or the app
bundle with it. Rubik and Geist come from `@expo-google-fonts` (OFL).
