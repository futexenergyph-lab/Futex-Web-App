"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { php } from "@/lib/utils";

export interface PaymentInfo {
  amount: number;
  method: string;
  referenceNo: string | null;
  status: "pending" | "confirmed";
  paidAt: string | null;
  proofUrl: string | null;
}

/** "See details" link that opens the full payment details + proof photo. */
export function PaymentDetails({ payment }: { payment: PaymentInfo }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Eye className="h-3.5 w-3.5" /> See details
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold">{php(payment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p
                  className={`font-medium capitalize ${
                    payment.status === "confirmed"
                      ? "text-futex-green"
                      : "text-red-600"
                  }`}
                >
                  {payment.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mode of payment</p>
                <p className="font-medium capitalize">
                  {payment.method.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference no.</p>
                <p className="font-medium">{payment.referenceNo || "—"}</p>
              </div>
              {payment.paidAt && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Recorded</p>
                  <p className="font-medium">
                    {new Date(payment.paidAt).toLocaleString("en-US", {
                      timeZone: "Asia/Manila",
                    })}
                  </p>
                </div>
              )}
            </div>

            {payment.proofUrl ? (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Payment proof — tap to enlarge
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payment.proofUrl}
                  alt="Payment proof"
                  onClick={() => setZoom(true)}
                  className="max-h-64 cursor-zoom-in rounded border object-contain"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No proof photo attached.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-quality enlarged proof */}
      {zoom && payment.proofUrl && (
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
            src={payment.proofUrl}
            alt="Payment proof enlarged"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
