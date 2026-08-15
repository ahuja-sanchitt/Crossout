import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Server-component / route-handler Supabase client — reads the session from
// cookies, still RLS-scoped (anon key), never the service-role key. Use this
// in Server Components, Server Actions, and route handlers.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component (not a Server Action or
            // route handler) — safe to ignore since middleware refreshes
            // the session on every request anyway.
          }
        },
      },
    },
  );
}
