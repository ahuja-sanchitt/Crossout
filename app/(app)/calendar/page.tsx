import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStreakSummary } from '@/lib/streak';
import { todayString } from '@/lib/today';
import type { DayRow, DayStatus } from '@/lib/types';

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const STATUS_CLASSES: Record<DayStatus, string> = {
  complete: 'bg-accent/10 border-accent/45 text-accent',
  excused: 'bg-amber/10 border-amber/45 text-amber',
  incomplete: 'border-border text-ink-faint',
};

function monthBounds(monthParam: string | undefined) {
  const today = todayString();
  const [y, m] = (monthParam ?? today.slice(0, 7)).split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return { year: y, month: m, first, last };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shiftMonth(monthParam: string, delta: number): string {
  const [y, m] = monthParam.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const params = await searchParams;
  const today = todayString();
  const currentMonthParam = today.slice(0, 7);
  const monthParam = params.month ?? currentMonthParam;
  const { first, last } = monthBounds(monthParam);

  const [{ data: daysData, error }, streakSummary] = await Promise.all([
    supabase
      .from('days')
      .select('date, status')
      .eq('user_id', user.id)
      .gte('date', toDateStr(first))
      .lte('date', toDateStr(last)),
    getStreakSummary(supabase, user.id, today),
  ]);

  if (error) throw error;

  const statusByDate = new Map((daysData ?? []).map((d) => [d.date, d.status as DayStatus]));

  const leadingBlanks = first.getUTCDay();
  const daysInMonth = last.getUTCDate();
  const cells: { date: string; day: number; status: DayStatus | null; isFuture: boolean; isToday: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateStr(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)));
    cells.push({
      date,
      day,
      status: statusByDate.get(date) ?? null,
      isFuture: date > today,
      isToday: date === today,
    });
  }

  const consideredCells = cells.filter((c) => !c.isFuture);
  const completeCount = consideredCells.filter((c) => c.status === 'complete' || c.status === 'excused').length;
  const monthCompletionRate = consideredCells.length
    ? Math.round((completeCount / consideredCells.length) * 100)
    : 0;

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
            {monthLabel}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        </div>
        <div className="flex items-center gap-3 font-mono text-[0.8rem] text-ink-muted">
          <Link href={`/calendar?month=${shiftMonth(monthParam, -1)}`} className="hover:text-ink">
            ← prev
          </Link>
          <Link href={`/calendar?month=${currentMonthParam}`} className="hover:text-ink">
            today
          </Link>
          <Link href={`/calendar?month=${shiftMonth(monthParam, 1)}`} className="hover:text-ink">
            next →
          </Link>
        </div>
        <div className="flex gap-4 text-[0.78rem] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
            Complete
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber" />
            Excused
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-red bg-red/15" />
            Missed
          </span>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-7 gap-1.5">
        {DOW_LABELS.map((l, i) => (
          <div key={i} className="pb-1 text-center font-mono text-[0.68rem] text-ink-faint">
            {l}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square rounded-md border border-dashed border-border-soft opacity-40" />
        ))}
        {cells.map((cell) => {
          const missed = !cell.isFuture && cell.status !== 'complete' && cell.status !== 'excused' && cell.date !== today;
          const classes = cell.isFuture
            ? 'border-dashed border-border-soft text-ink-faint opacity-40'
            : missed
              ? 'border-red/45 bg-red/10 text-red'
              : STATUS_CLASSES[cell.status ?? 'incomplete'];
          return (
            <div
              key={cell.date}
              className={`flex aspect-square items-start justify-start rounded-md border p-1.5 text-[0.72rem] ${classes} ${
                cell.isToday ? 'outline outline-[1.5px] -outline-offset-1 outline-ink' : ''
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatTile value={streakSummary.currentStreak} label="current streak" accentColor="amber" />
        <StatTile value={streakSummary.longestStreak} label="longest streak" />
        <StatTile value={`${monthCompletionRate}%`} label={`complete rate, ${first.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}`} />
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
