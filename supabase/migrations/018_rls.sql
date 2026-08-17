-- 018_rls
-- Row Level Security. Owner can access only rows associated with their own
-- owner profile; Admin is resolved through the application role stored in
-- users. All writes in the running application are performed by the backend
-- using the service role, which bypasses RLS; RLS is the defense-in-depth
-- guarantee that a direct client request can never touch another owner's data.
-- Reference: turvo_phase1_spec.md section 26.

-- --- Role helpers -----------------------------------------------------------

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role from public.users u where u.auth_user_id = auth.uid()),
    ''
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'ADMIN';
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'OWNER';
$$;

-- --- users ------------------------------------------------------------------

alter table public.users enable row level security;

create policy users_select_own on public.users
  for select to authenticated
  using (auth.uid() = auth_user_id);

create policy users_select_admin on public.users
  for select to authenticated
  using (public.is_admin());

create policy users_update_own on public.users
  for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- --- turf_owners -------------------------------------------------------------

alter table public.turf_owners enable row level security;

create policy turf_owners_select_own on public.turf_owners
  for select to authenticated
  using (user_id = auth.uid());

create policy turf_owners_select_admin on public.turf_owners
  for select to authenticated
  using (public.is_admin());

create policy turf_owners_update_own on public.turf_owners
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy turf_owners_update_admin on public.turf_owners
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- master data (readable by all authenticated, written by admin only) ------

alter table public.master_categories enable row level security;
alter table public.master_items enable row level security;

create policy master_categories_select on public.master_categories
  for select to authenticated
  using (true);

create policy master_categories_admin_write on public.master_categories
  for insert to authenticated
  with check (public.is_admin());

create policy master_categories_admin_update on public.master_categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy master_items_select on public.master_items
  for select to authenticated
  using (true);

create policy master_items_admin_write on public.master_items
  for insert to authenticated
  with check (public.is_admin());

create policy master_items_admin_update on public.master_items
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- turfs -------------------------------------------------------------------

alter table public.turfs enable row level security;

create policy turfs_select_owner on public.turfs
  for select to authenticated
  using (
    exists (
      select 1 from public.turf_owners to_
      where to_.id = turfs.owner_id and to_.user_id = auth.uid()
    )
  );

create policy turfs_select_admin on public.turfs
  for select to authenticated
  using (public.is_admin());

create policy turfs_update_owner on public.turfs
  for update to authenticated
  using (
    exists (
      select 1 from public.turf_owners to_
      where to_.id = turfs.owner_id and to_.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.turf_owners to_
      where to_.id = turfs.owner_id and to_.user_id = auth.uid()
    )
  );

create policy turfs_update_admin on public.turfs
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- turf_images --------------------------------------------------------------

alter table public.turf_images enable row level security;

create policy turf_images_select_owner on public.turf_images
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = turf_images.turf_id and to_.user_id = auth.uid()
    )
  );

create policy turf_images_select_admin on public.turf_images
  for select to authenticated
  using (public.is_admin());

-- --- turf_master_items ---------------------------------------------------------

alter table public.turf_master_items enable row level security;

create policy turf_master_items_select_owner on public.turf_master_items
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = turf_master_items.turf_id and to_.user_id = auth.uid()
    )
  );

create policy turf_master_items_select_admin on public.turf_master_items
  for select to authenticated
  using (public.is_admin());

-- --- turf_sports ----------------------------------------------------------------

alter table public.turf_sports enable row level security;

create policy turf_sports_select_owner on public.turf_sports
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = turf_sports.turf_id and to_.user_id = auth.uid()
    )
  );

create policy turf_sports_select_admin on public.turf_sports
  for select to authenticated
  using (public.is_admin());

-- --- courts -----------------------------------------------------------------------

alter table public.courts enable row level security;

create policy courts_select_owner on public.courts
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = courts.turf_id and to_.user_id = auth.uid()
    )
  );

create policy courts_select_admin on public.courts
  for select to authenticated
  using (public.is_admin());

create policy courts_update_owner on public.courts
  for update to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = courts.turf_id and to_.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = courts.turf_id and to_.user_id = auth.uid()
    )
  );

create policy courts_update_admin on public.courts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- turf_operating_hours -----------------------------------------------------------

alter table public.turf_operating_hours enable row level security;

create policy turf_operating_hours_select_owner on public.turf_operating_hours
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = turf_operating_hours.turf_id and to_.user_id = auth.uid()
    )
  );

create policy turf_operating_hours_select_admin on public.turf_operating_hours
  for select to authenticated
  using (public.is_admin());

-- --- availability_blocks -------------------------------------------------------------

alter table public.availability_blocks enable row level security;

create policy availability_blocks_select_owner on public.availability_blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = availability_blocks.turf_id and to_.user_id = auth.uid()
    )
  );

create policy availability_blocks_select_admin on public.availability_blocks
  for select to authenticated
  using (public.is_admin());

-- --- pricing_rules ---------------------------------------------------------------------

alter table public.pricing_rules enable row level security;

create policy pricing_rules_select_owner on public.pricing_rules
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = pricing_rules.turf_id and to_.user_id = auth.uid()
    )
  );

create policy pricing_rules_select_admin on public.pricing_rules
  for select to authenticated
  using (public.is_admin());

-- --- bookings ---------------------------------------------------------------------------

alter table public.bookings enable row level security;

create policy bookings_select_owner on public.bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.turfs t
      join public.turf_owners to_ on to_.id = t.owner_id
      where t.id = bookings.turf_id and to_.user_id = auth.uid()
    )
  );

create policy bookings_select_admin on public.bookings
  for select to authenticated
  using (public.is_admin());

-- --- notifications -----------------------------------------------------------------------

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_select_admin on public.notifications
  for select to authenticated
  using (public.is_admin());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- audit_logs (append-only; select for admin only, no update/delete policies) -----------

alter table public.audit_logs enable row level security;

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- --- platform_settings (admin only) ---------------------------------------------------------

alter table public.platform_settings enable row level security;

create policy platform_settings_select_admin on public.platform_settings
  for select to authenticated
  using (public.is_admin());

create policy platform_settings_update_admin on public.platform_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
