import { createClient } from "@/lib/supabase/server";
import type { BookingWithRelations } from "@/lib/types";

// Reusable select with disambiguated foreign-key joins to profiles.
export const BOOKING_SELECT = `
  *,
  preferred_package:packages!bookings_preferred_package_id_fkey(id,name,base_price),
  preferred_enclosure:enclosures!bookings_preferred_enclosure_id_fkey(id,name,price),
  assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(id,full_name),
  assigned_installer:profiles!bookings_assigned_installer_id_fkey(id,full_name)
`;

export async function fetchBookings(): Promise<BookingWithRelations[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false });
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
