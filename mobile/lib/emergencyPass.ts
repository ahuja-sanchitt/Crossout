import type { SupabaseClient } from '@supabase/supabase-js';

export const EMERGENCY_PASS_LIMIT = 3; // per rolling 30 days — keep in sync with default in the SQL function

export class EmergencyPassLimitError extends Error {}

/**
 * Marks `date` as 'excused'. The 30-day limit is enforced inside the
 * `use_emergency_pass` Postgres function (see migration), not here — this
 * wrapper just surfaces that failure as a typed error instead of a raw
 * Postgres exception.
 */
export async function useEmergencyPass(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  note?: string,
): Promise<{ remaining: number }> {
  const { data, error } = await supabase.rpc('use_emergency_pass', {
    p_user_id: userId,
    p_date: date,
    p_note: note ?? null,
    p_limit: EMERGENCY_PASS_LIMIT,
  });

  if (error) {
    if (error.message.includes('emergency pass limit reached')) {
      throw new EmergencyPassLimitError(error.message);
    }
    throw error;
  }

  const remaining = Array.isArray(data) ? data[0]?.remaining : data?.remaining;
  return { remaining: remaining ?? 0 };
}

export async function getRemainingEmergencyPasses(
  supabase: SupabaseClient,
  userId: string,
  limit = EMERGENCY_PASS_LIMIT,
): Promise<number> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const { count, error } = await supabase
    .from('emergency_passes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('used_at', since.toISOString());

  if (error) throw error;

  return Math.max(limit - (count ?? 0), 0);
}
