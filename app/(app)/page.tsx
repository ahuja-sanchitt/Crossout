import { createClient } from '@/lib/supabase/server';
import { generateInstancesForDate } from '@/lib/instances';
import { getRemainingEmergencyPasses } from '@/lib/emergencyPass';
import { todayString } from '@/lib/today';
import { TodayView, type TodayInstance } from '@/components/TodayView';
import type { DayRow, DayStatus, Priority, TaskRow, TimeOfDay } from '@/lib/types';

function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayString();

  // Lazy fallback: self-heal today's (and tomorrow's) instances in case the
  // cron path hasn't run yet — see lib/instances.ts.
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await Promise.all([
    generateInstancesForDate(supabase, user.id, today),
    generateInstancesForDate(supabase, user.id, tomorrow.toISOString().slice(0, 10)),
  ]);

  const [instancesResult, dayResult, passesRemaining] = await Promise.all([
    supabase
      .from('task_instances')
      .select('id, task_id, completed_at, tasks(id, title, priority, category, time_of_day)')
      .eq('user_id', user.id)
      .eq('date', today),
    supabase.from('days').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    getRemainingEmergencyPasses(supabase, user.id),
  ]);

  if (instancesResult.error) throw instancesResult.error;
  if (dayResult.error) throw dayResult.error;

  type InstanceWithTask = {
    id: string;
    task_id: string;
    completed_at: string | null;
    tasks: Pick<TaskRow, 'id' | 'title' | 'priority' | 'category' | 'time_of_day'> | Pick<TaskRow, 'id' | 'title' | 'priority' | 'category' | 'time_of_day'>[] | null;
  };

  const rows = (instancesResult.data ?? []) as InstanceWithTask[];
  const taskIds = rows.map((r) => r.task_id);

  let subtaskCounts = new Map<string, number>();
  if (taskIds.length > 0) {
    const { data: subtasks, error: subtaskError } = await supabase
      .from('tasks')
      .select('parent_task_id')
      .in('parent_task_id', taskIds);
    if (subtaskError) throw subtaskError;
    subtaskCounts = new Map();
    for (const row of subtasks ?? []) {
      const key = row.parent_task_id as string;
      subtaskCounts.set(key, (subtaskCounts.get(key) ?? 0) + 1);
    }
  }

  const instances: TodayInstance[] = rows.map((row) => {
    const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    return {
      instanceId: row.id,
      taskId: row.task_id,
      title: task?.title ?? '(deleted task)',
      priority: (task?.priority ?? 'med') as Priority,
      category: task?.category ?? null,
      timeOfDay: (task?.time_of_day ?? 'morning') as TimeOfDay,
      completed: Boolean(row.completed_at),
      subtaskCount: subtaskCounts.get(row.task_id) ?? 0,
    };
  });

  const day = dayResult.data as DayRow | null;
  const dayStatus: DayStatus = day?.status ?? 'incomplete';

  return (
    <TodayView
      dateLabel={formatDateLabel(today)}
      dayStatus={dayStatus}
      instances={instances}
      passesRemaining={passesRemaining}
    />
  );
}
