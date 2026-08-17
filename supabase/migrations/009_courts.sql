-- 009_courts
-- Courts belonging to a turf. Each Phase 1 court is associated with one sport.
-- Reference: turvo_phase1_spec.md section 11 (courts).

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  sport_id uuid not null references public.master_items(id) on delete restrict,
  name varchar(100) not null,
  description text,
  capacity integer not null default 0 check (capacity >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- FK target for court-scoped child rows (e.g. availability_blocks).
  constraint uq_courts_turf_id_id unique (turf_id, id)
);

create trigger trg_courts_updated_at
before update on public.courts
for each row execute function public.set_updated_at();
