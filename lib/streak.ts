import type { SupabaseClient } from '@supabase/supabase-js';
import type { DayRow } from './types';

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

const STREAK_STATUSES = new Set(['complete', 'excused']);

/**
 * current streak = consecutive complete/excused days ending today or
 * yesterday (so a day that hasn't happened yet today doesn't break it).
 * longest streak = the longest such run anywhere in the fetched history.
 */
export function computeStreaks(days: Pick<DayRow, 'date' | 'status'>[], today: string): StreakSummary {
  const byDate = new Map(days.map((d) => [d.date, d.status]));
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1)); // desc

  let longestStreak = 0;
  let run = 0;
  for (const day of sorted) {
    if (STREAK_STATUSES.has(day.status)) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }

  // current streak: walk back from today (or yesterday, if today has no
  // row yet / is still incomplete) while status keeps qualifying.
  let cursor = new Date(`${today}T00:00:00Z`);
  const todayStatus = byDate.get(today);
  if (!todayStatus || !STREAK_STATUSES.has(todayStatus)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let currentStreak = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const status = byDate.get(key);
    if (!status || !STREAK_STATUSES.has(status)) break;
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { currentStreak, longestStreak };
}

export async function getStreakSummary(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  lookbackDays = 400,
): Promise<StreakSummary> {
  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - lookbackDays);

  const { data, error } = await supabase
    .from('days')
    .select('date, status')
    .eq('user_id', userId)
    .gte('date', since.toISOString().slice(0, 10))
    .lte('date', today);

  if (error) throw error;

  return computeStreaks(data as Pick<DayRow, 'date' | 'status'>[], today);
}
