-- 006_turf_images
-- Turf images stored in Supabase Storage. storage_path follows
-- turfs/{turf_id}/{image_uuid}.{extension}.
-- Reference: turvo_phase1_spec.md section 10 (turf_images).

create table public.turf_images (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  storage_path text not null unique,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enforce a single primary image per turf (section 10).
create unique index uq_turf_images_one_primary
on public.turf_images (turf_id)
where is_primary;
