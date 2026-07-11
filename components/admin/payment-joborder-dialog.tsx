"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { php, formatDate } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

/** Aggregated payment + linked job order shown for one client row. */
export interface ClientPayment {
  total: number;
  status: PaymentStatus | null;
  methods: string[];
  paidAt: string | null;
  jobOrder: {
    finalTotal: number;
    packageName: string | null;
    enclosureName: string | null;
    wireMeters: number;
    works: { description: string; amount: number }[];
  } | null;
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
};

/**
 * Read-only. Shows the client's total payment; clicking opens the linked job
 * order breakdown. (Payment values are NOT editable here.)
 */
export function PaymentJobOrderDialog({
  clientName,
  payment,
}: {
  clientName: string;
  payment: ClientPayment;
}) {
  const [open, setOpen] = useState(false);
  const jo = payment.jobOrder;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm font-semibold tabular-nums hover:bg-secondary"
        title="View job order"
      >
        <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
        {php(payment.total)}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment &amp; Job Order — {clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Payment summary (read-only) */}
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total payment</span>
                <span className="text-base font-bold tabular-nums">
                  {php(payment.total)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {payment.status && (
                  <Badge
                    variant={
                      payment.status === "confirmed"
                        ? "accent"
                        : payment.status === "declined"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABEL[payment.status]}
                  </Badge>
                )}
                {payment.methods.map((m, i) => (
                  <Badge key={i} variant="outline">
                    {m}
                  </Badge>
                ))}
                {payment.paidAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(payment.paidAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Job order breakdown */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Job order
              </p>
              {!jo ? (
                <p className="rounded-md border bg-background p-3 text-muted-foreground">
                  No job order submitted for this client yet.
                </p>
              ) : (
                <div className="space-y-1.5 rounded-md border bg-background p-3">
                  <Line label="Package" value={jo.packageName ?? "—"} />
                  {jo.enclosureName && (
                    <Line label="Separate enclosure" value={jo.enclosureName} />
                  )}
                  {jo.wireMeters > 0 && (
                    <Line
                      label="Additional wire"
                      value={`${jo.wireMeters} m`}
                    />
                  )}
                  {jo.works.map((w, i) => (
                    <Line
                      key={i}
                      label={w.description || "Additional job work"}
                      value={php(w.amount)}
                    />
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
                    <span>Job order total</span>
                    <span className="tabular-nums">{php(jo.finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
