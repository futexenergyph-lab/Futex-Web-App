import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin can also view accounting.
  const profile = await requireRole(["accounting", "admin"]);
  return (
    <AppShell profile={profile} area="accounting">
      {children}
    </AppShell>
  );
}
