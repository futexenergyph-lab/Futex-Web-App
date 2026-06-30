-- =============================================================================
-- Per-actor deployment status: track the field officer and installer
-- separately. The installer's "done" updates only their own status; only the
-- field officer's completion moves the booking to completed (master list).
-- =============================================================================
alter table public.bookings
  add column if not exists field_officer_arrived_at timestamptz,
  add column if not exists installer_arrived_at timestamptz,
  add column if not exists installer_done_at timestamptz;
