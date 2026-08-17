-- 010_operating_hours
-- Weekly operating hours per turf. day_of_week: 0 Sunday .. 6 Saturday.
-- Reference: turvo_phase1_spec.md section 12 (turf_operating_hours).

create table public.turf_operating_hours (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opening_time time not null,
  closing_time time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Opening time must be earlier than closing time (section 12).
  constraint chk_opening_before_closing
    check (is_closed or opening_time < closing_time),
  -- One operating-hours row per turf per day.
  constraint uq_turf_operating_hours_day unique (turf_id, day_of_week)
);

create trigger trg_turf_operating_hours_updated_at
before update on public.turf_operating_hours
for each row execute function public.set_updated_at();
