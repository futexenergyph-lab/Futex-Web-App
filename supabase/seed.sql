-- =============================================================================
-- FUTEX Energy Solution — Phase 1: Seed data
-- =============================================================================
-- Inserts the live pricing (packages, enclosures, add-ons, settings) plus a few
-- demo users (one per role) and sample bookings so every dashboard has data.
--
-- Pricing is idempotent (re-runnable). Demo users are created against
-- auth.users with fixed UUIDs; password for every demo account is:
--     Futex2026!
-- (handled by the Node seed script in scripts/seed.ts — see README).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
insert into public.settings (key, value, description) values
  ('wire_rate_per_meter', '200',   'PHP charged per additional linear meter of wire'),
  ('daily_slots',         '["09:00","14:00"]', 'Standard daily deployment slots'),
  ('company_phone_1',     '"0961-449-6825"', 'Primary contact number'),
  ('company_phone_2',     '"0968-477-2475"', 'Secondary contact number'),
  ('facebook_url',        '"https://facebook.com/futexenergyph"', 'Official Facebook page')
on conflict (key) do update
  set value = excluded.value, description = excluded.description;

-- -----------------------------------------------------------------------------
-- Installation packages
-- -----------------------------------------------------------------------------
-- Standard 4 packages
insert into public.packages
  (name, description, inclusions, base_price, enclosure_included, is_promo, original_price, sort_order, active)
values
  ('Package 1',
   'Installation + Futex Smart App',
   '["Installation","Futex Smart App"]'::jsonb,
   25000, false, false, null, 1, true),
  ('Package 2',
   'Installation + Smart App + Enclosure (no stand)',
   '["Installation","Futex Smart App","Enclosure (no stand)"]'::jsonb,
   35000, true, false, null, 2, true),
  ('Package 3',
   'Installation + Smart App + Enclosure + Metal stand',
   '["Installation","Futex Smart App","Enclosure","Metal stand"]'::jsonb,
   45000, true, false, null, 3, true),
  ('Package 4',
   'Smart Charger + Smart App + Enclosure + Metal stand',
   '["Smart Charger","Futex Smart App","Enclosure","Metal stand"]'::jsonb,
   55000, true, false, null, 4, true)
on conflict do nothing;

-- Two advertised promo "headline" packages
insert into public.packages
  (name, description, inclusions, base_price, enclosure_included, is_promo, original_price, sort_order, active)
values
  ('Standard EV Charger Installation (2-Way Protection)',
   'Standard EV charger installation with 2-way protection',
   '["Standard EV Charger Installation","2-Way Protection"]'::jsonb,
   20000, false, true, 25000, 5, true),
  ('Futex Smart EV Charger Installation (3-Way Protection)',
   'Futex Smart EV charger installation with 3-way protection',
   '["Futex Smart EV Charger Installation","3-Way Protection","Futex Smart App"]'::jsonb,
   25000, false, true, 30000, 6, true)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Enclosure types (metal enclosure protection the client selects)
-- -----------------------------------------------------------------------------
insert into public.enclosures (name, description, price, sort_order, active) values
  ('Full Glass Premium Box', 'Full glass premium protective box', 13000, 1, true),
  ('Full Metal Cybertruck',  'Full metal Cybertruck-style enclosure', 10000, 2, true),
  ('Standard Glass',         'Standard glass enclosure', 10000, 3, true)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Add-ons (box only)
-- -----------------------------------------------------------------------------
insert into public.addons (name, description, price, sort_order, active) values
  ('Futex Smart Charger',     'Futex smart charger unit (box only)', 20000, 1, true),
  ('Enclosure Box (no stand)','Enclosure box without stand', 10000, 2, true),
  ('Stand for Cybertruck Box','Metal stand for Cybertruck box', 10000, 3, true)
on conflict do nothing;
