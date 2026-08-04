-- =============================================================================
-- Internal Inputs — Owner-only ledger of internal cash & costs that are NOT
-- tied to a booking (capital injections, owner's draw, operating costs,
-- supplier payments). Deliberately separate from public.expenses so it never
-- appears in the staff/accounting expense flows.
-- =============================================================================

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and active
  );
$$;

create table if not exists public.internal_inputs (
  id             uuid primary key default gen_random_uuid(),
  entry_date     date not null default current_date,
  direction      text not null default 'out',   -- 'in' (money in) | 'out' (money out)
  category       text not null default 'Other',
  description    text not null default '',
  amount         numeric(14,2) not null default 0,
  payee          text,                           -- supplier / recipient / source
  reference_no   text,
  notes          text,
  attachment_path text,                          -- storage object path
  created_by     uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint internal_inputs_direction_chk check (direction in ('in', 'out'))
);

create index if not exists idx_internal_inputs_date
  on public.internal_inputs(entry_date desc);

drop trigger if exists trg_internal_inputs_updated_at on public.internal_inputs;
create trigger trg_internal_inputs_updated_at
  before update on public.internal_inputs
  for each row execute function public.set_updated_at();

alter table public.internal_inputs enable row level security;

-- Owner only: no other role can read or write these rows.
drop policy if exists internal_inputs_select on public.internal_inputs;
create policy internal_inputs_select on public.internal_inputs
  for select using (public.is_owner());

drop policy if exists internal_inputs_insert on public.internal_inputs;
create policy internal_inputs_insert on public.internal_inputs
  for insert with check (public.is_owner());

drop policy if exists internal_inputs_update on public.internal_inputs;
create policy internal_inputs_update on public.internal_inputs
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists internal_inputs_delete on public.internal_inputs;
create policy internal_inputs_delete on public.internal_inputs
  for delete using (public.is_owner());

-- Private bucket for receipts/attachments on internal entries.
insert into storage.buckets (id, name, public)
values ('internal-inputs', 'internal-inputs', false)
on conflict (id) do nothing;

drop policy if exists internal_inputs_objects_all on storage.objects;
create policy internal_inputs_objects_all on storage.objects
  for all
  using (bucket_id = 'internal-inputs' and public.is_owner())
  with check (bucket_id = 'internal-inputs' and public.is_owner());
