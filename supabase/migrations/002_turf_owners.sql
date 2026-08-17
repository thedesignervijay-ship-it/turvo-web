-- 002_turf_owners
-- Turf owner business profile. One-to-one with users.
-- Reference: turvo_phase1_spec.md section 7 (turf_owners).

create table public.turf_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete restrict,
  business_name varchar(150) not null,
  business_phone varchar(15) not null,
  business_email varchar(255),
  address_line_1 varchar(255) not null,
  address_line_2 varchar(255),
  city varchar(100) not null,
  state varchar(100) not null,
  pincode varchar(10) not null,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_turf_owners_updated_at
before update on public.turf_owners
for each row execute function public.set_updated_at();
