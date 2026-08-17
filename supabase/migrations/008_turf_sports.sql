-- 008_turf_sports
-- Sports supported by a turf. sport_id references a SPORTS master item.
-- Reference: turvo_phase1_spec.md section 11 (turf_sports).

create table public.turf_sports (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  sport_id uuid not null references public.master_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint uq_turf_sports unique (turf_id, sport_id)
);
