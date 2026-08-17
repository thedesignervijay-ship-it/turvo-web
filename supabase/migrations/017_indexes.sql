-- 017_indexes
-- Indexes for foreign keys and frequently filtered columns.
-- Reference: turvo_phase1_spec.md section 7 migration sequence, section 31
-- (pagination/search/filtering).

-- users
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_status on public.users (status);

-- turf_owners
create index if not exists idx_turf_owners_status on public.turf_owners (status);
create index if not exists idx_turf_owners_city on public.turf_owners (city);

-- master_categories / master_items
create index if not exists idx_master_categories_status on public.master_categories (status);
create index if not exists idx_master_items_category_id on public.master_items (category_id);
create index if not exists idx_master_items_status on public.master_items (status);

-- turfs
create index if not exists idx_turfs_owner_id on public.turfs (owner_id);
create index if not exists idx_turfs_status on public.turfs (status);
create index if not exists idx_turfs_approval_status on public.turfs (approval_status);
create index if not exists idx_turfs_city on public.turfs (city);
create index if not exists idx_turfs_created_at on public.turfs (created_at);

-- turf_images
create index if not exists idx_turf_images_turf_id on public.turf_images (turf_id);

-- turf_master_items
create index if not exists idx_turf_master_items_turf_id on public.turf_master_items (turf_id);
create index if not exists idx_turf_master_items_item_id on public.turf_master_items (master_item_id);

-- turf_sports
create index if not exists idx_turf_sports_turf_id on public.turf_sports (turf_id);
create index if not exists idx_turf_sports_sport_id on public.turf_sports (sport_id);

-- courts
create index if not exists idx_courts_turf_id on public.courts (turf_id);
create index if not exists idx_courts_sport_id on public.courts (sport_id);
create index if not exists idx_courts_status on public.courts (status);

-- turf_operating_hours
create index if not exists idx_turf_operating_hours_turf_id on public.turf_operating_hours (turf_id);

-- availability_blocks
create index if not exists idx_availability_blocks_turf_id on public.availability_blocks (turf_id);
create index if not exists idx_availability_blocks_court_id on public.availability_blocks (court_id);
create index if not exists idx_availability_blocks_start on public.availability_blocks (start_datetime);

-- pricing_rules
create index if not exists idx_pricing_rules_turf_id on public.pricing_rules (turf_id);
create index if not exists idx_pricing_rules_court_id on public.pricing_rules (court_id);
create index if not exists idx_pricing_rules_status on public.pricing_rules (status);

-- bookings
create index if not exists idx_bookings_turf_id on public.bookings (turf_id);
create index if not exists idx_bookings_court_id on public.bookings (court_id);
create index if not exists idx_bookings_sport_id on public.bookings (sport_id);
create index if not exists idx_bookings_booking_date on public.bookings (booking_date);
create index if not exists idx_bookings_status on public.bookings (booking_status);
create index if not exists idx_bookings_source on public.bookings (booking_source);
create index if not exists idx_bookings_created_by on public.bookings (created_by);
create index if not exists idx_bookings_created_at on public.bookings (created_at);

-- notifications
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_read on public.notifications (user_id, is_read);
create index if not exists idx_notifications_created_at on public.notifications (created_at);

-- audit_logs
create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at);
