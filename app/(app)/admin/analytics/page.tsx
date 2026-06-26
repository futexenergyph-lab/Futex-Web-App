import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBarChart, RevenueLineChart, MixPieChart } from "@/components/charts";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/lib/types";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const DAILY_CAPACITY = 10; // 5 field officers × 2 slots

interface Row {
  id: string;
  status: BookingStatus;
  preferred_date: string | null;
  created_at: string;
  packages: { name: string } | null;
  enclosures: { name: string } | null;
}

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, status, preferred_date, created_at,
       packages:packages!bookings_preferred_package_id_fkey(name),
       enclosures:enclosures!bookings_preferred_enclosure_id_fkey(name)`,
    );

  const rows = (data as unknown as Row[]) ?? [];

  // Funnel by status.
  const funnel = BOOKING_STATUSES.map((s) => ({
    label: BOOKING_STATUS_LABELS[s],
    value: rows.filter((r) => r.status === s).length,
  }));

  // Package demand.
  const pkgMap = new Map<string, number>();
  for (const r of rows) {
    const n = r.packages?.name;
    if (n) pkgMap.set(n, (pkgMap.get(n) ?? 0) + 1);
  }
  const packageDemand = [...pkgMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  // Enclosure demand.
  const encMap = new Map<string, number>();
  for (const r of rows) {
    const n = r.enclosures?.name;
    if (n) encMap.set(n, (encMap.get(n) ?? 0) + 1);
  }
  const enclosureDemand = [...encMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  // Jobs per day vs capacity.
  const dayMap = new Map<string, number>();
  for (const r of rows) {
    if (!r.preferred_date) continue;
    dayMap.set(r.preferred_date, (dayMap.get(r.preferred_date) ?? 0) + 1);
  }
  const jobsPerDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }));

  // Funnel conversion summary.
  const totalNew = rows.length;
  const completed = rows.filter((r) =>
    ["completed", "paid", "closed"].includes(r.status),
  ).length;
  const paid = rows.filter((r) => ["paid", "closed"].includes(r.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Demand, funnel and capacity insights across the operation."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total bookings" value={String(totalNew)} />
        <Stat label="Completed" value={String(completed)} />
        <Stat label="Paid" value={String(paid)} />
        <Stat
          label="Conversion"
          value={totalNew ? `${Math.round((paid / totalNew) * 100)}%` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={funnel} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Package demand</CardTitle>
          </CardHeader>
          <CardContent>
            {packageDemand.length ? (
              <CategoryBarChart data={packageDemand} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enclosure demand</CardTitle>
          </CardHeader>
          <CardContent>
            {enclosureDemand.length ? (
              <MixPieChart data={enclosureDemand} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs per day</CardTitle>
          <p className="text-sm text-muted-foreground">
            Daily capacity baseline: {DAILY_CAPACITY} jobs (5 officers × 2 slots).
          </p>
        </CardHeader>
        <CardContent>
          {jobsPerDay.length ? (
            <RevenueLineChart data={jobsPerDay} />
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
}
