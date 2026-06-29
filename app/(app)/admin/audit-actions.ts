"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

// Tables that management/owner may edit or delete through the audit system.
type AuditTable = "payments" | "expenses" | "bookings";

function revalidateAll(path: string) {
  for (const p of [
    "/admin",
    "/admin/clients",
    "/admin/deployment",
    "/admin/utilization",
    "/admin/live",
    "/accounting",
    "/accounting/cashflow",
    "/accounting/expenses",
    "/admin/logs",
  ]) {
    revalidatePath(p);
  }
  if (path) revalidatePath(path);
}

/** Delete a record and write an audit log (so it can be restored). */
export async function deleteRecord(input: {
  table: AuditTable;
  id: string;
  label: string;
}) {
  const profile = await requireRole(["admin"]); // management + owner only
  const admin = createAdminClient();

  const { data: row } = await admin
    .from(input.table)
    .select("*")
    .eq("id", input.id)
    .single();
  if (!row) return { error: "Record not found" };

  const { error: delErr } = await admin
    .from(input.table)
    .delete()
    .eq("id", input.id);
  if (delErr) return { error: delErr.message };

  await admin.from("audit_logs").insert({
    table_name: input.table,
    record_id: input.id,
    action: "delete",
    label: input.label,
    before_data: row,
    actor_id: profile.id,
    actor_name: profile.full_name,
  });

  revalidateAll("");
  return { ok: true };
}

/** Update a record and write an audit log (so the change can be reverted). */
export async function updateRecord(input: {
  table: AuditTable;
  id: string;
  patch: Record<string, unknown>;
  label: string;
}) {
  const profile = await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: before } = await admin
    .from(input.table)
    .select("*")
    .eq("id", input.id)
    .single();
  if (!before) return { error: "Record not found" };

  const { error: upErr } = await admin
    .from(input.table)
    .update(input.patch)
    .eq("id", input.id);
  if (upErr) return { error: upErr.message };

  const { data: after } = await admin
    .from(input.table)
    .select("*")
    .eq("id", input.id)
    .single();

  await admin.from("audit_logs").insert({
    table_name: input.table,
    record_id: input.id,
    action: "update",
    label: input.label,
    before_data: before,
    after_data: after,
    actor_id: profile.id,
    actor_name: profile.full_name,
  });

  revalidateAll("");
  return { ok: true };
}

/**
 * Redo / undo a logged action (Owner only). For a delete it re-inserts the
 * original row; for an update it reverts the record to its previous state.
 */
export async function restoreAudit(logId: string) {
  await requireRole(["owner"]); // Owner only
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: log } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("id", logId)
    .single();
  if (!log) return { error: "Log not found" };
  if (log.undone_at) return { error: "Already redone" };

  if (log.action === "delete") {
    const { error } = await admin.from(log.table_name).insert(log.before_data);
    if (error) return { error: error.message };
  } else if (log.action === "update") {
    const { error } = await admin
      .from(log.table_name)
      .update(log.before_data)
      .eq("id", log.record_id);
    if (error) return { error: error.message };
  }

  await admin
    .from("audit_logs")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", logId);

  revalidateAll("");
  return { ok: true };
}
