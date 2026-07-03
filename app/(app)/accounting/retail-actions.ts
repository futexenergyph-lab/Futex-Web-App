"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { RetailPurchaseType } from "@/lib/types";

function revalidate() {
  for (const p of [
    "/accounting/retail",
    "/accounting",
    "/accounting/profitability",
    "/accounting/cashflow",
  ]) {
    revalidatePath(p);
  }
}

/** Record a retail purchase (draft — not yet counted as profit). */
export async function addRetailPurchase(input: {
  purchase_date: string;
  type: RetailPurchaseType;
  description: string;
  amount: number;
}) {
  const profile = await requireRole(["accounting", "admin"]);
  const supabase = createClient();
  if (!input.amount || input.amount <= 0) return { error: "Enter an amount" };
  const { error } = await supabase.from("retail_purchases").insert({
    purchase_date: input.purchase_date,
    type: input.type,
    description: input.description || null,
    amount: input.amount,
    status: "recorded",
    created_by: profile.id,
    created_by_name: profile.full_name,
  });
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

/** Delete a recorded (not yet submitted) retail purchase. */
export async function deleteRetailPurchase(id: string) {
  await requireRole(["accounting", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("retail_purchases")
    .delete()
    .eq("id", id)
    .eq("status", "recorded");
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

/** Submit all recorded retail purchases to the account as profit. */
export async function submitRetailPurchases() {
  await requireRole(["accounting", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("retail_purchases")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("status", "recorded");
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}
