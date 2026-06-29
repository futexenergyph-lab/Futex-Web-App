"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { restoreAudit } from "@/app/(app)/admin/audit-actions";
import { Button } from "@/components/ui/button";

/** Redo (undo) a logged delete/edit — restores the record. */
export function RedoLogButton({
  logId,
  done,
}: {
  logId: string;
  done: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (done) {
    return <span className="text-xs text-muted-foreground">Redone</span>;
  }

  async function onRedo() {
    setPending(true);
    const res = await restoreAudit(logId);
    setPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Action redone — record restored");
      router.refresh();
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={onRedo} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Undo2 className="h-3.5 w-3.5" />
      )}
      Redo
    </Button>
  );
}
