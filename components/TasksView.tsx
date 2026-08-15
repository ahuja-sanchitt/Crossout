'use client';

import { useState, useTransition } from 'react';
import { createTask, deleteTask, updateTask } from '@/app/(app)/tasks-actions';
import { TIME_OF_DAY_LABEL, TIME_OF_DAY_ORDER } from '@/lib/timeOfDay';
import type { Priority, RecurrenceRule, TimeOfDay } from '@/lib/types';

export interface TaskListItem {
  id: string;
  title: string;
  notes: string | null;
  category: string | null;
  priority: Priority;
  timeOfDay: TimeOfDay;
  dueDate: string | null;
  recurrenceRule: RecurrenceRule | null;
  subtaskCount: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red',
  med: 'bg-amber',
  low: 'bg-ink-faint',
};

function recurrenceLabel(rule: RecurrenceRule | null): string | null {
  if (!rule) return null;
  if (rule.freq === 'daily') return 'daily';
  return rule.days.map((d) => WEEKDAY_LABELS[d]).join('/');
}

function scheduleLabel(task: TaskListItem): string {
  const parts: string[] = [TIME_OF_DAY_LABEL[task.timeOfDay]];
  if (task.recurrenceRule) return parts[0];
  if (task.dueDate) parts.push(`due ${task.dueDate}`);
  return parts.join(', ');
}

export function TasksView({ tasks }: { tasks: TaskListItem[] }) {
  const [panel, setPanel] = useState<'closed' | 'new' | string>('closed');
  const editingTask = typeof panel === 'string' && panel !== 'closed' && panel !== 'new'
    ? tasks.find((t) => t.id === panel) ?? null
    : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.11em] text-ink-faint">
            All tasks
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        </div>
        <button
          type="button"
          onClick={() => setPanel(panel === 'new' ? 'closed' : 'new')}
          className="flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-[0.82rem] font-semibold text-accent-ink"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M10 4v12M4 10h12" />
          </svg>
          New task
        </button>
      </div>

      {panel === 'new' && <TaskForm onDone={() => setPanel('closed')} />}
      {editingTask && (
        <TaskForm task={editingTask} onDone={() => setPanel('closed')} />
      )}

      <div className="overflow-hidden overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="grid min-w-[640px] grid-cols-[1fr_110px_100px_140px_70px] items-center gap-3 bg-surface-sunken px-4 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-ink-faint">
          <div>Task</div>
          <div>Category</div>
          <div>Priority</div>
          <div>Schedule</div>
          <div />
        </div>
        {tasks.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-faint">No tasks yet — add one above.</p>
        )}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={() => setPanel(task.id)} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, onEdit }: { task: TaskListItem; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const recurrence = recurrenceLabel(task.recurrenceRule);

  return (
    <div className="grid min-w-[640px] grid-cols-[1fr_110px_100px_140px_70px] items-center gap-3 border-b border-border-soft px-4 py-3 text-[0.87rem] last:border-b-0">
      <div className="flex items-center gap-2">
        {task.title}
        {recurrence && (
          <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[0.72rem] text-accent">
            {recurrence}
          </span>
        )}
        {task.subtaskCount > 0 && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[0.72rem] text-ink-muted">
            {task.subtaskCount} subtasks
          </span>
        )}
      </div>
      <div className="text-ink-muted">{task.category ?? '—'}</div>
      <div className="flex items-center gap-1.5 text-ink-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        {task.priority === 'med' ? 'Medium' : task.priority === 'high' ? 'High' : 'Low'}
      </div>
      <div className="text-ink-muted">{scheduleLabel(task)}</div>
      <div className="flex items-center gap-3 text-ink-faint">
        <button type="button" onClick={onEdit} className="hover:text-ink">
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${task.title}"?`)) return;
            startTransition(() => deleteTask(task.id));
          }}
          className="hover:text-red"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TaskForm({ task, onDone }: { task?: TaskListItem; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly'>(
    task?.recurrenceRule ? task.recurrenceRule.freq : 'none',
  );
  const initialWeeklyDays = task?.recurrenceRule?.freq === 'weekly' ? task.recurrenceRule.days : [];

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          if (task) {
            await updateTask(task.id, formData);
          } else {
            await createTask(formData);
          }
          onDone();
        });
      }}
      className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          name="title"
          placeholder="Task title"
          required
          defaultValue={task?.title}
          className="min-w-[200px] flex-1 rounded border border-border bg-surface-raised px-2.5 py-2 text-[0.88rem] text-ink outline-none focus:border-accent"
        />
        <input
          type="text"
          name="category"
          placeholder="Category (optional)"
          defaultValue={task?.category ?? ''}
          className="w-40 rounded border border-border bg-surface-raised px-2.5 py-2 text-[0.85rem] text-ink outline-none focus:border-accent"
        />
        <select
          name="priority"
          defaultValue={task?.priority ?? 'med'}
          className="rounded border border-border bg-surface-raised px-2 py-2 text-[0.82rem] text-ink-muted"
        >
          <option value="low">Low</option>
          <option value="med">Med</option>
          <option value="high">High</option>
        </select>
        <select
          name="time_of_day"
          defaultValue={task?.timeOfDay ?? 'morning'}
          className="rounded border border-border bg-surface-raised px-2 py-2 text-[0.82rem] text-ink-muted"
        >
          {TIME_OF_DAY_ORDER.map((tod) => (
            <option key={tod} value={tod}>
              {TIME_OF_DAY_LABEL[tod]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-[0.85rem] text-ink-muted">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="recurrence_type"
              value="none"
              checked={recurrenceType === 'none'}
              onChange={() => setRecurrenceType('none')}
            />
            One-off
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="recurrence_type"
              value="daily"
              checked={recurrenceType === 'daily'}
              onChange={() => setRecurrenceType('daily')}
            />
            Daily
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="recurrence_type"
              value="weekly"
              checked={recurrenceType === 'weekly'}
              onChange={() => setRecurrenceType('weekly')}
            />
            Weekly
          </label>
        </div>

        {recurrenceType === 'none' && (
          <input
            type="date"
            name="due_date"
            required
            defaultValue={task?.dueDate ?? ''}
            className="rounded border border-border bg-surface-raised px-2.5 py-1.5 text-[0.82rem] text-ink outline-none focus:border-accent"
          />
        )}

        {recurrenceType === 'weekly' && (
          <div className="flex gap-2 text-[0.78rem] text-ink-muted">
            {WEEKDAY_LABELS.map((label, idx) => (
              <label key={label} className="flex items-center gap-1">
                <input type="checkbox" name="weekly_days" value={idx} defaultChecked={initialWeeklyDays.includes(idx)} />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      <textarea
        name="notes"
        placeholder="Notes (optional)"
        defaultValue={task?.notes ?? ''}
        rows={2}
        className="rounded border border-border bg-surface-raised px-2.5 py-2 text-[0.85rem] text-ink outline-none focus:border-accent"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-accent px-3.5 py-2 text-[0.85rem] font-semibold text-accent-ink"
        >
          {task ? 'Save changes' : 'Create task'}
        </button>
        <button type="button" onClick={onDone} className="text-[0.82rem] text-ink-faint">
          Cancel
        </button>
      </div>
    </form>
  );
}
