-- =============================================================================
-- Audit logs — record every management/owner edit & delete so the Owner can
-- review them and "Redo" (undo) the action. before_data holds a full row
-- snapshot used to restore a delete or revert an update.
-- =============================================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  record_id   uuid not null,
  action      text not null,             -- 'update' | 'delete'
  label       text,                       -- human summary
  before_data jsonb,                       -- snapshot before the change
  after_data  jsonb,                        -- snapshot after (updates)
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  undone_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- Management + Owner (is_admin covers admin/owner/admin_staff; the Logs page is
-- gated to Owner at the app layer).
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (public.is_admin());
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert with check (public.is_admin());
drop policy if exists audit_logs_update on public.audit_logs;
create policy audit_logs_update on public.audit_logs
  for update using (public.is_admin()) with check (public.is_admin());
