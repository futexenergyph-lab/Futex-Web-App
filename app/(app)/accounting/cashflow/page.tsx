import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InOutChart, CategoryBarChart } from "@/components/charts";
import { DateRangeFilter } from "@/components/accounting/date-range-filter";
import { php, cn } from "@/lib/utils";
import { EXPENSE_TYPE_LABELS, type Expense, type ExpenseType } from "@/lib/types";

export const metadata = { title: "Financial Overview" };
export const dynamic = "force-dynamic";

function inRange(d: string, from?: string, to?: string) {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

type Gran = "day" | "month" | "year";
function bucket(d: string, g: Gran) {
  if (g === "day") return d;
  if (g === "month") return d.slice(0, 7);
  return d.slice(0, 4);
}

export default async function FinancialOverviewPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const from = searchParams.from;
  const to = searchParams.to;

  const supabase = createClient();
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at, created_at, status")
      .eq("status", "confirmed"),
    supabase.from("expenses").select("amount, expense_date, type"),
  ]);

  const inflow = (payments ?? [])
    .map((p) => ({
      when: ((p.paid_at as string) ?? (p.created_at as string)).slice(0, 10),
      amount: Number(p.amount),
    }))
    .filter((x) => inRange(x.when, from, to));

  const outflow = ((expenses as Expense[] | null) ?? [])
    .map((e) => ({
      when: e.expense_date,
      amount: Number(e.amount),
      type: e.type,
    }))
    .filter((x) => inRange(x.when, from, to));

  const revenue = inflow.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = outflow.reduce((s, x) => s + x.amount, 0);
  const net = revenue - totalExpenses;
  const margin = revenue > 0 ? Math.round((net / revenue) * 100) : 0;

  // Choose chart granularity from the range span.
  let gran: Gran = "month";
  if (from && to) {
    const days =
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    gran = days <= 62 ? "day" : days <= 731 ? "month" : "year";
  }

  const map = new Map<string, { inflow: number; outflow: number }>();
  const ensure = (k: string) =>
    map.get(k) ?? map.set(k, { inflow: 0, outflow: 0 }).get(k)!;
  for (const x of inflow) ensure(bucket(x.when, gran)).inflow += x.amount;
  for (const x of outflow) ensure(bucket(x.when, gran)).outflow += x.amount;
  const series = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label: gran === "month" ? label.slice(2) : label,
      inflow: v.inflow,
      outflow: v.outflow,
    }));

  // Expenses by type
  const byType = new Map<string, number>();
  for (const x of outflow)
    byType.set(x.type, (byType.get(x.type) ?? 0) + x.amount);
  const typeData = [...byType.entries()].map(([k, v]) => ({
    label: EXPENSE_TYPE_LABELS[k as ExpenseType] ?? k,
    value: v,
  }));

  const rangeLabel =
    from || to ? `${from ?? "start"} → ${to ?? "today"}` : "All time";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Overview"
        description="Revenue, expenses and net profit for the selected period."
      />

      <DateRangeFilter basePath="/accounting/cashflow" from={from} to={to} />

      {/* Income statement */}
      <Card>
        <CardHeader>
          <CardTitle>Income statement · {rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground">Revenue (inflows)</dt>
              <dd className="font-medium tabular-nums text-futex-green">
                {php(revenue)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground">Less: Expenses (outflows)</dt>
              <dd className="font-medium tabular-nums text-destructive">
                ({php(totalExpenses)})
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-base font-semibold">Net profit</dt>
              <dd
                className={cn(
                  "text-lg font-bold tabular-nums",
                  net >= 0 ? "text-futex-green" : "text-destructive",
                )}
              >
                {php(net)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground">Net margin</dt>
              <dd className="font-medium tabular-nums">{margin}%</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inflows vs Outflows</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length ? (
            <InOutChart data={series} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No data for this period.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by type</CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length ? (
            <CategoryBarChart data={typeData} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
