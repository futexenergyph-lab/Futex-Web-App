import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["field_officer", "installer"]);
  return (
    <AppShell profile={profile} area="field">
      {children}
    </AppShell>
  );
}
