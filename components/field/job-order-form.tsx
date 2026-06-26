"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Lock, Unlock, Ban, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  submitJobOrder,
  requestJobOrderChange,
  voidJobOrder,
} from "@/app/(app)/field/actions";
import { computePricing } from "@/lib/pricing";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { php } from "@/lib/utils";
import type {
  Enclosure,
  JobOrder,
  JobWork,
  Package,
} from "@/lib/types";

// Editing shape: amount stays a string so the input clears cleanly.
interface WorkInput {
  description: string;
  amount: string;
}

export function JobOrderForm({
  bookingId,
  packages,
  enclosures,
  wireRate,
  existing,
  defaults,
}: {
  bookingId: string;
  packages: Package[];
  enclosures: Enclosure[];
  wireRate: number;
  existing: JobOrder | null;
  defaults: { packageId: string | null; enclosureId: string | null };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [working, setWorking] = useState(false);

  // Change-request lifecycle on a submitted order:
  //   none → request (pending) → management approves → editable/void.
  const changeRequested = !!existing?.change_requested_at;
  const changeApproved = !!existing?.change_approved_at;
  const editable = changeRequested && changeApproved;

  const [packageId, setPackageId] = useState(
    existing?.package_id ?? defaults.packageId ?? packages[0]?.id ?? "",
  );
  const [enclosureId, setEnclosureId] = useState(
    existing?.enclosure_id ?? defaults.enclosureId ?? "",
  );
  const [addSeparateEnclosure, setAddSeparate] = useState(
    existing?.add_separate_enclosure ?? false,
  );
  const [wireMeters, setWireMeters] = useState(
    existing?.additional_wire_meters
      ? String(existing.additional_wire_meters)
      : "",
  );
  // Amounts are kept as raw strings while editing so the input clears cleanly
  // (a numeric controlled input leaves a stuck leading "0").
  const [jobWorks, setJobWorks] = useState<WorkInput[]>(
    (existing?.additional_job_works ?? []).map((w) => ({
      description: w.description,
      amount: String(w.amount),
    })),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const enc = enclosures.find((e) => e.id === enclosureId) ?? null;
  const bundled = pkg?.enclosure_included ?? false;

  const jobWorksNum: JobWork[] = jobWorks.map((w) => ({
    description: w.description,
    amount: Number(w.amount) || 0,
  }));

  const pricing = useMemo(
    () =>
      computePricing({
        pkg,
        enclosure: enc,
        addSeparateEnclosure,
        additionalWireMeters: Number(wireMeters) || 0,
        wireRatePerMeter: wireRate,
        additionalJobWorks: jobWorksNum,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pkg, enc, addSeparateEnclosure, wireMeters, jobWorks, wireRate],
  );

  // A submitted/locked order is read-only until management approves a change.
  const locked =
    (existing?.status === "locked" || existing?.status === "submitted") &&
    !editable;

  function addWork() {
    setJobWorks((w) => [...w, { description: "", amount: "" }]);
  }
  function updateWork(i: number, patch: Partial<WorkInput>) {
    setJobWorks((w) => w.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeWork(i: number) {
    setJobWorks((w) => w.filter((_, idx) => idx !== i));
  }

  async function onSubmit() {
    if (!packageId) {
      toast.error("Select a package");
      return;
    }
    setPending(true);
    try {
      const res = await submitJobOrder({
        bookingId,
        jobOrderId: editable ? existing?.id : undefined,
        packageId,
        enclosureId: enclosureId || null,
        addSeparateEnclosure,
        additionalWireMeters: Number(wireMeters) || 0,
        additionalJobWorks: jobWorksNum.filter((w) => w.description.trim()),
        notes,
      });
      if (res?.error) throw new Error(res.error);
      toast.success(`Job order locked · ${php(res.finalTotal ?? 0)}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function onRequestChange() {
    if (!existing) return;
    setWorking(true);
    try {
      const res = await requestJobOrderChange({
        bookingId,
        jobOrderId: existing.id,
        reason,
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Change request sent to management for approval");
      setShowReason(false);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setWorking(false);
    }
  }

  async function onVoid() {
    if (!existing) return;
    if (!confirm("Void this job order? This removes the locked pricing.")) {
      return;
    }
    setWorking(true);
    try {
      const res = await voidJobOrder({ bookingId, jobOrderId: existing.id });
      if (res?.error) throw new Error(res.error);
      toast.success("Job order voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setWorking(false);
    }
  }

  if (locked && existing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm">
          <Lock className="h-4 w-4" />
          Job order submitted &amp; locked.
        </div>
        <div className="rounded-lg border p-4">
          <PricingBreakdown
            pricing={computePricing({
              pkg,
              enclosure: enc,
              addSeparateEnclosure: existing.add_separate_enclosure,
              additionalWireMeters: existing.additional_wire_meters,
              wireRatePerMeter: existing.wire_rate_per_meter,
              additionalJobWorks: existing.additional_job_works,
            })}
          />
        </div>

        {changeRequested ? (
          // Requested but not yet approved — waiting on management.
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Change request pending management approval.
              </p>
              {existing.change_request_reason && (
                <p className="mt-0.5 text-xs">
                  &ldquo;{existing.change_request_reason}&rdquo;
                </p>
              )}
            </div>
          </div>
        ) : showReason ? (
          <div className="space-y-2 rounded-md border p-3">
            <Label htmlFor="change-reason">Reason for the change</Label>
            <Textarea
              id="change-reason"
              placeholder="e.g. wrong package selected, additional wire needed…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={onRequestChange} disabled={working} size="sm">
                {working && <Loader2 className="h-4 w-4 animate-spin" />}
                Send request
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReason(false)}
                disabled={working}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowReason(true)}
          >
            <Unlock className="h-4 w-4" />
            Request to change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {editable && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Unlock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Management approved your change request. Edit and resubmit to
            re-lock, or void the job order below.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="package">Package</Label>
          <select
            id="package"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {php(p.base_price)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="enclosure">Enclosure</Label>
          <select
            id="enclosure"
            value={enclosureId}
            onChange={(e) => setEnclosureId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">None</option>
            {enclosures.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {php(e.price)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bundled ? (
        <p className="rounded-md bg-accent/10 px-3 py-2 text-xs text-accent-foreground">
          This package already includes an enclosure — it won&apos;t be charged
          separately.
        </p>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={addSeparateEnclosure}
            onChange={(e) => setAddSeparate(e.target.checked)}
            className="h-4 w-4"
            disabled={!enclosureId}
          />
          Charge selected enclosure as a separate line item
        </label>
      )}

      <div className="space-y-2">
        <Label htmlFor="wire">Additional wire (linear meters)</Label>
        <Input
          id="wire"
          type="number"
          min={0}
          step="0.1"
          value={wireMeters}
          onChange={(e) => setWireMeters(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Charged at {php(wireRate)} per meter.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Additional job works</Label>
          <Button type="button" size="sm" variant="outline" onClick={addWork}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {jobWorks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add any on-site assessed work (description + amount).
          </p>
        )}
        {jobWorks.map((w, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Description"
              value={w.description}
              onChange={(e) => updateWork(i, { description: e.target.value })}
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="₱ amount"
              className="w-28"
              value={w.amount}
              onChange={(e) => updateWork(i, { amount: e.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => removeWork(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jo-notes">Notes</Label>
        <Textarea
          id="jo-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-secondary/30 p-4">
        <PricingBreakdown pricing={pricing} />
      </div>

      <Button onClick={onSubmit} disabled={pending} className="w-full" size="lg">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit &amp; lock job order
      </Button>

      {editable && (
        <Button
          variant="outline"
          onClick={onVoid}
          disabled={working}
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          {working ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
          Void job order
        </Button>
      )}
    </div>
  );
}
