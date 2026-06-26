import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InOutChart } from "@/components/charts";
import { php } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export const metadata = { title: "Cash Flow" };
export const dynamic = "force-dynamic";

type Period = "day" | "month" | "year" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
  { key: "all", label: "All the time" },
];

function bucketKey(iso: string, period: Period): string {
  const d = iso.slice(0, 10); // YYYY-MM-DD
  if (period === "day") return d;
  if (period === "month") return d.slice(0, 7);
  if (period === "year") return d.slice(0, 4);
  return "All time";
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: Period = (["day", "month", "year", "all"].includes(
    searchParams.period ?? "",
  )
    ? searchParams.period
    : "month") as Period;

  const supabase = createClient();
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at, created_at, status")
      .eq("status", "confirmed"),
    supabase.from("expenses").select("amount, expense_date"),
  ]);

  const inflowList = (payments ?? []).map((p) => ({
    when: (p.paid_at as string) ?? (p.created_at as string),
    amount: Number(p.amount),
  }));
  const outflowList = ((expenses as Expense[] | null) ?? []).map((e) => ({
    when: e.expense_date,
    amount: Number(e.amount),
  }));

  const totalIn = inflowList.reduce((s, x) => s + x.amount, 0);
  const totalOut = outflowList.reduce((s, x) => s + x.amount, 0);
  const net = totalIn - totalOut;

  // Group into a combined series.
  const map = new Map<string, { inflow: number; outflow: number }>();
  const ensure = (k: string) =>
    map.get(k) ?? map.set(k, { inflow: 0, outflow: 0 }).get(k)!;
  for (const x of inflowList) ensure(bucketKey(x.when, period)).inflow += x.amount;
  for (const x of outflowList) ensure(bucketKey(x.when, period)).outflow += x.amount;

  const series = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label: period === "month" ? label.slice(2) : label,
      inflow: v.inflow,
      outflow: v.outflow,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow"
        description="Receivable inflows vs. expense outflows."
      />

      {/* Period toggle */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-background p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/accounting/cashflow?period=${p.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total inflows</p>
            <p className="mt-1 text-2xl font-bold text-futex-green">
              {php(totalIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total outflows</p>
            <p className="mt-1 text-2xl font-bold text-destructive">
              {php(totalOut)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net cash flow</p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                net >= 0 ? "text-futex-green" : "text-destructive",
              )}
            >
              {php(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Inflows vs Outflows ·{" "}
            {PERIODS.find((p) => p.key === period)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {series.length ? (
            <InOutChart data={series} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No cash-flow data yet. Record payments and expenses to see the
              graph.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
