"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createManualBooking } from "@/app/(app)/admin/actions";
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

interface Option {
  id: string;
  name: string;
}

export function NewBookingDialog({
  packages,
  enclosures,
}: {
  packages: Option[];
  enclosures: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await createManualBooking({
        client_number: (f.get("client_number") as string) || null,
        client_name: String(f.get("client_name")),
        email: (f.get("email") as string) || null,
        address: String(f.get("address")),
        contact_number: String(f.get("contact_number")),
        preferred_date: (f.get("preferred_date") as string) || null,
        preferred_time: (f.get("preferred_time") as string) || null,
        preferred_package_id: (f.get("preferred_package_id") as string) || null,
        preferred_enclosure_id:
          (f.get("preferred_enclosure_id") as string) || null,
        notes: (f.get("notes") as string) || null,
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Booking created");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New manual booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_number">Client number</Label>
            <Input
              id="client_number"
              name="client_number"
              placeholder="e.g. FX-2026-0001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_name">Client name</Label>
            <Input id="client_name" name="client_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact number</Label>
              <Input id="contact_number" name="contact_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_date">Preferred date</Label>
              <Input id="preferred_date" name="preferred_date" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preferred_time">Slot</Label>
              <select
                id="preferred_time"
                name="preferred_time"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">Any</option>
                {DAILY_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s === "09:00" ? "9:00 AM" : "2:00 PM"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_package_id">Package</Label>
              <select
                id="preferred_package_id"
                name="preferred_package_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">—</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_enclosure_id">Enclosure</Label>
            <select
              id="preferred_enclosure_id"
              name="preferred_enclosure_id"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">—</option>
              {enclosures.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
