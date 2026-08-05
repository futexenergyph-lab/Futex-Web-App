-- =============================================================================
-- Internal clients — Owner-only home for historical/imported clients so they
-- appear ONLY inside Internal Inputs, never in Management/Accounting modules.
-- The FINANCIAL_REPORT_MAY_2026 import is moved out of bookings/payments here
-- (same ids, so their client_financials lines keep working).
-- =============================================================================

create table if not exists public.internal_clients (
  id             uuid primary key default gen_random_uuid(),
  client_name    text not null,
  address        text,
  install_date   date,
  payment_amount numeric(14,2) not null default 0,
  payment_method text,
  payment_ref    text,
  notes          text,
  created_at     timestamptz not null default now()
);

alter table public.internal_clients enable row level security;

drop policy if exists internal_clients_select on public.internal_clients;
create policy internal_clients_select on public.internal_clients
  for select using (public.is_owner());
drop policy if exists internal_clients_insert on public.internal_clients;
create policy internal_clients_insert on public.internal_clients
  for insert with check (public.is_owner());
drop policy if exists internal_clients_update on public.internal_clients;
create policy internal_clients_update on public.internal_clients
  for update using (public.is_owner()) with check (public.is_owner());
drop policy if exists internal_clients_delete on public.internal_clients;
create policy internal_clients_delete on public.internal_clients
  for delete using (public.is_owner());

-- client_financials / status rows may now belong to an internal client, so
-- they can no longer hard-reference bookings.
alter table public.client_financials
  drop constraint if exists client_financials_booking_id_fkey;
alter table public.client_financial_status
  drop constraint if exists client_financial_status_booking_id_fkey;

-- Move the imported clients out of the shared tables (idempotent).
insert into public.internal_clients
  (id, client_name, address, install_date, payment_amount, payment_method, payment_ref, notes, created_at)
select b.id, b.client_name, b.address, b.preferred_date,
       coalesce((select sum(p.amount) from public.payments p
                 where p.booking_id = b.id and p.status = 'confirmed'), 0),
       (select p.method::text from public.payments p
        where p.booking_id = b.id order by p.created_at desc limit 1),
       (select p.reference_no from public.payments p
        where p.booking_id = b.id order by p.created_at desc limit 1),
       b.notes, b.created_at
from public.bookings b
where b.notes like '%FINANCIAL_REPORT_MAY_2026.xlsx%'
on conflict (id) do nothing;

delete from public.payments
  where booking_id in (select id from public.internal_clients);
delete from public.bookings
  where id in (select id from public.internal_clients);
