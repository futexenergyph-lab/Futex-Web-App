import { createClient } from "@/lib/supabase/server";
import type { BookingWithRelations } from "@/lib/types";

// Reusable select with disambiguated foreign-key joins to profiles.
export const BOOKING_SELECT = `
  *,
  preferred_package:packages!bookings_preferred_package_id_fkey(id,name,base_price),
  preferred_enclosure:enclosures!bookings_preferred_enclosure_id_fkey(id,name,price),
  assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(id,full_name),
  assigned_installer:profiles!bookings_assigned_installer_id_fkey(id,full_name),
  job_orders(id,final_total,change_requested_at,change_request_reason,change_approved_at,created_at)
`;

export async function fetchBookings(window?: {
  fromISO: string | null;
  toISO: string | null;
}): Promise<BookingWithRelations[]> {
  const supabase = createClient();
  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false });
  if (window?.fromISO) query = query.gte("created_at", window.fromISO);
  if (window?.toISO) query = query.lt("created_at", window.toISO);
  const { data } = await query;
  return (data as unknown as BookingWithRelations[]) ?? [];
}

export async function fetchStaff() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .in("role", ["field_officer", "installer"])
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}
