import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  ClientFinancialsTracker,
  type FinancialLine,
} from "@/components/admin/client-financials-tracker";
import { formatDate } from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";

export const metadata = { title: "Client Financials" };
export const dynamic = "force-dynamic";

export default async function ClientFinancialsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["owner"]);
  const supabase = createClient();

  const [{ data: booking }, { data: pays }, { data: lines }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, client_number, client_name, address, contact_number, status, preferred_date",
        )
        .eq("id", params.id)
        .single(),
      supabase
        .from("payments")
        .select("amount, status")
        .eq("booking_id", params.id),
      supabase
        .from("client_financials")
        .select(
          "id, entry_date, project_name, expense_type, description, amount, charge_to, remarks",
        )
        .eq("booking_id", params.id)
        // Entry order: package template lines first (as loaded), additional
        // expenses added later appear below them — like the sheet.
        .order("created_at", { ascending: true }),
    ]);

  if (!booking) notFound();
  const b = booking as {
    id: string;
    client_number: string | null;
    client_name: string;
    address: string;
    contact_number: string;
    status: BookingStatus;
    preferred_date: string | null;
  };

  // Payment: confirmed payments when present, otherwise whatever is recorded.
  const payRows = (pays as { amount: number; status: string }[] | null) ?? [];
  const confirmed = payRows.filter((p) => p.status === "confirmed");
  const payment = (confirmed.length ? confirmed : payRows).reduce(
    (t, p) => t + Number(p.amount || 0),
    0,
  );

  const financialLines: FinancialLine[] = (
    (lines as FinancialLine[] | null) ?? []
  ).map((l) => ({ ...l, amount: Number(l.amount ?? 0) }));

  return (
    <div>
      <Link
        href="/admin/internal-inputs/financial-report"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Financial Report
      </Link>
      <PageHeader title={b.client_name}>
        <StatusBadge status={b.status} />
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm text-muted-foreground">
          {b.client_number && (
            <span className="font-mono text-xs">#{b.client_number}</span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {b.address}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {b.contact_number}
          </span>
          {b.preferred_date && (
            <span>Install: {formatDate(b.preferred_date)}</span>
          )}
        </CardContent>
      </Card>

      <ClientFinancialsTracker
        bookingId={b.id}
        lines={financialLines}
        payment={payment}
      />
    </div>
  );
}
