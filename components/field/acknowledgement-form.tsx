"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileCheck2,
  Download,
  ReceiptText,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveAcknowledgement } from "@/app/(app)/field/actions";
import { SignaturePad } from "@/components/field/signature-pad";
import {
  buildAcknowledgementPdf,
  type AckParticular,
} from "@/lib/acknowledgement-pdf";
import { mergePdfs } from "@/lib/pdf-merge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { php } from "@/lib/utils";

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export function AcknowledgementForm({
  bookingId,
  customer,
  particulars,
  totalAmount,
  mop,
  date,
  fieldOfficerName,
  commissioningUrl,
  documentationPhotoUrl,
  alreadyDone,
  downloadUrl,
}: {
  bookingId: string;
  customer: { name: string; address: string; contact: string };
  particulars: AckParticular[];
  totalAmount: number;
  mop: string;
  date: string;
  fieldOfficerName: string;
  commissioningUrl: string | null;
  documentationPhotoUrl: string | null;
  alreadyDone: boolean;
  downloadUrl: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [paymentByName, setPaymentByName] = useState(customer.name ?? "");
  const [paymentBySignature, setPaymentBySignature] = useState<string | null>(
    null,
  );
  const [receivedByName, setReceivedByName] = useState(fieldOfficerName ?? "");
  const [receivedBySignature, setReceivedBySignature] = useState<string | null>(
    null,
  );
  // Photo (full quality) attached for the receipt's DOCUMENTATION section.
  const [photo, setPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (photoRef.current) photoRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (alreadyDone) {
    return (
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCheck2 className="h-4 w-4 text-green-600" />
          Acknowledgement receipt generated &amp; merged with the commissioning
          document.
        </div>
        {downloadUrl && (
          <Button asChild variant="outline" className="w-full">
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Download receipt PDF
            </a>
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Filed under the client&apos;s Commissioning &amp; Warranty in the
          Client Master List as one combined PDF.
        </p>
      </div>
    );
  }

  if (!commissioningUrl) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Complete the Commissioning checklist first — the acknowledgement receipt
        is merged with it into a single PDF.
      </div>
    );
  }

  async function onGenerate() {
    if (!receivedBySignature) {
      toast.error("Capture the field officer's signature (Received by)");
      return;
    }
    setPending(true);
    try {
      const logo = await fetchDataUrl("/images/logo-stacked.png");
      // Prefer the explicitly attached photo; fall back to a docs photo.
      const docPhoto =
        photo ??
        (documentationPhotoUrl ? await fetchDataUrl(documentationPhotoUrl) : null);

      const arBlob = buildAcknowledgementPdf({
        date,
        customerName: customer.name,
        address: customer.address,
        contact: customer.contact,
        particulars,
        totalAmount,
        mop,
        paymentByName,
        paymentBySignature,
        receivedByName,
        receivedBySignature,
        documentationPhoto: docPhoto,
        logo,
      });

      // Merge commissioning + warranty + acknowledgement receipt into one PDF.
      const commBuf = await fetchArrayBuffer(commissioningUrl!);
      const arBuf = await arBlob.arrayBuffer();
      const merged = commBuf
        ? await mergePdfs([commBuf, arBuf])
        : new Blob([arBuf], { type: "application/pdf" });

      const supabase = createClient();
      const path = `${bookingId}/commissioning-warranty-ack-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, merged, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);

      const res = await saveAcknowledgement({
        bookingId,
        storagePath: path,
        title: "Commissioning, Warranty & Acknowledgement Receipt",
        data: { mop, totalAmount, receivedByName, paymentByName },
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Acknowledgement receipt generated & filed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ReceiptText className="h-4 w-4" />
        Acknowledgement Receipt
      </div>

      {/* Read-only summary pulled from the job order + payment */}
      <div className="space-y-1 rounded-md bg-secondary/50 p-3 text-sm">
        <p>
          <span className="text-muted-foreground">Customer:</span>{" "}
          {customer.name}
        </p>
        <div className="mt-1 space-y-0.5">
          {particulars.map((p, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span>{p.label}</span>
              {p.unitPrice != null && (
                <span className="text-muted-foreground">{php(p.unitPrice)}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
          <span>Total ({mop})</span>
          <span>{php(totalAmount)}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment-by">Payment by (client printed name)</Label>
          <Input
            id="payment-by"
            value={paymentByName}
            onChange={(e) => setPaymentByName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="received-by">
            Received by (field officer printed name)
          </Label>
          <Input
            id="received-by"
            value={receivedByName}
            onChange={(e) => setReceivedByName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Client signature (Payment by)</Label>
          <SignaturePad onChange={setPaymentBySignature} />
        </div>
        <div className="space-y-2">
          <Label>Field officer signature (Received by)</Label>
          <SignaturePad onChange={setReceivedBySignature} />
        </div>
      </div>

      {/* Attach 1 photo for the receipt's DOCUMENTATION section */}
      <div className="space-y-2">
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => photoRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Attach (1) Photo Documentation
          </Button>
          {photo && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Documentation"
                className="h-12 w-12 rounded border object-cover"
              />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The attached photo appears under the “DOCUMENTATION” section of the
          receipt PDF (original quality).
        </p>
      </div>

      <Button onClick={onGenerate} disabled={pending} className="w-full" size="lg">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Generate acknowledgement receipt
      </Button>
    </div>
  );
}
