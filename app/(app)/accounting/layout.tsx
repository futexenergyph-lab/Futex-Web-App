import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin can also view accounting. When an admin opens these pages, keep the
  // Management sidebar (which now includes the accounting links) so they don't
  // lose context; dedicated accounting users get the Accounting sidebar.
  const profile = await requireRole(["accounting", "admin"]);
  const area = profile.role === "admin" ? "admin" : "accounting";
  return (
    <AppShell profile={profile} area={area}>
      {children}
    </AppShell>
  );
}
