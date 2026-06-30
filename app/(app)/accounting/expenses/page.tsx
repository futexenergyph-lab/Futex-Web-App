import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CsvExport } from "@/components/csv-export";
import { CategoryBarChart } from "@/components/charts";
import { DateRangeFilter } from "@/components/accounting/date-range-filter";
import {
  ExpenseForm,
  DeleteExpenseButton,
} from "@/components/accounting/expense-form";
import {
  ExpenseEditDialog,
  SubmitOfficerExpensesButton,
  SubmitOwnExpensesButton,
} from "@/components/accounting/expense-edit-dialog";
import {
  ExpenseBatches,
  type ExpenseBatch,
} from "@/components/accounting/expense-batches";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { php, formatDate } from "@/lib/utils";
import {
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  // The limited Admin role can input expenses but has no access to the
  // history of past records (no backtracking).
  const me = await getProfile();
  if (me?.role === "admin_staff") {
    const supabase = createClient();
    const [{ data: ownData }, { data: subData }] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("created_by", me.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("*")
        .eq("status", "submitted")
        .order("created_at", { ascending: false }),
    ]);
    const ownDrafts = (ownData as Expense[] | null) ?? [];
    const submitted = (subData as Expense[] | null) ?? [];

    const officerIds = [
      ...new Set(submitted.map((e) => e.created_by)),
    ].filter(Boolean) as string[];
    const nameById = new Map<string, string>();
    if (officerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", officerIds);
      for (const p of (profs as { id: string; full_name: string }[] | null) ??
        [])
        nameById.set(p.id, p.full_name);
    }
    const byOfficer = new Map<string, Expense[]>();
    for (const e of submitted) {
      const k = e.created_by ?? "—";
      byOfficer.set(k, [...(byOfficer.get(k) ?? []), e]);
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title="Expenses & Payables"
          description="Record your expenses and review field officer expenses, then submit to accounting."
        />
        <Card>
          <CardHeader>
            <CardTitle>Record an expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My expenses to submit ({ownDrafts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownDrafts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No expenses to submit. Record one above.
              </p>
            ) : (
              <>
                <div className="divide-y">
                  {ownDrafts.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {EXPENSE_TYPE_LABELS[e.type] ?? e.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(e.expense_date)}
                          </span>
                        </div>
                        {e.description && (
                          <p className="mt-0.5 truncate text-sm">
                            {e.description}
                          </p>
                        )}
                      </div>
                      <span className="font-medium tabular-nums">
                        {php(e.amount)}
                      </span>
                      <ExpenseEditDialog expense={e} />
                      <DeleteExpenseButton id={e.id} />
                    </div>
                  ))}
                </div>
                <SubmitOwnExpensesButton count={ownDrafts.length} />
              </>
            )}
          </CardContent>
        </Card>

        {submitted.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Field officer submitted expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Review and edit if needed, then submit each officer&apos;s
                expenses to accounting.
              </p>
              {[...byOfficer.entries()].map(([officerId, items]) => {
                const subtotal = items.reduce(
                  (s, e) => s + Number(e.amount),
                  0,
                );
                return (
                  <div key={officerId} className="rounded-lg border">
                    <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-2.5">
                      <p className="font-medium">
                        {nameById.get(officerId) ?? "—"}{" "}
                        <span className="text-sm text-muted-foreground">
                          · {items.length} item(s) · {php(subtotal)}
                        </span>
                      </p>
                      <SubmitOfficerExpensesButton
                        officerId={officerId}
                        count={items.length}
                      />
                    </div>
                    <div className="divide-y">
                      {items.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {EXPENSE_TYPE_LABELS[e.type] ?? e.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(e.expense_date)}
                              </span>
                            </div>
                            {e.description && (
                              <p className="mt-0.5 truncate text-sm">
                                {e.description}
                              </p>
                            )}
                          </div>
                          <span className="font-medium tabular-nums">
                            {php(e.amount)}
                          </span>
                          <ExpenseEditDialog expense={e} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const canManage = me?.role === "admin" || me?.role === "owner";
  const { from, to } = searchParams;
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

  // Field-officer expenses awaiting admin review (Management/Owner only).
  const pendingReview = allExpenses.filter((e) => e.status === "submitted");
  // Official records that count in accounting (exclude field draft/submitted).
  const expenses = allExpenses.filter(
    (e) => e.status !== "draft" && e.status !== "submitted",
  );
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Names for the review section + record batches.
  const allIds = [
    ...new Set([...pendingReview, ...expenses].map((e) => e.created_by)),
  ].filter(Boolean) as string[];
  const nameById = new Map<string, string>();
  if (allIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allIds);
    for (const p of (profs as { id: string; full_name: string }[] | null) ?? [])
      nameById.set(p.id, p.full_name);
  }
  // Group pending review by officer.
  const byOfficer = new Map<string, Expense[]>();
  for (const e of pendingReview) {
    const k = e.created_by ?? "—";
    byOfficer.set(k, [...(byOfficer.get(k) ?? []), e]);
  }

  // Group official records into submission batches (per user submission).
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

  const byType = new Map<string, number>();
  for (const e of expenses) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + Number(e.amount));
  }
  const typeData = [...byType.entries()].map(([k, v]) => ({
    label: EXPENSE_TYPE_LABELS[k as ExpenseType] ?? k,
    value: v,
  }));

  const csvRows = expenses.map((e) => ({
    date: e.expense_date,
    type: EXPENSE_TYPE_LABELS[e.type] ?? e.type,
    description: e.description ?? "",
    amount: e.amount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & Payables"
        description="Record outflows — bills and payments — for a detailed cash record."
      >
        <CsvExport rows={csvRows} filename="futex-expenses.csv" />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Record an expense</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm />
        </CardContent>
      </Card>

      <DateRangeFilter basePath="/accounting/expenses" from={from} to={to} />

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
                No expenses yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && pendingReview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field officer submitted expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Review and edit if needed, then submit each officer&apos;s
              expenses to accounting.
            </p>
            {[...byOfficer.entries()].map(([officerId, items]) => {
              const subtotal = items.reduce((s, e) => s + Number(e.amount), 0);
              return (
                <div key={officerId} className="rounded-lg border">
                  <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-2.5">
                    <p className="font-medium">
                      {nameById.get(officerId) ?? "—"}{" "}
                      <span className="text-sm text-muted-foreground">
                        · {items.length} item(s) · {php(subtotal)}
                      </span>
                    </p>
                    <SubmitOfficerExpensesButton
                      officerId={officerId}
                      count={items.length}
                    />
                  </div>
                  <div className="divide-y">
                    {items.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {EXPENSE_TYPE_LABELS[e.type] ?? e.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(e.expense_date)}
                            </span>
                          </div>
                          {e.description && (
                            <p className="mt-0.5 truncate text-sm">
                              {e.description}
                            </p>
                          )}
                        </div>
                        <span className="font-medium tabular-nums">
                          {php(e.amount)}
                        </span>
                        <ExpenseEditDialog expense={e} />
                        <DeleteRecordButton
                          table="expenses"
                          id={e.id}
                          label={`Expense ${php(e.amount)} — ${nameById.get(officerId) ?? ""}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
