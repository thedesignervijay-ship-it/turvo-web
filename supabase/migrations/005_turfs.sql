-- 005_turfs
-- Turf listings owned by a turf_owner.
-- Reference: turvo_phase1_spec.md section 7 (turfs), section 9 (state machine).
--
-- slot_duration_minutes: the spec (section 12) requires a turf-level slot
-- duration, default 60 minutes, configurable to 30 or 60. It is added here so
-- the availability engine has a concrete storage column.

create table public.turfs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.turf_owners(id) on delete restrict,
  name varchar(150) not null,
  description text not null,
  address_line_1 varchar(255) not null,
  address_line_2 varchar(255),
  city varchar(100) not null,
  state varchar(100) not null,
  pincode varchar(10) not null,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  contact_phone varchar(15) not null,
  contact_email varchar(255),
  slot_duration_minutes smallint not null default 60 check (slot_duration_minutes in (30, 60)),
  status text not null default 'INACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  approval_status text not null default 'DRAFT'
    check (approval_status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Rejection requires a reason (section 9).
  constraint chk_rejection_requires_reason
    check (approval_status <> 'REJECTED' or rejection_reason is not null),
  -- An unapproved turf cannot be active (section 9).
  constraint chk_active_requires_approval
    check (status = 'INACTIVE' or approval_status = 'APPROVED')
);

create trigger trg_turfs_updated_at
before update on public.turfs
for each row execute function public.set_updated_at();
