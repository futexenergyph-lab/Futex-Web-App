import { fetchBookings, fetchStaff } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { NewBookingDialog } from "@/components/admin/new-booking-dialog";
import {
  BackJobOrderDialog,
  type BackJobClient,
} from "@/components/admin/back-job-order-dialog";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { createClient } from "@/lib/supabase/server";
import { resolveDateRange } from "@/lib/utils";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveDateRange(searchParams);
  const [bookings, staff] = await Promise.all([
    fetchBookings({ fromISO: range.fromISO, toISO: range.toISO }),
    fetchStaff(),
  ]);
  const supabase = createClient();
  const [{ data: packages }, { data: enclosures }, { data: completed }] =
    await Promise.all([
      supabase.from("packages").select("id,name").eq("active", true).order("sort_order"),
      supabase.from("enclosures").select("id,name").eq("active", true).order("sort_order"),
      // Completed installations for a back job order — independent of the
      // Kanban date window so every eligible client stays selectable.
      supabase
        .from("bookings")
        .select("id, client_name, address, client_number")
        .eq("status", "completed")
        .eq("is_back_job_order", false)
        .order("created_at", { ascending: false }),
    ]);

  const backJobClients: BackJobClient[] = (completed ?? []) as BackJobClient[];

  return (
    <div>
      <PageHeader
        title="Bookings Kanban"
        description="Drag cards across stages. New web bookings appear here in realtime."
      >
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter />
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
