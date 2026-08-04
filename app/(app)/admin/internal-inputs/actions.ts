"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface InternalInputValues {
  entry_date: string;
  direction: "in" | "out";
  category: string;
  description: string;
  amount: number;
  payee: string;
  reference_no: string;
  notes: string;
}

function validate(v: InternalInputValues): string | null {
  if (!v.entry_date) return "Date is required.";
  if (!v.description.trim()) return "Description is required.";
  if (!Number.isFinite(v.amount) || v.amount <= 0)
    return "Amount must be greater than zero.";
  if (v.direction !== "in" && v.direction !== "out")
    return "Choose whether this is money in or money out.";
  return null;
}

function payload(v: InternalInputValues) {
  return {
    entry_date: v.entry_date,
    direction: v.direction,
    category: v.category || "Other",
    description: v.description.trim(),
    amount: v.amount,
    payee: v.payee.trim() || null,
    reference_no: v.reference_no.trim() || null,
    notes: v.notes.trim() || null,
  };
}

/** Record a new internal cash / cost entry. */
export async function createInternalInput(v: InternalInputValues) {
  const profile = await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("internal_inputs")
    .insert({
      ...payload(v),
      created_by: profile.id,
      created_by_name: profile.full_name,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/internal-inputs");
  return { ok: true, id: data.id as string };
}

/** Update an existing entry. */
export async function updateInternalInput(id: string, v: InternalInputValues) {
  await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };

  const supabase = createClient();
  const { error } = await supabase
    .from("internal_inputs")
    .update(payload(v))
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/internal-inputs");
  return { ok: true };
}

/** Delete an entry (and its attachment, if any). */
export async function deleteInternalInput(id: string) {
  await requireRole(["owner"]);
  const supabase = createClient();

  const { data: row } = await supabase
    .from("internal_inputs")
    .select("attachment_path")
    .eq("id", id)
    .single();
  if (row?.attachment_path) {
    await supabase.storage.from("internal-inputs").remove([row.attachment_path]);
  }

  const { error } = await supabase.from("internal_inputs").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/internal-inputs");
  return { ok: true };
}

/** Attach an uploaded receipt/file path to an entry. */
export async function attachInternalInputFile(id: string, storagePath: string) {
  await requireRole(["owner"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("internal_inputs")
    .update({ attachment_path: storagePath })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/internal-inputs");
  return { ok: true };
}
