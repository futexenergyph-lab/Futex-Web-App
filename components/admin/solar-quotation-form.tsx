"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, FileText, Sun } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createQuotation,
  updateQuotation,
  attachQuotationPdf,
} from "@/app/(app)/admin/quotations/actions";
import { buildSolarQuotationPdf } from "@/lib/quotation-pdf";
import {
  defaultSolarQuote,
  solarTotal,
  type SolarQuoteData,
  type SolarProduct,
  type ProposedCostRow,
} from "@/lib/solar-quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export interface SolarQuoteInitial {
  id: string;
  client_name: string;
  client_address: string | null;
  client_contact: string | null;
  client_email: string | null;
  details: SolarQuoteData | null;
}

export function SolarQuotationForm({
  initial,
}: {
  initial?: SolarQuoteInitial;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clientName, setClientName] = useState(initial?.client_name ?? "");
  const [clientAddress, setClientAddress] = useState(
    initial?.client_address ?? "",
  );
  const [clientContact, setClientContact] = useState(
    initial?.client_contact ?? "",
  );
  const [clientEmail, setClientEmail] = useState(initial?.client_email ?? "");
  const [data, setData] = useState<SolarQuoteData>(
    initial?.details ?? defaultSolarQuote(),
  );

  const total = useMemo(() => solarTotal(data), [data]);

  // ---- Proposed cost helpers ----
  function setCost(i: number, patch: Partial<ProposedCostRow>) {
    setData((d) => ({
      ...d,
      proposedCost: d.proposedCost.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    }));
  }
  function addCost() {
    setData((d) => ({
      ...d,
      proposedCost: [
        ...d.proposedCost,
        { packageName: "", noOfPackage: 1, netPrice: 0, discountedPrice: 0 },
      ],
    }));
  }
  function removeCost(i: number) {
    setData((d) => ({
      ...d,
      proposedCost: d.proposedCost.filter((_, idx) => idx !== i),
    }));
  }

  // ---- Product helpers ----
  function setProduct(pi: number, patch: Partial<SolarProduct>) {
    setData((d) => ({
      ...d,
      products: d.products.map((p, idx) =>
        idx === pi ? { ...p, ...patch } : p,
      ),
    }));
  }
  function setMaterial(
    pi: number,
    mi: number,
    patch: Partial<SolarProduct["materials"][number]>,
  ) {
    setData((d) => ({
      ...d,
      products: d.products.map((p, idx) =>
        idx === pi
          ? {
              ...p,
              materials: p.materials.map((m, j) =>
                j === mi ? { ...m, ...patch } : m,
              ),
            }
          : p,
      ),
    }));
  }
  function addMaterial(pi: number) {
    setData((d) => ({
      ...d,
      products: d.products.map((p, idx) =>
        idx === pi
          ? {
              ...p,
              materials: [
                ...p.materials,
                { name: "", unit: "pcs", qty: 1, checked: true },
              ],
            }
          : p,
      ),
    }));
  }
  function removeMaterial(pi: number, mi: number) {
    setData((d) => ({
      ...d,
      products: d.products.map((p, idx) =>
        idx === pi
          ? { ...p, materials: p.materials.filter((_, j) => j !== mi) }
          : p,
      ),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const body = {
        type: "solar" as const,
        client_name: clientName,
        client_address: clientAddress,
        client_contact: clientContact,
        client_email: clientEmail,
        items: [],
        vat_enabled: false,
        validity_days: 30,
        notes: "",
        details: data,
      };
      const res = initial
        ? await updateQuotation(initial.id, body)
        : await createQuotation(body);
      if (res?.error || !res?.id) {
        toast.error(res?.error ?? "Failed to save quotation");
        return;
      }

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
        const blob = buildSolarQuotationPdf({
          quoteNo: res.quoteNo!,
          date,
          client: {
            name: clientName,
            address: clientAddress,
            contact: clientContact,
          },
          data,
          logo,
        });
        const supabase = createClient();
        const path = `${res.id}/${res.quoteNo}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("quotations")
          .upload(path, blob, { contentType: "application/pdf", upsert: true });
        if (upErr) throw new Error(upErr.message);
        await attachQuotationPdf({ id: res.id, storagePath: path });
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Saved, but PDF failed: ${err.message}`
            : "Saved, but PDF failed",
        );
      }

      toast.success(
        `Quotation ${res.quoteNo} ${initial ? "updated" : "created"}`,
      );
      router.push("/admin/quotations");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border bg-secondary/30 p-3 text-sm font-medium">
        <Sun className="h-4 w-4 text-amber-500" /> Solar Solution Quotation
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

      {/* A. Proposed cost */}
      <div className="space-y-2">
        <h3 className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          A. Proposed Cost
        </h3>
        <div className="space-y-2">
          {data.proposedCost.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-end gap-2 rounded-md border p-2 sm:grid-cols-5"
            >
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs">Package</Label>
                <Input
                  value={r.packageName}
                  onChange={(e) => setCost(i, { packageName: e.target.value })}
                  placeholder="8kwh hybrid"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">No. of Package</Label>
                <Input
                  type="number"
                  min={1}
                  value={r.noOfPackage || ""}
                  onChange={(e) =>
                    setCost(i, { noOfPackage: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Net Price / Package</Label>
                <Input
                  type="number"
                  min={0}
                  value={r.netPrice || ""}
                  onChange={(e) =>
                    setCost(i, { netPrice: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discounted Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={r.discountedPrice || ""}
                  onChange={(e) =>
                    setCost(i, { discountedPrice: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium tabular-nums">
                  {php(r.noOfPackage * r.discountedPrice)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCost(i)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addCost}>
            <Plus className="h-4 w-4" /> Add package
          </Button>
          <span className="text-sm font-semibold">
            Total: <span className="tabular-nums">{php(total)}</span>
          </span>
        </div>
      </div>

      {/* B. Product detail */}
      <div className="space-y-3">
        <h3 className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          B. Product Detail
        </h3>
        {data.products.map((p, pi) => (
          <div key={p.key} className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-bold uppercase">{p.title}</p>

            {p.brandOptions.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Brand (select)</Label>
                  <select
                    value={p.brandOptions.includes(p.brand) ? p.brand : ""}
                    onChange={(e) =>
                      setProduct(pi, { brand: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— choose brand —</option>
                    {p.brandOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Brand (or type manually)</Label>
                  <Input
                    value={p.brand}
                    onChange={(e) => setProduct(pi, { brand: e.target.value })}
                    placeholder="Add / edit brand"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Inclusion</Label>
              <Textarea
                rows={2}
                value={p.inclusion}
                onChange={(e) => setProduct(pi, { inclusion: e.target.value })}
                placeholder="e.g. 16 pcs 620 watt"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Standard materials (check to include, set quantity)
              </Label>
              <div className="space-y-1.5">
                {p.materials.map((m, mi) => (
                  <div key={mi} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={m.checked}
                      onChange={(e) =>
                        setMaterial(pi, mi, { checked: e.target.checked })
                      }
                      className="h-4 w-4 shrink-0"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={m.qty || ""}
                      onChange={(e) =>
                        setMaterial(pi, mi, { qty: Number(e.target.value) || 0 })
                      }
                      className="w-16"
                      aria-label="Quantity"
                    />
                    <Input
                      value={m.unit}
                      onChange={(e) => setMaterial(pi, mi, { unit: e.target.value })}
                      className="w-16"
                      aria-label="Unit"
                      placeholder="pcs"
                    />
                    <Input
                      value={m.name}
                      onChange={(e) => setMaterial(pi, mi, { name: e.target.value })}
                      className="flex-1"
                      aria-label="Material"
                      placeholder="Material name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMaterial(pi, mi)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMaterial(pi)}
              >
                <Plus className="h-4 w-4" /> Add material
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Additional details (one bullet per line — specs, warranty…)
              </Label>
              <Textarea
                rows={3}
                value={p.details}
                onChange={(e) => setProduct(pi, { details: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="space-y-2">
        <Label htmlFor="disc">Warranty note (red disclaimer)</Label>
        <Textarea
          id="disc"
          rows={3}
          value={data.disclaimer}
          onChange={(e) => setData((d) => ({ ...d, disclaimer: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        {initial
          ? "Update quotation & regenerate PDF"
          : "Generate quotation PDF"}
      </Button>
    </form>
  );
}
