import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabaseClient';
import { getOrGenerateDailyInsight } from '@/lib/insights';
import { todayString } from '@/lib/today';

// Authenticated entry point for the mobile app (and anything else off-origin) to reach
// lib/insights.ts. The web Insights page calls that module directly from a Server
// Component instead — this route exists purely for callers without a Next.js server
// layer of their own.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const anonClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const insight = await getOrGenerateDailyInsight(supabase, user.id, todayString());
    return NextResponse.json(insight);
  } catch (err) {
    console.error('GET /api/insights failed:', err);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
