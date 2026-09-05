"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addFieldExpense,
  deleteFieldExpense,
  submitFieldExpenses,
} from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { php, formatDate } from "@/lib/utils";
import {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  type ExpenseType,
} from "@/lib/types";

export interface BookingExpenseRow {
  id: string;
  expense_date: string;
  type: string;
  description: string | null;
  amount: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  admin_reviewed: "With accounting",
  finalized: "Finalized",
};

/**
 * Per-client-deployment expense tracking on the field officer's job page —
 * same inputs as the Expenses module, tied to this booking. Drafts stay
 * editable until submitted to the admin.
 */
export function BookingExpenses({
  bookingId,
  today,
  expenses,
}: {
  bookingId: string;
  today: string;
  expenses: BookingExpenseRow[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const drafts = expenses.filter((e) => e.status === "draft");
  const submitted = expenses.filter((e) => e.status !== "draft");
  const sum = (list: BookingExpenseRow[]) =>
    list.reduce((t, e) => t + Number(e.amount), 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const amt = Number(f.get("amount"));
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    start(async () => {
      const res = await addFieldExpense({
        expense_date: today,
        type: String(f.get("type")),
        description: String(f.get("description") ?? ""),
        amount: amt,
        bookingId,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expense added for this client");
        form.reset();
        router.refresh();
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      const res = await deleteFieldExpense(id, bookingId);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function onSubmitAll() {
    if (
      !confirm(
        `Submit ${drafts.length} expense(s) for this client to the admin? You won't be able to edit them after submitting.`,
      )
    )
      return;
    start(async () => {
      const res = await submitFieldExpenses(bookingId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expenses submitted to admin");
        router.refresh();
      }
    });
  }

  function Row({ e, deletable }: { e: BookingExpenseRow; deletable: boolean }) {
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
        {deletable && (
          <Button
            size="icon"
            variant="ghost"
            disabled={pending}
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(e.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="be-date">Date (today)</Label>
            <Input
              id="be-date"
              value={today}
              disabled
              readOnly
              className="bg-secondary text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="be-type">Type of expense</Label>
            <select
              id="be-type"
              name="type"
              defaultValue="transportation"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXPENSE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="be-description">Description</Label>
            <Input
              id="be-description"
              name="description"
              placeholder="e.g. Fare to site, meals…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="be-amount">Amount (₱)</Label>
            <Input
              id="be-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="₱ amount"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending}
          variant="outline"
          className="w-full"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Record expense for this client
        </Button>
      </form>

      <div>
        <p className="mb-1 text-sm font-semibold">
          To submit ({drafts.length})
        </p>
        {drafts.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No draft expenses for this client yet.
          </p>
        ) : (
          <>
            <div className="divide-y">
              {drafts.map((e) => (
                <Row key={e.id} e={e} deletable />
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{php(sum(drafts))}</span>
            </div>
            <Button
              disabled={pending}
              className="mt-3 w-full"
              onClick={onSubmitAll}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit {drafts.length} expense(s) to admin
            </Button>
          </>
        )}
      </div>

      {submitted.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Submitted</p>
          <p className="mb-1 text-xs text-muted-foreground">
            Submitted expenses are locked — the admin reviews them next.
          </p>
          <div className="divide-y">
            {submitted.map((e) => (
              <Row key={e.id} e={e} deletable={false} />
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{php(sum(submitted))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
