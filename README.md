# Crossout — backend (Phase 1)

Schema and backend logic for the task tracker, per the approved plan. No frontend yet —
this is the Supabase schema, the day-completion/streak logic, instance generation, and
the OpenAI insights module, all runnable as plain TypeScript scripts.

## Setup

1. Create a Supabase project, then in the SQL editor run `supabase/migrations/0001_init.sql`.
2. Create your one user account (Authentication -> Users -> Add user) — this is the
   single-user Phase 1 account everything below operates on.
3. Copy `.env.example` to `.env` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Project Settings -> API
   - `OPENAI_API_KEY` — your OpenAI key
   - `CROSSOUT_USER_ID` — the `id` of the user created in step 2
4. `npm install`

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

## Try it

```bash
npm run generate-instances          # generates today's instances
npm run generate-instances -- 2026-08-16
npm run generate-insight            # generates (or returns cached) today's insight
```
