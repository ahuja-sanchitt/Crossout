// Generates (or returns the cached) daily insight for today.
//
//   npm run generate-insight -- 2026-08-16
import { createServiceClient } from '../lib/supabaseClient';
import { env } from '../lib/env';
import { getOrGenerateDailyInsight } from '../lib/insights';

async function main() {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const supabase = createServiceClient();

  const insight = await getOrGenerateDailyInsight(supabase, env.crossoutUserId, date);
  console.log(insight.content);
}

main().catch((err) => {
  console.error('generate-insight failed:', err);
  process.exitCode = 1;
});
