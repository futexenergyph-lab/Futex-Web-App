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
