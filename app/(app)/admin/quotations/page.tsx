import Link from "next/link";
import { Zap, Sun, Download, FileText, Pencil, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteQuotationButton } from "@/components/admin/delete-quotation-button";
import { DuplicateQuotationButton } from "@/components/admin/duplicate-quotation-button";
import {
  RegenerateQuotationButton,
  type RegenQuote,
} from "@/components/admin/regenerate-quotation-button";
import { php, formatDate } from "@/lib/utils";

export const metadata = { title: "Quotations" };
export const dynamic = "force-dynamic";

type QuoteRow = RegenQuote & { storage_path: string | null };

/** Minimal package/line summary shown in the history table. */
function quoteSummary(r: QuoteRow): string {
  if (r.type === "solar") {
    const rows = r.details?.proposedCost ?? [];
    if (rows.length === 0) return "—";
    return rows
      .map((p) => `${p.packageName}${p.noOfPackage > 1 ? ` ×${p.noOfPackage}` : ""}`)
      .join(", ");
  }
  const items = r.items ?? [];
  if (items.length === 0) return "—";
  const first = items[0].description?.trim() || "Item";
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
}

export default async function QuotationsPage() {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("quotations")
    .select(
      "id, quote_no, type, client_name, client_address, client_contact, client_email, items, subtotal, vat_enabled, vat, total, validity_days, notes, details, storage_path, prepared_by_name, created_at",
    )
    .order("created_at", { ascending: false });
  const rows = (data as QuoteRow[] | null) ?? [];

  // Sign the PDF paths for download.
  const urls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.storage_path)
      .map(async (r) => {
        const { data: s } = await supabase.storage
          .from("quotations")
          .createSignedUrl(r.storage_path!, 3600);
        if (s?.signedUrl) urls.set(r.id, s.signedUrl);
      }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Create and manage EV Charger and Solar Solution price quotations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create quotation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1 justify-start gap-2">
              <Link href="/admin/quotations/new?type=ev">
                <Zap className="h-4 w-4" /> EV Charger Quotation
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 justify-start gap-2"
            >
              <Link href="/admin/quotations/new?type=solar">
                <Sun className="h-4 w-4 text-amber-500" /> Solar Solution
                Quotation
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotation history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.quote_no ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.type === "ev" ? (
                      <Badge variant="accent" className="gap-1">
                        <Zap className="h-3 w-3" /> EV Charger
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Sun className="h-3 w-3" /> Solar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                    <span className="line-clamp-2">{quoteSummary(r)}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{php(r.total)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {urls.get(r.id) ? (
                        <Button asChild variant="ghost" size="icon" title="Download PDF">
                          <a
                            href={urls.get(r.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No PDF
                        </span>
                      )}
                      <RegenerateQuotationButton quote={r} />
                      <DuplicateQuotationButton id={r.id} />
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        title="Create a Contract"
                      >
                        <Link href={`/admin/quotations/${r.id}/contract`}>
                          <FileSignature className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit">
                        <Link href={`/admin/quotations/${r.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteQuotationButton id={r.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No quotations yet. Create one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
