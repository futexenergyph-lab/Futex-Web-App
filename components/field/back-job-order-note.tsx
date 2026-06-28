"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveBackJobNote } from "@/app/(app)/field/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Free-text "job order" for a back job order ticket. */
export function BackJobOrderNote({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const res = await saveBackJobNote({ bookingId, note });
    setPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Job order saved");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Describe the work / job order for this support visit…"
        value={note}
        rows={5}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={save} disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save job order
      </Button>
    </div>
  );
}
