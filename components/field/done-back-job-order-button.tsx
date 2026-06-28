"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { completeBackJobOrder } from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";

/** Green "Done Back Job Order" button — requires documentation photos. */
export function DoneBackJobOrderButton({
  bookingId,
  docsReady,
  completed,
}: {
  bookingId: string;
  docsReady: boolean;
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (completed) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-600/10 p-3 text-sm font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Back job order completed.
      </div>
    );
  }

  async function onDone() {
    setPending(true);
    try {
      const res = await completeBackJobOrder(bookingId);
      if (res?.error) throw new Error(res.error);
      toast.success("Back job order completed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {!docsReady && (
        <p className="text-xs text-red-600">
          Attach documentation photos before finishing.
        </p>
      )}
      <Button
        onClick={onDone}
        disabled={!docsReady || pending}
        size="lg"
        className="w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600/40"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Done Back Job Order
      </Button>
    </div>
  );
}
