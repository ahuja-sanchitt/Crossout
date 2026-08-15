# Crossout

A personal daily task tracker: rich tasks, a "cross out the day" streak mechanic,
an emergency pass for real-life days, and AI-generated weekly insights. Next.js
(App Router) + Supabase + OpenAI, per the approved plan.

## Setup

1. Create a Supabase project, then in the SQL editor run `supabase/migrations/0001_init.sql`.
2. Create your one user account (Authentication -> Users -> Add user) — this is the
   single-user Phase 1 account. Note its `id`.
3. Copy `.env.example` to `.env` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Project Settings -> API (used by the
     backend scripts below)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same project, used by
     the Next.js app (Project Settings -> API)
   - `OPENAI_API_KEY` — your OpenAI key
   - `CROSSOUT_USER_ID` — the user `id` from step 2 (only used by the standalone scripts)
4. `npm install`
5. `npm run dev` and sign up at `/signup` with the same email as the user created in
   step 2 (or just log in if Supabase auto-confirms in your project settings)

## What's here

- `supabase/migrations/0001_init.sql` — tables (`tasks`, `task_instances`, `days`,
  `emergency_passes`, `insights`), RLS policies, the day-status recompute trigger, and
  the `use_emergency_pass` function (enforces the 3-per-30-days limit server-side).
- `lib/instances.ts` — `generateInstancesForDate`, the idempotent function both the
  cron path and the lazy-fallback path call to materialize a day's task instances.
- `lib/streak.ts` — current/longest streak computed from `days` rows.
- `lib/emergencyPass.ts` — TypeScript wrapper around the `use_emergency_pass` RPC.
- `lib/insights.ts` — gathers a 7-day stats snapshot, calls OpenAI, caches the result
  in `insights` (so it's never re-generated on every page load).
- `app/(app)/` — the four screens (Today, Calendar, Insights, Tasks) behind Supabase
  auth, plus the Server Actions (`today-actions.ts`, `tasks-actions.ts`) that back them.
- `app/login`, `app/signup`, `proxy.ts` — auth pages and the session/route-gating proxy
  (Next 16's replacement for `middleware.ts`).
- `components/` — `Sidebar`, `TodayView`, `TasksView`.

The Today page calls `generateInstancesForDate` for today (and tomorrow) on every load
as the lazy-fallback path from the plan; the cron path (`npm run generate-instances`,
scheduled externally) is what's meant to make that a no-op in the normal case.

## Try it standalone (no UI)

```bash
npm run generate-instances          # generates today's instances
npm run generate-instances -- 2026-08-16
npm run generate-insight            # generates (or returns cached) today's insight
```

## Not built yet

- Expo mobile app (Phase 2)
- An actual scheduled cron calling `generate-instances` (the function and script exist;
  wiring it to a scheduler — GitHub Actions, Vercel Cron, etc. — is still manual)
- The "patterns noticed" bullet list from the original mockup — the Insights page ships
  the AI paragraph, stat tiles, and a real 7-day completion chart, but that specific
  bullet list needs grounded per-category data the current prompt doesn't request yet

See `~/.claude/plans/atomic-growing-pumpkin.md` for the full plan.
