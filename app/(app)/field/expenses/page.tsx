import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FieldExpenseForm,
  FieldExpenseDelete,
} from "@/components/field/field-expense-form";
import { php, formatDate } from "@/lib/utils";
import {
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function FieldExpensesPage() {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("created_by", profile.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const expenses = (data as Expense[] | null) ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Expenses"
        description="Record your field expenses (fare, meals, supplies)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Record an expense</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldExpenseForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Total recorded: <span className="font-semibold">{php(total)}</span>
          </p>
          {expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="divide-y">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {EXPENSE_TYPE_LABELS[e.type as ExpenseType] ?? e.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(e.expense_date)}
                      </span>
                    </div>
                    {e.description && (
                      <p className="mt-0.5 truncate text-sm">{e.description}</p>
                    )}
                  </div>
                  <span className="font-medium tabular-nums">
                    {php(e.amount)}
                  </span>
                  <FieldExpenseDelete id={e.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
