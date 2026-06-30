"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getUnreadAnnouncements,
  markAnnouncementRead,
  type UnreadAnnouncement,
} from "@/app/(app)/announcements/actions";
import { formatDateTime } from "@/lib/utils";

/**
 * Shows unread announcements one at a time in a centered, non-dismissible modal.
 * The user must press "Confirm" (which records a read receipt) to clear each
 * one. Polls periodically so newly released announcements appear without a
 * reload. Mounted globally inside the app shell.
 */
export function AnnouncementGate() {
  const router = useRouter();
  const [queue, setQueue] = useState<UnreadAnnouncement[]>([]);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await getUnreadAnnouncements();
      setQueue((prev) => {
        // Preserve order; only swap when the set of ids actually changed.
        const prevIds = prev.map((a) => a.id).join(",");
        const nextIds = items.map((a) => a.id).join(",");
        return prevIds === nextIds ? prev : items;
      });
    } catch {
      // Ignore transient fetch errors; the next poll retries.
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45_000);
    return () => clearInterval(t);
  }, [load]);

  const current = queue[0];
  if (!current) return null;

  async function onConfirm() {
    setPending(true);
    await markAnnouncementRead(current.id);
    setPending(false);
    setQueue((prev) => prev.slice(1));
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Announcement</h2>
            <p className="text-xs text-muted-foreground">
              From {current.created_by_name ?? "Management"} ·{" "}
              {formatDateTime(current.created_at)}
            </p>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {current.message}
        </p>
        {queue.length > 1 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {queue.length - 1} more announcement
            {queue.length - 1 === 1 ? "" : "s"} after this.
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
