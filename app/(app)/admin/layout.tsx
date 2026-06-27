import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The limited Admin role shares the /admin routes but with a reduced
  // sidebar; the middleware blocks the modules it may not open.
  const profile = await requireRole(["admin", "admin_staff"]);
  const area = profile.role === "admin_staff" ? "admin_staff" : "admin";
  return (
    <AppShell profile={profile} area={area}>
      {children}
    </AppShell>
  );
}
