"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, FileText, Zap, Sun } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createQuotation,
  attachQuotationPdf,
} from "@/app/(app)/admin/quotations/actions";
import { buildQuotationPdf } from "@/lib/quotation-pdf";
import { COMPANY, ACCREDITATION } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { php } from "@/lib/utils";

interface Row {
  description: string;
  qty: number;
  unit_price: number;
}

const DEFAULTS: Record<"ev" | "solar", Row[]> = {
  ev: [
    {
      description: "Futex Smart 3-Way Protection (EV Charger Installation)",
      qty: 1,
      unit_price: 0,
    },
    { description: "Charger Enclosure", qty: 1, unit_price: 0 },
    { description: "Installation & Labor", qty: 1, unit_price: 0 },
  ],
  solar: [
    { description: "Solar Panels", qty: 1, unit_price: 0 },
    { description: "Inverter", qty: 1, unit_price: 0 },
    { description: "Mounting Structure & Installation", qty: 1, unit_price: 0 },
  ],
};

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

export function QuotationForm({
  type,
  preparedByName,
}: {
  type: "ev" | "solar";
  preparedByName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [rows, setRows] = useState<Row[]>(DEFAULTS[type]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState("");

  const { subtotal, vat, total } = useMemo(() => {
    const s = rows.reduce((t, r) => t + r.qty * r.unit_price, 0);
    const v = vatEnabled ? Math.round(s * 0.12 * 100) / 100 : 0;
    return { subtotal: s, vat: v, total: s + v };
  }, [rows, vatEnabled]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { description: "", qty: 1, unit_price: 0 }]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createQuotation({
        type,
        client_name: clientName,
        client_address: clientAddress,
        client_contact: clientContact,
        client_email: clientEmail,
        items: rows,
        vat_enabled: vatEnabled,
        validity_days: validityDays,
        notes,
      });
      if (res?.error || !res?.id) {
        toast.error(res?.error ?? "Failed to create quotation");
        return;
      }

      // Build + upload the branded PDF.
      try {
        const logo = await fetchDataUrl("/images/logo-stacked.png");
        const date = new Date()
          .toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Manila",
          })
          .toUpperCase();
        const items = rows.filter(
          (r) => r.description.trim() || r.unit_price > 0,
        );
        const blob = buildQuotationPdf({
          quoteNo: res.quoteNo!,
          date,
          type,
          validityDays,
          client: {
            name: clientName,
            address: clientAddress,
            contact: clientContact,
            email: clientEmail,
          },
          items,
          subtotal,
          vatEnabled,
          vat,
          total,
          notes,
          preparedByName,
          company: {
            legalName: COMPANY.legalName,
            address: COMPANY.address,
            phones: COMPANY.phones,
            doeNumber: ACCREDITATION.number,
          },
          logo,
        });
        const supabase = createClient();
        const path = `${res.id}/${res.quoteNo}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("quotations")
          .upload(path, blob, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw new Error(upErr.message);
        await attachQuotationPdf({ id: res.id, storagePath: path });
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Saved, but PDF failed: ${err.message}`
            : "Saved, but PDF failed",
        );
      }

      toast.success(`Quotation ${res.quoteNo} created`);
      router.push("/admin/quotations");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border bg-secondary/30 p-3 text-sm font-medium">
        {type === "ev" ? (
          <Zap className="h-4 w-4 text-primary" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
        {type === "ev"
          ? "EV Charger Installation Quotation"
          : "Solar Solution Quotation"}
      </div>

      {/* Client */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cname">Client name</Label>
          <Input
            id="cname"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ccontact">Contact number</Label>
          <Input
            id="ccontact"
            value={clientContact}
            onChange={(e) => setClientContact(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cemail">Email</Label>
          <Input
            id="cemail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvalid">Validity (days)</Label>
          <Input
            id="cvalid"
            type="number"
            min={1}
            value={validityDays}
            onChange={(e) => setValidityDays(Number(e.target.value) || 30)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="caddr">Address</Label>
          <Textarea
            id="caddr"
            rows={2}
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-2">
        <Label>Line items</Label>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                placeholder="Description"
                value={r.description}
                onChange={(e) => setRow(i, { description: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                placeholder="Qty"
                value={r.qty}
                onChange={(e) => setRow(i, { qty: Number(e.target.value) || 0 })}
                className="w-16"
                aria-label="Quantity"
              />
              <Input
                type="number"
                min={0}
                placeholder="Unit price"
                value={r.unit_price}
                onChange={(e) =>
                  setRow(i, { unit_price: Number(e.target.value) || 0 })
                }
                className="w-28"
                aria-label="Unit price"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(i)}
                className="text-destructive hover:bg-destructive/10"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      {/* Totals */}
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{php(subtotal)}</span>
        </div>
        <label className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Add VAT (12%)
          </span>
          <span className="tabular-nums">{php(vat)}</span>
        </label>
        <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{php(total)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Terms</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Inclusions, exclusions, payment terms…"
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Generate quotation
      </Button>
    </form>
  );
}
