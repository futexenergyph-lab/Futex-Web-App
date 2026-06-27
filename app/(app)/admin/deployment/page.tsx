import { fetchBookings, fetchStaff } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { computePricing } from "@/lib/pricing";
import { PageHeader } from "@/components/app/page-header";
import { DeployDialog } from "@/components/admin/deploy-dialog";
import {
  JobOrderAmount,
  type JobOrderDetail,
} from "@/components/admin/job-order-amount";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { JobWork } from "@/lib/types";

export const metadata = { title: "Deployment" };
export const dynamic = "force-dynamic";

interface JobOrderRow {
  id: string;
  booking_id: string;
  add_separate_enclosure: boolean;
  additional_wire_meters: number;
  wire_rate_per_meter: number;
  additional_job_works: JobWork[];
  final_total: number;
  notes: string | null;
  signature: string | null;
  status: string;
  created_at: string;
  packages: { name: string; base_price: number; enclosure_included: boolean } | null;
  enclosures: { name: string; price: number } | null;
}

export default async function DeploymentPage() {
  const [bookings, staff] = await Promise.all([fetchBookings(), fetchStaff()]);
  const supabase = createClient();

  // Latest payment per booking (status drives the Payment column).
  const allIds = bookings.map((b) => b.id);
  const payByBooking = new Map<
    string,
    { amount: number; status: "pending" | "confirmed" }
  >();
  if (allIds.length > 0) {
    const { data: pays } = await supabase
      .from("payments")
      .select("booking_id, amount, status, created_at")
      .in("booking_id", allIds)
      .order("created_at", { ascending: false });
    for (const p of (pays as
      | { booking_id: string; amount: number; status: "pending" | "confirmed" }[]
      | null) ?? []) {
      if (!payByBooking.has(p.booking_id)) {
        payByBooking.set(p.booking_id, { amount: Number(p.amount), status: p.status });
      }
    }
  }

  // Deployable = not paid/closed; completed jobs only stay if a payment still
  // needs confirming (so management can confirm it from here).
  const active = bookings.filter(
    (b) =>
      !["paid", "closed"].includes(b.status) &&
      (b.status !== "completed" ||
        payByBooking.get(b.id)?.status === "pending"),
  );

  // Latest job order per booking (for the Job Order amount + details).
  const ids = active.map((b) => b.id);
  const byBooking = new Map<string, { amount: number; detail: JobOrderDetail }>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from("job_orders")
      .select(
        `id, booking_id, add_separate_enclosure, additional_wire_meters,
         wire_rate_per_meter, additional_job_works, final_total, notes,
         signature, status, created_at,
         packages(name, base_price, enclosure_included),
         enclosures(name, price)`,
      )
      .in("booking_id", ids)
      .order("created_at", { ascending: false });

    for (const jo of (data as unknown as JobOrderRow[]) ?? []) {
      if (byBooking.has(jo.booking_id)) continue; // keep the latest only
      const pricing = computePricing({
        pkg: jo.packages
          ? {
              base_price: jo.packages.base_price,
              enclosure_included: jo.packages.enclosure_included,
            }
          : null,
        enclosure: jo.enclosures ? { price: jo.enclosures.price } : null,
        addSeparateEnclosure: jo.add_separate_enclosure,
        additionalWireMeters: jo.additional_wire_meters,
        wireRatePerMeter: jo.wire_rate_per_meter,
        additionalJobWorks: jo.additional_job_works ?? [],
      });
      byBooking.set(jo.booking_id, {
        amount: Number(jo.final_total),
        detail: {
          clientName:
            active.find((b) => b.id === jo.booking_id)?.client_name ?? "",
          packageName: jo.packages?.name ?? null,
          enclosureName: jo.enclosures?.name ?? null,
          totalWireMeters: Number(jo.additional_wire_meters),
          pricing,
          notes: jo.notes,
          signature: jo.signature,
          status: jo.status,
        },
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Deployment"
        description="Assign a field officer + installer and set the schedule. The officer sees it instantly on their dashboard."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Job Order</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Field Officer</TableHead>
                <TableHead>Installer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((b) => {
                const jo = byBooking.get(b.id);
                const pay = payByBooking.get(b.id);
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.client_name}</p>
                      <p className="text-xs text-muted-foreground">{b.address}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(b.preferred_date)}
                      {b.preferred_time ? ` · ${b.preferred_time}` : ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.preferred_package?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {jo ? (
                        <JobOrderAmount amount={jo.amount} detail={jo.detail} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {!pay ? (
                        <span className="text-muted-foreground">
                          No payment
                        </span>
                      ) : pay.status === "confirmed" ? (
                        <Badge variant="accent">Paid</Badge>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant="secondary">Payment pending</Badge>
                          <ConfirmPaymentButton bookingId={b.id} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.assigned_field_officer?.full_name ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.assigned_installer?.full_name ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeployDialog booking={b} staff={staff} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {active.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No active bookings to deploy.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
