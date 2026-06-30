-- =============================================================================
-- Backfill installer_done_at for jobs installers completed before the
-- per-actor done split, so every installer's Client Master List reflects their
-- past completed installations.
-- =============================================================================
update public.bookings
set installer_done_at = installation_done_at
where installer_done_at is null
  and installation_done_at is not null
  and assigned_installer_id is not null;
