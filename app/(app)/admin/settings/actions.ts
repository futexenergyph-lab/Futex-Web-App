"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

function revalidatePricing() {
  revalidatePath("/admin/settings");
  revalidatePath("/packages");
  revalidatePath("/contact");
}

// ---- Packages ----
export async function upsertPackage(input: {
  id?: string;
  name: string;
  description: string;
  inclusions: string[];
  base_price: number;
  enclosure_included: boolean;
  is_promo: boolean;
  original_price: number | null;
  active: boolean;
  image_url?: string | null;
}) {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { id, ...fields } = input;
  const { error } = id
    ? await supabase.from("packages").update(fields).eq("id", id)
    : await supabase.from("packages").insert(fields);
  if (error) return { error: error.message };
  revalidatePricing();
  return { ok: true };
}

// ---- Enclosures ----
export async function upsertEnclosure(input: {
  id?: string;
  name: string;
  price: number;
  active: boolean;
  image_url?: string | null;
}) {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { id, ...fields } = input;
  const { error } = id
    ? await supabase.from("enclosures").update(fields).eq("id", id)
    : await supabase.from("enclosures").insert(fields);
  if (error) return { error: error.message };
  revalidatePricing();
  return { ok: true };
}

// ---- Add-ons ----
export async function upsertAddon(input: {
  id?: string;
  name: string;
  price: number;
  active: boolean;
  image_url?: string | null;
}) {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { id, ...fields } = input;
  const { error } = id
    ? await supabase.from("addons").update(fields).eq("id", id)
    : await supabase.from("addons").insert(fields);
  if (error) return { error: error.message };
  revalidatePricing();
  return { ok: true };
}

// ---- Reorder (drag to set display order) ----
export async function reorderPricing(
  kind: "packages" | "enclosures" | "addons",
  orderedIds: string[],
) {
  await requireRole(["admin"]);
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from(kind).update({ sort_order: i }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  revalidatePricing();
  return { ok: true };
}

// ---- Settings (wire rate etc.) ----
export async function updateSetting(key: string, value: unknown) {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value })
    .eq("key", key);
  if (error) return { error: error.message };
  revalidatePricing();
  return { ok: true };
}

// ---- User management (service role) ----
export async function createUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone: string;
}) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      phone: input.phone,
    },
  });
  if (error) return { error: error.message };
  // Ensure profile reflects role (trigger creates it; update to be safe).
  await admin
    .from("profiles")
    .update({
      full_name: input.full_name,
      role: input.role,
      phone: input.phone,
    })
    .eq("id", data.user!.id);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateUser(input: {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string;
  active: boolean;
  email?: string;
  password?: string;
}) {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  // Update the profile row.
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: input.full_name,
      role: input.role,
      phone: input.phone,
      active: input.active,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  // Update auth credentials (email / password) when provided.
  const authUpdate: { email?: string; password?: string; email_confirm?: boolean } =
    {};
  if (input.email) {
    authUpdate.email = input.email;
    authUpdate.email_confirm = true;
  }
  if (input.password) authUpdate.password = input.password;
  if (Object.keys(authUpdate).length > 0) {
    const { error: authErr } = await admin.auth.admin.updateUserById(
      input.id,
      authUpdate,
    );
    if (authErr) return { error: authErr.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/hr");
  return { ok: true };
}

export async function deleteUser(id: string) {
  const me = await requireRole(["admin"]);
  if (me.id === id) {
    return { error: "You can't delete your own account while signed in." };
  }
  const admin = createAdminClient();
  // Deleting the auth user cascades to the profile row.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/hr");
  return { ok: true };
}
