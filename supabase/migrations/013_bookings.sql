-- 013_bookings
-- Manual phone/in-person bookings recorded by the turf owner.
-- Reference: turvo_phase1_spec.md sections 14-17 (bookings).
--
-- Double-booking prevention (section 15): the system must prevent two active
-- (CONFIRMED) bookings for the same court on the same date with overlapping
-- times. This is enforced atomically at the database level with a partial
-- GiST exclusion constraint using half-open [start, end) intervals, so
-- concurrent inserts cannot both succeed. The booking service performs the
-- same validation to produce a friendly BOOKING_CONFLICT response.

create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference varchar(30) not null unique,
  turf_id uuid not null references public.turfs(id) on delete restrict,
  court_id uuid not null references public.courts(id) on delete restrict,
  sport_id uuid not null references public.master_items(id) on delete restrict,
  customer_name varchar(120) not null,
  customer_phone varchar(15) not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  base_amount numeric(12,2) not null check (base_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  booking_source text not null check (booking_source in ('PHONE', 'IN_PERSON')),
  booking_status text not null default 'CONFIRMED'
    check (booking_status in ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_booking_start_before_end check (start_time < end_time),
  -- Cancellation requires a reason (section 17).
  constraint chk_cancellation_requires_reason
    check (booking_status <> 'CANCELLED' or cancellation_reason is not null),
  constraint chk_cancelled_at_set
    check (booking_status <> 'CANCELLED' or cancelled_at is not null),
  constraint chk_completed_at_set
    check (booking_status <> 'COMPLETED' or completed_at is not null)
);

create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Atomic double-booking prevention for active (CONFIRMED) bookings.
-- tsrange over (booking_date + start_time, booking_date + end_time) with
-- [) bounds; two CONFIRMED bookings for the same court whose intervals
-- overlap violate this constraint and one insert fails.
alter table public.bookings
  add constraint uq_booking_no_active_overlap
  exclude using gist (
    court_id with =,
    tsrange((booking_date + start_time)::timestamp, (booking_date + end_time)::timestamp, '[)') with &&
  )
  where (booking_status = 'CONFIRMED');
