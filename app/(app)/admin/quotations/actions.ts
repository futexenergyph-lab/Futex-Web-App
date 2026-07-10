"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { solarTotal, type SolarQuoteData } from "@/lib/solar-quote";

export interface QuoteItemInput {
  description: string;
  qty: number;
  unit_price: number;
}

interface QuoteInput {
  type: "ev" | "solar";
  client_name: string;
  client_address: string;
  client_contact: string;
  client_email: string;
  items: QuoteItemInput[];
  vat_enabled: boolean;
  validity_days: number;
  notes: string;
  details: SolarQuoteData | null; // structured solar payload
}

/** Compute the persisted numeric fields for either quotation type. */
function computeTotals(input: QuoteInput) {
  if (input.type === "solar" && input.details) {
    const total = solarTotal(input.details);
    return { subtotal: total, vat: 0, total };
  }
  const items = input.items.filter((i) => i.description.trim() || i.unit_price > 0);
  const subtotal = items.reduce((t, i) => t + i.qty * i.unit_price, 0);
  const vat = input.vat_enabled ? Math.round(subtotal * 0.12 * 100) / 100 : 0;
  return { subtotal, vat, total: subtotal + vat, items };
}

function validate(input: QuoteInput): string | null {
  if (!input.client_name.trim()) return "Client name is required.";
  if (input.type === "ev") {
    const items = input.items.filter((i) => i.description.trim() || i.unit_price > 0);
    if (items.length === 0) return "Add at least one line item.";
  } else if (!input.details || input.details.proposedCost.length === 0) {
    return "Add at least one proposed-cost row.";
  }
  return null;
}

function payload(input: QuoteInput) {
  const t = computeTotals(input);
  const items =
    input.type === "ev"
      ? input.items.filter((i) => i.description.trim() || i.unit_price > 0)
      : [];
  return {
    type: input.type,
    client_name: input.client_name,
    client_address: input.client_address || null,
    client_contact: input.client_contact || null,
    client_email: input.client_email || null,
    items,
    subtotal: t.subtotal,
    vat_enabled: input.type === "ev" ? input.vat_enabled : false,
    vat: t.vat,
    total: t.total,
    validity_days: input.validity_days,
    notes: input.notes || null,
    details: input.type === "solar" ? input.details : null,
  };
}

/** Create a quotation. Returns the new id + generated quote number. */
export async function createQuotation(input: QuoteInput) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const err = validate(input);
  if (err) return { error: err };

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true });
  const quoteNo = `Q-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      ...payload(input),
      quote_no: quoteNo,
      prepared_by: profile.id,
      prepared_by_name: profile.full_name,
    })
    .select("id, quote_no")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/quotations");
  return { ok: true, id: data.id as string, quoteNo: data.quote_no as string };
}

/**
 * Duplicate an existing quotation as a brand-new quote with a new quote number.
 * Copies every field except the PDF (the copy starts without one so it can be
 * regenerated under the new number) and re-stamps the preparer.
 */
export async function duplicateQuotation(id: string) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const { data: src, error: fetchErr } = await supabase
    .from("quotations")
    .select(
      "type, client_name, client_address, client_contact, client_email, items, subtotal, vat_enabled, vat, total, validity_days, notes, details",
    )
    .eq("id", id)
    .single();
  if (fetchErr || !src) return { error: fetchErr?.message ?? "Quotation not found." };

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true });
  const quoteNo = `Q-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      ...src,
      quote_no: quoteNo,
      storage_path: null, // fresh copy has no PDF yet — regenerate under new no.
      prepared_by: profile.id,
      prepared_by_name: profile.full_name,
    })
    .select("id, quote_no")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/quotations");
  return { ok: true, id: data.id as string, quoteNo: data.quote_no as string };
}

/** Update an existing quotation (keeps its quote number). */
export async function updateQuotation(id: string, input: QuoteInput) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const err = validate(input);
  if (err) return { error: err };

  const { data, error } = await supabase
    .from("quotations")
    .update(payload(input))
    .eq("id", id)
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
