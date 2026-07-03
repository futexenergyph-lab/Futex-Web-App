import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuotationForm } from "@/components/admin/quotation-form";
import { SolarQuotationForm } from "@/components/admin/solar-quotation-form";

export const metadata = { title: "New Quotation" };
export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const profile = await requireRole(["admin", "admin_staff"]);
  const type = searchParams.type === "solar" ? "solar" : "ev";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/quotations"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </Link>
      <PageHeader
        title="Create Quotation"
        description="Fill in the client and pricing details. A branded PDF is generated automatically."
      />
      <Card>
        <CardContent className="pt-6">
          {type === "solar" ? (
            <SolarQuotationForm />
          ) : (
            <QuotationForm type="ev" preparedByName={profile.full_name} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
