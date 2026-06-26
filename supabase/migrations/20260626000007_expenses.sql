-- =============================================================================
-- Expenses / payables (outflows) — bills & payments
-- =============================================================================
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  type         text not null default 'others',
  description  text,
  amount       numeric(12,2) not null check (amount >= 0),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_expenses_type on public.expenses(type);

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- RLS: accounting + admin only.
alter table public.expenses enable row level security;

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all
  using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());
