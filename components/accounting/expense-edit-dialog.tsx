"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  editExpenseRecord,
  submitFieldOfficerExpenses,
} from "@/app/(app)/accounting/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from "@/lib/types";

export function ExpenseEditDialog({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await editExpenseRecord({
        id: expense.id,
        expense_date: String(f.get("expense_date")),
        type: f.get("type") as ExpenseType,
        description: (f.get("description") as string) || null,
        amount: Number(f.get("amount")) || 0,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expense updated");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expense_date">Date</Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                defaultValue={expense.expense_date}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={expense.type}
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={expense.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₱)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={expense.amount}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitOfficerExpensesButton({
  officerId,
  count,
}: {
  officerId: string;
  count: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await submitFieldOfficerExpenses(officerId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Forwarded to accounting");
            router.refresh();
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Send className="h-3.5 w-3.5" />
      )}
      Submit {count} to accounting
    </Button>
  );
}
