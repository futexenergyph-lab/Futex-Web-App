"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addFieldExpense,
  deleteFieldExpense,
} from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_TYPES, EXPENSE_TYPE_LABELS, type ExpenseType } from "@/lib/types";

export function FieldExpenseForm() {
  const [pending, start] = useTransition();
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
      const res = await addFieldExpense({
        expense_date: String(f.get("expense_date")),
        type: String(f.get("type")),
        description: String(f.get("description") ?? ""),
        amount: amt,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expense recorded");
        form.reset();
        router.refresh();
      }
    });
  }

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
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
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
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
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="e.g. Fare to site, meals…"
        />
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
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Record expense
      </Button>
    </form>
  );
}

export function FieldExpenseDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      className="text-destructive hover:bg-destructive/10"
      onClick={() =>
        start(async () => {
          const res = await deleteFieldExpense(id);
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
