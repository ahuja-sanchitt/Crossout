export type Priority = 'low' | 'med' | 'high';
export type TimeOfDay = 'morning' | 'evening' | 'night';
export type DayStatus = 'incomplete' | 'complete' | 'excused';

export type RecurrenceRule =
  | { freq: 'daily' }
  | { freq: 'weekly'; days: number[] }; // 0 = Sunday .. 6 = Saturday

export interface TaskRow {
  id: string;
  user_id: string;
  parent_task_id: string | null;
  title: string;
  notes: string | null;
  category: string | null;
  priority: Priority;
  time_of_day: TimeOfDay;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM:SS
  recurrence_rule: RecurrenceRule | null;
  is_active: boolean;
  created_at: string;
}

export interface TaskInstanceRow {
  id: string;
  task_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  completed_at: string | null;
  created_at: string;
}

export interface DayRow {
  user_id: string;
  date: string;
  status: DayStatus;
  completed_at: string | null;
  excuse_note: string | null;
}

export interface EmergencyPassRow {
  id: string;
  user_id: string;
  date: string;
  used_at: string;
  note: string | null;
}

export interface InsightRow {
  id: string;
  user_id: string;
  date: string;
  content: string;
  stats_snapshot: InsightStatsSnapshot;
  created_at: string;
}

export interface InsightStatsSnapshot {
  rangeStart: string;
  rangeEnd: string;
  completionRate: number; // 0-1 across the range
  daysComplete: number;
  daysExcused: number;
  daysMissed: number;
  currentStreak: number;
  emergencyPassesUsed: number;
}
