import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dedicated HR users get the HR sidebar; admin/owner viewing keep their
  // Management sidebar so they don't lose context.
  const profile = await requireRole(["hr", "admin"]);
  const area = profile.role === "hr" ? "hr" : "admin";
  return (
    <AppShell profile={profile} area={area}>
      {children}
    </AppShell>
  );
}
