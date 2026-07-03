"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  addRetailPurchase,
  deleteRetailPurchase,
  submitRetailPurchases,
} from "@/app/(app)/accounting/retail-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RETAIL_PURCHASE_TYPES,
  RETAIL_PURCHASE_TYPE_LABELS,
  type RetailPurchaseType,
} from "@/lib/types";

export function RetailPurchaseForm() {
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
      const res = await addRetailPurchase({
        purchase_date: String(f.get("purchase_date")),
        type: f.get("type") as RetailPurchaseType,
        description: String(f.get("description") ?? ""),
        amount: amt,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Retail purchase recorded");
        form.reset();
        setAmount("");
        router.refresh();
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="purchase_date">Date</Label>
        <Input
          id="purchase_date"
          name="purchase_date"
          type="date"
          defaultValue={today}
          required
          className="bg-muted/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type of purchase</Label>
        <select
          id="type"
          name="type"
          defaultValue="charger"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {RETAIL_PURCHASE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RETAIL_PURCHASE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="e.g. Type 2 charger unit"
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Record purchase
      </Button>
    </form>
  );
}

export function DeleteRetailButton({ id }: { id: string }) {
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
          const res = await deleteRetailPurchase(id);
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

export function SubmitRetailButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      className="w-full"
      disabled={pending || count === 0}
      onClick={() =>
        start(async () => {
          const res = await submitRetailPurchases();
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Submitted to the account as profit");
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
      Submit {count} to account as profit
    </Button>
  );
}
