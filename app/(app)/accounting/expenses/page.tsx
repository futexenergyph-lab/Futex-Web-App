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
import { CategoryBarChart } from "@/components/charts";
import {
  ExpenseForm,
  DeleteExpenseButton,
} from "@/components/accounting/expense-form";
import { php, formatDate } from "@/lib/utils";
import {
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const expenses = (data as Expense[] | null) ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

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

      <Card>
        <CardHeader>
          <CardTitle>Expense records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">
                    {formatDate(e.expense_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {EXPENSE_TYPE_LABELS[e.type] ?? e.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {php(e.amount)}
                  </TableCell>
                  <TableCell>
                    <DeleteExpenseButton id={e.id} />
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No expenses recorded yet.
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
