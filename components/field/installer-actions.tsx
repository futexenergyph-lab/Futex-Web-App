"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDeployment,
  declineDeployment,
  markInstallationDone,
} from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";

export function DeploymentConfirm({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  async function accept() {
    setPending("accept");
    const res = await confirmDeployment(bookingId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Deployment accepted");
      router.refresh();
    }
    setPending(null);
  }

  async function decline() {
    setPending("decline");
    const res = await declineDeployment(bookingId, reason);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Deployment declined — management notified");
      router.refresh();
    }
    setPending(null);
  }

  return (
    <div className="rounded-lg border bg-amber-50 p-4">
      <p className="text-sm font-medium">
        You&apos;ve been deployed to this job. Do you accept?
      </p>
      {!declining ? (
        <div className="mt-3 flex gap-2">
          <Button variant="accent" onClick={accept} disabled={pending !== null}>
            {pending === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Accept deployment
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeclining(true)}
            disabled={pending !== null}
          >
            <X className="h-4 w-4" /> Decline
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={decline}
              disabled={pending !== null}
            >
              {pending === "decline" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Confirm decline
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallationDoneButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function done() {
    setPending(true);
    const res = await markInstallationDone(bookingId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Installation marked as done");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Button
      onClick={done}
      disabled={pending}
      size="lg"
      variant="accent"
      className="w-full"
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-5 w-5" />
      )}
      Installation Done
    </Button>
  );
}
