import { MapPin, Phone, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { BOOKING_SELECT } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { BookingWithRelations } from "@/lib/types";

export const metadata = { title: "My Customers" };
export const dynamic = "force-dynamic";

export default async function InstallerCustomersPage() {
  const profile = await requireRole(["installer", "field_officer"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("assigned_installer_id", profile.id)
    .not("installer_done_at", "is", null)
    .order("installer_done_at", { ascending: false });

  const customers = (data as unknown as BookingWithRelations[]) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Customers"
        description="Clients you have completed installations for."
      />

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No completed installations yet. They&apos;ll appear here once you tap
            “Installation Done”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((b) => (
            <Card key={b.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{b.client_name}</p>
                  <span className="flex items-center gap-1 text-xs font-medium text-futex-green">
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" /> {b.address}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {b.contact_number}
                  </span>
                  {b.preferred_package && <span>{b.preferred_package.name}</span>}
                  {b.preferred_date && (
                    <span>Scheduled {formatDate(b.preferred_date)}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Completed: {formatDateTime(b.installer_done_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
