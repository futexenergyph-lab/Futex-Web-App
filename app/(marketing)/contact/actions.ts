"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { bookingFormSchema } from "@/lib/validation";

export type BookingState = {
  ok: boolean;
  error?: string;
  reference?: string;
};

export async function submitBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const raw = {
    client_name: formData.get("client_name"),
    address: formData.get("address"),
    contact_number: formData.get("contact_number"),
    preferred_date: formData.get("preferred_date") ?? "",
    preferred_time: formData.get("preferred_time") ?? "",
    preferred_package_id: formData.get("preferred_package_id") ?? "",
    preferred_enclosure_id: formData.get("preferred_enclosure_id") ?? "",
    enclosure_protection_notes: formData.get("enclosure_protection_notes") ?? "",
    notes: formData.get("notes") ?? "",
  };

  const parsed = bookingFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Please check your details.",
    };
  }
  const v = parsed.data;

  // Generate the id server-side so we don't need to read the row back —
  // anonymous visitors can INSERT a web booking but RLS does not let them
  // SELECT bookings, so a post-insert .select() would fail.
  const id = randomUUID();

  const supabase = createClient();
  const { error } = await supabase.from("bookings").insert({
    id,
    client_name: v.client_name,
    address: v.address,
    contact_number: v.contact_number,
    preferred_date: v.preferred_date || null,
    preferred_time: v.preferred_time || null,
    preferred_package_id: v.preferred_package_id || null,
    preferred_enclosure_id: v.preferred_enclosure_id || null,
    enclosure_protection_notes: v.enclosure_protection_notes || null,
    notes: v.notes || null,
    source: "web",
    status: "new",
  });

  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true, reference: id.slice(0, 8).toUpperCase() };
}
