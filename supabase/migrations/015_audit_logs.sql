-- 015_audit_logs
-- Append-only audit trail for critical state-changing actions.
-- Reference: turvo_phase1_spec.md section 24 (audit_logs).
-- No RLS update/delete policies are ever created for this table, and normal
-- application functionality never deletes rows.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete restrict,
  action varchar(100) not null,
  entity_type varchar(80) not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
