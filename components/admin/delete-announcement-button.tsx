"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnnouncement } from "@/app/(app)/announcements/actions";
import { Button } from "@/components/ui/button";

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    setPending(true);
    const res = await deleteAnnouncement(id);
    setPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Deleted");
      router.refresh();
    }
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
