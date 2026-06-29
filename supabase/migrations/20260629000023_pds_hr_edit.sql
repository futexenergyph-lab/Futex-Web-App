-- =============================================================================
-- Let HR / Management / Owner maintain any employee's Personal Data Sheet from
-- the 201 files (edit details + upload the 3:4 photo).
-- =============================================================================
drop policy if exists pds_insert on public.personal_data_sheets;
create policy pds_insert on public.personal_data_sheets
  for insert with check (
    user_id = auth.uid() or public.is_hr() or public.is_admin()
  );

drop policy if exists pds_update on public.personal_data_sheets;
create policy pds_update on public.personal_data_sheets
  for update using (
    user_id = auth.uid() or public.is_hr() or public.is_admin()
  ) with check (
    user_id = auth.uid() or public.is_hr() or public.is_admin()
  );

-- HR/admin may upload PDS photos for an employee into the public profiles bucket.
drop policy if exists "profiles insert hr admin" on storage.objects;
create policy "profiles insert hr admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profiles' and (public.is_hr() or public.is_admin())
  );
drop policy if exists "profiles update hr admin" on storage.objects;
create policy "profiles update hr admin" on storage.objects
  for update to authenticated using (
    bucket_id = 'profiles' and (public.is_hr() or public.is_admin())
  );
