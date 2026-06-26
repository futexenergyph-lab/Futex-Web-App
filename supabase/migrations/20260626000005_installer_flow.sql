-- =============================================================================
-- Installer flow: deployment confirmation + installation-done tracking
-- =============================================================================
alter table public.bookings
  add column if not exists installer_confirmed_at timestamptz,
  add column if not exists installer_declined_at  timestamptz,
  add column if not exists installation_done_at   timestamptz;
