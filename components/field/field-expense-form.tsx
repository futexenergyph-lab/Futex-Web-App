"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  addFieldExpense,
  deleteFieldExpense,
  submitFieldExpenses,
} from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_TYPES, EXPENSE_TYPE_LABELS } from "@/lib/types";

export interface ExpenseClient {
  id: string;
  label: string;
}

export function FieldExpenseForm({
  today,
  clients,
}: {
  today: string;
  clients: ExpenseClient[];
}) {
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
        expense_date: today,
        type: String(f.get("type")),
        description: String(f.get("description") ?? ""),
        amount: amt,
        bookingId: (f.get("booking") as string) || null,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Expense added");
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="expense_date">Date (today)</Label>
          <Input
            id="expense_date"
            value={today}
            disabled
            readOnly
            className="bg-secondary text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking">Deployment / client</Label>
          <select
            id="booking"
            name="booking"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value="">Others</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="e.g. Fare to site, meals…"
        />
      </div>
      <Button type="submit" disabled={pending} variant="outline" className="w-full">
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

export function SubmitExpensesButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending || count === 0}
      className="w-full"
      size="lg"
      onClick={() =>
        start(async () => {
          if (
            !confirm(
              `Submit ${count} expense(s) to the admin? You won't be able to edit them after submitting.`,
            )
          )
            return;
          const res = await submitFieldExpenses();
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Expenses submitted to admin");
            router.refresh();
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Submit {count > 0 ? `${count} ` : ""}expense(s) to admin
    </Button>
  );
}
