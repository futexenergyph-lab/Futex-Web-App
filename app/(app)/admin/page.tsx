import { fetchBookings } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { NewBookingDialog } from "@/components/admin/new-booking-dialog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await fetchBookings();
  const supabase = createClient();
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
      <KanbanBoard
        initial={bookings}
        packages={packages ?? []}
        enclosures={enclosures ?? []}
      />
    </div>
  );
}
