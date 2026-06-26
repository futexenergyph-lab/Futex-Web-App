# FUTEX Energy Solution — Web App

Production MVP for FUTEX Energy Solution, a Philippine EV-charger installation
company. Public marketing site + internal operations platform that replaces the
current Google Sheets + Messenger workflow.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(Postgres, Auth, Storage, RLS, Realtime). Deploy target: Vercel.

> **Status:** Phase 1 (database schema + RLS + seed) is in place. App code
> (auth, marketing site, dashboards) lands in later phases.

---

## Build phases

1. ✅ **Supabase schema + RLS + seed data (pricing)** ← _you are here_
2. ⬜ Auth + role-based routing + layouts
3. ⬜ Public marketing site + public booking form
4. ⬜ Admin: bookings Kanban + deployment
5. ⬜ Field Officer / Installer mobile dashboard
6. ⬜ Accounting dashboard
7. ⬜ HR dashboard
8. ⬜ Analytics / utilization

---

## Phase 1 — database

### Files

```
supabase/
  migrations/
    0001_schema.sql     -- enums, tables, indexes, updated_at + new-user triggers
    0002_rls.sql        -- row level security policies + role helper functions
    0003_storage.sql    -- storage buckets (attendance, job-updates, proofs, docs)
  seed.sql              -- pricing: packages, enclosures, add-ons, settings
scripts/
  seed.ts              -- demo users (1 per role) + sample bookings (uses service key)
```

### Apply it

**Option A — Supabase CLI (recommended):**

```bash
supabase db reset           # applies migrations/ then seed.sql
# or against a linked remote project:
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Option B — SQL editor:** paste `0001 → 0002 → 0003 → seed.sql` in order.

### Seed demo users + sample data

```bash
cp .env.example .env.local   # fill in Supabase URL + service-role key
npm install
npx tsx scripts/seed.ts
```

Demo accounts (password `Futex2026!`):

| Role          | Email                       |
|---------------|-----------------------------|
| admin         | admin@futexenergy.ph        |
| field_officer | officer@futexenergy.ph      |
| installer     | installer@futexenergy.ph    |
| accounting    | accounting@futexenergy.ph   |

---

## Data model overview

| Table           | Purpose |
|-----------------|---------|
| `profiles`      | 1:1 with `auth.users`; `role` drives access |
| `packages`      | Installation packages + promo headline packages (admin-editable) |
| `enclosures`    | Metal/glass enclosure protection options |
| `addons`        | Box-only add-ons |
| `settings`      | Key/value config — e.g. `wire_rate_per_meter = 200` |
| `bookings`      | Client bookings (web + manual); Kanban status |
| `job_orders`    | On-site final pricing (locked); wire + job works |
| `attendance`    | Time in/out with photo + geolocation |
| `job_updates`   | On-site progress posts with photos |
| `payments`      | Payment confirmation + proof |
| `documentation` | Post-installation turnover docs |

### Pricing engine (never hardcoded — read from these tables)

```
final_total =
    package.base_price
  + enclosure.price            (only if NOT bundled in the package, i.e.
                                Package 1 or an enclosure upgrade)
  + additional_wire_meters × settings.wire_rate_per_meter
  + Σ(additional_job_works[].amount)
```

The booking captures the client's *preferred* package + enclosure. The **final**
total is locked when the field officer submits the job order on site.

### Access model (RLS)

- **admin** — full access to everything.
- **accounting** — read-only on operations, full access to payments.
- **field_officer / installer** — only rows assigned to / created by them.
- **anon (public)** — read active pricing; insert a `source='web'` booking.

Enforced by Postgres RLS (`0002_rls.sql`) and — in later phases — Next.js
middleware route guards.

---

## Environment

See `.env.example`. You need a Supabase project URL, anon key, and (for seeding
/ server admin actions) the service-role key. **Never** expose the service-role
key to the browser.

---

## Assumptions & Phase 2 notes

- Booking `preferred_time` is stored as a string (`"09:00"` / `"14:00"`) to match
  the two fixed daily deployment slots.
- `job_orders.add_separate_enclosure` flags whether an enclosure should be
  charged as its own line (true for Package 1 / upgrades; false when bundled).
- `wire_rate_per_meter` is snapshotted onto each `job_order` at submit time so
  historical receipts stay correct if the rate changes later.
- Storage buckets are private; the app generates signed URLs. Objects are stored
  under a `{uid}/...` path so RLS can scope writes to the owner.
