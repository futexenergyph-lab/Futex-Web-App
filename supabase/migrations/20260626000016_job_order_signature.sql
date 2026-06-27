-- =============================================================================
-- Job order client signature
-- Stores the client's drawn signature (PNG data URL) captured at acceptance,
-- acknowledging receipt and acceptance of the job order terms.
-- =============================================================================
alter table public.job_orders
  add column if not exists signature text;
