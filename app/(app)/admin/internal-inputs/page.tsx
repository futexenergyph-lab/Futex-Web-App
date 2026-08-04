import Link from "next/link";
import { FileBarChart, PiggyBank, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { php } from "@/lib/utils";

export const metadata = { title: "Internal Inputs" };
export const dynamic = "force-dynamic";

export default async function InternalInputsHub() {
  // Owner-only dashboard of the private internal modules.
  await requireRole(["owner"]);
  const supabase = createClient();

  const [{ count: clientCount }, { data: fin }, { data: ledger }] =
    await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("client_financials").select("amount"),
      supabase.from("internal_inputs").select("direction, amount"),
    ]);

  const trackedExpenses = ((fin as { amount: number }[] | null) ?? []).reduce(
    (t, r) => t + Number(r.amount || 0),
    0,
  );
  const led = (ledger as { direction: string; amount: number }[] | null) ?? [];
  const moneyIn = led
    .filter((r) => r.direction === "in")
    .reduce((t, r) => t + Number(r.amount || 0), 0);
  const moneyOut = led
    .filter((r) => r.direction === "out")
    .reduce((t, r) => t + Number(r.amount || 0), 0);

  const modules = [
    {
      href: "/admin/internal-inputs/financial-report",
      icon: FileBarChart,
      title: "Financial Report (Per Client)",
      desc: "Every client record. Open a client to log project-based expenses (labor, food, materials) and see payment, expenses and profit.",
      stat: `${clientCount ?? 0} client${clientCount === 1 ? "" : "s"} · ${php(trackedExpenses)} tracked`,
    },
    {
      href: "/admin/internal-inputs/ledger",
      icon: PiggyBank,
      title: "Internal Cash & Costs",
      desc: "Private ledger of internal cash that isn't tied to a booking — capital, drawings, operating costs and supplier payments.",
      stat: `In ${php(moneyIn)} · Out ${php(moneyOut)}`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Internal Inputs"
        description="Private owner workspace. These modules are visible to the Owner only."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="group">
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex h-full flex-col gap-3 pt-6">
                  <div className="flex items-start gap-3">
                    <span className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {m.desc}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-auto text-xs font-medium text-muted-foreground">
                    {m.stat}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
