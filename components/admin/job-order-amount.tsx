"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
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
  bookingId,
  paymentStatus = null,
  paymentProofUrl = null,
}: {
  amount: number;
  detail: JobOrderDetail;
  bookingId?: string;
  paymentStatus?: "pending" | "confirmed" | "declined" | null;
  paymentProofUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
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

            {/* Payment proof photo — click to enlarge (full quality). */}
            {paymentProofUrl && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Payment proof
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentProofUrl}
                  alt="Payment proof"
                  onClick={() => setZoom(true)}
                  className="max-h-48 cursor-zoom-in rounded border object-contain"
                />
              </div>
            )}

            {/* Confirm payment, inline below the details. */}
            {bookingId && paymentStatus === "pending" && (
              <div className="flex items-center gap-2 border-t pt-3">
                <span className="text-sm font-medium text-red-600">
                  Payment pending
                </span>
                <ConfirmPaymentButton bookingId={bookingId} />
              </div>
            )}
            {paymentStatus === "confirmed" && (
              <p className="border-t pt-3 text-sm font-medium text-futex-green">
                Payment confirmed
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-quality enlarged payment proof */}
      {zoom && paymentProofUrl && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={paymentProofUrl}
            alt="Payment proof enlarged"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
