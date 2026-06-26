-- =============================================================================
-- Job order change requests
-- A field officer can ask management to unlock a submitted/locked job order
-- before editing or voiding it. Management approves the request on the
-- bookings Kanban ("Allow request") before any changes are permitted.
-- =============================================================================
alter table public.job_orders
  add column if not exists change_requested_at  timestamptz,
  add column if not exists change_request_reason text,
  add column if not exists change_approved_at   timestamptz,
  add column if not exists change_approved_by    uuid references public.profiles(id) on delete set null;

create index if not exists idx_job_orders_change_pending
  on public.job_orders(booking_id)
  where change_requested_at is not null and change_approved_at is null;
