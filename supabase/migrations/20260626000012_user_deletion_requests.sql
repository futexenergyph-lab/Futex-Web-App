-- =============================================================================
-- User removal requests
-- Management/Admin cannot delete accounts directly — they raise a removal
-- request that the Owner approves (delete) or rejects (clear). Owner deletes
-- directly without a request.
-- =============================================================================
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by uuid references public.profiles(id) on delete set null;
