'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateInstancesForDate } from '@/lib/instances';
import { todayString } from '@/lib/today';
import type { Priority, RecurrenceRule, TimeOfDay } from '@/lib/types';

function parseRecurrenceRule(formData: FormData): RecurrenceRule | null {
  const type = String(formData.get('recurrence_type') ?? 'none');
  if (type === 'daily') return { freq: 'daily' };
  if (type === 'weekly') {
    const days = formData.getAll('weekly_days').map((d) => Number(d));
    if (days.length === 0) return null;
    return { freq: 'weekly', days };
  }
  return null;
}

function taskFieldsFromForm(formData: FormData) {
  const recurrenceRule = parseRecurrenceRule(formData);
  const dueDate = String(formData.get('due_date') ?? '').trim() || null;

  return {
    title: String(formData.get('title') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim() || null,
    category: String(formData.get('category') ?? '').trim() || null,
    priority: String(formData.get('priority') ?? 'med') as Priority,
    time_of_day: String(formData.get('time_of_day') ?? 'morning') as TimeOfDay,
    // a recurring task ignores due_date (the rule decides which dates it
    // appears on); a one-off task needs a due_date or it never shows up
    due_date: recurrenceRule ? null : dueDate,
    recurrence_rule: recurrenceRule,
  };
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fields = taskFieldsFromForm(formData);
  if (!fields.title) return;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...fields, user_id: user.id })
    .select('id, due_date, recurrence_rule')
    .single();

  if (error) throw error;

  // A recurring task's instance for today, or a one-off's instance for its
  // due date — generated immediately rather than waiting on cron/lazy runs.
  // Matters most for a due_date in the past: nothing else would ever
  // generate that instance, and it's how a backfilled/overdue task ends up
  // in the Pending section instead of just not existing anywhere.
  const today = todayString();
  if (task.recurrence_rule) {
    await generateInstancesForDate(supabase, user.id, today);
  } else if (task.due_date) {
    await generateInstancesForDate(supabase, user.id, task.due_date);
  }

  revalidatePath('/tasks');
  revalidatePath('/');
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fields = taskFieldsFromForm(formData);
  if (!fields.title) return;

  const { error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw error;

  const today = todayString();
  if (fields.recurrence_rule) {
    await generateInstancesForDate(supabase, user.id, today);
  } else if (fields.due_date) {
    await generateInstancesForDate(supabase, user.id, fields.due_date);
  }

  revalidatePath('/tasks');
  revalidatePath('/');
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id);
  if (error) throw error;

  revalidatePath('/tasks');
  revalidatePath('/');
}
