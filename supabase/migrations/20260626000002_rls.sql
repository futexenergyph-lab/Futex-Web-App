-- =============================================================================
-- FUTEX Energy Solution — Phase 1: Row Level Security
-- =============================================================================
-- Access model:
--   admin          -> full access to everything
--   accounting     -> read-only on operations + full access to payments
--   field_officer  -> only rows assigned to / created by them
--   installer      -> only rows assigned to them
--   anon (public)  -> read active pricing; insert a web booking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- -----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.is_accounting()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'accounting' and active
  );
$$;

-- Is the current user assigned to (or the creator of) this booking?
create or replace function public.is_assigned_to_booking(b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = b_id
      and (
        b.assigned_field_officer_id = auth.uid()
        or b.assigned_installer_id = auth.uid()
        or b.created_by = auth.uid()
      )
  );
$$;

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.packages       enable row level security;
alter table public.enclosures     enable row level security;
alter table public.addons         enable row level security;
alter table public.settings       enable row level security;
alter table public.bookings       enable row level security;
alter table public.job_orders     enable row level security;
alter table public.attendance     enable row level security;
alter table public.job_updates    enable row level security;
alter table public.payments       enable row level security;
alter table public.documentation  enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
-- Read: own row; admin + accounting can read all (need officer names).
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or public.is_admin() or public.is_accounting()
  );

-- Update: own row (role change blocked at app layer) or admin.
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Insert: admin can create profiles directly; the signup trigger is SECURITY
-- DEFINER so it bypasses RLS for normal sign-ups.
create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- =============================================================================
-- Pricing tables: public reads active rows; only admin writes.
-- =============================================================================
-- packages
create policy packages_select_public on public.packages
  for select using (active or public.is_admin());
create policy packages_write_admin on public.packages
  for all using (public.is_admin()) with check (public.is_admin());

-- enclosures
create policy enclosures_select_public on public.enclosures
  for select using (active or public.is_admin());
create policy enclosures_write_admin on public.enclosures
  for all using (public.is_admin()) with check (public.is_admin());

-- addons
create policy addons_select_public on public.addons
  for select using (active or public.is_admin());
create policy addons_write_admin on public.addons
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: readable by any authenticated user (pricing engine needs wire_rate);
-- only admin writes. Also readable by anon for the public pricing page.
create policy settings_select_all on public.settings
  for select using (true);
create policy settings_write_admin on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- bookings
-- =============================================================================
-- Public booking form: anon/authenticated may insert a web booking only.
create policy bookings_insert_public on public.bookings
  for insert
  with check (
    -- Public web submissions must be source='web' & status='new' & unassigned.
    (source = 'web' and status = 'new'
       and assigned_field_officer_id is null
       and assigned_installer_id is null)
    -- Admins may create bookings with any values.
    or public.is_admin()
  );

-- Read: admin + accounting see all; officers/installers see assigned/created.
create policy bookings_select on public.bookings
  for select using (
    public.is_admin()
    or public.is_accounting()
    or assigned_field_officer_id = auth.uid()
    or assigned_installer_id = auth.uid()
    or created_by = auth.uid()
  );

-- Update: admin anything; assigned officer/installer may update their booking
-- (e.g. status progression). Accounting is read-only -> no update policy.
create policy bookings_update_admin on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

create policy bookings_update_assigned on public.bookings
  for update using (
    assigned_field_officer_id = auth.uid()
    or assigned_installer_id = auth.uid()
  )
  with check (
    assigned_field_officer_id = auth.uid()
    or assigned_installer_id = auth.uid()
  );

create policy bookings_delete_admin on public.bookings
  for delete using (public.is_admin());

-- =============================================================================
-- job_orders
-- =============================================================================
create policy job_orders_select on public.job_orders
  for select using (
    public.is_admin()
    or public.is_accounting()
    or field_officer_id = auth.uid()
    or public.is_assigned_to_booking(booking_id)
  );

create policy job_orders_insert on public.job_orders
  for insert with check (
    public.is_admin()
    or (field_officer_id = auth.uid() and public.is_assigned_to_booking(booking_id))
  );

create policy job_orders_update on public.job_orders
  for update using (
    public.is_admin()
    or (field_officer_id = auth.uid() and status <> 'locked')
  )
  with check (
    public.is_admin() or field_officer_id = auth.uid()
  );

create policy job_orders_delete_admin on public.job_orders
  for delete using (public.is_admin());

-- =============================================================================
-- attendance  (own rows only; admin + accounting read all for HR/payroll)
-- =============================================================================
create policy attendance_select on public.attendance
  for select using (
    user_id = auth.uid() or public.is_admin() or public.is_accounting()
  );

create policy attendance_insert_self on public.attendance
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy attendance_delete_admin on public.attendance
  for delete using (public.is_admin());

-- =============================================================================
-- job_updates  (assigned users post; admin/accounting + assigned read)
-- =============================================================================
create policy job_updates_select on public.job_updates
  for select using (
    public.is_admin()
    or public.is_accounting()
    or user_id = auth.uid()
    or public.is_assigned_to_booking(booking_id)
  );

create policy job_updates_insert on public.job_updates
  for insert with check (
    public.is_admin()
    or (user_id = auth.uid() and public.is_assigned_to_booking(booking_id))
  );

create policy job_updates_delete_admin on public.job_updates
  for delete using (public.is_admin());

-- =============================================================================
-- payments  (field officer confirms; accounting + admin full)
-- =============================================================================
create policy payments_select on public.payments
  for select using (
    public.is_admin()
    or public.is_accounting()
    or confirmed_by_field_officer_id = auth.uid()
    or public.is_assigned_to_booking(booking_id)
  );

create policy payments_insert on public.payments
  for insert with check (
    public.is_admin()
    or public.is_accounting()
    or (confirmed_by_field_officer_id = auth.uid()
        and public.is_assigned_to_booking(booking_id))
  );

create policy payments_update on public.payments
  for update using (
    public.is_admin()
    or public.is_accounting()
    or confirmed_by_field_officer_id = auth.uid()
  )
  with check (
    public.is_admin()
    or public.is_accounting()
    or confirmed_by_field_officer_id = auth.uid()
  );

create policy payments_delete_admin on public.payments
  for delete using (public.is_admin());

-- =============================================================================
-- documentation
-- =============================================================================
create policy documentation_select on public.documentation
  for select using (
    public.is_admin()
    or public.is_accounting()
    or field_officer_id = auth.uid()
    or public.is_assigned_to_booking(booking_id)
  );

create policy documentation_insert on public.documentation
  for insert with check (
    public.is_admin()
    or (field_officer_id = auth.uid() and public.is_assigned_to_booking(booking_id))
  );

create policy documentation_update on public.documentation
  for update using (
    public.is_admin() or field_officer_id = auth.uid()
  )
  with check (
    public.is_admin() or field_officer_id = auth.uid()
  );

create policy documentation_delete_admin on public.documentation
  for delete using (public.is_admin());
