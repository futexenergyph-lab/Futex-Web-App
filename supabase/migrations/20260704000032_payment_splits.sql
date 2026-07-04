-- Split payments: a single payment can be paid with multiple methods
-- (e.g. half cash, half bank transfer). The breakdown is stored as
-- [{ method, amount }]; the row's `method` stays a representative value.
alter table public.payments
  add column if not exists splits jsonb;
