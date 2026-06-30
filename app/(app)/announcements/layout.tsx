import { requireRole } from "@/lib/auth";
import { AppShell, type AppArea } from "@/components/app/app-shell";

export default async function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Owner / Management / Admin only (owner inherits the "admin" gate).
  const profile = await requireRole(["admin", "admin_staff"]);
  const area: AppArea = profile.role === "admin_staff" ? "admin_staff" : "admin";
  return (
    <AppShell profile={profile} area={area}>
      {children}
    </AppShell>
  );
}
