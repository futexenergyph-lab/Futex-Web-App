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
  const { error } = await supabase.from("expenses").insert({
    expense_date: input.expense_date,
    type: input.type,
    description: input.description || null,
    amount: input.amount,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await requireRole(["accounting", "admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}
