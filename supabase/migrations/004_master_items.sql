-- 004_master_items
-- Master data items within a category. Item names are unique within a category.
-- Reference: turvo_phase1_spec.md section 8 (master_items).

create table public.master_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.master_categories(id) on delete restrict,
  name varchar(120) not null,
  description text,
  icon_path text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_master_items_category_name unique (category_id, name)
);

create trigger trg_master_items_updated_at
before update on public.master_items
for each row execute function public.set_updated_at();
