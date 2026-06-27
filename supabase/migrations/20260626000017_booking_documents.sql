-- =============================================================================
-- Booking documents (commissioning checklist PDFs, etc.)
-- A generated/uploaded document attached to a booking. Surfaced in the
-- Client Master List "Documents" section and downloadable.
-- =============================================================================
create table if not exists public.booking_documents (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  kind         text not null default 'commissioning',
  title        text not null,
  storage_path text not null,
  data         jsonb,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_booking_documents_booking
  on public.booking_documents(booking_id);

alter table public.booking_documents enable row level security;

drop policy if exists booking_documents_select on public.booking_documents;
create policy booking_documents_select on public.booking_documents
  for select using (
    public.is_admin()
    or public.is_accounting()
    or created_by = auth.uid()
    or public.is_assigned_to_booking(booking_id)
  );

drop policy if exists booking_documents_insert on public.booking_documents;
create policy booking_documents_insert on public.booking_documents
  for insert with check (
    public.is_admin()
    or (created_by = auth.uid() and public.is_assigned_to_booking(booking_id))
  );

drop policy if exists booking_documents_delete on public.booking_documents;
create policy booking_documents_delete on public.booking_documents
  for delete using (public.is_admin() or created_by = auth.uid());

-- Private storage bucket for the document files.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents insert staff" on storage.objects;
create policy "documents insert staff" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "documents read own or admin" on storage.objects;
create policy "documents read own or admin" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents'
    and (owner = auth.uid() or public.is_admin() or public.is_accounting())
  );
