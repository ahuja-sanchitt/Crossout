import { createBrowserClient } from '@supabase/ssr';

// Client-component Supabase client — RLS-scoped to the logged-in user via
// their session cookie, never the service-role key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
