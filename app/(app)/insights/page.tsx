import { createClient } from '@/lib/supabase/server';
import { getOrGenerateDailyInsight } from '@/lib/insights';
import { getStreakSummary } from '@/lib/streak';
import { todayString } from '@/lib/today';

const RANGE_DAYS = 7;

async function fetchDailyCompletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  today: string,
) {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (RANGE_DAYS - 1));
  const startStr = start.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('task_instances')
    .select('date, completed_at')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lte('date', today);

  if (error) throw error;

  const byDate = new Map<string, { total: number; completed: number }>();
  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    byDate.set(d.toISOString().slice(0, 10), { total: 0, completed: 0 });
  }
  for (const row of data ?? []) {
    const bucket = byDate.get(row.date);
    if (!bucket) continue;
    bucket.total += 1;
    if (row.completed_at) bucket.completed += 1;
  }

  return [...byDate.entries()].map(([date, { total, completed }]) => ({
    date,
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    ratio: total > 0 ? completed / total : 0,
    total,
    completed,
  }));
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayString();

  const [dailyCompletion, streak] = await Promise.all([
    fetchDailyCompletion(supabase, user.id, today),
    getStreakSummary(supabase, user.id, today),
  ]);

  let insight: Awaited<ReturnType<typeof getOrGenerateDailyInsight>> | null = null;
  let insightError: string | null = null;
  try {
    insight = await getOrGenerateDailyInsight(supabase, user.id, today);
  } catch (err) {
    insightError =
      err instanceof Error && err.message.includes('OPENAI_API_KEY')
        ? 'Add an OPENAI_API_KEY to your environment to enable AI insights.'
        : 'Could not generate an insight right now — try refreshing shortly.';
  }

  const snapshot = insight?.stats_snapshot;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">This week</div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-gradient-to-b from-accent/10 to-transparent p-5">
        <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
          {insight ? `Generated ${insight.date}` : 'Insight'}
        </div>
        <p className="max-w-[62ch] text-[0.98rem] leading-relaxed text-ink">
          {insight ? insight.content : insightError}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
          Completion by day
        </div>
        <div className="flex h-[110px] items-end gap-2.5">
          {dailyCompletion.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className={`w-full max-w-[26px] rounded-t-[4px] rounded-b-[2px] ${
                  d.total === 0 ? 'bg-border-soft' : d.ratio >= 0.7 ? 'bg-accent' : 'bg-border-soft'
                }`}
                style={{ height: `${Math.max(d.ratio * 100, d.total > 0 ? 4 : 2)}%` }}
                title={d.total > 0 ? `${d.completed}/${d.total} completed` : 'No tasks scheduled'}
              />
              <div className="font-mono text-[0.68rem] text-ink-faint">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatTile value={snapshot ? `${Math.round(snapshot.completionRate * 100)}%` : '—'} label="7-day completion rate" />
        <StatTile value={snapshot?.emergencyPassesUsed ?? '—'} label="emergency passes used" />
        <StatTile value={streak.currentStreak} label="day streak" accentColor="amber" />
      </div>
    </div>
  );
}

function StatTile({ value, label, accentColor }: { value: number | string; label: string; accentColor?: 'amber' }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className={`num text-xl font-semibold ${accentColor === 'amber' ? 'text-amber' : 'text-ink'}`}>{value}</div>
      <div className="mt-0.5 text-[0.76rem] text-ink-muted">{label}</div>
    </div>
  );
}
