"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Save (upsert) the current user's Personal Data Sheet. */
export async function savePersonalDataSheet(input: {
  photoUrl: string | null;
  data: Record<string, string>;
}) {
  const profile = await requireRole(["field_officer", "installer"]);
  const supabase = createClient();
  // Position & Date Hired are HR-only — preserve whatever HR set, ignore any
  // values coming from the employee's own form.
  const { data: existing } = await supabase
    .from("personal_data_sheets")
    .select("data")
    .eq("user_id", profile.id)
    .maybeSingle();
  const existingData = (existing?.data as Record<string, string> | null) ?? {};
  const data = {
    ...input.data,
    position: existingData.position ?? "",
    date_hired: existingData.date_hired ?? "",
  };
  const { error } = await supabase.from("personal_data_sheets").upsert(
    {
      user_id: profile.id,
      photo_url: input.photoUrl,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/field/pds");
  revalidatePath("/hr/201-files");
  return { ok: true };
}

/** Field officer records a draft expense (own row only). */
export async function addFieldExpense(input: {
  expense_date: string;
  type: string;
  description: string;
  amount: number;
  bookingId: string | null;
}) {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();
  const { error } = await supabase.from("expenses").insert({
    expense_date: input.expense_date,
    type: input.type,
    description: input.description || null,
    amount: input.amount,
    booking_id: input.bookingId,
    status: "draft",
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/field/expenses");
  return { ok: true };
}

/** Field officer deletes one of their own DRAFT expenses. */
export async function deleteFieldExpense(id: string) {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("created_by", profile.id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidatePath("/field/expenses");
  return { ok: true };
}

/**
 * Submit all the field officer's draft expenses to the admin for review.
 * Once submitted they can no longer be edited by the field officer.
 */
export async function submitFieldExpenses() {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      status: "submitted",
      submission_id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
    })
    .eq("created_by", profile.id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidatePath("/field/expenses");
  revalidatePath("/accounting/expenses");
  return { ok: true };
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

/**
 * Mark arrival on site. Field officer arrival moves the booking to on_site;
 * the installer's arrival only updates their own deployment status.
 */
export async function recordArrival(bookingId: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const now = new Date().toISOString();
  if (profile.role === "installer") {
    const { error } = await supabase
      .from("bookings")
      .update({ installer_arrived_at: now })
      .eq("id", bookingId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("bookings")
      .update({ field_officer_arrived_at: now })
      .eq("id", bookingId);
    if (error) return { error: error.message };
    await supabase
      .from("bookings")
      .update({ status: "on_site" })
      .eq("id", bookingId)
      .eq("status", "deployed");
  }
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  revalidatePath("/admin/deployment");
  return { ok: true };
}

/**
 * Installer marks their installation done. This updates only the installer's
 * deployment status — it does NOT complete the booking. Only the field officer
 * completing moves the job to the master list.
 */
export async function installerDone(bookingId: string) {
  const profile = await requireRole(["installer"]);
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ installer_done_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  revalidatePath("/field/customers");
  revalidatePath("/admin/deployment");
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
  // Only the field officer's presence moves the whole deployment to on_site.
  // An installer posting an update updates their own status only, not the
  // overall deployment status.
  if (profile.role !== "installer") {
    await supabase
      .from("bookings")
      .update({ status: "on_site" })
      .eq("id", input.bookingId)
      .eq("status", "deployed");
  }
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

export async function submitJobOrder(input: {
  bookingId: string;
  jobOrderId?: string | null;
  packageId: string;
  enclosureId: string | null;
  addSeparateEnclosure: boolean;
  additionalWireMeters: number;
  additionalJobWorks: JobWork[];
  notes: string;
  signature?: string | null;
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

  const fields = {
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
    signature: input.signature || null,
    status: "submitted" as const,
    submitted_at: new Date().toISOString(),
  };

  // Editing an approved-for-change order updates it in place and re-locks it
  // (clearing the change-request flags); otherwise insert a fresh order.
  const { error } = input.jobOrderId
    ? await supabase
        .from("job_orders")
        .update({
          ...fields,
          change_requested_at: null,
          change_request_reason: null,
          change_approved_at: null,
          change_approved_by: null,
        })
        .eq("id", input.jobOrderId)
    : await supabase.from("job_orders").insert(fields);
  if (error) return { error: error.message };

  await supabase
    .from("bookings")
    .update({ status: "in_progress" })
    .eq("id", input.bookingId);

  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/admin");
  return { ok: true, finalTotal: pricing.finalTotal };
}

/**
 * Field officer asks management to unlock a submitted job order so it can be
 * edited or voided. Management must approve before any change is allowed.
 */
export async function requestJobOrderChange(input: {
  bookingId: string;
  jobOrderId: string;
  reason: string;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("job_orders")
    .update({
      change_requested_at: new Date().toISOString(),
      change_request_reason: input.reason || null,
      change_approved_at: null,
      change_approved_by: null,
    })
    .eq("id", input.jobOrderId)
    .eq("field_officer_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Void an approved job order. Only allowed after management approved the
 * change request. Removes the locked pricing so the officer can start over.
 */
export async function voidJobOrder(input: {
  bookingId: string;
  jobOrderId: string;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();

  // Authorize: officer owns the order AND management approved the change.
  const { data: jo } = await supabase
    .from("job_orders")
    .select("id, field_officer_id, change_approved_at")
    .eq("id", input.jobOrderId)
    .single();
  if (!jo || jo.field_officer_id !== profile.id) {
    return { error: "Not your job order" };
  }
  if (!jo.change_approved_at) {
    return { error: "Management approval is required before voiding." };
  }

  // RLS lets only admins delete job orders; this is server-side authorized.
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_orders")
    .delete()
    .eq("id", input.jobOrderId);
  if (error) return { error: error.message };

  await supabase
    .from("bookings")
    .update({ status: "on_site" })
    .eq("id", input.bookingId);

  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/admin");
  return { ok: true };
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
  // Field officer records the payment; it stays PENDING until management
  // confirms it from Deployment, at which point it reflects in accounting.
  const { error } = await supabase.from("payments").insert({
    booking_id: input.bookingId,
    job_order_id: input.jobOrderId,
    amount: input.amount,
    method: input.method,
    reference_no: input.referenceNo || null,
    proof_url: input.proofPath,
    confirmed_by_field_officer_id: profile.id,
    status: "pending",
    paid_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/admin/deployment");
  revalidatePath("/admin");
  return { ok: true };
}

export async function saveCommissioning(input: {
  bookingId: string;
  title: string;
  storagePath: string;
  data: unknown;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase.from("booking_documents").insert({
    booking_id: input.bookingId,
    kind: "commissioning",
    title: input.title,
    storage_path: input.storagePath,
    data: input.data,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/admin/clients");
  return { ok: true };
}

/**
 * Save the merged Commissioning + Warranty + Acknowledgement Receipt PDF. The
 * field officer generates this in the Payment tab after management confirms
 * the payment. It replaces the standalone commissioning document so the Client
 * Master List shows a SINGLE combined PDF under "Commissioning & Warranty".
 */
export async function saveAcknowledgement(input: {
  bookingId: string;
  storagePath: string;
  title: string;
  data: unknown;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();

  // Remove the prior standalone commissioning row(s) so only the merged
  // document remains in the master list.
  await supabase
    .from("booking_documents")
    .delete()
    .eq("booking_id", input.bookingId)
    .eq("kind", "commissioning");

  // Re-insert as kind 'commissioning' (keeps the done-installation gating
  // working) but with the combined title and merged file.
  const { error } = await supabase.from("booking_documents").insert({
    booking_id: input.bookingId,
    kind: "commissioning",
    title: input.title,
    storage_path: input.storagePath,
    data: input.data,
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/field/bookings/${input.bookingId}`);
  revalidatePath("/field/clients");
  revalidatePath("/admin/clients");
  return { ok: true };
}

/** Save the field officer's free-text job order for a back job order ticket. */
export async function saveBackJobNote(input: {
  bookingId: string;
  note: string;
}) {
  const profile = await me();
  await assertAssigned(input.bookingId, profile.id);
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ back_job_field_note: input.note || null })
    .eq("id", input.bookingId);
  if (error) return { error: error.message };
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

/**
 * Mark a back job order (support ticket) done. Requires documentation photos;
 * payment is optional for support work. Sets the booking to "completed".
 */
export async function completeBackJobOrder(bookingId: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();

  const { data: docs } = await supabase
    .from("documentation")
    .select("file_urls")
    .eq("booking_id", bookingId);
  const docsOk = ((docs as { file_urls: string[] }[] | null) ?? []).some(
    (d) => (d.file_urls ?? []).length > 0,
  );
  if (!docsOk) {
    return { error: "Attach documentation photos before finishing." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      installation_done_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  revalidatePath("/field/clients");
  revalidatePath("/admin/deployment");
  revalidatePath("/admin");
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
  // Note: documentation upload no longer auto-completes the job. The field
  // officer must explicitly press "Done installation", which is only enabled
  // once every module (job order, commissioning, confirmed payment, docs) is
  // complete. See completeInstallation below.
  revalidatePath(`/field/bookings/${input.bookingId}`);
  return { ok: true };
}

/**
 * Field officer marks the installation done. Only allowed once ALL modules are
 * complete: job order submitted, commissioning checklist filed, payment
 * confirmed by management, and post-installation documentation uploaded.
 * Moves the booking to "completed" (removing it from My Jobs and surfacing it
 * in the field officer's Client Master List).
 */
export async function completeInstallation(bookingId: string) {
  const profile = await me();
  await assertAssigned(bookingId, profile.id);
  const supabase = createClient();

  const [{ data: jo }, { data: pay }, { data: comm }, { data: docs }] =
    await Promise.all([
      supabase
        .from("job_orders")
        .select("id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("status")
        .eq("booking_id", bookingId)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("booking_documents")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("kind", "commissioning")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documentation")
        .select("file_urls")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false }),
    ]);

  const docsOk =
    ((docs as { file_urls: string[] }[] | null) ?? []).some(
      (d) => (d.file_urls ?? []).length > 0,
    );

  const missing: string[] = [];
  if (!jo) missing.push("Job Order");
  if (!comm) missing.push("Commissioning");
  if (!pay) missing.push("Confirmed payment");
  if (!docsOk) missing.push("Documentation");
  if (missing.length > 0) {
    return { error: `Incomplete: ${missing.join(", ")}` };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      installation_done_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidatePath(`/field/bookings/${bookingId}`);
  revalidatePath("/field");
  revalidatePath("/field/clients");
  revalidatePath("/admin/deployment");
  revalidatePath("/admin");
  return { ok: true };
}
