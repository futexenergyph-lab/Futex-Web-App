import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InOutChart, CategoryBarChart } from "@/components/charts";
import { DateRangeFilter } from "@/components/accounting/date-range-filter";
import { php, cn } from "@/lib/utils";
import { fetchRetailRevenue } from "@/lib/retail";
import {
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type Expense,
  type ExpenseType,
  type PaymentMethod,
  type PaymentSplit,
} from "@/lib/types";

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
      .select("amount, method, splits, paid_at, created_at, status")
      .eq("status", "confirmed"),
    // Only expenses that have cleared the field→admin review count officially.
    supabase
      .from("expenses")
      .select("amount, expense_date, type, status")
      .not("status", "in", "(draft,submitted)"),
  ]);

  // Submitted retail purchases are additional revenue (inflow).
  const retail = await fetchRetailRevenue(supabase);

  const inflow = [
    ...(payments ?? []).map((p) => ({
      when: ((p.paid_at as string) ?? (p.created_at as string)).slice(0, 10),
      amount: Number(p.amount),
    })),
    ...retail.map((r) => ({ when: r.day, amount: r.amount })),
  ].filter((x) => inRange(x.when, from, to));

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

  // Breakdown of client payments by mode of payment (split payments are
  // distributed across their parts). Retail purchases have no mode and are
  // excluded from this breakdown.
  const byMode = new Map<PaymentMethod, number>();
  for (const p of (payments as
    | {
        amount: number;
        method: PaymentMethod;
        splits: PaymentSplit[] | null;
        paid_at: string | null;
        created_at: string;
      }[]
    | null) ?? []) {
    const when = (p.paid_at ?? p.created_at).slice(0, 10);
    if (!inRange(when, from, to)) continue;
    if (p.splits && p.splits.length > 0) {
      for (const s of p.splits)
        byMode.set(s.method, (byMode.get(s.method) ?? 0) + Number(s.amount));
    } else {
      byMode.set(p.method, (byMode.get(p.method) ?? 0) + Number(p.amount));
    }
  }
  const paymentsTotal = [...byMode.values()].reduce((s, v) => s + v, 0);
  const modeRows = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
    .map((m) => ({ method: m, amount: byMode.get(m) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const modeData = modeRows.map((r) => ({
    label: PAYMENT_METHOD_LABELS[r.method],
    value: r.amount,
  }));

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

  // Expenses by type — grouped by display label so merged categories
  // (legacy Rental into Rent, Lease and Utilities) chart as one bar.
  const byType = new Map<string, number>();
  for (const x of outflow) {
    const label = EXPENSE_TYPE_LABELS[x.type as ExpenseType] ?? x.type;
    byType.set(label, (byType.get(label) ?? 0) + x.amount);
  }
  const typeData = [...byType.entries()].map(([label, value]) => ({
    label,
    value,
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
          <CardTitle>Payments by mode</CardTitle>
          <p className="text-sm text-muted-foreground">
            Client payments broken down by cash, credit card, bank transfer and
            check (split payments counted per part).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {modeData.length ? (
            <>
              <CategoryBarChart data={modeData} />
              <dl className="divide-y text-sm">
                {modeRows.map((r) => (
                  <div
                    key={r.method}
                    className="flex items-center justify-between py-1.5"
                  >
                    <dt className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[r.method]}
                    </dt>
                    <dd className="flex items-center gap-3 tabular-nums">
                      <span className="text-xs text-muted-foreground">
                        {paymentsTotal
                          ? Math.round((r.amount / paymentsTotal) * 100)
                          : 0}
                        %
                      </span>
                      <span className="font-medium">{php(r.amount)}</span>
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 font-semibold">
                  <dt>Total payments</dt>
                  <dd className="tabular-nums">{php(paymentsTotal)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No client payments for this period.
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
