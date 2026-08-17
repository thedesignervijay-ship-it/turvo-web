-- 012_pricing_rules
-- Pricing per turf/court. Booking amounts are calculated server-side and
-- stored on the booking; later pricing changes never alter historical bookings.
-- Reference: turvo_phase1_spec.md section 13 (pricing_rules).
--
-- Overlap rule: "Active rules for the same court/time period cannot overlap"
-- is enforced in the backend pricing service before insert/update. It is not
-- expressible as a simple CHECK constraint because it depends on time-range
-- and effective-date overlap; the booking service re-validates the price at
-- booking time from active rules only.

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  day_type text not null check (day_type in ('WEEKDAY', 'WEEKEND')),
  price numeric(12,2) not null check (price > 0),
  currency char(3) not null default 'INR',
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pricing_start_before_end check (start_time < end_time),
  constraint chk_pricing_effective_period
    check (effective_to is null or effective_from <= effective_to)
);

create trigger trg_pricing_rules_updated_at
before update on public.pricing_rules
for each row execute function public.set_updated_at();
