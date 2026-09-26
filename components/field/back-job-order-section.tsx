"use client";

import { useState, type ReactNode } from "react";

/**
 * Back-job Job Order tab: "No payment" toggle on top, the work-description
 * note always available, and the full job order pricing form below — grayed
 * out (read-only) when the support visit has no payment.
 */
export function BackJobOrderSection({
  hasJobOrder,
  note,
  form,
}: {
  /** An already-submitted job order keeps the form visible regardless. */
  hasJobOrder: boolean;
  note: ReactNode;
  form: ReactNode;
}) {
  const [noPayment, setNoPayment] = useState(false);
  const grayed = noPayment && !hasJobOrder;

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={noPayment}
          onChange={(e) => setNoPayment(e.target.checked)}
          className="h-4 w-4"
        />
        No payment
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Work description</p>
        {note}
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">
          Job order &amp; payment details
          {grayed && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (disabled — no payment for this support visit)
            </span>
          )}
        </p>
        <div
          aria-disabled={grayed}
          className={grayed ? "pointer-events-none select-none opacity-40" : ""}
        >
          {form}
        </div>
      </div>
    </div>
  );
}
