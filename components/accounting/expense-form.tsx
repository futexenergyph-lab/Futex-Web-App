"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addExpense, deleteExpense } from "@/app/(app)/accounting/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  type ExpenseType,
} from "@/lib/types";

export function ExpenseForm() {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const router = useRouter();

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
      const res = await addExpense({
        expense_date: String(f.get("expense_date")),
        type: f.get("type") as ExpenseType,
        description: String(f.get("description") ?? ""),
        amount: amt,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expense recorded");
        form.reset();
        setAmount("");
        router.refresh();
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="expense_date">Date</Label>
        <Input
          id="expense_date"
          name="expense_date"
          type="date"
          defaultValue={today}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type of expense</Label>
        <select
          id="type"
          name="type"
          defaultValue="meals"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {EXPENSE_TYPES.map((t) => (
            <option key={t} value={t}>
              {EXPENSE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="e.g. Diesel for service van" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₱)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="₱ amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="lg:col-span-5">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Record expense
        </Button>
      </div>
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteExpense(id);
          if (res?.error) toast.error(res.error);
          else router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
