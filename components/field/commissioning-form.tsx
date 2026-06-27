"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { Loader2, FileCheck2, Download } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveCommissioning } from "@/app/(app)/field/actions";
import { SignaturePad } from "@/components/field/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMMISSIONING_SECTIONS,
  type CommValues,
} from "@/lib/commissioning";

function buildPdf(opts: {
  title: string;
  values: CommValues;
  printedName: string;
  signature: string | null;
}): Blob {
  const { title, values, printedName, signature } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineH = 15;
  let y = margin;
  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Electric Vehicle Charger Installation Checklist", pageW / 2, y, {
    align: "center",
  });
  y += 22;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 20;

  for (const section of COMMISSIONING_SECTIONS) {
    ensure(lineH * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${section.num}. ${section.title}`, margin, y);
    y += lineH + 2;
    for (const sub of section.subsections) {
      if (sub.title) {
        ensure(lineH);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(sub.title, margin, y);
        y += lineH;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const f of sub.fields) {
        const v = values[f.key];
        const text =
          f.type === "check"
            ? `${v ? "[X]" : "[  ]"}  ${f.label}`
            : `${f.label}: ${(v as string) || "—"}`;
        const lines = doc.splitTextToSize(text, pageW - margin * 2) as string[];
        ensure(lineH * lines.length);
        doc.text(lines, margin, y);
        y += lineH * lines.length;
      }
      y += 4;
    }
    y += 6;
  }

  ensure(140);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENT:", margin, y);
  y += 12;
  if (signature) {
    try {
      doc.addImage(signature, "PNG", margin, y, 160, 70);
    } catch {
      /* ignore bad image */
    }
  }
  y += 80;
  doc.line(margin, y, margin + 240, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(printedName || "", margin, y);
  y += 12;
  doc.setFontSize(9);
  doc.text("Signature over printed name", margin, y);

  return doc.output("blob");
}

export function CommissioningForm({
  bookingId,
  prefill,
  completed,
  downloadUrl,
}: {
  bookingId: string;
  prefill: { client_name: string; site_address: string; contact_person: string };
  completed: boolean;
  downloadUrl: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [printedName, setPrintedName] = useState(prefill.client_name ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [values, setValues] = useState<CommValues>(() => {
    const init: CommValues = {};
    for (const s of COMMISSIONING_SECTIONS)
      for (const sub of s.subsections)
        for (const f of sub.fields) init[f.key] = f.type === "check" ? false : "";
    init.client_name = prefill.client_name ?? "";
    init.site_address = prefill.site_address ?? "";
    init.contact_person = prefill.contact_person ?? "";
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
    setPending(true);
    try {
      const title = `${prefill.client_name || "Client"} — Commissioning Checklist`;
      const blob = buildPdf({ title, values, printedName, signature });

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
        data: { values, printedName },
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

      <Button onClick={onComplete} disabled={pending} className="w-full" size="lg">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Complete &amp; generate signed PDF
      </Button>
    </div>
  );
}
