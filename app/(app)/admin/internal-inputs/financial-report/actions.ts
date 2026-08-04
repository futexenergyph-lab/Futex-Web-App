"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface ClientFinancialValues {
  entry_date: string;
  project_name: string;
  expense_type: string;
  description: string;
  amount: number;
  charge_to: string;
  remarks: string;
}

function validate(v: ClientFinancialValues): string | null {
  if (!v.description.trim() && v.amount <= 0)
    return "Add a description or an amount.";
  if (!Number.isFinite(v.amount) || v.amount < 0)
    return "Amount must be zero or more.";
  return null;
}

function payload(v: ClientFinancialValues) {
  return {
    entry_date: v.entry_date || null,
    project_name: v.project_name.trim() || null,
    expense_type: v.expense_type || "Materials",
    description: v.description.trim(),
    amount: v.amount,
    charge_to: v.charge_to.trim() || null,
    remarks: v.remarks.trim() || null,
  };
}

function refresh(bookingId: string) {
  revalidatePath("/admin/internal-inputs");
  revalidatePath("/admin/internal-inputs/financial-report");
  revalidatePath(`/admin/internal-inputs/financial-report/${bookingId}`);
}

/** Add an expense line to a client's project financials. */
export async function createClientFinancial(
  bookingId: string,
  v: ClientFinancialValues,
) {
  const profile = await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };

  const supabase = createClient();
  const { error } = await supabase.from("client_financials").insert({
    booking_id: bookingId,
    ...payload(v),
    created_by: profile.id,
    created_by_name: profile.full_name,
  });
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/** Update one expense line. */
export async function updateClientFinancial(
  id: string,
  bookingId: string,
  v: ClientFinancialValues,
) {
  await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };

  const supabase = createClient();
  const { error } = await supabase
    .from("client_financials")
    .update(payload(v))
    .eq("id", id);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/** Delete one expense line. */
export async function deleteClientFinancial(id: string, bookingId: string) {
  await requireRole(["owner"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("client_financials")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/**
 * Load an installation package's default cost lines into a client's
 * financials. Lines are inserted in sheet order (staggered created_at keeps
 * the display order stable) and remain individually editable afterwards.
 */
export async function applyInstallationPackage(
  bookingId: string,
  packageId: string,
) {
  const profile = await requireRole(["owner"]);
  const { INSTALLATION_PACKAGES } = await import("@/lib/installation-packages");
  const pkg = INSTALLATION_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return { error: "Unknown package." };

  const base = Date.now();
  const rows = pkg.lines.map((l, i) => ({
    booking_id: bookingId,
    entry_date: null,
    project_name: pkg.label,
    expense_type: l.expense_type,
    description: l.description,
    amount: l.amount,
    charge_to: null,
    remarks: null,
    created_by: profile.id,
    created_by_name: profile.full_name,
    created_at: new Date(base + i * 10).toISOString(),
  }));

  const supabase = createClient();
  const { error } = await supabase.from("client_financials").insert(rows);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true, count: rows.length };
}
