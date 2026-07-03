import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuotationForm } from "@/components/admin/quotation-form";
import { SolarQuotationForm } from "@/components/admin/solar-quotation-form";
import type { SolarQuoteData } from "@/lib/solar-quote";

export const metadata = { title: "Edit Quotation" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  type: "ev" | "solar";
  client_name: string;
  client_address: string | null;
  client_contact: string | null;
  client_email: string | null;
  items: { description: string; qty: number; unit_price: number }[] | null;
  vat_enabled: boolean;
  validity_days: number;
  notes: string | null;
  details: SolarQuoteData | null;
}

export default async function EditQuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("quotations")
    .select(
      "id, type, client_name, client_address, client_contact, client_email, items, vat_enabled, validity_days, notes, details",
    )
    .eq("id", params.id)
    .single();
  if (!data) notFound();
  const q = data as Row;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/quotations"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </Link>
      <PageHeader
        title="Edit Quotation"
        description="Update the details and regenerate the PDF."
      />
      <Card>
        <CardContent className="pt-6">
          {q.type === "solar" ? (
            <SolarQuotationForm
              initial={{
                id: q.id,
                client_name: q.client_name,
                client_address: q.client_address,
                client_contact: q.client_contact,
                client_email: q.client_email,
                details: q.details,
              }}
            />
          ) : (
            <QuotationForm
              type="ev"
              preparedByName={profile.full_name}
              initial={{
                id: q.id,
                client_name: q.client_name,
                client_address: q.client_address,
                client_contact: q.client_contact,
                client_email: q.client_email,
                items: q.items ?? [],
                vat_enabled: q.vat_enabled,
                validity_days: q.validity_days,
                notes: q.notes,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
