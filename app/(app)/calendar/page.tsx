import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStreakSummary } from '@/lib/streak';
import { todayString } from '@/lib/today';
import type { DayStatus } from '@/lib/types';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const cells: { date: string; day: number; status: DayStatus | null; isFuture: boolean; isToday: boolean; dow: number }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day));
    const date = toDateStr(d);
    cells.push({
      date,
      day,
      status: statusByDate.get(date) ?? null,
      isFuture: date > today,
      isToday: date === today,
      dow: d.getUTCDay(),
    });
  }

  const consideredCells = cells.filter((c) => !c.isFuture);
  const completeCount = consideredCells.filter((c) => c.status === 'complete' || c.status === 'excused').length;
  const monthCompletionRate = consideredCells.length
    ? Math.round((completeCount / consideredCells.length) * 100)
    : 0;

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const monthShort = first.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
            {monthLabel}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <Link
            href={`/calendar?month=${shiftMonth(monthParam, -1)}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
              <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href={`/calendar?month=${currentMonthParam}`}
            className="rounded-md px-2.5 py-1 font-mono text-[0.74rem] text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${shiftMonth(monthParam, 1)}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
            aria-label="Next month"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
              <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="mb-7 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border-soft bg-surface-sunken">
          {DOW_LABELS.map((l) => (
            <div key={l} className="px-1 py-2 text-center font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-faint">
              {l}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border-soft p-px">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="aspect-square bg-surface-sunken opacity-40" />
          ))}
          {cells.map((cell) => (
            <DayCell key={cell.date} {...cell} monthShort={monthShort} />
          ))}
        </div>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-5 text-[0.78rem] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <CheckIcon className="h-3.5 w-3.5 text-accent" />
          Complete
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldIcon className="h-3.5 w-3.5 text-amber" />
          Excused
        </span>
        <span className="flex items-center gap-1.5">
          <XIcon className="h-3.5 w-3.5 text-red/80" />
          Missed
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatTile value={streakSummary.currentStreak} label="current streak" icon={<FlameIcon className="h-4 w-4" />} accentColor="amber" />
        <StatTile value={streakSummary.longestStreak} label="longest streak" icon={<TrophyIcon className="h-4 w-4" />} />
        <StatTile
          value={`${monthCompletionRate}%`}
          label={`complete rate, ${first.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}`}
          icon={<RingIcon className="h-4 w-4" percent={monthCompletionRate} />}
        />
      </div>
    </div>
  );
}

function DayCell({
  day,
  status,
  isFuture,
  isToday,
  monthShort,
}: {
  date: string;
  day: number;
  status: DayStatus | null;
  isFuture: boolean;
  isToday: boolean;
  monthShort: string;
}) {
  const isComplete = status === 'complete';
  const isExcused = status === 'excused';
  const isMissed = !isFuture && !isComplete && !isExcused && !isToday;

  const watermarkColor = isToday
    ? 'text-accent/25'
    : isComplete
      ? 'text-accent/[0.14]'
      : isExcused
        ? 'text-amber/[0.14]'
        : isMissed
          ? 'text-red/[0.16]'
          : isFuture
            ? 'text-ink/[0.03]'
            : 'text-ink/[0.06]';

  return (
    <div
      className={`group relative flex aspect-square flex-col overflow-hidden p-2 transition-colors ${
        isComplete
          ? 'bg-accent/[0.05] hover:bg-accent/[0.09]'
          : isExcused
            ? 'bg-amber/[0.05] hover:bg-amber/[0.09]'
            : isMissed
              ? 'bg-red/[0.05] hover:bg-red/[0.09]'
              : 'bg-surface hover:bg-surface-raised'
      } ${isToday ? 'ring-1 ring-inset ring-accent' : ''}`}
    >
      {/* watermark date — the visual texture of the cell */}
      <span
        className={`num pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[2.65rem] font-black leading-none tracking-tighter ${watermarkColor}`}
      >
        {day}
      </span>

      {/* precise label — what's actually read */}
      <div className="relative z-10 flex items-start justify-between gap-1">
        <span
          className={`font-mono text-[0.64rem] uppercase tracking-[0.06em] ${
            isToday
              ? 'font-bold text-accent'
              : isMissed
                ? 'text-red/80'
                : isFuture
                  ? 'text-ink-faint/50'
                  : 'text-ink-faint'
          }`}
        >
          {monthShort} {day}
        </span>
        {isComplete && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />}
        {isExcused && <ShieldIcon className="h-3 w-3 shrink-0 text-amber" />}
        {isMissed && <XIcon className="h-3 w-3 shrink-0 text-red/80" />}
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  icon,
  accentColor,
}: {
  value: number | string;
  label: string;
  icon: React.ReactNode;
  accentColor?: 'amber';
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          accentColor === 'amber' ? 'bg-amber/10 text-amber' : 'bg-accent/10 text-accent'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className={`num text-xl font-semibold ${accentColor === 'amber' ? 'text-amber' : 'text-ink'}`}>{value}</div>
        <div className="mt-0.5 text-[0.76rem] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M10 2l6 2.4v4.6c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V4.4L10 2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1c1 3-2 4-2 7a2 2 0 004 0c1 1 2 2.5 2 4.5A5.5 5.5 0 018 17.5 5.5 5.5 0 013 12c0-3.5 2.5-5 3-8 1 1 1.5 2 1.5 3C8.5 4.5 9.5 3 10 1z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h8v5a4 4 0 01-8 0V3z" />
      <path d="M6 4H3.5A1.5 1.5 0 002 5.5v.5A3 3 0 006 8" />
      <path d="M14 4h2.5A1.5 1.5 0 0118 5.5v.5A3 3 0 0114 8" />
      <path d="M10 12v3M7.5 17.5h5M8 15h4" />
    </svg>
  );
}

function RingIcon({ className, percent }: { className?: string; percent: number }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg viewBox="0 0 20 20" className={className}>
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.6" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}
