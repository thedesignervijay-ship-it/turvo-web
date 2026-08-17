-- 001_users
-- Core application user table.
-- Reference: turvo_phase1_spec.md section 7 (users).
-- auth_user_id maps to the Supabase Auth user UUID. Passwords are never stored
-- here; they live exclusively in Supabase Auth.

-- Shared trigger to maintain updated_at on mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  role text not null check (role in ('ADMIN', 'OWNER')),
  name varchar(120) not null,
  email varchar(255) not null,
  phone varchar(15) not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();
