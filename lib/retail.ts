import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetailPurchaseType } from "@/lib/types";

export interface RetailRevenueRow {
  id: string;
  day: string; // YYYY-MM-DD (purchase date)
  amount: number;
  type: RetailPurchaseType;
  description: string | null;
  created_by_name: string | null;
}

/**
 * Submitted retail purchases counted as revenue (profit). Shared by the
 * Payments, Profitability and Overview pages so retail sales reflect there.
 */
export async function fetchRetailRevenue(
  supabase: SupabaseClient,
): Promise<RetailRevenueRow[]> {
  const { data } = await supabase
    .from("retail_purchases")
    .select("id, purchase_date, amount, type, description, created_by_name")
    .eq("status", "submitted")
    .order("purchase_date", { ascending: false });
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: r.id as string,
    day: r.purchase_date as string,
    amount: Number(r.amount),
    type: r.type as RetailPurchaseType,
    description: (r.description as string | null) ?? null,
    created_by_name: (r.created_by_name as string | null) ?? null,
  }));
}
