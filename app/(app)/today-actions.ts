'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { useEmergencyPass, EmergencyPassLimitError } from '@/lib/emergencyPass';
import { todayString } from '@/lib/today';
import type { Priority, TimeOfDay } from '@/lib/types';

export async function toggleTaskInstance(instanceId: string, completed: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('task_instances')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', instanceId)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/');
}

export async function quickAddTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;

  const timeOfDay = String(formData.get('time_of_day') ?? 'morning') as TimeOfDay;
  const priority = String(formData.get('priority') ?? 'med') as Priority;
  const category = String(formData.get('category') ?? '').trim() || null;
  const today = todayString();

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      time_of_day: timeOfDay,
      priority,
      category,
      due_date: today,
    })
    .select('id')
    .single();

  if (taskError) throw taskError;

  const { error: instanceError } = await supabase
    .from('task_instances')
    .insert({ task_id: task.id, user_id: user.id, date: today });

  if (instanceError) throw instanceError;

  revalidatePath('/');
}

export async function useEmergencyPassAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const note = String(formData.get('note') ?? '').trim() || undefined;
  const today = todayString();

  try {
    await useEmergencyPass(supabase, user.id, today, note);
  } catch (err) {
    if (err instanceof EmergencyPassLimitError) {
      // Surfaced as a no-op for now — the button is hidden client-side once
      // passesRemaining hits 0, so reaching this branch means a race
      // (e.g. two tabs). Fine to just stop silently rather than throw a 500.
      return;
    }
    throw err;
  }

  revalidatePath('/');
}
