import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CsvExport } from "@/components/csv-export";
import { MixPieChart, CategoryBarChart } from "@/components/charts";
import { DateRangeFilter } from "@/components/accounting/date-range-filter";
import { PaymentEditDialog } from "@/components/admin/payment-edit-dialog";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { php, formatDate, phDay } from "@/lib/utils";
import { fetchRetailRevenue } from "@/lib/retail";
import {
  PAYMENT_METHOD_LABELS,
  RETAIL_PURCHASE_TYPE_LABELS,
  type PaymentMethod,
} from "@/lib/types";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference_no: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  bookings: { client_name: string } | null;
  confirmed_by: { full_name: string } | null;
  job_orders: { final_total: number; packages: { name: string } | null } | null;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  // The limited Admin role sees the current day's payments only (no
  // backtracking); everyone else may filter by date range.
  const me = await getProfile();
  const limited = me?.role === "admin_staff";
  // Only Management & Owner may edit/delete records.
  const canManage = me?.role === "admin" || me?.role === "owner";
  const today = phDay(new Date().toISOString());
  const from = limited ? today : searchParams.from;
  const to = limited ? today : searchParams.to;

  const supabase = createClient();
  const { data } = await supabase
    .from("payments")
    .select(
      `id, amount, method, reference_no, status, paid_at, created_at,
       bookings(client_name),
       confirmed_by:profiles!payments_confirmed_by_field_officer_id_fkey(full_name),
       job_orders(final_total, packages(name))`,
    )
    .order("created_at", { ascending: false });

  // Effective date evaluated in Philippine time (UTC+8).
  const eff = (p: PaymentRow) => phDay(p.paid_at ?? p.created_at);
  const inRange = (d: string) =>
    (!from || d >= from) && (!to || d <= to);

  const payments = ((data as unknown as PaymentRow[]) ?? []).filter((p) =>
    inRange(eff(p)),
  );
  const confirmed = payments.filter((p) => p.status === "confirmed");

  // Submitted retail purchases count as revenue under a "Retail Purchase"
  // category, filtered to the same date window.
  const retail = (await fetchRetailRevenue(supabase)).filter((r) =>
    inRange(r.day),
  );
  const retailTotal = retail.reduce((s, r) => s + r.amount, 0);

  const confirmedTotal = confirmed.reduce((s, p) => s + Number(p.amount), 0);
  const total = confirmedTotal + retailTotal;

  // By method
  const byMethod = new Map<string, number>();
  for (const p of confirmed)
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  const methodData = [...byMethod.entries()].map(([k, v]) => ({
    label: PAYMENT_METHOD_LABELS[k as PaymentMethod],
    value: v,
  }));
  if (retailTotal > 0)
    methodData.push({ label: "Retail Purchase", value: retailTotal });

  // By officer
  const byOfficer = new Map<string, number>();
  for (const p of confirmed) {
    const name = p.confirmed_by?.full_name ?? "—";
    byOfficer.set(name, (byOfficer.get(name) ?? 0) + Number(p.amount));
  }
  const officerData = [...byOfficer.entries()].map(([k, v]) => ({
    label: k,
    value: v,
  }));

  const csvRows = confirmed.map((p) => ({
    date: p.paid_at ?? p.created_at,
    client: p.bookings?.client_name ?? "",
    package: p.job_orders?.packages?.name ?? "",
    method: PAYMENT_METHOD_LABELS[p.method],
    reference: p.reference_no ?? "",
    officer: p.confirmed_by?.full_name ?? "",
    amount: p.amount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={
          limited
            ? "Today's confirmed payments."
            : "All confirmed payments and breakdowns."
        }
      >
        {!limited && <CsvExport rows={csvRows} filename="futex-payments.csv" />}
      </PageHeader>

      {limited ? (
        <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          Showing the current day only ({formatDate(today)}). Past payment
          records aren&apos;t available on this account.
        </p>
      ) : (
        <DateRangeFilter basePath="/accounting" from={from} to={to} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total received" value={php(total)} accent />
        <Stat label="Payments" value={String(confirmed.length)} />
        <Stat
          label="Avg payment"
          value={php(confirmed.length ? confirmedTotal / confirmed.length : 0)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment method mix</CardTitle>
          </CardHeader>
          <CardContent>
            {methodData.length ? (
              <MixPieChart data={methodData} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by officer</CardTitle>
          </CardHeader>
          <CardContent>
            {officerData.length ? (
              <CategoryBarChart data={officerData} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmed.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {formatDate(p.paid_at ?? p.created_at)}
                  </TableCell>
                  <TableCell>{p.bookings?.client_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {p.job_orders?.packages?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.confirmed_by?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {php(p.amount)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <PaymentEditDialog
                          payment={{
                            id: p.id,
                            amount: Number(p.amount),
                            method: p.method,
                            reference_no: p.reference_no,
                            status: p.status,
                          }}
                          clientName={p.bookings?.client_name ?? "—"}
                        />
                        <DeleteRecordButton
                          table="payments"
                          id={p.id}
                          label={`Payment ${php(p.amount)} — ${p.bookings?.client_name ?? "—"}`}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {confirmed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    No confirmed payments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {retail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Retail purchases (profit)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retail.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{formatDate(r.day)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {RETAIL_PURCHASE_TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.created_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {php(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-2xl font-bold ${accent ? "text-futex-green" : ""}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
}
