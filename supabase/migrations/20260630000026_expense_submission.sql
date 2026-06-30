-- =============================================================================
-- Group expenses by submission batch: every time a field officer / limited
-- admin submits their drafts, the batch shares a submission_id + submitted_at
-- so accounting can view totals per submission.
-- =============================================================================
alter table public.expenses
  add column if not exists submission_id uuid,
  add column if not exists submitted_at timestamptz;

create index if not exists idx_expenses_submission
  on public.expenses(submission_id);
