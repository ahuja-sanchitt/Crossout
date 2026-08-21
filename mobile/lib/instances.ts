import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecurrenceRule, TaskRow } from './types';

function ruleMatchesDate(rule: RecurrenceRule, date: Date): boolean {
  if (rule.freq === 'daily') return true;
  if (rule.freq === 'weekly') return rule.days.includes(date.getUTCDay());
  return false;
}

function toDateOnly(date: string): Date {
  // date strings are YYYY-MM-DD; parse as UTC so weekday math is stable
  // regardless of the server's local timezone.
  return new Date(`${date}T00:00:00Z`);
}

/**
 * Ensures task_instances exist for `date`:
 *  - every active recurring task whose rule matches that date's weekday
 *  - every active one-off task (no recurrence_rule) whose due_date is that date
 *
 * Safe to call repeatedly for the same date (unique (task_id, date) +
 * ON CONFLICT DO NOTHING) — this is what makes the cron path and the lazy
 * fallback path able to both call it without risk of duplicates.
 */
export async function generateInstancesForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<{ created: number }> {
  const parsed = toDateOnly(date);

  const { data: candidateTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    // subtasks (parent_task_id set) are informational under their parent in
    // Phase 1 — they don't get their own instance/checkbox on the day view
    .is('parent_task_id', null)
    .or(`recurrence_rule.not.is.null,due_date.eq.${date}`);

  if (error) throw error;

  const tasksForDate = (candidateTasks as TaskRow[]).filter((task) => {
    if (task.recurrence_rule) return ruleMatchesDate(task.recurrence_rule, parsed);
    return task.due_date === date;
  });

  if (tasksForDate.length === 0) return { created: 0 };

  const rows = tasksForDate.map((task) => ({
    task_id: task.id,
    user_id: userId,
    date,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('task_instances')
    .upsert(rows, { onConflict: 'task_id,date', ignoreDuplicates: true })
    .select('id');

  if (insertError) throw insertError;

  return { created: inserted?.length ?? 0 };
}
