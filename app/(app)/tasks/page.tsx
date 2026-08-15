import { createClient } from '@/lib/supabase/server';
import { TasksView, type TaskListItem } from '@/components/TasksView';
import type { TaskRow } from '@/lib/types';

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const tasks = (data ?? []) as TaskRow[];
  const taskIds = tasks.map((t) => t.id);

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

  const items: TaskListItem[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes,
    category: task.category,
    priority: task.priority,
    timeOfDay: task.time_of_day,
    dueDate: task.due_date,
    recurrenceRule: task.recurrence_rule,
    subtaskCount: subtaskCounts.get(task.id) ?? 0,
  }));

  return <TasksView tasks={items} />;
}
