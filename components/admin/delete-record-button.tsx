"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRecord } from "@/app/(app)/admin/audit-actions";
import { Button } from "@/components/ui/button";

/**
 * Delete a record (payments / expenses / bookings) with confirmation. The
 * deletion is logged so the Owner can redo it from the Logs page.
 */
export function DeleteRecordButton({
  table,
  id,
  label,
  size = "icon",
}: {
  table: "payments" | "expenses" | "bookings";
  id: string;
  label: string;
  size?: "icon" | "sm";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        `Delete this record?\n\n${label}\n\nThis is logged and can be redone by the Owner.`,
      )
    )
      return;
    setPending(true);
    const res = await deleteRecord({ table, id, label });
    setPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Deleted");
      router.refresh();
    }
  }

  if (size === "sm") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Delete
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      className="text-destructive hover:bg-destructive/10"
      title="Delete"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
