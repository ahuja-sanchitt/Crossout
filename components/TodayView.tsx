'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { quickAddTask, toggleTaskInstance, useEmergencyPassAction } from '@/app/(app)/today-actions';
import { DayCompleteCelebration } from '@/components/DayCompleteCelebration';
import { Spinner } from '@/components/Spinner';
import { TIME_OF_DAY_LABEL, TIME_OF_DAY_ORDER, currentTimeOfDay } from '@/lib/timeOfDay';
import type { DayStatus, Priority, TimeOfDay } from '@/lib/types';

export interface TodayInstance {
  instanceId: string;
  taskId: string;
  title: string;
  priority: Priority;
  category: string | null;
  timeOfDay: TimeOfDay;
  completed: boolean;
  subtaskCount: number;
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red',
  med: 'bg-amber',
  low: 'bg-ink-faint',
};

export function TodayView({
  dateLabel,
  dayStatus,
  instances,
  passesRemaining,
  currentStreak,
}: {
  dateLabel: string;
  dayStatus: DayStatus;
  instances: TodayInstance[];
  passesRemaining: number;
  currentStreak: number;
}) {
  const total = instances.length;

  // Lifted so we can detect "last task just checked off" client-side, the
  // instant it happens — waiting on dayStatus from the server round-trip
  // (via revalidatePath) would lag a beat behind the actual click.
  const [completedIds, setCompletedIds] = useState(
    () => new Set(instances.filter((i) => i.completed).map((i) => i.instanceId)),
  );
  const done = completedIds.size;
  const wasAlreadyComplete = useRef(dayStatus === 'complete' || dayStatus === 'excused');
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const allDone = total > 0 && done === total;
    if (allDone && !wasAlreadyComplete.current) {
      setCelebrating(true);
    }
    wasAlreadyComplete.current = allDone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, total]);

  function handleToggle(instanceId: string, next: boolean) {
    setCompletedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(instanceId);
      else copy.delete(instanceId);
      return copy;
    });
  }

  const groups = TIME_OF_DAY_ORDER.map((tod) => ({
    timeOfDay: tod,
    items: instances.filter((i) => i.timeOfDay === tod),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {celebrating && (
        <DayCompleteCelebration streak={currentStreak + 1} onDismiss={() => setCelebrating(false)} />
      )}

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
            {dateLabel}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[5px] w-40 overflow-hidden rounded-full bg-border-soft">
              <div
                className={`h-full rounded-full ${dayStatus === 'complete' ? 'bg-accent' : dayStatus === 'excused' ? 'bg-amber' : 'bg-accent'}`}
                style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
              />
            </div>
            <div className="text-[0.78rem] text-ink-muted">
              {dayStatus === 'excused' ? (
                <span className="text-amber">Excused today</span>
              ) : (
                <>
                  <span className="num text-ink">{done}</span> of{' '}
                  <span className="num text-ink">{total}</span> done
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <AddTaskButton />
          {passesRemaining > 0 && dayStatus !== 'complete' && dayStatus !== 'excused' && (
            <EmergencyPassButton passesRemaining={passesRemaining} />
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <p className="mb-6 text-sm text-ink-faint">Nothing scheduled yet — add a task to get started.</p>
      )}

      {groups.map((group) => (
        <div key={group.timeOfDay} className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-muted">
              {TIME_OF_DAY_LABEL[group.timeOfDay]}
            </span>
            <span className="h-px flex-1 bg-border-soft" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {group.items.map((item) => (
              <TaskRow
                key={item.instanceId}
                item={item}
                completed={completedIds.has(item.instanceId)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskRow({
  item,
  completed,
  onToggle,
}: {
  item: TodayInstance;
  completed: boolean;
  onToggle: (instanceId: string, next: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !completed;
    onToggle(item.instanceId, next);
    startTransition(async () => {
      await toggleTaskInstance(item.instanceId, next);
    });
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-border-soft px-3.5 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={completed}
        aria-label={completed ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
        className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
          completed ? 'border-accent bg-accent text-accent-ink' : 'border-ink-faint'
        }`}
      >
        {completed && (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5">
            <path d="M1 5l3 3 5-6" />
          </svg>
        )}
      </button>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[item.priority]}`} />
      <span className={`flex-1 text-[0.9rem] ${completed ? 'text-ink-faint line-through' : 'text-ink'}`}>
        {item.title}
      </span>
      {item.subtaskCount > 0 && (
        <span className="rounded border border-border-soft bg-surface-raised px-1.5 py-0.5 text-[0.72rem] text-ink-faint">
          {item.subtaskCount} subtasks
        </span>
      )}
      {item.category && <span className="text-[0.7rem] text-ink-faint">{item.category}</span>}
    </div>
  );
}

function AddTaskButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultTimeOfDay = currentTimeOfDay(new Date().getHours());

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-[0.82rem] font-semibold text-accent-ink"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Add task
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await quickAddTask(formData);
          setOpen(false);
        });
      }}
      className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5"
    >
      <input
        type="text"
        name="title"
        placeholder="What do you need to do?"
        required
        autoFocus
        className="min-w-[180px] flex-1 rounded border border-border bg-surface-raised px-2.5 py-2 text-[0.88rem] text-ink outline-none focus:border-accent"
      />
      <select
        name="time_of_day"
        defaultValue={defaultTimeOfDay}
        className="rounded border border-border bg-surface-raised px-2 py-2 text-[0.8rem] text-ink-muted"
      >
        {TIME_OF_DAY_ORDER.map((tod) => (
          <option key={tod} value={tod}>
            {TIME_OF_DAY_LABEL[tod]}
          </option>
        ))}
      </select>
      <select
        name="priority"
        defaultValue="med"
        className="rounded border border-border bg-surface-raised px-2 py-2 text-[0.8rem] text-ink-muted"
      >
        <option value="low">Low</option>
        <option value="med">Med</option>
        <option value="high">High</option>
      </select>
      <input
        type="text"
        name="category"
        placeholder="Category (optional)"
        className="w-36 rounded border border-border bg-surface-raised px-2.5 py-2 text-[0.82rem] text-ink outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 rounded bg-accent px-3.5 py-2 text-[0.85rem] font-semibold text-accent-ink disabled:opacity-70"
      >
        {isPending && <Spinner className="h-3 w-3" />}
        {isPending ? 'Adding…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={isPending}
        className="text-[0.8rem] text-ink-faint"
      >
        Cancel
      </button>
    </form>
  );
}

function EmergencyPassButton({ passesRemaining }: { passesRemaining: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.82rem] text-amber"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
          <path d="M10 2l6 2.4v4.6c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V4.4L10 2z" />
        </svg>
        Use emergency pass
        <span className="text-[0.76rem] text-ink-muted">{passesRemaining} left</span>
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await useEmergencyPassAction(formData);
          setOpen(false);
        });
      }}
      className="flex items-center gap-2 rounded-md border border-amber/40 bg-surface-raised p-2"
    >
      <input
        type="text"
        name="note"
        placeholder="Optional note"
        className="w-44 rounded border border-border bg-surface px-2.5 py-1.5 text-[0.82rem] text-ink outline-none focus:border-amber"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 rounded bg-amber px-3 py-1.5 text-[0.8rem] font-semibold text-accent-ink disabled:opacity-70"
      >
        {isPending && <Spinner className="h-3 w-3" />}
        {isPending ? 'Confirming…' : 'Confirm'}
      </button>
      <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="text-[0.78rem] text-ink-faint">
        Cancel
      </button>
    </form>
  );
}
