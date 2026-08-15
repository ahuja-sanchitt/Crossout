// Entry point for the cron path described in the plan: run daily (e.g. via
// a scheduled GitHub Action, Vercel Cron once a frontend exists, or a plain
// `node-cron`/OS scheduler) to pre-generate tomorrow's task instances.
//
//   npm run generate-instances -- 2026-08-16
//
// With no argument, defaults to today (useful for the lazy-fallback case
// and for backfilling manually).
import { createServiceClient } from '../lib/supabaseClient.js';
import { env } from '../lib/env.js';
import { generateInstancesForDate } from '../lib/instances.js';

async function main() {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const supabase = createServiceClient();

  const result = await generateInstancesForDate(supabase, env.crossoutUserId, date);
  console.log(`Generated ${result.created} task instance(s) for ${date}.`);
}

main().catch((err) => {
  console.error('generate-instances failed:', err);
  process.exitCode = 1;
});
