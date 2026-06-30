-- =============================================================================
-- Announcements — Owner/Management/Admin broadcast messages to all users or a
-- selected set. Each user is prompted with a centered modal on release and
-- confirms ("read") it; a per-user read record drives the Notification Log
-- inbox and the one-time prompt.
-- =============================================================================
create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  message         text not null,
  audience        text not null default 'all',   -- 'all' | 'specific'
  created_by      uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_announcements_created on public.announcements(created_at desc);

-- Targeted recipients (only populated when audience = 'specific').
create table if not exists public.announcement_targets (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (announcement_id, user_id)
);

-- Per-user read receipts (a row exists once the user confirms the prompt).
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_reads enable row level security;

-- A user may see an announcement if they authored it (is_admin), if it targets
-- everyone, or if they are an explicit recipient.
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select using (
    public.is_admin()
    or audience = 'all'
    or exists (
      select 1 from public.announcement_targets t
      where t.announcement_id = id and t.user_id = auth.uid()
    )
  );
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements
  for insert with check (public.is_admin());
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements
  for delete using (public.is_admin());

drop policy if exists announcement_targets_select on public.announcement_targets;
create policy announcement_targets_select on public.announcement_targets
  for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists announcement_targets_insert on public.announcement_targets;
create policy announcement_targets_insert on public.announcement_targets
  for insert with check (public.is_admin());

drop policy if exists announcement_reads_select on public.announcement_reads;
create policy announcement_reads_select on public.announcement_reads
  for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists announcement_reads_insert on public.announcement_reads;
create policy announcement_reads_insert on public.announcement_reads
  for insert with check (user_id = auth.uid());
