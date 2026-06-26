"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { deployBooking } from "@/app/(app)/admin/actions";
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
import { DAILY_SLOTS, type BookingWithRelations } from "@/lib/types";

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

export function DeployDialog({
  booking,
  staff,
}: {
  booking: BookingWithRelations;
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const officers = staff.filter((s) => s.role === "field_officer");
  const installers = staff.filter((s) => s.role === "installer");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await deployBooking({
        bookingId: booking.id,
        fieldOfficerId: (f.get("field_officer") as string) || null,
        installerId: (f.get("installer") as string) || null,
        preferredDate: (f.get("date") as string) || booking.preferred_date,
        preferredTime: (f.get("time") as string) || booking.preferred_time,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Deployment saved — officer notified on their dashboard");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Truck className="h-4 w-4" /> Deploy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy — {booking.client_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field_officer">Field officer</Label>
            <select
              id="field_officer"
              name="field_officer"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={booking.assigned_field_officer_id ?? ""}
            >
              <option value="">— Unassigned —</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="installer">Installer</Label>
            <select
              id="installer"
              name="installer"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={booking.assigned_installer_id ?? ""}
            >
              <option value="">— Unassigned —</option>
              {installers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={booking.preferred_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Slot</Label>
              <select
                id="time"
                name="time"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={booking.preferred_time ?? ""}
              >
                <option value="">—</option>
                {DAILY_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s === "09:00" ? "9:00 AM" : "2:00 PM"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save deployment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
