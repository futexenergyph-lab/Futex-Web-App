"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateAttendanceRecord,
  deleteAttendanceRecords,
} from "@/app/(app)/hr/attendance-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { phDateTimeLocal, phLocalToUtc } from "@/lib/utils";

/**
 * Edit/Delete controls for one attendance record (a person's day). Only
 * rendered for Management & Owner; every change is logged for the audit trail.
 */
export function AttendanceRowActions({
  name,
  date,
  firstInId,
  firstIn,
  lastOutId,
  lastOut,
  allIds,
}: {
  name: string;
  date: string;
  firstInId: string | null;
  firstIn: string | null;
  lastOutId: string | null;
  lastOut: string | null;
  allIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [delPending, setDelPending] = useState(false);
  const router = useRouter();

  const label = `Attendance — ${name} (${date})`;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newIn = (f.get("time_in") as string) || "";
    const newOut = (f.get("time_out") as string) || "";

    start(async () => {
      // Update only punches that exist and actually changed.
      if (firstInId && newIn && newIn !== phDateTimeLocal(firstIn)) {
        const res = await updateAttendanceRecord({
          id: firstInId,
          timestamp: phLocalToUtc(newIn),
          label: `${label} — Time In`,
        });
        if (res?.error) {
          toast.error(res.error);
          return;
        }
      }
      if (lastOutId && newOut && newOut !== phDateTimeLocal(lastOut)) {
        const res = await updateAttendanceRecord({
          id: lastOutId,
          timestamp: phLocalToUtc(newOut),
          label: `${label} — Time Out`,
        });
        if (res?.error) {
          toast.error(res.error);
          return;
        }
      }
      toast.success("Attendance updated");
      setOpen(false);
      router.refresh();
    });
  }

  async function onDelete() {
    if (
      !confirm(
        `Delete this attendance record?\n\n${label}\n\nThis is logged and can be redone by the Owner.`,
      )
    )
      return;
    setDelPending(true);
    const res = await deleteAttendanceRecords({ ids: allIds, label });
    setDelPending(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Deleted");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon" title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit attendance — {name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {date} · times shown in Philippine time (UTC+8).
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="time_in">Time In</Label>
              <Input
                id="time_in"
                name="time_in"
                type="datetime-local"
                defaultValue={phDateTimeLocal(firstIn)}
                disabled={!firstInId}
              />
              {!firstInId && (
                <p className="text-xs text-muted-foreground">
                  No time-in punch to edit.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_out">Time Out</Label>
              <Input
                id="time_out"
                name="time_out"
                type="datetime-local"
                defaultValue={phDateTimeLocal(lastOut)}
                disabled={!lastOutId}
              />
              {!lastOutId && (
                <p className="text-xs text-muted-foreground">
                  No time-out punch to edit.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={delPending}
        className="text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        {delPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
