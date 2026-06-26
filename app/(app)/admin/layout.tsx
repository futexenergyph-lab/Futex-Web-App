import {
  LayoutDashboard,
  Truck,
  Activity,
  Users,
  Settings,
  BarChart3,
  CalendarClock,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app/app-shell";
import { DebugError, isNextControlFlow } from "@/lib/debug-error";

const nav: NavItem[] = [
  { href: "/admin", label: "Bookings Kanban", icon: LayoutDashboard },
  { href: "/admin/deployment", label: "Deployment", icon: Truck },
  { href: "/admin/utilization", label: "Utilization", icon: CalendarClock },
  { href: "/admin/live", label: "Live Status", icon: Activity },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/hr", label: "HR", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile;
  try {
    profile = await requireRole(["admin"]);
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    return <DebugError where="admin layout (requireRole)" error={e} />;
  }
  return (
    <AppShell profile={profile} nav={nav} areaLabel="Management">
      {children}
    </AppShell>
  );
}
