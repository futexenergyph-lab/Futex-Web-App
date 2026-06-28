import { fetchBookings, fetchStaff } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { NewBookingDialog } from "@/components/admin/new-booking-dialog";
import {
  BackJobOrderDialog,
  type BackJobClient,
} from "@/components/admin/back-job-order-dialog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const [bookings, staff] = await Promise.all([fetchBookings(), fetchStaff()]);
  const supabase = createClient();
  const [{ data: packages }, { data: enclosures }] = await Promise.all([
    supabase.from("packages").select("id,name").eq("active", true).order("sort_order"),
    supabase.from("enclosures").select("id,name").eq("active", true).order("sort_order"),
  ]);

  // Completed installations available for an after-sales back job order.
  const backJobClients: BackJobClient[] = bookings
    .filter((b) => b.status === "completed" && !b.is_back_job_order)
    .map((b) => ({
      id: b.id,
      client_name: b.client_name,
      address: b.address,
      client_number: b.client_number,
    }));

  return (
    <div>
      <PageHeader
        title="Bookings Kanban"
        description="Drag cards across stages. New web bookings appear here in realtime."
      >
        <div className="flex items-center gap-2">
          <BackJobOrderDialog clients={backJobClients} />
          <NewBookingDialog
            packages={packages ?? []}
            enclosures={enclosures ?? []}
          />
        </div>
      </PageHeader>
      <KanbanBoard
        initial={bookings}
        packages={packages ?? []}
        enclosures={enclosures ?? []}
        staff={staff}
      />
    </div>
  );
}
