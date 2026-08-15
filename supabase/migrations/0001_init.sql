-- Crossout — Phase 1 schema
-- Tables, RLS policies, and the day-status recompute trigger described in the plan.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- tasks: the definition. Recurring tasks carry a recurrence_rule; one-off
-- tasks (including same-day quick-add) leave it null.
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  notes text,
  category text,
  priority text not null default 'med' check (priority in ('low', 'med', 'high')),
  time_of_day text not null default 'morning' check (time_of_day in ('morning', 'evening', 'night')),
  due_date date,
  due_time time,
  -- e.g. {"freq":"daily"} or {"freq":"weekly","days":[1,3,5]} (0=Sun..6=Sat); null = one-off
  recurrence_rule jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_parent_task_id_idx on tasks (parent_task_id) where parent_task_id is not null;
create index if not exists tasks_recurring_idx on tasks (user_id) where recurrence_rule is not null and is_active;

-- ---------------------------------------------------------------------------
-- task_instances: one occurrence of a task on one date. This is what the day
-- view reads and checks off — never `tasks` directly. user_id is denormalized
-- from the parent task so RLS and per-day queries don't need a join.
-- ---------------------------------------------------------------------------
create table if not exists task_instances (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, date)
);

create index if not exists task_instances_user_date_idx on task_instances (user_id, date);

-- ---------------------------------------------------------------------------
-- days: the per-date rollup the calendar and streak read from.
-- status: incomplete (default) / complete (100% of that date's instances
-- done) / excused (emergency pass used). A row only exists once a task
-- instance or an emergency pass has touched that date.
-- ---------------------------------------------------------------------------
create table if not exists days (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null default 'incomplete' check (status in ('incomplete', 'complete', 'excused')),
  completed_at timestamptz,
  excuse_note text,
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- emergency_passes: one row per use. Remaining passes = limit − count of
-- rows with used_at in the last 30 days — no separate counter to keep in sync.
-- ---------------------------------------------------------------------------
create table if not exists emergency_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  used_at timestamptz not null default now(),
  note text
);

create index if not exists emergency_passes_user_used_at_idx on emergency_passes (user_id, used_at);

-- ---------------------------------------------------------------------------
-- insights: cached AI output so the page never re-calls OpenAI on a refresh.
-- ---------------------------------------------------------------------------
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  content text not null,
  stats_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Day-status recompute: fires whenever a task_instance is inserted, updated,
-- or deleted. Recomputes incomplete <-> complete for that (user_id, date)
-- based on the instances that exist for it.
--
-- Deliberately does NOT touch a day that's already 'excused' — the emergency
-- pass is authoritative once used; finishing tasks afterward doesn't need to
-- (and shouldn't silently) flip it back to 'complete'. Only the emergency
-- pass function or a fresh incomplete/complete recompute changes status.
-- ---------------------------------------------------------------------------
create or replace function recompute_day_status(p_user_id uuid, p_date date)
returns void
language plpgsql
as $$
declare
  v_total int;
  v_completed int;
  v_current_status text;
begin
  select count(*), count(completed_at)
    into v_total, v_completed
    from task_instances
   where user_id = p_user_id and date = p_date;

  select status into v_current_status
    from days
   where user_id = p_user_id and date = p_date;

  if v_current_status = 'excused' then
    return; -- sticky; see comment above
  end if;

  if v_total > 0 and v_completed = v_total then
    insert into days (user_id, date, status, completed_at)
    values (p_user_id, p_date, 'complete', now())
    on conflict (user_id, date)
    do update set status = 'complete', completed_at = now();
  else
    insert into days (user_id, date, status, completed_at)
    values (p_user_id, p_date, 'incomplete', null)
    on conflict (user_id, date)
    do update set status = 'incomplete', completed_at = null
    where days.status <> 'excused';
  end if;
end;
$$;

create or replace function trg_task_instances_recompute_day()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform recompute_day_status(old.user_id, old.date);
    return old;
  else
    perform recompute_day_status(new.user_id, new.date);
    if tg_op = 'UPDATE' and (old.date <> new.date or old.user_id <> new.user_id) then
      perform recompute_day_status(old.user_id, old.date);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists task_instances_recompute_day on task_instances;
create trigger task_instances_recompute_day
after insert or update or delete on task_instances
for each row execute function trg_task_instances_recompute_day();

-- ---------------------------------------------------------------------------
-- Emergency pass: marks a date 'excused'. Enforces the rolling-30-day limit
-- server-side (not just in the UI) so it can't be bypassed by calling the
-- table directly.
-- ---------------------------------------------------------------------------
create or replace function use_emergency_pass(p_user_id uuid, p_date date, p_note text default null, p_limit int default 3)
returns table (remaining int)
language plpgsql
as $$
declare
  v_used_last_30 int;
begin
  select count(*) into v_used_last_30
    from emergency_passes
   where user_id = p_user_id
     and used_at >= now() - interval '30 days';

  if v_used_last_30 >= p_limit then
    raise exception 'emergency pass limit reached (% used in the last 30 days)', v_used_last_30;
  end if;

  insert into emergency_passes (user_id, date, note)
  values (p_user_id, p_date, p_note);

  insert into days (user_id, date, status, excuse_note)
  values (p_user_id, p_date, 'excused', p_note)
  on conflict (user_id, date)
  do update set status = 'excused', excuse_note = p_note;

  return query
  select greatest(p_limit - (v_used_last_30 + 1), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped to auth.uid(). Phase 1 is
-- single-user, but this makes multi-user safe to turn on later for free.
-- ---------------------------------------------------------------------------
alter table tasks enable row level security;
alter table task_instances enable row level security;
alter table days enable row level security;
alter table emergency_passes enable row level security;
alter table insights enable row level security;

create policy tasks_owner on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy task_instances_owner on task_instances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy days_owner on days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy emergency_passes_owner on emergency_passes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy insights_owner on insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
