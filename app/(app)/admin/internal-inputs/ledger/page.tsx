import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  InternalInputsManager,
  type InternalInputRow,
} from "@/components/admin/internal-inputs-manager";

export const metadata = { title: "Internal Cash & Costs" };
export const dynamic = "force-dynamic";

export default async function InternalInputsPage() {
  // Owner-only: these entries are private to the owner.
  await requireRole(["owner"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("internal_inputs")
    .select(
      "id, entry_date, direction, category, description, amount, payee, reference_no, notes, attachment_path, created_by_name",
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const raw = (data as Omit<InternalInputRow, "attachment_url">[] | null) ?? [];

  // Sign the attachment paths in one batch so the page stays fast.
  const paths = [...new Set(raw.map((r) => r.attachment_path).filter(Boolean))] as string[];
  const signed = new Map<string, string>();
  for (let i = 0; i < paths.length; i += 100) {
    const { data: s } = await supabase.storage
      .from("internal-inputs")
      .createSignedUrls(paths.slice(i, i + 100), 3600);
    for (const x of s ?? []) {
      if (x.signedUrl && x.path) signed.set(x.path, x.signedUrl);
    }
  }

  const rows: InternalInputRow[] = raw.map((r) => ({
    ...r,
    amount: Number(r.amount ?? 0),
    attachment_url: r.attachment_path
      ? (signed.get(r.attachment_path) ?? null)
      : null,
  }));

  return (
    <div>
      <Link
        href="/admin/internal-inputs"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Internal Inputs
      </Link>
      <PageHeader
        title="Internal Cash & Costs"
        description="Private owner ledger of internal cash and costs that aren't tied to a booking — capital, drawings, operating costs and supplier payments."
      />
      <InternalInputsManager rows={rows} />
    </div>
  );
}
