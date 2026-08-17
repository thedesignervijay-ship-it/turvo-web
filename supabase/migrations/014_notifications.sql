-- 014_notifications
-- In-app notifications for Admin and Owner.
-- Reference: turvo_phase1_spec.md section 18 (notifications).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar(80) not null,
  title varchar(150) not null,
  message text not null,
  entity_type varchar(50),
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
