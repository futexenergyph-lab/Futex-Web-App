-- =============================================================================
-- Retail Purchases — over-the-counter retail orders (charger, enclosure,
-- extension, supplies, others). Accounting/Management records them, then submits
-- them "to the account as profit"; submitted rows reflect in Payments and
-- Profitability under the "Retail Purchase" category.
-- =============================================================================
create table if not exists public.retail_purchases (
  id              uuid primary key default gen_random_uuid(),
  purchase_date   date not null default current_date,
  type            text not null default 'others',   -- charger|enclosure|extension|supplies|others
  description     text,
  amount          numeric(12,2) not null check (amount >= 0),
  status          text not null default 'recorded',  -- 'recorded' | 'submitted'
  created_by      uuid references public.profiles(id) on delete set null,
  created_by_name text,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_retail_purchases_date on public.retail_purchases(purchase_date);
create index if not exists idx_retail_purchases_status on public.retail_purchases(status);

alter table public.retail_purchases enable row level security;

drop policy if exists retail_purchases_all on public.retail_purchases;
create policy retail_purchases_all on public.retail_purchases
  for all using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());
