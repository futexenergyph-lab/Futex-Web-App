"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { attachQuotationPdf } from "@/app/(app)/admin/quotations/actions";
import {
  buildQuotationPdf,
  buildSolarQuotationPdf,
} from "@/lib/quotation-pdf";
import { COMPANY, ACCREDITATION } from "@/lib/company";
import type { SolarQuoteData } from "@/lib/solar-quote";
import { Button } from "@/components/ui/button";

export interface RegenQuote {
  id: string;
  quote_no: string | null;
  type: "ev" | "solar";
  client_name: string;
  client_address: string | null;
  client_contact: string | null;
  client_email: string | null;
  items: { description: string; qty: number; unit_price: number }[] | null;
  subtotal: number;
  vat_enabled: boolean;
  vat: number;
  total: number;
  validity_days: number;
  notes: string | null;
  details: SolarQuoteData | null;
  prepared_by_name: string | null;
  created_at: string;
}

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

/** Rebuilds a quotation's PDF from its stored data (e.g. to apply layout fixes). */
export function RegenerateQuotationButton({ quote }: { quote: RegenQuote }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRegen() {
    setPending(true);
    try {
      const logo = await fetchDataUrl("/images/logo-stacked.png");
      const date = new Date(quote.created_at)
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Manila",
        })
        .toUpperCase();
      const quoteNo = quote.quote_no ?? "";

      let blob: Blob;
      if (quote.type === "solar" && quote.details) {
        blob = buildSolarQuotationPdf({
          quoteNo,
          date,
          client: {
            name: quote.client_name,
            address: quote.client_address ?? "",
            contact: quote.client_contact ?? "",
          },
          data: quote.details,
          logo,
        });
      } else {
        blob = buildQuotationPdf({
          quoteNo,
          date,
          type: quote.type,
          validityDays: quote.validity_days,
          client: {
            name: quote.client_name,
            address: quote.client_address ?? "",
            contact: quote.client_contact ?? "",
            email: quote.client_email ?? "",
          },
          items: quote.items ?? [],
          subtotal: quote.subtotal,
          vatEnabled: quote.vat_enabled,
          vat: quote.vat,
          total: quote.total,
          notes: quote.notes ?? "",
          preparedByName: quote.prepared_by_name ?? "",
          company: {
            legalName: COMPANY.legalName,
            address: COMPANY.address,
            phones: COMPANY.phones,
            doeNumber: ACCREDITATION.number,
          },
          logo,
        });
      }

      const supabase = createClient();
      const path = `${quote.id}/${quoteNo || quote.id}.pdf`;
      const { error } = await supabase.storage
        .from("quotations")
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (error) throw new Error(error.message);
      await attachQuotationPdf({ id: quote.id, storagePath: path });
      toast.success("PDF regenerated (one page)");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onRegen}
      disabled={pending}
      title="Regenerate PDF"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
    </Button>
  );
}
