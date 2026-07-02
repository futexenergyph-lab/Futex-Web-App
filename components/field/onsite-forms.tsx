"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, MapPin, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  confirmPayment,
  postJobUpdate,
  recordArrival,
  uploadDocumentation,
} from "@/app/(app)/field/actions";
import { uploadToBucket } from "@/lib/storage";
import { stampPhoto } from "@/lib/photo-stamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { php } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type JobOrder,
  type PaymentMethod,
} from "@/lib/types";

// Small multi-photo picker.
function usePhotos() {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    if (ref.current) ref.current.value = "";
  }
  function reset() {
    setFiles([]);
  }
  return { files, setFiles, ref, onPick, reset };
}

// ---------------------------------------------------------------------------
export function ArrivalButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function markArrived() {
    setPending(true);
    const res = await recordArrival(bookingId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Marked as arrived on site");
      router.refresh();
    }
    setPending(false);
  }
  return (
    <Button variant="accent" onClick={markArrived} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      I&apos;ve arrived on site
    </Button>
  );
}

// ---------------------------------------------------------------------------
export function UpdateForm({
  bookingId,
  userId,
  stampName,
}: {
  bookingId: string;
  userId: string;
  /** When set, photos are stamped with this name + PHT time + GPS (installers). */
  stampName?: string;
}) {
  const { files, ref, onPick, reset } = usePhotos();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!message && files.length === 0) {
      toast.error("Add a message or photo");
      return;
    }
    setPending(true);
    try {
      const paths: string[] = [];
      for (const f of files) {
        const toUpload = stampName
          ? await stampPhoto(f, { name: stampName })
          : f;
        paths.push(
          await uploadToBucket("job-updates", toUpload, userId, bookingId),
        );
      }
      const res = await postJobUpdate({
        bookingId,
        message,
        photoPaths: paths,
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Update posted");
      setMessage("");
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Progress update…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => ref.current?.click()}
        >
          <Camera className="h-4 w-4" /> Add photos
        </Button>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {files.length} photo(s) ready
          </span>
        )}
      </div>
      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Post update
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function PaymentForm({
  bookingId,
  jobOrder,
  userId,
  existingStatus,
}: {
  bookingId: string;
  jobOrder: JobOrder | null;
  userId: string;
  existingStatus: "pending" | "confirmed" | "declined" | null;
}) {
  const { files, ref, onPick, reset } = usePhotos();
  const [amount, setAmount] = useState(String(jobOrder?.final_total ?? ""));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  // Confirmed/pending lock the form; declined re-opens it for a correction.
  if (existingStatus === "confirmed" || existingStatus === "pending") {
    return (
      <p className="rounded-md bg-accent/10 px-3 py-2 text-sm">
        {existingStatus === "confirmed"
          ? "Payment confirmed by management for this job."
          : "Payment recorded — awaiting management confirmation."}
      </p>
    );
  }

  async function submit() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter the amount");
      return;
    }
    if (!files[0]) {
      toast.error("Attach a proof of payment photo");
      return;
    }
    setPending(true);
    try {
      const proofPath = await uploadToBucket(
        "payment-proofs",
        files[0],
        userId,
        bookingId,
      );
      const res = await confirmPayment({
        bookingId,
        jobOrderId: jobOrder?.id ?? null,
        amount: Number(amount),
        method,
        referenceNo,
        proofPath,
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Payment recorded — awaiting management confirmation");
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {existingStatus === "declined" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          Your payment submission was declined by management. Please correct the
          details and resubmit.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₱)</Label>
          <Input
            id="amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {(
              Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
            ).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {method === "bank_transfer" && (
        <div className="space-y-1 rounded-md border bg-secondary/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Scan to pay via InstaPay (EastWest — FUTEX)
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/payment-bank-transfer.jpeg"
            alt="EastWest InstaPay QR — FUTEX"
            className="mx-auto max-h-72 w-auto rounded object-contain"
          />
        </div>
      )}
      {method === "check" && (
        <div className="space-y-1 rounded-md border bg-secondary/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Check details
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/payment-check.jpeg"
            alt="Check payable to — sample"
            className="mx-auto max-h-72 w-auto rounded object-contain"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ref">Reference no.</Label>
        <Input
          id="ref"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => ref.current?.click()}
      >
        <Camera className="h-4 w-4" /> Upload proof
        {files.length > 0 ? " ✓" : ""}
      </Button>
      <p className="text-xs text-muted-foreground">
        {files.length > 0
          ? "Proof of payment attached."
          : "A proof of payment photo is required."}
      </p>
      {jobOrder && (
        <p className="text-xs text-muted-foreground">
          Job order total: {php(jobOrder.final_total)}
        </p>
      )}
      <Button
        onClick={submit}
        disabled={pending || files.length === 0}
        className="w-full"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm payment
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function DocumentationForm({
  bookingId,
  userId,
}: {
  bookingId: string;
  userId: string;
}) {
  const { files, ref, onPick, reset } = usePhotos();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    if (files.length === 0) {
      toast.error("Attach at least one file");
      return;
    }
    setPending(true);
    try {
      const paths: string[] = [];
      for (const f of files) {
        paths.push(await uploadToBucket("documentation", f, userId, bookingId));
      }
      const res = await uploadDocumentation({
        bookingId,
        filePaths: paths,
        notes,
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Documentation uploaded");
      setNotes("");
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => ref.current?.click()}
      >
        <Upload className="h-4 w-4" /> Attach photos
      </Button>
      {files.length > 0 && (
        <span className="block text-xs text-muted-foreground">
          {files.length} photo(s) ready
        </span>
      )}
      <Textarea
        placeholder="Turnover notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button onClick={submit} disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Upload documentation
      </Button>
    </div>
  );
}
