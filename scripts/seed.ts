/**
 * FUTEX Energy Solution — demo user + sample data seed.
 *
 * Run AFTER applying the SQL migrations and supabase/seed.sql (pricing).
 * This creates one auth user per role and a few sample bookings so every
 * dashboard has data on first run.
 *
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD ?? "Futex2026!";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Role = "admin" | "field_officer" | "installer" | "accounting";

const demoUsers: { email: string; full_name: string; role: Role; phone: string }[] = [
  { email: "admin@futexenergy.ph",      full_name: "Management Admin",  role: "admin",         phone: "0961-449-6825" },
  { email: "officer@futexenergy.ph",    full_name: "Field Officer One", role: "field_officer", phone: "0968-477-2475" },
  { email: "installer@futexenergy.ph",  full_name: "Installer One",     role: "installer",     phone: "0961-449-6826" },
  { email: "accounting@futexenergy.ph", full_name: "Accounting One",    role: "accounting",    phone: "0968-477-2476" },
];

async function upsertUser(u: (typeof demoUsers)[number]): Promise<string> {
  // Try to create; if the user exists, look them up instead.
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role, phone: u.phone },
  });

  if (error) {
    // Already exists -> find by listing.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((x) => x.email === u.email);
    if (!existing) throw error;
    // Make sure the profile reflects the intended role.
    await admin.from("profiles").update({
      full_name: u.full_name,
      role: u.role,
      phone: u.phone,
    }).eq("id", existing.id);
    console.log(`= user exists: ${u.email}`);
    return existing.id;
  }

  // Ensure the profile row (created by trigger) carries the right role.
  await admin.from("profiles").update({
    full_name: u.full_name,
    role: u.role,
    phone: u.phone,
  }).eq("id", data.user!.id);

  console.log(`+ created user: ${u.email} (${u.role})`);
  return data.user!.id;
}

async function main() {
  const ids: Record<Role, string> = {} as Record<Role, string>;
  for (const u of demoUsers) {
    ids[u.role] = await upsertUser(u);
  }

  // Look up a couple of package/enclosure ids for the sample bookings.
  const { data: pkgs } = await admin.from("packages").select("id,name").limit(10);
  const { data: encs } = await admin.from("enclosures").select("id,name").limit(10);
  const pkg1 = pkgs?.find((p) => p.name === "Package 1")?.id ?? pkgs?.[0]?.id ?? null;
  const pkg3 = pkgs?.find((p) => p.name === "Package 3")?.id ?? pkgs?.[0]?.id ?? null;
  const enc1 = encs?.find((e) => e.name === "Standard Glass")?.id ?? encs?.[0]?.id ?? null;

  // Sample bookings spanning a few Kanban stages.
  const sampleBookings: Record<string, unknown>[] = [
    {
      client_name: "Juan Dela Cruz",
      address: "12 Mabini St, Quezon City",
      contact_number: "0917-123-4567",
      preferred_date: "2026-07-01",
      preferred_time: "09:00",
      preferred_package_id: pkg1,
      preferred_enclosure_id: enc1,
      source: "web" as const,
      status: "new" as const,
      created_by: ids.admin,
    },
    {
      client_name: "Maria Santos",
      address: "88 Rizal Ave, Makati City",
      contact_number: "0918-765-4321",
      preferred_date: "2026-07-02",
      preferred_time: "14:00",
      preferred_package_id: pkg3,
      preferred_enclosure_id: enc1,
      source: "manual" as const,
      status: "deployed" as const,
      assigned_field_officer_id: ids.field_officer,
      assigned_installer_id: ids.installer,
      deployed_at: new Date().toISOString(),
      created_by: ids.admin,
    },
  ];

  for (const b of sampleBookings) {
    const { error } = await admin.from("bookings").insert(b);
    if (error) console.warn(`! booking insert (${b.client_name}): ${error.message}`);
    else console.log(`+ booking: ${b.client_name} (${b.status})`);
  }

  console.log("\nDone. Demo login password:", password);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
