import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  ClientFinancialsTracker,
  type FinancialLine,
} from "@/components/admin/client-financials-tracker";
import { php, formatDate } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type BookingStatus,
  type JobWork,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/types";

export const metadata = { title: "Client Financials" };
export const dynamic = "force-dynamic";

interface PayRow {
  amount: number;
  method: PaymentMethod;
  splits: { method: PaymentMethod; amount: number }[] | null;
  reference_no: string | null;
  status: PaymentStatus;
  paid_at: string | null;
}

interface JoRow {
  package_id: string | null;
  enclosure_id: string | null;
  add_separate_enclosure: boolean;
  additional_wire_meters: number;
  additional_job_works: JobWork[] | null;
  final_total: number | string;
}

const PAY_STATUS: Record<PaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
};

export default async function ClientFinancialsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["owner"]);
  const supabase = createClient();

  const [
    { data: booking },
    { data: internal },
    { data: pays },
    { data: lines },
    { data: status },
    { data: jo },
    { data: pkgs },
    { data: encs },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, client_number, client_name, address, contact_number, status, preferred_date, preferred_package_id, preferred_enclosure_id, assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(full_name)",
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("internal_clients")
      .select(
        "id, client_name, address, install_date, payment_amount, payment_method, payment_ref",
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount, method, splits, reference_no, status, paid_at, created_at")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_financials")
      .select(
        "id, entry_date, project_name, expense_type, description, amount, charge_to, remarks",
      )
      .eq("booking_id", params.id)
      // Entry order: package template lines first (as loaded), additional
      // expenses added later appear below them — like the sheet.
      .order("created_at", { ascending: true }),
    supabase
      .from("client_financial_status")
      .select("finalized_at, finalized_by_name")
      .eq("booking_id", params.id)
      .maybeSingle(),
    supabase
      .from("job_orders")
      .select(
        "package_id, enclosure_id, add_separate_enclosure, additional_wire_meters, additional_job_works, final_total",
      )
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("packages").select("id, name"),
    supabase.from("enclosures").select("id, name"),
  ]);

  const ic = internal as {
    id: string;
    client_name: string;
    address: string | null;
    install_date: string | null;
    payment_amount: number;
    payment_method: string | null;
    payment_ref: string | null;
  } | null;
  const isInternal = !booking && !!ic;
  if (!booking && !ic) notFound();
  const b = booking
    ? (booking as unknown as {
        id: string;
        client_number: string | null;
        client_name: string;
        address: string;
        contact_number: string;
        status: BookingStatus;
        preferred_date: string | null;
        preferred_package_id: string | null;
        assigned_field_officer: { full_name: string } | null;
      })
    : {
        id: ic!.id,
        client_number: null,
        client_name: ic!.client_name,
        address: ic!.address ?? "",
        contact_number: "",
        status: "completed" as BookingStatus,
        preferred_date: ic!.install_date,
        preferred_package_id: null,
        assigned_field_officer: null,
      };

  // Payment: confirmed payments when present, otherwise whatever is recorded.
  const payRows = (pays as unknown as PayRow[] | null) ?? [];
  const confirmed = payRows.filter((p) => p.status === "confirmed");
  const payment = isInternal
    ? Number(ic!.payment_amount ?? 0)
    : (confirmed.length ? confirmed : payRows).reduce(
        (t, p) => t + Number(p.amount || 0),
        0,
      );

  const financialLines: FinancialLine[] = (
    (lines as FinancialLine[] | null) ?? []
  ).map((l) => ({ ...l, amount: Number(l.amount ?? 0) }));

  // Job order lookups.
  const joRow = (jo as JoRow | null) ?? null;
  const pkgName = new Map(
    ((pkgs as { id: string; name: string }[] | null) ?? []).map((p) => [
      p.id,
      p.name,
    ]),
  );
  const encName = new Map(
    ((encs as { id: string; name: string }[] | null) ?? []).map((e) => [
      e.id,
      e.name,
    ]),
  );

  // Packages availed — grouped from the loaded cost lines.
  const pkgGroups: { name: string; items: number; total: number }[] = [];
  {
    const map = new Map<string, { items: number; total: number }>();
    for (const l of financialLines) {
      const name = l.project_name?.trim();
      if (!name) continue;
      const g = map.get(name) ?? { items: 0, total: 0 };
      g.items += 1;
      g.total += Number(l.amount || 0);
      map.set(name, g);
    }
    for (const [name, g] of map) pkgGroups.push({ name, ...g });
  }

  const payMethods = (p: PayRow): string => {
    const splits = Array.isArray(p.splits) ? p.splits : null;
    if (splits && splits.length)
      return splits
        .map((s) => `${PAYMENT_METHOD_LABELS[s.method]} ${php(s.amount)}`)
        .join(" + ");
    return PAYMENT_METHOD_LABELS[p.method];
  };

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
          {b.contact_number && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {b.contact_number}
            </span>
          )}
          {isInternal && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Internal record
            </span>
          )}
          {b.preferred_date && (
            <span>Install: {formatDate(b.preferred_date)}</span>
          )}
          {b.assigned_field_officer?.full_name && (
            <span>Field Officer: {b.assigned_field_officer.full_name}</span>
          )}
        </CardContent>
      </Card>

      {/* Job order + payment method details */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {!joRow ? (
              <p className="text-muted-foreground">
                No job order submitted for this client yet.
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Package</span>
                  <span className="text-right font-medium">
                    {joRow.package_id
                      ? (pkgName.get(joRow.package_id) ?? "—")
                      : "—"}
                  </span>
                </div>
                {joRow.add_separate_enclosure && joRow.enclosure_id && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">
                      Separate enclosure
                    </span>
                    <span className="text-right">
                      {encName.get(joRow.enclosure_id) ?? "—"}
                    </span>
                  </div>
                )}
                {Number(joRow.additional_wire_meters || 0) > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">
                      Additional wire
                    </span>
                    <span className="text-right">
                      {joRow.additional_wire_meters} m
                    </span>
                  </div>
                )}
                {(joRow.additional_job_works ?? []).map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="text-muted-foreground">
                      {w.description || "Additional job work"}
                    </span>
                    <span className="text-right tabular-nums">
                      {php(w.amount)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
                  <span>Job order total</span>
                  <span className="tabular-nums">
                    {php(Number(joRow.final_total || 0))}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isInternal ? (
              <div className="rounded-md border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold tabular-nums">
                    {php(payment)}
                  </span>
                  <Badge variant="accent">Confirmed</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mode of payment:{" "}
                  {ic!.payment_method
                    ? (PAYMENT_METHOD_LABELS[
                        ic!.payment_method as PaymentMethod
                      ] ?? ic!.payment_method)
                    : "—"}
                </p>
                {ic!.payment_ref && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {ic!.payment_ref}
                  </p>
                )}
              </div>
            ) : payRows.length === 0 ? (
              <p className="text-muted-foreground">
                No payment recorded for this client yet.
              </p>
            ) : (
              payRows.map((p, i) => (
                <div
                  key={i}
                  className="rounded-md border bg-secondary/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold tabular-nums">
                      {php(Number(p.amount || 0))}
                    </span>
                    <Badge
                      variant={
                        p.status === "confirmed"
                          ? "accent"
                          : p.status === "declined"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {PAY_STATUS[p.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mode of payment: {payMethods(p)}
                  </p>
                  {p.reference_no && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {p.reference_no}
                    </p>
                  )}
                  {p.paid_at && (
                    <p className="text-xs text-muted-foreground">
                      Paid: {formatDate(p.paid_at)}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Packages availed (from the loaded cost lines) */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Packages availed</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pkgGroups.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No package loaded yet — pick one below to add its cost lines.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="p-3 text-left font-medium">Package</th>
                  <th className="p-3 text-right font-medium">Items</th>
                  <th className="p-3 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {pkgGroups.map((g) => (
                  <tr key={g.name} className="border-t">
                    <td className="p-3 font-medium">{g.name}</td>
                    <td className="p-3 text-right tabular-nums">{g.items}</td>
                    <td className="p-3 text-right tabular-nums">
                      {php(g.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ClientFinancialsTracker
        bookingId={b.id}
        lines={financialLines}
        payment={payment}
        installDate={b.preferred_date}
        bookedPackage={
          pkgName.get(
            joRow?.package_id ?? b.preferred_package_id ?? "",
          ) ?? null
        }
        bookedEnclosure={
          joRow
            ? joRow.add_separate_enclosure && joRow.enclosure_id
              ? (encName.get(joRow.enclosure_id) ?? "Enclosure")
              : null
            : null
        }
        finalizedAt={
          (status as { finalized_at: string | null } | null)?.finalized_at ??
          null
        }
        finalizedByName={
          (status as { finalized_by_name: string | null } | null)
            ?.finalized_by_name ?? null
        }
      />
    </div>
  );
}
