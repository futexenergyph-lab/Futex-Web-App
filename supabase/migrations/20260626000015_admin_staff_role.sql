-- =============================================================================
-- Limited "Admin" role (admin_staff)
-- A restricted operations role beneath Management. Module access is enforced
-- in the app (routing + nav + per-page scoping). At the data layer it is
-- treated like admin so its allowed read pages work; the sensitive pages
-- (Settings, HR, Profitability) and write actions remain app-gated to
-- Management/Owner.
-- =============================================================================
alter type public.user_role add value if not exists 'admin_staff';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner', 'admin_staff') and active
  );
$$;
