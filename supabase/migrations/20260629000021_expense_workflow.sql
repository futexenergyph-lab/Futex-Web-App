-- =============================================================================
-- Expense approval workflow: field officer -> admin -> accounting.
--   draft           field officer is still adding (editable/deletable by them)
--   submitted       field officer submitted; awaiting admin review (locked to FO)
--   admin_reviewed  admin checked & forwarded; now in accounting (counts)
--   finalized       direct admin/accounting entry, or accounting-finalized
-- Field-officer expenses only count in accounting once status leaves
-- draft/submitted. booking_id links the expense to a deployment (null = Others).
-- =============================================================================
alter table public.expenses
  add column if not exists status text not null default 'finalized',
  add column if not exists booking_id uuid
    references public.bookings(id) on delete set null;

-- Field officers may edit their OWN expenses only while still a draft.
drop policy if exists expenses_update_own on public.expenses;
create policy expenses_update_own on public.expenses
  for update using (created_by = auth.uid() and status = 'draft')
  with check (created_by = auth.uid());
