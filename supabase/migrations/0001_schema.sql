-- =============================================================================
-- FUTEX Energy Solution — Phase 1: Schema
-- Postgres / Supabase
-- =============================================================================
-- This migration creates all core tables, enums, indexes, and the
-- `updated_at` auto-touch trigger. RLS policies live in 0002_rls.sql and
-- Storage buckets/policies in 0003_storage.sql.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
-- Enums
-- =============================================================================

-- App roles
do $$ begin
  create type public.user_role as enum ('admin', 'field_officer', 'installer', 'accounting');
exception when duplicate_object then null; end $$;

-- Booking lifecycle (mirrors the admin Kanban columns)
do $$ begin
  create type public.booking_status as enum (
    'new', 'scheduled', 'deployed', 'on_site', 'in_progress', 'completed', 'paid', 'closed'
  );
exception when duplicate_object then null; end $$;

-- Where a booking originated
do $$ begin
  create type public.booking_source as enum ('manual', 'web');
exception when duplicate_object then null; end $$;

-- Attendance punch type
do $$ begin
  create type public.attendance_type as enum ('time_in', 'time_out');
exception when duplicate_object then null; end $$;

-- Job order lifecycle
do $$ begin
  create type public.job_order_status as enum ('draft', 'submitted', 'locked');
exception when duplicate_object then null; end $$;

-- Payment method
do $$ begin
  create type public.payment_method as enum ('cash', 'check', 'credit_card', 'bank_transfer');
exception when duplicate_object then null; end $$;

-- Payment state
do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Shared updated_at trigger
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles  (1:1 with auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'field_officer',
  phone       text,
  photo_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'field_officer'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Pricing tables  (admin-editable; public marketing site reads these live)
-- =============================================================================
create table if not exists public.packages (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  inclusions         jsonb not null default '[]'::jsonb,   -- array of strings
  base_price         numeric(12,2) not null check (base_price >= 0),
  enclosure_included boolean not null default false,
  is_promo           boolean not null default false,
  original_price     numeric(12,2),                        -- "was" price for promos
  sort_order         integer not null default 0,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_packages_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

create table if not exists public.enclosures (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(12,2) not null check (price >= 0),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_enclosures_updated_at
  before update on public.enclosures
  for each row execute function public.set_updated_at();

create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(12,2) not null check (price >= 0),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_addons_updated_at
  before update on public.addons
  for each row execute function public.set_updated_at();

-- Key/value settings (e.g. wire_rate_per_meter = 200)
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- bookings
-- =============================================================================
create table if not exists public.bookings (
  id                          uuid primary key default gen_random_uuid(),
  client_name                 text not null,
  address                     text not null,
  contact_number              text not null,
  preferred_date              date,
  preferred_time              text,                         -- "09:00" / "14:00" daily slots
  preferred_package_id        uuid references public.packages(id) on delete set null,
  preferred_enclosure_id      uuid references public.enclosures(id) on delete set null,
  enclosure_protection_notes  text,
  notes                       text,
  source                      public.booking_source not null default 'manual',
  status                      public.booking_status not null default 'new',
  assigned_field_officer_id   uuid references public.profiles(id) on delete set null,
  assigned_installer_id       uuid references public.profiles(id) on delete set null,
  deployed_at                 timestamptz,
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_bookings_status        on public.bookings(status);
create index if not exists idx_bookings_field_officer on public.bookings(assigned_field_officer_id);
create index if not exists idx_bookings_installer     on public.bookings(assigned_installer_id);
create index if not exists idx_bookings_preferred_date on public.bookings(preferred_date);

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- job_orders  (locked final pricing, computed on site)
-- =============================================================================
create table if not exists public.job_orders (
  id                     uuid primary key default gen_random_uuid(),
  booking_id             uuid not null references public.bookings(id) on delete cascade,
  field_officer_id       uuid references public.profiles(id) on delete set null,
  package_id             uuid references public.packages(id) on delete set null,
  enclosure_id           uuid references public.enclosures(id) on delete set null,
  add_separate_enclosure boolean not null default false,   -- charge enclosure as its own line?
  additional_wire_meters numeric(10,2) not null default 0 check (additional_wire_meters >= 0),
  wire_rate_per_meter    numeric(12,2) not null default 200,  -- snapshot of rate at submit time
  additional_job_works   jsonb not null default '[]'::jsonb,  -- [{description, amount}]
  computed_subtotal      numeric(12,2) not null default 0,
  final_total            numeric(12,2) not null default 0,
  notes                  text,
  status                 public.job_order_status not null default 'draft',
  submitted_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_job_orders_booking       on public.job_orders(booking_id);
create index if not exists idx_job_orders_field_officer on public.job_orders(field_officer_id);

create trigger trg_job_orders_updated_at
  before update on public.job_orders
  for each row execute function public.set_updated_at();

-- =============================================================================
-- attendance  (time in / out with photo proof + geolocation)
-- =============================================================================
create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  type       public.attendance_type not null,
  timestamp  timestamptz not null default now(),
  photo_url  text,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_user on public.attendance(user_id);
create index if not exists idx_attendance_ts   on public.attendance("timestamp");

-- =============================================================================
-- job_updates  (on-site progress posts with pictures -> admin live status)
-- =============================================================================
create table if not exists public.job_updates (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text,
  photo_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_updates_booking on public.job_updates(booking_id);
create index if not exists idx_job_updates_user    on public.job_updates(user_id);

-- =============================================================================
-- payments
-- =============================================================================
create table if not exists public.payments (
  id                            uuid primary key default gen_random_uuid(),
  job_order_id                  uuid references public.job_orders(id) on delete set null,
  booking_id                    uuid not null references public.bookings(id) on delete cascade,
  amount                        numeric(12,2) not null check (amount >= 0),
  method                        public.payment_method not null,
  reference_no                  text,
  proof_url                     text,
  confirmed_by_field_officer_id uuid references public.profiles(id) on delete set null,
  status                        public.payment_status not null default 'pending',
  paid_at                       timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index if not exists idx_payments_booking   on public.payments(booking_id);
create index if not exists idx_payments_job_order  on public.payments(job_order_id);
create index if not exists idx_payments_status     on public.payments(status);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =============================================================================
-- documentation  (post-installation turnover docs)
-- =============================================================================
create table if not exists public.documentation (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  field_officer_id uuid references public.profiles(id) on delete set null,
  file_urls        jsonb not null default '[]'::jsonb,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_documentation_booking on public.documentation(booking_id);

create trigger trg_documentation_updated_at
  before update on public.documentation
  for each row execute function public.set_updated_at();
