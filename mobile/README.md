# Crossout — mobile (Phase 2)

Expo/React Native app, reusing the same Supabase project as the web app. Currently just a
scaffold that proves the connection works — real screens come next.

## Setup

1. `cd mobile && npm install` (already done if you're reading this right after the scaffold commit)
2. Copy `.env.example` to `.env` and fill in the same Supabase URL/anon key used by the web
   app's `NEXT_PUBLIC_SUPABASE_*` vars (Project Settings -> API)
3. `npm start` — then press `i`/`a` for iOS/Android simulator, or scan the QR code with
   Expo Go on a physical device

## What's here

- `lib/supabase.ts` — Supabase client with AsyncStorage-backed session persistence (so
  login survives app restarts, same idea as the web app's cookie-based session)
- `App.tsx` — placeholder screen that confirms the Supabase connection on boot

## Not built yet

Auth screens, navigation, and the four real screens (Today/Calendar/Insights/Tasks) —
same data model as the web app (`../lib/types.ts`), different UI layer.
