"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitBooking, type BookingState } from "@/app/(marketing)/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAILY_SLOTS } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Submit Booking
    </Button>
  );
}

export function BookingForm({
  packages,
  enclosures,
}: {
  packages: Option[];
  enclosures: Option[];
}) {
  const [state, action] = useFormState<BookingState, FormData>(submitBooking, {
    ok: false,
  });

  if (state.ok) {
    return (
      <div className="rounded-lg border bg-background p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-futex-green" />
        <h3 className="mt-4 text-xl font-bold">Booking received!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you. Your booking reference is{" "}
          <span className="font-semibold text-foreground">
            #{state.reference}
          </span>
          . Our team will contact you shortly to confirm your schedule.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client_name">Full name *</Label>
          <Input id="client_name" name="client_name" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Installation address *</Label>
          <Input id="address" name="address" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_number">Contact number *</Label>
          <Input
            id="contact_number"
            name="contact_number"
            type="tel"
            placeholder="0917-000-0000"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="preferred_date">Preferred date</Label>
            <Input id="preferred_date" name="preferred_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_time">Slot</Label>
            <select
              id="preferred_time"
              name="preferred_time"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred_package_id">Preferred package</Label>
          <select
            id="preferred_package_id"
            name="preferred_package_id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">Not sure yet</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred_enclosure_id">Enclosure protection</Label>
          <select
            id="preferred_enclosure_id"
            name="preferred_enclosure_id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">None / decide on site</option>
            {enclosures.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Anything we should know about your site?"
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">
        By submitting, you agree to be contacted about your installation.
      </p>
    </form>
  );
}
