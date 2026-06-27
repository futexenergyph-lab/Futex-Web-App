"use client";

import { useState } from "react";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { php } from "@/lib/utils";
import type { PricingResult } from "@/lib/pricing";

export interface JobOrderDetail {
  clientName: string;
  packageName: string | null;
  enclosureName: string | null;
  totalWireMeters: number;
  pricing: PricingResult;
  notes: string | null;
  signature: string | null;
  status: string;
}

/** Clickable job-order amount that opens the full breakdown in a dialog. */
export function JobOrderAmount({
  amount,
  detail,
}: {
  amount: number;
  detail: JobOrderDetail;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium tabular-nums text-primary hover:underline"
      >
        {php(amount)}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job Order — {detail.clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Package</p>
                <p className="font-medium">{detail.packageName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enclosure</p>
                <p className="font-medium">{detail.enclosureName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total wire</p>
                <p className="font-medium">{detail.totalWireMeters} m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{detail.status}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-4">
              <PricingBreakdown pricing={detail.pricing} />
            </div>

            {detail.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{detail.notes}</p>
              </div>
            )}

            {detail.signature && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Client signature — acknowledged &amp; accepted
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.signature}
                  alt="Client signature"
                  className="h-24 rounded border bg-white object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
