-- =============================================================================
-- Owner + HR roles
--   owner -> identical full access to admin/management
--   hr    -> dedicated dashboard exposing only the HR (attendance) module
-- NOTE: when applied via the Management API each statement runs in its own
-- transaction, so the new enum values are committed before the functions /
-- policies that reference them are created.
-- =============================================================================
alter type public.user_role add value if not exists 'owner';
alter type public.user_role add value if not exists 'hr';

-- Owner is treated everywhere admin is.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner') and active
  );
$$;

-- HR helper (attendance / payroll read access).
create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'hr' and active
  );
$$;

-- Let HR read the data the attendance module needs.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or public.is_admin() or public.is_accounting() or public.is_hr()
  );

drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  for select using (
    user_id = auth.uid() or public.is_admin() or public.is_accounting() or public.is_hr()
  );

drop policy if exists "attendance read own or staff" on storage.objects;
create policy "attendance read own or staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'attendance'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin() or public.is_accounting() or public.is_hr())
  );
