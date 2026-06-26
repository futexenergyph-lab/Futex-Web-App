-- =============================================================================
-- Employee 201 files
-- Private document store for each employee's HR file (contracts, IDs, etc.).
-- Objects are keyed by employee id: {employee_id}/{timestamp}-{filename}.
-- HR + management/admin/owner can read, upload, and delete.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('employee-201', 'employee-201', false)
on conflict (id) do nothing;

create policy "201 read hr or admin" on storage.objects
  for select to authenticated using (
    bucket_id = 'employee-201' and (public.is_hr() or public.is_admin())
  );
create policy "201 insert hr or admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'employee-201' and (public.is_hr() or public.is_admin())
  );
create policy "201 delete hr or admin" on storage.objects
  for delete to authenticated using (
    bucket_id = 'employee-201' and (public.is_hr() or public.is_admin())
  );
