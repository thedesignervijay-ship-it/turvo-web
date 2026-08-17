-- 007_turf_master_items
-- Turf-specific selection of facilities/rules/equipment master items.
-- Reference: turvo_phase1_spec.md section 8 (turf_master_items).

create table public.turf_master_items (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  master_item_id uuid not null references public.master_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint uq_turf_master_items unique (turf_id, master_item_id)
);
