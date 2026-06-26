import { createClient } from "@/lib/supabase/server";
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
import { php, formatDate } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

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

export default async function AccountingPage() {
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

  const payments = (data as unknown as PaymentRow[]) ?? [];
  const confirmed = payments.filter((p) => p.status === "confirmed");

  const total = confirmed.reduce((s, p) => s + Number(p.amount), 0);

  // By method
  const byMethod = new Map<string, number>();
  for (const p of confirmed)
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  const methodData = [...byMethod.entries()].map(([k, v]) => ({
    label: PAYMENT_METHOD_LABELS[k as PaymentMethod],
    value: v,
  }));

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
      <PageHeader title="Payments" description="All confirmed payments and breakdowns.">
        <CsvExport rows={csvRows} filename="futex-payments.csv" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total received" value={php(total)} accent />
        <Stat label="Payments" value={String(confirmed.length)} />
        <Stat
          label="Avg payment"
          value={php(confirmed.length ? total / confirmed.length : 0)}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
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
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No payments recorded yet.
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
