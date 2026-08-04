import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import {
  FinancialReportList,
  type ClientFinancialRow,
} from "@/components/admin/financial-report-list";
import type { BookingStatus } from "@/lib/types";

export const metadata = { title: "Financial Report (Per Client)" };
export const dynamic = "force-dynamic";

export default async function FinancialReportPage() {
  await requireRole(["owner"]);
  const supabase = createClient();

  const [{ data: bookings }, { data: pays }, { data: fins }, { data: stats }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, client_number, client_name, address, status, preferred_date, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("booking_id, amount, status"),
      supabase.from("client_financials").select("booking_id, amount"),
      supabase
        .from("client_financial_status")
        .select("booking_id, finalized_at"),
    ]);

  const finalized = new Set(
    (
      (stats as { booking_id: string; finalized_at: string | null }[] | null) ??
      []
    )
      .filter((s) => s.finalized_at)
      .map((s) => s.booking_id),
  );

  // Payment per booking: confirmed payments if any, else whatever is recorded.
  const payAll = new Map<string, number>();
  const payConfirmed = new Map<string, number>();
  for (const p of (pays as
    | { booking_id: string; amount: number; status: string }[]
    | null) ?? []) {
    const amt = Number(p.amount || 0);
    payAll.set(p.booking_id, (payAll.get(p.booking_id) ?? 0) + amt);
    if (p.status === "confirmed") {
      payConfirmed.set(p.booking_id, (payConfirmed.get(p.booking_id) ?? 0) + amt);
    }
  }

  const expByBooking = new Map<string, number>();
  for (const f of (fins as { booking_id: string; amount: number }[] | null) ??
    []) {
    expByBooking.set(
      f.booking_id,
      (expByBooking.get(f.booking_id) ?? 0) + Number(f.amount || 0),
    );
  }

  const rows: ClientFinancialRow[] = (
    (bookings as
      | {
          id: string;
          client_number: string | null;
          client_name: string;
          address: string;
          status: BookingStatus;
          preferred_date: string | null;
          created_at: string;
        }[]
      | null) ?? []
  ).map((b) => {
    const payment = payConfirmed.get(b.id) ?? payAll.get(b.id) ?? 0;
    const expenses = expByBooking.get(b.id) ?? 0;
    return {
      id: b.id,
      client_number: b.client_number,
      client_name: b.client_name,
      address: b.address,
      status: b.status,
      preferred_date: b.preferred_date,
      created_at: b.created_at,
      payment,
      expenses,
      profit: payment - expenses,
      finalized: finalized.has(b.id),
    };
  });

  return (
    <div>
      <Link
        href="/admin/internal-inputs"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Internal Inputs
      </Link>
      <PageHeader
        title="Financial Report (Per Client)"
        description="All client records. Click a client name to log project-based expenses and see their payment, expenses and profit."
      />
      <FinancialReportList rows={rows} />
    </div>
  );
}
