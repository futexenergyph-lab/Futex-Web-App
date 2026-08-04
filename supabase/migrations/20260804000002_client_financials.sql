-- =============================================================================
-- Client financials — Owner-only, project-based expense tracking per client
-- (mirrors the "PROJECT-BASED EXPENSE TRACKING" sheet). Payment comes from the
-- existing payments table; these rows are the internal cost lines, and profit
-- is payment minus the sum of these.
-- =============================================================================

create table if not exists public.client_financials (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  entry_date   date,
  project_name text,
  expense_type text not null default 'Materials',
  description  text not null default '',
  amount       numeric(14,2) not null default 0,
  charge_to    text,
  remarks      text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_client_financials_booking
  on public.client_financials(booking_id);

drop trigger if exists trg_client_financials_updated_at on public.client_financials;
create trigger trg_client_financials_updated_at
  before update on public.client_financials
  for each row execute function public.set_updated_at();

alter table public.client_financials enable row level security;

drop policy if exists client_financials_select on public.client_financials;
create policy client_financials_select on public.client_financials
  for select using (public.is_owner());

drop policy if exists client_financials_insert on public.client_financials;
create policy client_financials_insert on public.client_financials
  for insert with check (public.is_owner());

drop policy if exists client_financials_update on public.client_financials;
create policy client_financials_update on public.client_financials
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists client_financials_delete on public.client_financials;
create policy client_financials_delete on public.client_financials
  for delete using (public.is_owner());
