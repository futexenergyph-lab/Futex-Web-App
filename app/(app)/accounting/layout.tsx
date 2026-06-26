import { Wallet, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app/app-shell";

const nav: NavItem[] = [
  { href: "/accounting", label: "Payments", icon: Wallet },
  { href: "/accounting/profitability", label: "Profitability", icon: TrendingUp },
];

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin can also view accounting.
  const profile = await requireRole(["accounting", "admin"]);
  return (
    <AppShell profile={profile} nav={nav} areaLabel="Accounting">
      {children}
    </AppShell>
  );
}
