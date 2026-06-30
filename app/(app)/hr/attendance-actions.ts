"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

// Attendance edits/deletes are reserved for Management & Owner (the Owner
// inherits the "admin" gate via requireRole). Every action is written to the
// audit log so it shows up — and can be redone — from the Owner's Logs page.

function revalidate() {
  revalidatePath("/hr");
  revalidatePath("/admin/hr");
  revalidatePath("/admin/logs");
}

/** Update a single attendance punch's timestamp (logged). */
export async function updateAttendanceRecord(input: {
  id: string;
  timestamp: string;
  label: string;
}) {
  const profile = await requireRole(["admin"]); // management + owner
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("attendance")
    .select("*")
    .eq("id", input.id)
    .single();
  if (!before) return { error: "Record not found" };

  const { error } = await admin
    .from("attendance")
    .update({ timestamp: input.timestamp })
    .eq("id", input.id);
  if (error) return { error: error.message };

  const { data: after } = await admin
    .from("attendance")
    .select("*")
    .eq("id", input.id)
    .single();

  await admin.from("audit_logs").insert({
    table_name: "attendance",
    record_id: input.id,
    action: "update",
    label: input.label,
    before_data: before,
    after_data: after,
    actor_id: profile.id,
    actor_name: profile.full_name,
  });

  revalidate();
  return { ok: true };
}

/**
 * Delete one or more attendance punches (a whole person/day record may be
 * several punches). Each deletion is logged individually so it can be redone.
 */
export async function deleteAttendanceRecords(input: {
  ids: string[];
  label: string;
}) {
  const profile = await requireRole(["admin"]); // management + owner
  const admin = createAdminClient();

  for (const id of input.ids) {
    const { data: row } = await admin
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();
    if (!row) continue;

    const { error } = await admin.from("attendance").delete().eq("id", id);
    if (error) return { error: error.message };

    await admin.from("audit_logs").insert({
      table_name: "attendance",
      record_id: id,
      action: "delete",
      label: input.label,
      before_data: row,
      actor_id: profile.id,
      actor_name: profile.full_name,
    });
  }

  revalidate();
  return { ok: true };
}
