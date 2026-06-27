"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { confirmDeploymentPayment } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";

export function ConfirmPaymentButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onConfirm() {
    if (
      !confirm(
        "Confirm this payment? It will be recorded in accounting and the booking marked paid.",
      )
    )
      return;
    setPending(true);
    const res = await confirmDeploymentPayment(bookingId);
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Payment confirmed");
      router.refresh();
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onConfirm} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BadgeCheck className="h-3.5 w-3.5" />
      )}
      Confirm payment
    </Button>
  );
}
