-- =============================================================================
-- Personal Data Sheet (PDS) — one per user (field officer / installer). Holds
-- HR personal information + in-case-of-emergency details + a 3:4 photo. The
-- user maintains their own; HR and admin can read all (surfaced in 201 files).
-- =============================================================================
create table if not exists public.personal_data_sheets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles(id) on delete cascade,
  photo_url  text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_data_sheets enable row level security;

drop policy if exists pds_select on public.personal_data_sheets;
create policy pds_select on public.personal_data_sheets
  for select using (
    user_id = auth.uid() or public.is_hr() or public.is_admin()
  );

drop policy if exists pds_insert on public.personal_data_sheets;
create policy pds_insert on public.personal_data_sheets
  for insert with check (user_id = auth.uid());

drop policy if exists pds_update on public.personal_data_sheets;
create policy pds_update on public.personal_data_sheets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
