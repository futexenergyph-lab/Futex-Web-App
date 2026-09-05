import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvExport } from "@/components/csv-export";
import { CategoryBarChart } from "@/components/charts";
import { DateRangeFilter } from "@/components/accounting/date-range-filter";
import {
  ExpenseBatches,
  type ExpenseBatch,
} from "@/components/accounting/expense-batches";
import { php } from "@/lib/utils";
import {
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

/**
 * The Expenses dashboard filtered by WHO recorded each entry:
 * - "field":  expenses input by field officers (Client/TL Expense)
 * - "office": expenses input by admin / office users (Operational Expense)
 * Same layout as the main Expenses page, records only.
 */
export async function ScopedExpenses({
  scope,
  from,
  to,
}: {
  scope: "field" | "office";
  from?: string;
  to?: string;
}) {
  const me = await getProfile();
  // The limited Admin role has no access to past records.
  if (me?.role === "admin_staff") redirect("/accounting/expenses");
  const canManage = me?.role === "admin" || me?.role === "owner";

  const isField = scope === "field";
  const title = isField ? "Client/TL Expense" : "Operational Expense";
  const description = isField
    ? "Expenses recorded by field officers (team leads) on site."
    : "Expenses recorded by admin and office users.";
  const basePath = isField
    ? "/accounting/expenses/client-tl"
    : "/accounting/expenses/operational";

  const supabase = createClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);
  const { data } = await query;

  const allExpenses = (data as Expense[] | null) ?? [];
  // Official records only (field drafts / pending submissions excluded).
  const official = allExpenses.filter(
    (e) => e.status !== "draft" && e.status !== "submitted",
  );

  // Who recorded each entry — role decides which module it belongs to.
  const creatorIds = [...new Set(official.map((e) => e.created_by))].filter(
    Boolean,
  ) as string[];
  const roleById = new Map<string, string>();
  const nameById = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", creatorIds);
    for (const p of (profs as
      | { id: string; full_name: string; role: string }[]
      | null) ?? []) {
      roleById.set(p.id, p.role);
      nameById.set(p.id, p.full_name);
    }
  }
  const fromFieldOfficer = (e: Expense) =>
    !!e.created_by && roleById.get(e.created_by) === "field_officer";
  const expenses = official.filter((e) =>
    isField ? fromFieldOfficer(e) : !fromFieldOfficer(e),
  );

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Group into submission batches (per user submission), like the main page.
  const batchMap = new Map<string, ExpenseBatch>();
  for (const e of expenses) {
    const key = e.submission_id ?? `direct-${e.created_by ?? "none"}`;
    const when = e.submitted_at ?? e.created_at ?? e.expense_date;
    const existingBatch = batchMap.get(key);
    if (existingBatch) {
      existingBatch.items.push(e);
      existingBatch.total += Number(e.amount);
      if (when > existingBatch.date) existingBatch.date = when;
    } else {
      batchMap.set(key, {
        key,
        userName: e.created_by
          ? (nameById.get(e.created_by) ?? "—")
          : "Direct entry",
        date: when,
        total: Number(e.amount),
        isSubmission: !!e.submission_id,
        items: [e],
      });
    }
  }
  const batches = [...batchMap.values()];

  // Group by display label so merged categories chart as one bar.
  const byType = new Map<string, number>();
  for (const e of expenses) {
    const label = EXPENSE_TYPE_LABELS[e.type] ?? e.type;
    byType.set(label, (byType.get(label) ?? 0) + Number(e.amount));
  }
  const typeData = [...byType.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const csvRows = expenses.map((e) => ({
    date: e.expense_date,
    type: EXPENSE_TYPE_LABELS[e.type] ?? e.type,
    description: e.description ?? "",
    amount: e.amount,
    recorded_by: e.created_by ? (nameById.get(e.created_by) ?? "") : "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        <CsvExport
          rows={csvRows}
          filename={`futex-${isField ? "client-tl" : "operational"}-expenses.csv`}
        />
      </PageHeader>

      <DateRangeFilter basePath={basePath} from={from} to={to} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total outflows</p>
            <p className="mt-1 text-2xl font-bold text-destructive">
              {php(total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {expenses.length} entries
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>By type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length ? (
              <CategoryBarChart data={typeData} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses here yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense records</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseBatches batches={batches} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
