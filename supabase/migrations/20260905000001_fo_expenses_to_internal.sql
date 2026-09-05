-- =============================================================================
-- Field officer expenses -> Internal Inputs.
-- When a field officer submits an expense tied to a client deployment, a
-- matching cost line is copied into client_financials (owner-only), so the
-- Financial Report (Per Client) reflects it automatically. A security-definer
-- trigger does the copy because client_financials is owner-locked by RLS.
-- =============================================================================

-- Dedupe marker: each expense is copied at most once.
alter table public.client_financials
  add column if not exists source_expense_id uuid;
create unique index if not exists idx_client_financials_source_expense
  on public.client_financials(source_expense_id);

-- Display label for an accounting expense type (mirrors EXPENSE_TYPE_LABELS).
create or replace function public.expense_type_label(t text)
returns text language sql immutable as $$
  select case t
    when 'meals' then 'Meals'
    when 'transportation' then 'Transportation, Fuels and Tolls'
    when 'utilities' then 'Rent, Lease and Utilities'
    when 'labors' then 'Labors'
    when 'repairs_maintenance' then 'Repairs & Maintenance'
    when 'supplies' then 'Office Supplies and Materials'
    when 'salaries_wages' then 'Salaries and Wages'
    when 'professional_fees' then 'Professional Fees'
    when 'marketing_advertising' then 'Marketing and Advertising'
    when 'rental' then 'Rent, Lease and Utilities'
    when 'others' then 'Miscellaneous'
    else coalesce(t, 'Miscellaneous')
  end
$$;

create or replace function public.copy_fo_expense_to_internal()
returns trigger
language plpgsql security definer set search_path = public as $$
declare officer record;
begin
  if new.booking_id is not null
     and new.status = 'submitted'
     and old.status = 'draft' then
    select full_name, role into officer
      from profiles where id = new.created_by;
    -- Only field officer submissions flow into Internal Inputs.
    if officer.role = 'field_officer' then
      insert into client_financials
        (booking_id, entry_date, project_name, expense_type, description,
         amount, charge_to, remarks, created_by, created_by_name,
         source_expense_id)
      values
        (new.booking_id, new.expense_date, null,
         expense_type_label(new.type), coalesce(new.description, ''),
         new.amount, null,
         'Field officer expense' || coalesce(' — ' || officer.full_name, ''),
         new.created_by, coalesce(officer.full_name, 'Field Officer'), new.id)
      on conflict (source_expense_id) do nothing;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_expenses_copy_internal on public.expenses;
create trigger trg_expenses_copy_internal
  after update on public.expenses
  for each row execute function public.copy_fo_expense_to_internal();

-- One-time backfill: client-tied field officer expenses already submitted
-- before this trigger existed.
insert into public.client_financials
  (booking_id, entry_date, project_name, expense_type, description, amount,
   charge_to, remarks, created_by, created_by_name, source_expense_id)
select e.booking_id, e.expense_date, null,
       public.expense_type_label(e.type), coalesce(e.description, ''),
       e.amount, null,
       'Field officer expense' || coalesce(' — ' || p.full_name, ''),
       e.created_by, coalesce(p.full_name, 'Field Officer'), e.id
from public.expenses e
join public.profiles p on p.id = e.created_by
where e.booking_id is not null
  and e.status in ('submitted', 'admin_reviewed', 'finalized')
  and p.role = 'field_officer'
on conflict (source_expense_id) do nothing;
