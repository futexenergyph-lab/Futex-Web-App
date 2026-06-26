"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { ELEVATED_ROLES, type UserRole } from "@/lib/types";

const isElevated = (role: UserRole) => ELEVATED_ROLES.includes(role);

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
// Access model:
//   - Only the OWNER may grant/modify elevated roles (owner, management/admin).
//   - Management/Admin may assign non-elevated roles (accounting, hr,
//     field officer, installer) and may not touch elevated accounts.
//   - Only the OWNER may delete an account directly. Management/Admin must
//     raise a removal request that the OWNER approves.
export async function createUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone: string;
}) {
  const me = await requireRole(["admin"]);
  if (me.role !== "owner" && isElevated(input.role)) {
    return { error: "Only the owner can assign the Owner or Management role." };
  }
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
  const me = await requireRole(["admin"]);
  const admin = createAdminClient();

  // Read the target's current role to enforce elevated-account protections.
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", input.id)
    .single();
  const currentRole = target?.role as UserRole | undefined;

  if (me.role !== "owner") {
    if (currentRole && isElevated(currentRole)) {
      return { error: "Only the owner can modify an Owner/Management account." };
    }
    if (isElevated(input.role)) {
      return {
        error: "Only the owner can assign the Owner or Management role.",
      };
    }
  }

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

/** Owner-only: permanently delete an account (also used to approve a request). */
export async function deleteUser(id: string) {
  const me = await requireRole(["admin"]);
  if (me.role !== "owner") {
    return {
      error:
        "Only the owner can remove an account. Use 'Request removal' to ask the owner to approve.",
    };
  }
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

/** Management/Admin: raise a removal request for the owner to approve. */
export async function requestUserDeletion(id: string) {
  const me = await requireRole(["admin"]);
  if (me.id === id) {
    return { error: "You can't request removal of your own account." };
  }
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  if (target && isElevated(target.role as UserRole) && me.role !== "owner") {
    return { error: "You can't request removal of an Owner/Management account." };
  }
  const { error } = await admin
    .from("profiles")
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_requested_by: me.id,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Clear a pending removal request (owner rejects, or requester cancels). */
export async function cancelUserDeletion(id: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ deletion_requested_at: null, deletion_requested_by: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
