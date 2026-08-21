# Crossout — mobile (Phase 2)

Expo/React Native app with Expo Router, reusing the same Supabase project as the web app.

## Setup

1. `cd mobile && npm install` (already done if you're reading this right after a scaffold commit)
2. Copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same project as the web
     app's `NEXT_PUBLIC_SUPABASE_*` vars (Project Settings -> API)
   - `EXPO_PUBLIC_WEB_APP_URL` — the deployed web app's URL (powers the Insights screen,
     which calls its `/api/insights` route since the OpenAI key can't ship in the app
     bundle). For local dev before deploying, use your machine's LAN IP, e.g.
     `http://192.168.1.20:3000` — `localhost` from the phone means the phone itself.
3. `npm start` — press `i`/`a` for iOS/Android simulator, or scan the QR code with Expo Go

## What's here

- `app/(auth)/login.tsx`, `signup.tsx` — Supabase email/password auth
- `app/(tabs)/index.tsx` — **Today**: Morning/Evening/Night groups, checkboxes, quick-add,
  emergency pass, Pending backlog for overdue one-off tasks, day-complete celebration
- `app/(tabs)/calendar.tsx` — month grid + streak stats
- `app/(tabs)/insights.tsx` — calls the web app's `/api/insights` with the user's Supabase
  session token
- `app/(tabs)/tasks.tsx` — task list + create/edit form (recurrence, priority, category)
- `app/_layout.tsx` — session check + redirect between `(auth)` and `(tabs)`
- `lib/` — duplicated (not imported) from the root `lib/`: `types.ts`, `streak.ts`,
  `instances.ts`, `emergencyPass.ts`, `timeOfDay.ts`, `today.ts`. These have zero
  Next.js-specific code, but Metro only bundles files inside `mobile/` without extra
  monorepo config, so they're copied rather than shared — see the plan file for the
  reasoning and when to revisit it.
- `lib/supabase.ts` — Supabase client with AsyncStorage-backed session persistence
- Mutations go straight through the Supabase client (RLS-protected) — there's no server
  layer on mobile the way the web app has Server Actions.

## Verify it builds

```bash
npm run typecheck
npx expo export --platform android   # confirms the bundle actually builds
```

## Not built yet

- Push notifications
- EAS Build / app store submission (see the plan file for the deployment tiers)
- True monorepo shared-code setup (deferred — see `lib/` note above)
