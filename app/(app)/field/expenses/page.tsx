import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FieldExpenseForm,
  FieldExpenseDelete,
  SubmitExpensesButton,
  type ExpenseClient,
} from "@/components/field/field-expense-form";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { php, formatDate, resolveDateRange, phDay } from "@/lib/utils";
import {
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function FieldExpensesPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  const [{ data: expData }, { data: bkData }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, client_name, status")
      .eq("assigned_field_officer_id", profile.id)
      .not("status", "in", "(closed)")
      .order("created_at", { ascending: false }),
  ]);

  const expenses = (expData as Expense[] | null) ?? [];
  const drafts = expenses.filter((e) => e.status === "draft");
  const submitted = expenses.filter((e) => e.status !== "draft");

  // Submitted records are filtered by their expense date, defaulting to today.
  const range = resolveDateRange(searchParams);
  const dateWindow =
    range.fromISO && range.toISO
      ? { fromDay: phDay(range.fromISO), toDayExclusive: phDay(range.toISO) }
      : null;
  const submittedShown = dateWindow
    ? submitted.filter(
        (e) =>
          e.expense_date >= dateWindow.fromDay &&
          e.expense_date < dateWindow.toDayExclusive,
      )
    : submitted;

  const sum = (list: Expense[]) =>
    list.reduce((t, e) => t + Number(e.amount), 0);
  const draftsTotal = sum(drafts);
  const submittedTotal = sum(submittedShown);

  function TotalRow({ amount }: { amount: number }) {
    return (
      <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{php(amount)}</span>
      </div>
    );
  }

  const clients: ExpenseClient[] = (
    (bkData as { id: string; client_name: string }[] | null) ?? []
  ).map((b) => ({ id: b.id, label: b.client_name }));

  const STATUS_LABEL: Record<string, string> = {
    submitted: "Submitted",
    admin_reviewed: "With accounting",
    finalized: "Finalized",
  };

  function Row({ e, deletable }: { e: Expense; deletable: boolean }) {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {EXPENSE_TYPE_LABELS[e.type as ExpenseType] ?? e.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(e.expense_date)}
            </span>
            {e.status !== "draft" && (
              <Badge variant="accent">
                {STATUS_LABEL[e.status] ?? e.status}
              </Badge>
            )}
          </div>
          {e.description && (
            <p className="mt-0.5 truncate text-sm">{e.description}</p>
          )}
        </div>
        <span className="font-medium tabular-nums">{php(e.amount)}</span>
        {deletable && <FieldExpenseDelete id={e.id} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Expenses"
        description="Record your field expenses, then submit them to the admin."
      />

      <Card>
        <CardHeader>
          <CardTitle>Record an expense</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldExpenseForm today={today} clients={clients} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To submit ({drafts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No draft expenses. Record one above.
            </p>
          ) : (
            <>
              <div className="divide-y">
                {drafts.map((e) => (
                  <Row key={e.id} e={e} deletable />
                ))}
              </div>
              <TotalRow amount={draftsTotal} />
              <SubmitExpensesButton count={drafts.length} />
            </>
          )}
        </CardContent>
      </Card>

      {submitted.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Submitted</CardTitle>
            <DateRangeFilter />
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              Submitted expenses are locked — the admin reviews them next.
            </p>
            {submittedShown.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No submitted expenses for the selected date.
              </p>
            ) : (
              <>
                <div className="divide-y">
                  {submittedShown.map((e) => (
                    <Row key={e.id} e={e} deletable={false} />
                  ))}
                </div>
                <TotalRow amount={submittedTotal} />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
