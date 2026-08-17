-- 016_platform_settings
-- Key/value platform settings managed by Admin.
-- Reference: turvo_phase1_spec.md section 20 (Admin: platform settings),
-- section 7 migration sequence (016_platform_settings).
-- The spec does not enumerate setting columns; a generic key/value store keeps
-- the table stable while Admin-defined settings evolve.

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key varchar(100) not null unique,
  value jsonb not null,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_platform_settings_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();
