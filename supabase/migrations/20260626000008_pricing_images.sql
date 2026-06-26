-- =============================================================================
-- Pricing images — admin-uploaded photos shown on the public pricing page
-- =============================================================================
alter table public.packages   add column if not exists image_url text;
alter table public.enclosures add column if not exists image_url text;
alter table public.addons     add column if not exists image_url text;

-- Public bucket for pricing photos (read by anyone; admins upload).
insert into storage.buckets (id, name, public)
values ('pricing', 'pricing', true)
on conflict (id) do nothing;

drop policy if exists "pricing insert admin" on storage.objects;
create policy "pricing insert admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pricing' and public.is_admin());

drop policy if exists "pricing update admin" on storage.objects;
create policy "pricing update admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'pricing' and public.is_admin());

drop policy if exists "pricing read public" on storage.objects;
create policy "pricing read public" on storage.objects
  for select using (bucket_id = 'pricing');
