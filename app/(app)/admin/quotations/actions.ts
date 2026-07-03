"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface QuoteItemInput {
  description: string;
  qty: number;
  unit_price: number;
}

/**
 * Create a quotation record (Management/Owner/Admin). Returns the new id and a
 * generated quote number so the client can build + upload the branded PDF.
 */
export async function createQuotation(input: {
  type: "ev" | "solar";
  client_name: string;
  client_address: string;
  client_contact: string;
  client_email: string;
  items: QuoteItemInput[];
  vat_enabled: boolean;
  validity_days: number;
  notes: string;
}) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  if (!input.client_name.trim()) return { error: "Client name is required." };
  const items = input.items.filter(
    (i) => i.description.trim() || i.unit_price > 0,
  );
  if (items.length === 0) return { error: "Add at least one line item." };

  const subtotal = items.reduce((t, i) => t + i.qty * i.unit_price, 0);
  const vat = input.vat_enabled ? Math.round(subtotal * 0.12 * 100) / 100 : 0;
  const total = subtotal + vat;

  // Sequential quote number: Q-YYYY-####
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true });
  const quoteNo = `Q-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      quote_no: quoteNo,
      type: input.type,
      client_name: input.client_name,
      client_address: input.client_address || null,
      client_contact: input.client_contact || null,
      client_email: input.client_email || null,
      items,
      subtotal,
      vat_enabled: input.vat_enabled,
      vat,
      total,
      validity_days: input.validity_days,
      notes: input.notes || null,
      prepared_by: profile.id,
      prepared_by_name: profile.full_name,
    })
    .select("id, quote_no")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/quotations");
  return { ok: true, id: data.id as string, quoteNo: data.quote_no as string };
}

/** Attach the generated PDF's storage path to a quotation. */
export async function attachQuotationPdf(input: {
  id: string;
  storagePath: string;
}) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ storage_path: input.storagePath })
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/quotations");
  return { ok: true };
}

/** Delete a quotation (and its PDF). */
export async function deleteQuotation(id: string) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { data: row } = await supabase
    .from("quotations")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (row?.storage_path) {
    await supabase.storage.from("quotations").remove([row.storage_path]);
  }
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/quotations");
  return { ok: true };
}
