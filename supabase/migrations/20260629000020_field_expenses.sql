-- =============================================================================
-- Let field officers record their own expenses from the field. They can insert,
-- view, and delete only their own rows; admin/accounting still see everything
-- via the existing expenses_all policy (RLS policies are OR-combined).
-- =============================================================================
drop policy if exists expenses_insert_own on public.expenses;
create policy expenses_insert_own on public.expenses
  for insert with check (created_by = auth.uid());

drop policy if exists expenses_select_own on public.expenses;
create policy expenses_select_own on public.expenses
  for select using (created_by = auth.uid());

drop policy if exists expenses_delete_own on public.expenses;
create policy expenses_delete_own on public.expenses
  for delete using (created_by = auth.uid());
