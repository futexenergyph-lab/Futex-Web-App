"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileCheck2, Download } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveCommissioning } from "@/app/(app)/field/actions";
import { SignaturePad } from "@/components/field/signature-pad";
import { buildCommissioningPdf } from "@/lib/commissioning-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMMISSIONING_SECTIONS,
  WARRANTY_SECTIONS,
  type CommValues,
} from "@/lib/commissioning";

/** Fetch the stacked FUTEX logo and return it as a PNG data URL. */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/images/logo-stacked.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function CommissioningForm({
  bookingId,
  prefill,
  completed,
  downloadUrl,
  receivedByDefault = "",
}: {
  bookingId: string;
  prefill: { client_name: string; site_address: string; contact_person: string };
  completed: boolean;
  downloadUrl: string | null;
  receivedByDefault?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [printedName, setPrintedName] = useState(prefill.client_name ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [receivedByName, setReceivedByName] = useState(receivedByDefault);
  const [receivedBySignature, setReceivedBySignature] = useState<string | null>(
    null,
  );
  const [values, setValues] = useState<CommValues>(() => {
    const init: CommValues = {};
    for (const s of COMMISSIONING_SECTIONS)
      for (const sub of s.subsections)
        for (const f of sub.fields) init[f.key] = f.type === "check" ? false : "";
    init.client_name = prefill.client_name ?? "";
    init.site_address = prefill.site_address ?? "";
    init.contact_person = prefill.contact_person ?? "";
    // Default the installation date to today (the day of installation).
    init.installation_date = new Date().toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return init;
  });

  function setVal(key: string, v: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm">
          <FileCheck2 className="h-4 w-4" />
          Commissioning checklist completed &amp; signed.
        </div>
        {downloadUrl && (
          <Button asChild variant="outline" className="w-full">
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Download commissioning PDF
            </a>
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          The signed PDF is filed under the client&apos;s documents in the
          Client Master List.
        </p>
      </div>
    );
  }

  async function onComplete() {
    if (!printedName.trim()) {
      toast.error("Enter the client's printed name");
      return;
    }
    if (!signature) {
      toast.error("Capture the client's signature first");
      return;
    }
    if (!receivedBySignature) {
      toast.error("Capture the FUTEX representative's signature");
      return;
    }
    setPending(true);
    try {
      const logo = await loadLogo();
      const blob = buildCommissioningPdf({
        values,
        clientName: printedName,
        clientSignature: signature,
        receivedByName,
        receivedBySignature,
        logo,
      });

      const supabase = createClient();
      const path = `${bookingId}/commissioning-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(upErr.message);

      const res = await saveCommissioning({
        bookingId,
        title: "Commissioning Checklist",
        storagePath: path,
        data: { values, printedName, receivedByName },
      });
      if (res?.error) throw new Error(res.error);
      toast.success("Commissioning checklist saved & filed to documents");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Fill in the EV charger installation checklist, then have the client
        sign. On completion a signed PDF is generated and filed to the client&apos;s
        documents.
      </p>

      {COMMISSIONING_SECTIONS.map((section) => (
        <div key={section.num} className="space-y-3">
          <h4 className="text-sm font-bold">
            {section.num}. {section.title}
          </h4>
          {section.subsections.map((sub, si) => (
            <div key={si} className="space-y-2 rounded-md border p-3">
              {sub.title && (
                <p className="text-xs font-semibold text-muted-foreground">
                  {sub.title}
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {sub.fields.map((f) =>
                  f.type === "check" ? (
                    <label
                      key={f.key}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        checked={!!values[f.key]}
                        onChange={(e) => setVal(f.key, e.target.checked)}
                      />
                      <span>{f.label}</span>
                    </label>
                  ) : (
                    <div key={f.key} className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`c-${f.key}`} className="text-xs">
                        {f.label}
                      </Label>
                      <Input
                        id={`c-${f.key}`}
                        value={(values[f.key] as string) ?? ""}
                        onChange={(e) => setVal(f.key, e.target.value)}
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="printed-name">Client printed name</Label>
        <Input
          id="printed-name"
          value={printedName}
          onChange={(e) => setPrintedName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Client signature</Label>
        <SignaturePad onChange={setSignature} />
      </div>

      {/* Warranty Terms & Conditions — second form, included in the PDF */}
      <div className="space-y-3 rounded-md border border-dashed p-4">
        <h4 className="text-sm font-bold">Warranty Terms &amp; Conditions</h4>
        <p className="text-xs text-muted-foreground">
          Review the warranty terms with the client. These are included as a
          second signed page in the generated PDF.
        </p>
        <div className="space-y-3">
          {WARRANTY_SECTIONS.map((section, si) => (
            <div key={si} className="space-y-1.5">
              <p className="text-xs font-semibold">{section.title}</p>
              <div className="space-y-1">
                {section.blocks.map((b, bi) => (
                  <p
                    key={bi}
                    className={`text-xs leading-relaxed text-muted-foreground ${
                      b.bullet ? "pl-4" : ""
                    } ${b.bold ? "font-semibold text-foreground" : ""}`}
                  >
                    {b.bullet ? "• " : ""}
                    {b.text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="received-by-name">
          Received by (FUTEX representative) — printed name
        </Label>
        <Input
          id="received-by-name"
          value={receivedByName}
          onChange={(e) => setReceivedByName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>FUTEX representative signature</Label>
        <SignaturePad onChange={setReceivedBySignature} />
      </div>

      <Button onClick={onComplete} disabled={pending} className="w-full" size="lg">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Complete &amp; generate signed PDF
      </Button>
    </div>
  );
}
