-- =============================================================================
-- Final-submission marker for a client's financial report (Owner-only).
-- When finalized_at is set the report is locked; the Owner can reopen it.
-- =============================================================================

create table if not exists public.client_financial_status (
  booking_id        uuid primary key references public.bookings(id) on delete cascade,
  finalized_at      timestamptz,
  finalized_by      uuid references public.profiles(id) on delete set null,
  finalized_by_name text,
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_client_financial_status_updated_at on public.client_financial_status;
create trigger trg_client_financial_status_updated_at
  before update on public.client_financial_status
  for each row execute function public.set_updated_at();

alter table public.client_financial_status enable row level security;

drop policy if exists client_financial_status_select on public.client_financial_status;
create policy client_financial_status_select on public.client_financial_status
  for select using (public.is_owner());

drop policy if exists client_financial_status_insert on public.client_financial_status;
create policy client_financial_status_insert on public.client_financial_status
  for insert with check (public.is_owner());

drop policy if exists client_financial_status_update on public.client_financial_status;
create policy client_financial_status_update on public.client_financial_status
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists client_financial_status_delete on public.client_financial_status;
create policy client_financial_status_delete on public.client_financial_status
  for delete using (public.is_owner());
