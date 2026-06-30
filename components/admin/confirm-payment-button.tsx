"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BadgeCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDeploymentPayment,
  declineDeploymentPayment,
} from "@/app/(app)/admin/actions";
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
    <Button
      size="sm"
      onClick={onConfirm}
      disabled={pending}
      className="bg-futex-green text-white hover:bg-futex-green/90"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BadgeCheck className="h-3.5 w-3.5" />
      )}
      Confirm payment
    </Button>
  );
}

export function DeclinePaymentButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onDecline() {
    if (
      !confirm(
        "Decline this payment? The field officer will need to correct and resubmit it.",
      )
    )
      return;
    setPending(true);
    const res = await declineDeploymentPayment(bookingId);
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Payment declined — field officer can resubmit");
      router.refresh();
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onDecline}
      disabled={pending}
      className="border-destructive/40 text-destructive hover:bg-destructive/10"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      Decline
    </Button>
  );
}
