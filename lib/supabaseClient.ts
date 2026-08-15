import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role client for backend scripts/logic — bypasses RLS, so every
// query here must filter by user_id explicitly. Once a frontend exists it
// gets its own anon-key client scoped by the user's session instead.
export function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
