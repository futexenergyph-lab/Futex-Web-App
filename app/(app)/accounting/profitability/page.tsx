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
import { RevenueLineChart, CategoryBarChart } from "@/components/charts";
import { php, formatDate } from "@/lib/utils";

export const metadata = { title: "Profitability" };
export const dynamic = "force-dynamic";

interface JobOrderRow {
  id: string;
  final_total: number;
  booking_id: string;
  submitted_at: string | null;
  created_at: string;
  packages: { name: string } | null;
  bookings: { client_name: string; status: string } | null;
}

export default async function ProfitabilityPage() {
  const supabase = createClient();
  const [{ data: jobOrders }, { data: payments }] = await Promise.all([
    supabase
      .from("job_orders")
      .select(
        "id, final_total, booking_id, submitted_at, created_at, packages(name), bookings(client_name, status)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("booking_id, amount, paid_at, created_at, status")
      .eq("status", "confirmed"),
  ]);

  const jos = (jobOrders as unknown as JobOrderRow[]) ?? [];
  const paidBookingIds = new Set(
    (payments ?? []).map((p) => p.booking_id as string),
  );

  const totalRevenue = (payments ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const totalQuoted = jos.reduce((s, j) => s + Number(j.final_total), 0);

  // Outstanding = job order exists but booking not yet paid.
  const outstanding = jos.filter((j) => !paidBookingIds.has(j.booking_id));
  const outstandingTotal = outstanding.reduce(
    (s, j) => s + Number(j.final_total),
    0,
  );

  // Revenue over time (by day) from confirmed payments.
  const byDay = new Map<string, number>();
  for (const p of payments ?? []) {
    const day = (p.paid_at ?? p.created_at)?.slice(0, 10) ?? "—";
    byDay.set(day, (byDay.get(day) ?? 0) + Number(p.amount));
  }
  const revenueSeries = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }));

  // Revenue by package from job orders.
  const byPackage = new Map<string, number>();
  for (const j of jos) {
    const name = j.packages?.name ?? "—";
    byPackage.set(name, (byPackage.get(name) ?? 0) + Number(j.final_total));
  }
  const packageData = [...byPackage.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const csvRows = jos.map((j) => ({
    date: j.submitted_at ?? j.created_at,
    client: j.bookings?.client_name ?? "",
    package: j.packages?.name ?? "",
    final_total: j.final_total,
    paid: paidBookingIds.has(j.booking_id) ? "yes" : "no",
    status: j.bookings?.status ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profitability"
        description="Revenue, quoted job totals, and outstanding (unpaid) jobs."
      >
        <CsvExport rows={csvRows} filename="futex-job-orders.csv" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Revenue received" value={php(totalRevenue)} accent />
        <Stat label="Quoted (all job orders)" value={php(totalQuoted)} />
        <Stat
          label={`Outstanding (${outstanding.length})`}
          value={php(outstandingTotal)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueSeries.length ? (
              <RevenueLineChart data={revenueSeries} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by package</CardTitle>
          </CardHeader>
          <CardContent>
            {packageData.length ? (
              <CategoryBarChart data={packageData} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding jobs (completed but unpaid)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="text-sm">
                    {formatDate(j.submitted_at ?? j.created_at)}
                  </TableCell>
                  <TableCell>{j.bookings?.client_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {j.packages?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {j.bookings?.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {php(j.final_total)}
                  </TableCell>
                </TableRow>
              ))}
              {outstanding.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No outstanding jobs. 🎉
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
        <p className={`mt-1 text-2xl font-bold ${accent ? "text-futex-green" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
}
