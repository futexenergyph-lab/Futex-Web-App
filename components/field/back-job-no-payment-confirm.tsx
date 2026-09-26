"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { confirmBackJobNoPayment } from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

/**
 * Payment tab for a back job marked "No payment" in the Job Order tab:
 * nothing to collect — one Confirm click, then proceed to Docs to finish.
 */
export function BackJobNoPaymentConfirm({
  bookingId,
  confirmedAt,
}: {
  bookingId: string;
  confirmedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    try {
      const res = await confirmBackJobNoPayment(bookingId);
      if (res?.error) throw new Error(res.error);
      toast.success("No payment confirmed — proceed to Docs to finish");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (confirmedAt) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-futex-green/40 bg-accent/10 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-futex-green" />
        <div>
          <p className="font-medium">No payment — confirmed.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(confirmedAt)} · Go to the Docs tab to upload
            documentation and finish the job.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-md border bg-secondary/40 p-3 text-sm">
        This support visit is marked <strong>No payment</strong> in the job
        order — nothing to collect from the client.
      </p>
      <Button onClick={onConfirm} disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm — no payment
      </Button>
      <p className="text-xs text-muted-foreground">
        After confirming, go to the Docs tab to upload documentation and mark
        the job done.
      </p>
    </div>
  );
}
