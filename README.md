# FUTEX Energy Solution — Web App

Production MVP for FUTEX Energy Solution, a Philippine EV-charger installation
company. Public marketing site + internal operations platform that replaces the
current Google Sheets + Messenger workflow.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(Postgres, Auth, Storage, RLS, Realtime). Deploy target: Vercel.

> **Status:** All phases (1–8) implemented. `next build` passes.

---

## Build phases

1. ✅ Supabase schema + RLS + seed data (pricing)
2. ✅ Auth + role-based routing + layouts
3. ✅ Public marketing site + public booking form
4. ✅ Admin: bookings Kanban + deployment + utilization + live status + settings
5. ✅ Field Officer / Installer mobile dashboard
6. ✅ Accounting dashboard (payments + profitability + CSV + charts)
7. ✅ HR dashboard (attendance, hours, late flags)
8. ✅ Analytics / utilization

---

## Running locally

```bash
npm install
cp .env.example .env.local       # fill in your Supabase keys
# apply the SQL (see "Phase 1 — database" below), then seed demo data:
npm run seed
npm run dev                       # http://localhost:3000
```

Public site: `/`. Staff login: `/login` → role-based redirect to
`/admin`, `/field`, or `/accounting`.

## Project structure

```
app/
  (marketing)/        public site: home, about, services, packages, contact+booking
  (app)/
    admin/            kanban, deployment, utilization, live, analytics, hr, settings
    field/            my jobs, attendance, bookings/[id] (updates, job order, payment, docs)
    accounting/       payments, profitability
  login/  auth/signout
components/            ui/ (shadcn-style), admin/, field/, marketing/, charts, csv-export
lib/                  supabase clients, pricing engine, types, auth guards, queries, validation
supabase/             migrations/ + seed.sql
scripts/seed.ts       demo users + sample bookings
middleware.ts         session refresh + role route guards
```

The **pricing engine** lives in `lib/pricing.ts` and is the single source of
truth for job-order totals — used live in the field job-order form and
re-computed authoritatively server-side on submit (clients never set totals).

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

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add env vars (Project → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server only).
3. In Supabase: apply the migrations + `seed.sql`, enable **Realtime** on the
   `bookings`, `job_updates`, and `attendance` tables (Database → Replication),
   and confirm the Storage buckets exist (created by `0003_storage.sql`).
4. Deploy. The marketing pages (`/packages`, `/contact`) ISR-revalidate every
   60s so pricing edits in admin appear publicly within a minute.

## Assumptions made

- Booking `preferred_time` is a string (`"09:00"` / `"14:00"`) matching the two
  fixed daily deployment slots; capacity baseline is 5 officers × 2 slots = 10
  jobs/day.
- `job_orders.add_separate_enclosure` flags whether an enclosure is charged as
  its own line (true for Package 1 / upgrades; false when bundled in Pkg 2–4).
- `wire_rate_per_meter` is snapshotted onto each `job_order` at submit time so
  historical receipts stay correct if the rate later changes.
- Final job-order totals are **recomputed server-side** from DB prices on submit
  — the client total is display-only and never trusted.
- Booking status auto-advances from field actions: first on-site update →
  `on_site`, job-order submit → `in_progress`, documentation → `completed`,
  payment confirmed → `paid`. Admin can still drag any card on the Kanban.
- HR "late" flag is a simple heuristic: first morning time-in after 9:15 AM.
- Storage buckets are private; the app generates signed URLs. Objects live under
  a `{uid}/...` path so RLS scopes writes to the owner.
- The signup trigger reads `role` from auth user metadata; admins set roles when
  creating accounts in Settings → Users (service-role key required server-side).

## Recommended for phase 2

- **Receipts/PDF**: generate a printable job-order receipt + email/SMS to client.
- **Notifications**: push/SMS to officers on deployment (currently dashboard-only).
- **Edge-runtime note**: `@supabase/ssr` emits a benign `process.version` warning
  in middleware; consider the Node.js middleware runtime if it ever matters.
- **Audit log** of status changes and price edits; **soft-delete** for bookings.
- **Map/geofencing** on attendance to validate on-site time-in coordinates.
- **Multi-photo gallery** with lightbox in admin live status & HR (currently
  shows the first few thumbnails).
- **Tighter HR**: configurable schedules per officer; absence detection.
