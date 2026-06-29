"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateRecord } from "@/app/(app)/admin/audit-actions";
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
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

export function PaymentEditDialog({
  payment,
  clientName,
}: {
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    reference_no: string | null;
    status: string;
  };
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateRecord({
        table: "payments",
        id: payment.id,
        patch: {
          amount: Number(f.get("amount")) || 0,
          method: String(f.get("method")),
          reference_no: (f.get("reference_no") as string) || null,
          status: String(f.get("status")),
        },
        label: `Payment — ${clientName}`,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Payment updated");
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
          <DialogTitle>Edit payment — {clientName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₱)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                defaultValue={payment.amount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                name="method"
                defaultValue={payment.method}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference_no">Reference no.</Label>
            <Input
              id="reference_no"
              name="reference_no"
              defaultValue={payment.reference_no ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={payment.status}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
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
