-- =============================================================================
-- FUTEX Energy Solution — Phase 1: Storage buckets + policies
-- =============================================================================
-- Private buckets (access via signed URLs):
--   attendance     -> time in/out photo proof
--   job-updates    -> on-site progress photos
--   payment-proofs -> payment proof images
--   documentation  -> post-installation turnover docs
-- Public bucket:
--   profiles       -> avatar images
--
-- Convention: objects are stored under a path prefixed by the owner's uid,
-- e.g.  {auth.uid()}/{booking_id}/{filename}. Policies key off the first
-- path segment so users can only write into their own folder.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('attendance',     'attendance',     false),
  ('job-updates',    'job-updates',    false),
  ('payment-proofs', 'payment-proofs', false),
  ('documentation',  'documentation',  false),
  ('profiles',       'profiles',       true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Helper: the first folder segment of an object name must equal the user uid.
--   storage.foldername(name)[1] = auth.uid()::text
-- -----------------------------------------------------------------------------

-- ===== attendance =====
create policy "attendance read own or staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'attendance'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin() or public.is_accounting())
  );
create policy "attendance insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'attendance'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== job-updates =====
create policy "job-updates read own or staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'job-updates'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin() or public.is_accounting())
  );
create policy "job-updates insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'job-updates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== payment-proofs =====
create policy "payment-proofs read own or staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin() or public.is_accounting())
  );
create policy "payment-proofs insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== documentation =====
create policy "documentation read own or staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'documentation'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin() or public.is_accounting())
  );
create policy "documentation insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documentation'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== profiles (public bucket: anyone can read; users write their own) =====
create policy "profiles read all" on storage.objects
  for select using (bucket_id = 'profiles');
create policy "profiles insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "profiles update own" on storage.objects
  for update to authenticated using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
