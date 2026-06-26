import { BOOKING_SELECT } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { NewBookingDialog } from "@/components/admin/new-booking-dialog";
import { createClient } from "@/lib/supabase/server";
import { DebugError, isNextControlFlow } from "@/lib/debug-error";
import type { BookingWithRelations } from "@/lib/types";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  try {
    return await AdminBookings();
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    return <DebugError where="admin bookings page" error={e} />;
  }
}

async function AdminBookings() {
  const supabase = createClient();

  // Surface query errors instead of silently swallowing (debug).
  const bookingsRes = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false });
  if (bookingsRes.error) {
    throw new Error("bookings query: " + JSON.stringify(bookingsRes.error));
  }
  const bookings = (bookingsRes.data as unknown as BookingWithRelations[]) ?? [];

  const [{ data: packages }, { data: enclosures }] = await Promise.all([
    supabase.from("packages").select("id,name").eq("active", true).order("sort_order"),
    supabase.from("enclosures").select("id,name").eq("active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader
        title="Bookings Kanban"
        description="Drag cards across stages. New web bookings appear here in realtime."
      >
        <NewBookingDialog
          packages={packages ?? []}
          enclosures={enclosures ?? []}
        />
      </PageHeader>
      <KanbanBoard initial={bookings} />
    </div>
  );
}
