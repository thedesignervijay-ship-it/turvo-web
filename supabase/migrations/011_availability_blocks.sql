-- 011_availability_blocks
-- Blocks prevent booking for their affected interval. A block may target the
-- whole turf (court_id null) or a specific court.
-- Reference: turvo_phase1_spec.md section 12 (availability_blocks).

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  block_type text not null check (block_type in ('MAINTENANCE', 'OWNER_BLOCK', 'EMERGENCY')),
  reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chk_block_start_before_end check (start_datetime < end_datetime),
  -- A court-specific block must belong to the block's turf (section 36:
  -- court/turf relationship validation). Enforced as a composite FK: under
  -- MATCH SIMPLE the FK is only applied when court_id is non-null, so
  -- turf-wide blocks (court_id null) remain valid.
  constraint fk_block_court_belongs_to_turf
    foreign key (turf_id, court_id) references public.courts (turf_id, id)
);
