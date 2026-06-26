import { Clock, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app/app-shell";

const nav: NavItem[] = [
  { href: "/field", label: "My Jobs", icon: ClipboardList },
  { href: "/field/attendance", label: "Time In / Out", icon: Clock },
];

export default async function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["field_officer", "installer"]);
  return (
    <AppShell profile={profile} nav={nav} areaLabel="Field Operations">
      {children}
    </AppShell>
  );
}
