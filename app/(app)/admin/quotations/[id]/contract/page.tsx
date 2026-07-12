import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContractForm,
  type ContractInitial,
} from "@/components/admin/contract-form";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Create Contract" };
export const dynamic = "force-dynamic";

export default async function CreateContractPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("quotations")
    .select("quote_no, client_name, client_address, client_contact, total")
    .eq("id", params.id)
    .single();

  if (!data) notFound();
  const q = data as {
    quote_no: string | null;
    client_name: string;
    client_address: string | null;
    client_contact: string | null;
    total: number;
  };

  const initial: ContractInitial = {
    quoteNo: q.quote_no,
    clientName: q.client_name,
    clientAddress: q.client_address ?? "",
    clientContact: q.client_contact ?? "",
    total: Number(q.total ?? 0),
    // Supplier defaults (editable) — FUTEX / signing officer.
    supplierName: "Jeffrey Lois G. Talla",
    supplierAddress: COMPANY.address,
    supplierContact: COMPANY.phones[0],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/quotations"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </Link>
      <PageHeader
        title="Create Contract"
        description={`Installation contract based on quotation ${q.quote_no ?? ""}. Edit any field, then generate the branded PDF.`}
      />
      <Card>
        <CardContent className="pt-6">
          <ContractForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
