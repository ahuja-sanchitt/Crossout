import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { env } from './env.js';
import { getStreakSummary } from './streak.js';
import type { DayRow, InsightRow, InsightStatsSnapshot, TaskInstanceRow, TimeOfDay } from './types.js';

const RANGE_DAYS = 7;

interface TimeOfDayBreakdown {
  timeOfDay: TimeOfDay;
  scheduled: number;
  completed: number;
}

interface GatheredStats {
  snapshot: InsightStatsSnapshot;
  timeOfDayBreakdown: TimeOfDayBreakdown[];
  excusedNotes: string[];
  missedDates: string[];
}

async function gatherStats(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<GatheredStats> {
  const rangeStartDate = new Date(`${today}T00:00:00Z`);
  rangeStartDate.setUTCDate(rangeStartDate.getUTCDate() - (RANGE_DAYS - 1));
  const rangeStart = rangeStartDate.toISOString().slice(0, 10);

  const [{ data: days, error: daysError }, { data: instances, error: instancesError }, streak] =
    await Promise.all([
      supabase
        .from('days')
        .select('date, status, excuse_note')
        .eq('user_id', userId)
        .gte('date', rangeStart)
        .lte('date', today),
      supabase
        .from('task_instances')
        .select('date, completed_at, task_id, tasks(time_of_day)')
        .eq('user_id', userId)
        .gte('date', rangeStart)
        .lte('date', today),
      getStreakSummary(supabase, userId, today),
    ]);

  if (daysError) throw daysError;
  if (instancesError) throw instancesError;

  const dayRows = (days ?? []) as Pick<DayRow, 'date' | 'status' | 'excuse_note'>[];
  const daysComplete = dayRows.filter((d) => d.status === 'complete').length;
  const daysExcused = dayRows.filter((d) => d.status === 'excused').length;
  const daysMissed = dayRows.filter((d) => d.status === 'incomplete' && d.date < today).length;
  const totalConsidered = dayRows.length || 1;

  const { data: passes, error: passesError } = await supabase
    .from('emergency_passes')
    .select('id')
    .eq('user_id', userId)
    .gte('date', rangeStart)
    .lte('date', today);
  if (passesError) throw passesError;

  const breakdownMap = new Map<TimeOfDay, TimeOfDayBreakdown>();
  for (const tod of ['morning', 'evening', 'night'] as const) {
    breakdownMap.set(tod, { timeOfDay: tod, scheduled: 0, completed: 0 });
  }
  type InstanceWithTask = Pick<TaskInstanceRow, 'date' | 'completed_at'> & {
    tasks: { time_of_day: TimeOfDay } | { time_of_day: TimeOfDay }[] | null;
  };
  for (const row of (instances ?? []) as InstanceWithTask[]) {
    const taskRel = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    const tod = taskRel?.time_of_day ?? 'morning';
    const bucket = breakdownMap.get(tod)!;
    bucket.scheduled += 1;
    if (row.completed_at) bucket.completed += 1;
  }

  return {
    snapshot: {
      rangeStart,
      rangeEnd: today,
      completionRate: daysComplete / totalConsidered,
      daysComplete,
      daysExcused,
      daysMissed,
      currentStreak: streak.currentStreak,
      emergencyPassesUsed: passes?.length ?? 0,
    },
    timeOfDayBreakdown: [...breakdownMap.values()],
    excusedNotes: dayRows.filter((d) => d.status === 'excused' && d.excuse_note).map((d) => `${d.date}: ${d.excuse_note}`),
    missedDates: dayRows.filter((d) => d.status === 'incomplete' && d.date < today).map((d) => d.date),
  };
}

function buildPrompt(stats: GatheredStats): string {
  const { snapshot, timeOfDayBreakdown, excusedNotes, missedDates } = stats;
  const breakdownLines = timeOfDayBreakdown
    .map((b) => `- ${b.timeOfDay}: ${b.completed}/${b.scheduled} completed`)
    .join('\n');

  return `Here is one user's task-completion data for ${snapshot.rangeStart} to ${snapshot.rangeEnd}:

- Days fully complete: ${snapshot.daysComplete}
- Days excused (emergency pass used): ${snapshot.daysExcused}
- Days missed: ${snapshot.daysMissed}
- Current streak: ${snapshot.currentStreak} days
- Emergency passes used this range: ${snapshot.emergencyPassesUsed}
- Completion by time of day:
${breakdownLines}
${missedDates.length ? `- Missed dates: ${missedDates.join(', ')}` : ''}
${excusedNotes.length ? `- Excused-day notes: ${excusedNotes.join('; ')}` : ''}

Write a short (2-4 sentence), honest, encouraging-but-not-saccharine insight about this week.
Ground every claim strictly in the numbers above — do not invent specifics (names, causes,
events) that aren't in the data. If a time-of-day group is clearly weaker, call it out.
If an emergency pass was used, mention it plainly rather than glossing over it.`;
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const response = await client.chat.completions.create({
    model: env.openaiModel,
    messages: [
      {
        role: 'system',
        content:
          'You write brief, grounded productivity insights for a personal task-tracking app. Never fabricate details not present in the provided stats.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 220,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned an empty insight');
  return content;
}

/**
 * Returns today's cached insight if one exists; otherwise gathers stats,
 * calls OpenAI, caches the result, and returns it. Callers should invoke
 * this at most once per day per user (e.g. from a cron route or the
 * Insights page's first load) — the cache is what prevents repeat calls.
 */
export async function getOrGenerateDailyInsight(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<InsightRow> {
  const { data: existing, error: existingError } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as InsightRow;

  const stats = await gatherStats(supabase, userId, today);
  const content = await callOpenAI(buildPrompt(stats));

  const { data: inserted, error: insertError } = await supabase
    .from('insights')
    .insert({
      user_id: userId,
      date: today,
      content,
      stats_snapshot: stats.snapshot,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  return inserted as InsightRow;
}
