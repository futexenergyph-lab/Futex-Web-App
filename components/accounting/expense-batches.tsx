"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExpenseEditDialog } from "@/components/accounting/expense-edit-dialog";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { DeleteExpenseButton } from "@/components/accounting/expense-form";
import { php, formatDate } from "@/lib/utils";
import { EXPENSE_TYPE_LABELS, type Expense } from "@/lib/types";

export interface ExpenseBatch {
  key: string;
  userName: string;
  /** ISO date used for sorting + display (submission date or latest entry). */
  date: string;
  total: number;
  isSubmission: boolean;
  items: Expense[];
}

export function ExpenseBatches({
  batches,
  canManage,
}: {
  batches: ExpenseBatch[];
  canManage: boolean;
}) {
  const [sortBy, setSortBy] = useState<"date" | "user" | "category">("date");

  const sorted = useMemo(() => {
    const arr = [...batches];
    if (sortBy === "user") {
      arr.sort(
        (a, b) =>
          a.userName.localeCompare(b.userName) || b.date.localeCompare(a.date),
      );
    } else {
      arr.sort((a, b) => b.date.localeCompare(a.date));
    }
    return arr;
  }, [batches, sortBy]);

  // Category view: regroup every entry by its type of expense, biggest
  // category first, with a subtotal per category.
  const categoryGroups = useMemo(() => {
    if (sortBy !== "category") return null;
    const map = new Map<
      string,
      { label: string; total: number; items: (Expense & { userName: string })[] }
    >();
    for (const b of batches) {
      for (const e of b.items) {
        // Key by display label so merged categories group as one.
        const label = EXPENSE_TYPE_LABELS[e.type] ?? e.type;
        const g = map.get(label) ?? { label, total: 0, items: [] };
        g.total += Number(e.amount);
        g.items.push({ ...e, userName: b.userName });
        map.set(label, g);
      }
    }
    const arr = [...map.values()];
    arr.sort((a, b) => b.total - a.total);
    for (const g of arr)
      g.items.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
    return arr;
  }, [batches, sortBy]);

  if (batches.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No expenses recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1 text-sm">
        <span className="text-muted-foreground">Sort by</span>
        <button
          type="button"
          onClick={() => setSortBy("date")}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 ${
            sortBy === "date"
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "hover:bg-secondary"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" /> Date
        </button>
        <button
          type="button"
          onClick={() => setSortBy("user")}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 ${
            sortBy === "user"
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "hover:bg-secondary"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" /> User
        </button>
        <button
          type="button"
          onClick={() => setSortBy("category")}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 ${
            sortBy === "category"
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "hover:bg-secondary"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" /> Category
        </button>
      </div>

      {categoryGroups?.map((group) => (
        <div key={group.label} className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-2.5">
            <div className="min-w-0">
              <p className="font-medium">{group.label}</p>
              <p className="text-xs text-muted-foreground">
                {group.items.length} item
                {group.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold tabular-nums">{php(group.total)}</p>
            </div>
          </div>
          <div className="divide-y">
            {group.items.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(e.expense_date)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      · {e.userName}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-0.5 truncate text-sm">{e.description}</p>
                  )}
                </div>
                <span className="font-medium tabular-nums">{php(e.amount)}</span>
                <ExpenseEditDialog expense={e} />
                {canManage ? (
                  <DeleteRecordButton
                    table="expenses"
                    id={e.id}
                    label={`Expense ${php(e.amount)} — ${group.label}`}
                  />
                ) : (
                  <DeleteExpenseButton id={e.id} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!categoryGroups &&
      sorted.map((batch) => (
        <div key={batch.key} className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-2.5">
            <div className="min-w-0">
              <p className="font-medium">{batch.userName}</p>
              <p className="text-xs text-muted-foreground">
                {batch.isSubmission ? "Submitted" : "Recorded"}{" "}
                {formatDate(batch.date)} · {batch.items.length} item
                {batch.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold tabular-nums">{php(batch.total)}</p>
            </div>
          </div>
          <div className="divide-y">
            {batch.items.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
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
                    <p className="mt-0.5 truncate text-sm">{e.description}</p>
                  )}
                </div>
                <span className="font-medium tabular-nums">{php(e.amount)}</span>
                <ExpenseEditDialog expense={e} />
                {canManage ? (
                  <DeleteRecordButton
                    table="expenses"
                    id={e.id}
                    label={`Expense ${php(e.amount)} — ${EXPENSE_TYPE_LABELS[e.type] ?? e.type}`}
                  />
                ) : (
                  <DeleteExpenseButton id={e.id} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
