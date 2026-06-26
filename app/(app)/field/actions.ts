"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { computePricing } from "@/lib/pricing";
import type { BookingStatus, JobWork, PaymentMethod } from "@/lib/types";

async function me() {
  return requireRole(["field_officer", "installer"]);
}

/** Verify the current user is assigned to the booking. */
async function assertAssigned(bookingId: string, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, assigned_field_officer_id, assigned_installer_id")
    .eq("id", bookingId)
    .single();
  if (
    !data ||
    (data.assigned_field_officer_id !== userId &&
      data.assigned_installer_id !== userId)
  ) {
    throw new Error("Not assigned to this booking");
  }
}

export async function recordAttendance(input: {
  type: "time_in" | "time_out";
  photoPath: string | null;
  bookingId: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const profile = await me();
  const supabase = createClient();
  const { error } = await supabase.from("attendance").insert({
    user_id: profile.id,
    booking_id: input.bookingId,
    type: input.type,
    photo_url: input.photoPath,
    lat: input.lat,
    lng: input.lng,
  });
  if (error) return { error: error.message };
  revalidatePath("/field/attendance");
  return { ok: true };
}

// ---- Installer-specific actions ----------------------------------------

export async function confirmDeployment(bookingId: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      installer_confirmed_at: new Date().toISOString(),
      installer_declined_at: null,
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  return { ok: true };
}

export async function declineDeployment(bookingId: string, reason: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      installer_declined_at: new Date().toISOString(),
      installer_confirmed_at: null,
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  // Leave a note for management.
  await supabase.from("job_updates").insert({
    booking_id: bookingId,
    user_id: profile.id,
    message: `Installer declined the deployment${reason ? `: ${reason}` : "."}`,
    photo_urls: [],
  });
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  return { ok: true };
}

export async function markInstallationDone(bookingId: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      installation_done_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  revalidatePath("/field/customers");
  return { ok: true };
}

export async function setBookingStatusByField(
  bookingId: string,
  status: BookingStatus,
) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  return { ok: true };
}

export async function postJobUpdate(input: {
  bookingId: string;
  message: string;
  photoPaths: string[];
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase.from("job_updates").insert({
    booking_id: input.bookingId,
    user_id: profile.id,
    message: input.message || null,
    photo_urls: input.photoPaths,
  });
  if (error) return { error: error.message };
  // First update implies arrival on site.
  await supabase
    .from("bookings")
    .update({ status: "on_site" })
    .eq("id", input.bookingId)
    .eq("status", "deployed");
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

export async function submitJobOrder(input: {
  bookingId: string;
  packageId: string;
  enclosureId: string | null;
  addSeparateEnclosure: boolean;
  additionalWireMeters: number;
  additionalJobWorks: JobWork[];
  notes: string;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();

  // Fetch authoritative prices server-side — never trust client totals.
  const [{ data: pkg }, { data: enc }, { data: wireSetting }] =
    await Promise.all([
      supabase
        .from("packages")
        .select("base_price, enclosure_included")
        .eq("id", input.packageId)
        .single(),
      input.enclosureId
        ? supabase
            .from("enclosures")
            .select("price")
            .eq("id", input.enclosureId)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "wire_rate_per_meter")
        .single(),
    ]);

  if (!pkg) return { error: "Package not found" };
  const wireRate = Number(wireSetting?.value ?? 200);

  const pricing = computePricing({
    pkg,
    enclosure: enc,
    addSeparateEnclosure: input.addSeparateEnclosure,
    additionalWireMeters: input.additionalWireMeters,
    wireRatePerMeter: wireRate,
    additionalJobWorks: input.additionalJobWorks,
  });

  const { error } = await supabase.from("job_orders").insert({
    booking_id: input.bookingId,
    field_officer_id: profile.id,
    package_id: input.packageId,
    enclosure_id: input.enclosureId,
    add_separate_enclosure: input.addSeparateEnclosure,
    additional_wire_meters: input.additionalWireMeters,
    wire_rate_per_meter: wireRate,
    additional_job_works: input.additionalJobWorks,
    computed_subtotal: pricing.subtotal,
    final_total: pricing.finalTotal,
    notes: input.notes || null,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await supabase
    .from("bookings")
    .update({ status: "in_progress" })
    .eq("id", input.bookingId);

  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true, finalTotal: pricing.finalTotal };
}

export async function confirmPayment(input: {
  bookingId: string;
  jobOrderId: string | null;
  amount: number;
  method: PaymentMethod;
  referenceNo: string;
  proofPath: string | null;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase.from("payments").insert({
    booking_id: input.bookingId,
    job_order_id: input.jobOrderId,
    amount: input.amount,
    method: input.method,
    reference_no: input.referenceNo || null,
    proof_url: input.proofPath,
    confirmed_by_field_officer_id: profile.id,
    status: "confirmed",
    paid_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  // Mark booking completed & paid.
  await supabase
    .from("bookings")
    .update({ status: "paid" })
    .eq("id", input.bookingId);

  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

export async function uploadDocumentation(input: {
  bookingId: string;
  filePaths: string[];
  notes: string;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase.from("documentation").insert({
    booking_id: input.bookingId,
    field_officer_id: profile.id,
    file_urls: input.filePaths,
    notes: input.notes || null,
  });
  if (error) return { error: error.message };
  // Documentation turnover -> completed.
  await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", input.bookingId)
    .in("status", ["in_progress", "on_site"]);
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}
