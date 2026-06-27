"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { BookingStatus } from "@/lib/types";

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Approve a field officer's request to change/void a locked job order.
 * After approval the officer can edit or void it on their booking page.
 */
export async function approveJobOrderChange(input: {
  bookingId: string;
  jobOrderId: string;
}) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("job_orders")
    .update({
      change_approved_at: new Date().toISOString(),
      change_approved_by: profile.id,
    })
    .eq("id", input.jobOrderId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

/**
 * Edit the client-submitted booking details (management/admin only).
 */
export async function updateBooking(input: {
  id: string;
  client_number: string | null;
  client_name: string;
  email: string | null;
  address: string;
  contact_number: string;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_package_id: string | null;
  preferred_enclosure_id: string | null;
  enclosure_protection_notes: string | null;
  notes: string | null;
}) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { id, ...fields } = input;
  const { error } = await supabase
    .from("bookings")
    .update({
      ...fields,
      client_number: fields.client_number || null,
      email: fields.email || null,
      preferred_date: fields.preferred_date || null,
      preferred_time: fields.preferred_time || null,
      preferred_package_id: fields.preferred_package_id || null,
      preferred_enclosure_id: fields.preferred_enclosure_id || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return { ok: true };
}

/**
 * Confirm a field-recorded payment from Deployment. Marks the latest pending
 * payment confirmed (so it reflects in accounting) and the booking as paid.
 */
export async function confirmDeploymentPayment(bookingId: string) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { data: pay } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pay) return { error: "No pending payment to confirm." };

  const { error } = await supabase
    .from("payments")
    .update({ status: "confirmed", paid_at: new Date().toISOString() })
    .eq("id", pay.id);
  if (error) return { error: error.message };

  await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);

  revalidatePath("/admin/deployment");
  revalidatePath("/admin");
  revalidatePath("/accounting");
  revalidatePath("/accounting/cashflow");
  return { ok: true };
}

export async function deployBooking(input: {
  bookingId: string;
  fieldOfficerId: string | null;
  installerId: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
}) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const update: Record<string, unknown> = {
    assigned_field_officer_id: input.fieldOfficerId || null,
    assigned_installer_id: input.installerId || null,
    preferred_date: input.preferredDate || null,
    preferred_time: input.preferredTime || null,
  };

  // Assigning an officer moves a new booking forward and stamps deployment.
  if (input.fieldOfficerId || input.installerId) {
    update.status = "deployed";
    update.deployed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", input.bookingId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/deployment");
  revalidatePath("/admin/utilization");
  return { ok: true };
}

export async function createManualBooking(input: {
  client_number: string | null;
  client_name: string;
  email: string | null;
  address: string;
  contact_number: string;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_package_id: string | null;
  preferred_enclosure_id: string | null;
  notes: string | null;
}) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { error } = await supabase.from("bookings").insert({
    ...input,
    client_number: input.client_number || null,
    email: input.email || null,
    source: "manual",
    status: "new",
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return { ok: true };
}
