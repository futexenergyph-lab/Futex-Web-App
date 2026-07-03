import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RetailPurchaseForm,
  DeleteRetailButton,
  SubmitRetailButton,
} from "@/components/accounting/retail-purchase-form";
import { php, formatDate } from "@/lib/utils";
import {
  RETAIL_PURCHASE_TYPE_LABELS,
  type RetailPurchase,
  type RetailPurchaseType,
} from "@/lib/types";

export const metadata = { title: "Retail Purchases" };
export const dynamic = "force-dynamic";

export default async function RetailPurchasesPage() {
  await requireRole(["accounting", "admin", "admin_staff"]);
  const supabase = createClient();

  const { data } = await supabase
    .from("retail_purchases")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as RetailPurchase[] | null) ?? [];
  const recorded = rows.filter((r) => r.status === "recorded");
  const submitted = rows.filter((r) => r.status === "submitted");

  const sum = (list: RetailPurchase[]) =>
    list.reduce((t, r) => t + Number(r.amount), 0);

  function Row({ r, deletable }: { r: RetailPurchase; deletable: boolean }) {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {RETAIL_PURCHASE_TYPE_LABELS[r.type as RetailPurchaseType] ??
                r.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(r.purchase_date)}
            </span>
            {r.status === "submitted" && (
              <Badge variant="accent">Profit</Badge>
            )}
          </div>
          {r.description && (
            <p className="mt-0.5 truncate text-sm">{r.description}</p>
          )}
        </div>
        <span className="font-medium tabular-nums">{php(r.amount)}</span>
        {deletable && <DeleteRetailButton id={r.id} />}
      </div>
    );
  }

  function Total({ amount }: { amount: number }) {
    return (
      <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{php(amount)}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Retail Purchases"
        description="Record over-the-counter retail orders, then submit them to the account as profit."
      />

      <Card>
        <CardHeader>
          <CardTitle>Record a retail purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <RetailPurchaseForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To submit ({recorded.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recorded.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recorded purchases. Record one above.
            </p>
          ) : (
            <>
              <div className="divide-y">
                {recorded.map((r) => (
                  <Row key={r.id} r={r} deletable />
                ))}
              </div>
              <Total amount={sum(recorded)} />
              <SubmitRetailButton count={recorded.length} />
            </>
          )}
        </CardContent>
      </Card>

      {submitted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted (reflected as profit)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              These reflect in Payments and Profitability under the Retail
              Purchase category.
            </p>
            <div className="divide-y">
              {submitted.map((r) => (
                <Row key={r.id} r={r} deletable={false} />
              ))}
            </div>
            <Total amount={sum(submitted)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
