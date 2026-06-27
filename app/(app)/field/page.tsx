import Link from "next/link";
import { MapPin, Phone, Calendar, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { BOOKING_SELECT } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import type { BookingWithRelations } from "@/lib/types";

export const metadata = { title: "My Jobs" };
export const dynamic = "force-dynamic";

export default async function FieldHomePage() {
  const profile = await requireRole(["field_officer", "installer"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(
      `assigned_field_officer_id.eq.${profile.id},assigned_installer_id.eq.${profile.id}`,
    )
    .order("preferred_date", { ascending: true });

  const bookings = (data as unknown as BookingWithRelations[]) ?? [];
  // Completed/closed jobs leave My Jobs and move to the Client Master List.
  const active = bookings.filter(
    (b) => !["completed", "closed"].includes(b.status),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${profile.full_name.split(" ")[0]}`}
        description="Your deployed jobs. Tap a job to open it on site."
      />

      {active.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active jobs assigned yet. Completed jobs are in your Client
            Master List.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {active.map((b) => (
          <JobCard key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ b }: { b: BookingWithRelations }) {
  return (
    <Link href={`/field/bookings/${b.id}`}>
      <Card className="transition-colors hover:border-primary">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{b.client_name}</p>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{b.address}</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {b.contact_number}
              </span>
              {b.preferred_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(b.preferred_date)}
                  {b.preferred_time ? ` · ${b.preferred_time}` : ""}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
