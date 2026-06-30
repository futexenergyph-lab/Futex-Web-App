"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ExpenseType } from "@/lib/types";

export async function addExpense(input: {
  expense_date: string;
  type: ExpenseType;
  description: string;
  amount: number;
}) {
  const profile = await requireRole(["accounting", "admin", "admin_staff"]);
  const supabase = createClient();
  // The limited Admin records drafts that they submit to accounting; everyone
  // else (accounting/management/owner) records final entries directly.
  const status = profile.role === "admin_staff" ? "draft" : "finalized";
  const { error } = await supabase.from("expenses").insert({
    expense_date: input.expense_date,
    type: input.type,
    description: input.description || null,
    amount: input.amount,
    status,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await requireRole(["accounting", "admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

/**
 * Admin (management/owner/limited Admin) forwards a field officer's submitted
 * expenses to accounting (submitted -> admin_reviewed, where they count).
 */
export async function submitFieldOfficerExpenses(officerId: string) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ status: "admin_reviewed" })
    .eq("created_by", officerId)
    .eq("status", "submitted");
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

/** The limited Admin submits their own recorded (draft) expenses to accounting. */
export async function submitOwnDraftExpenses() {
  const profile = await requireRole(["admin_staff", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      status: "admin_reviewed",
      submission_id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
    })
    .eq("created_by", profile.id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

/**
 * Edit an expense (amount/type/description/date). Allowed for accounting,
 * management & owner — covers both the admin review and the accounting final
 * tally. Management/Owner edits are written to the audit log.
 */
export async function editExpenseRecord(input: {
  id: string;
  expense_date: string;
  type: ExpenseType;
  description: string | null;
  amount: number;
}) {
  const profile = await requireRole(["accounting", "admin", "admin_staff"]);
  const supabase = createClient();

  const { data: before } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", input.id)
    .single();

  const { error } = await supabase
    .from("expenses")
    .update({
      expense_date: input.expense_date,
      type: input.type,
      description: input.description || null,
      amount: input.amount,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  // Audit log for admin-tier edits (RLS allows is_admin to insert).
  if (profile.role !== "accounting") {
    const { data: after } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", input.id)
      .single();
    await supabase.from("audit_logs").insert({
      table_name: "expenses",
      record_id: input.id,
      action: "update",
      label: `Expense ₱${input.amount.toLocaleString("en-PH")}`,
      before_data: before,
      after_data: after,
      actor_id: profile.id,
      actor_name: profile.full_name,
    });
  }

  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  revalidatePath("/admin/logs");
  return { ok: true };
}
