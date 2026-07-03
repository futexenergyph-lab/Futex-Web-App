-- =============================================================================
-- Quotations — Management/Owner/Admin generate branded price quotations for
-- either an EV Charger installation or a Solar Solution. Each quotation stores
-- its line items and a generated PDF (in the private `quotations` bucket).
-- =============================================================================
create table if not exists public.quotations (
  id               uuid primary key default gen_random_uuid(),
  quote_no         text,
  type             text not null default 'ev',       -- 'ev' | 'solar'
  client_name      text not null,
  client_address   text,
  client_contact   text,
  client_email     text,
  items            jsonb not null default '[]',        -- [{description, qty, unit_price}]
  subtotal         numeric(12,2) not null default 0,
  vat_enabled      boolean not null default false,
  vat              numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  validity_days    integer not null default 30,
  notes            text,
  storage_path     text,
  prepared_by      uuid references public.profiles(id) on delete set null,
  prepared_by_name text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_quotations_created on public.quotations(created_at desc);

alter table public.quotations enable row level security;

-- Management / Owner / Admin only (is_admin covers admin/owner/admin_staff).
drop policy if exists quotations_all on public.quotations;
create policy quotations_all on public.quotations
  for all using (public.is_admin()) with check (public.is_admin());

-- Private bucket for the generated quotation PDFs.
insert into storage.buckets (id, name, public)
  values ('quotations', 'quotations', false)
  on conflict (id) do nothing;

drop policy if exists "quotations insert admin" on storage.objects;
create policy "quotations insert admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'quotations' and public.is_admin());

drop policy if exists "quotations read admin" on storage.objects;
create policy "quotations read admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'quotations' and public.is_admin());

drop policy if exists "quotations delete admin" on storage.objects;
create policy "quotations delete admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quotations' and public.is_admin());
