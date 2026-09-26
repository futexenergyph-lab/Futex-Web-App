"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setBackJobNoPayment } from "@/app/(app)/field/actions";

/**
 * Back-job Job Order tab: "No payment" toggle on top (persisted to the
 * booking so the Payment tab reflects it), the work-description note always
 * available, and the full job order pricing form below — grayed out when the
 * support visit has no payment.
 */
export function BackJobOrderSection({
  bookingId,
  initialNoPayment,
  hasJobOrder,
  note,
  form,
}: {
  bookingId: string;
  initialNoPayment: boolean;
  /** An already-submitted job order keeps the form visible regardless. */
  hasJobOrder: boolean;
  note: ReactNode;
  form: ReactNode;
}) {
  const router = useRouter();
  const [noPayment, setNoPayment] = useState(initialNoPayment);
  const [saving, setSaving] = useState(false);
  const grayed = noPayment && !hasJobOrder;

  async function onToggle(value: boolean) {
    setNoPayment(value); // optimistic
    setSaving(true);
    try {
      const res = await setBackJobNoPayment({ bookingId, value });
      if (res?.error) throw new Error(res.error);
      toast.success(
        value
          ? "Marked as No payment — confirm it in the Payment tab"
          : "Payment re-enabled for this support visit",
      );
      router.refresh();
    } catch (err) {
      setNoPayment(!value);
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={noPayment}
          disabled={saving}
          onChange={(e) => onToggle(e.target.checked)}
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
