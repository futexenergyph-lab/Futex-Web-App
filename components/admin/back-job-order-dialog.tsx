"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBackJobOrder } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { DAILY_SLOTS } from "@/lib/types";

export interface BackJobClient {
  id: string;
  client_name: string;
  address: string;
  client_number: string | null;
}

/**
 * Raise a Back Job Order — after-sales support / maintenance ticket — from a
 * completed installation in the master list.
 */
export function BackJobOrderDialog({ clients }: { clients: BackJobClient[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parentBookingId = String(f.get("client") || "");
    if (!parentBookingId) {
      toast.error("Select a client");
      return;
    }
    start(async () => {
      const res = await createBackJobOrder({
        parentBookingId,
        scheduledDate: (f.get("date") as string) || null,
        scheduledTime: (f.get("time") as string) || null,
        note: String(f.get("note") || ""),
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Back job order created — visible in Deployment");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LifeBuoy className="h-4 w-4" /> Back Job Order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Back Job Order — after-sales support</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No completed installations yet. A client must have a completed
            installation before raising a back job order.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client (completed installation)</Label>
              <select
                id="client"
                name="client"
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="" disabled>
                  Select a client…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name}
                    {c.client_number ? ` (${c.client_number})` : ""} — {c.address}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Schedule date</Label>
                <Input id="date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <select
                  id="time"
                  name="time"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Any</option>
                  {DAILY_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s === "09:00" ? "9:00 AM" : "2:00 PM"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">What needs to be done</Label>
              <Textarea
                id="note"
                name="note"
                rows={4}
                placeholder="Describe the support / maintenance needed…"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create back job order
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
