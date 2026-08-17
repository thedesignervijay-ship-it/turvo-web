-- 003_master_categories
-- Admin-controlled master data categories (SPORTS, FACILITIES, RULES, EQUIPMENT).
-- Reference: turvo_phase1_spec.md section 8 (master_categories).

create table public.master_categories (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(100) not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_master_categories_updated_at
before update on public.master_categories
for each row execute function public.set_updated_at();
