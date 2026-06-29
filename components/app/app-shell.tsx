"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Truck,
  Activity,
  Users,
  Settings,
  BarChart3,
  CalendarClock,
  Clock,
  ClipboardList,
  Wallet,
  TrendingUp,
  Receipt,
  ArrowLeftRight,
  FolderOpen,
  Contact,
  History,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Profile } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export type AppArea = "admin" | "field" | "accounting" | "hr" | "admin_staff";

// Nav config lives here (client) so icon components never cross the
// Server -> Client Component boundary (functions aren't serializable).
const AREAS: Record<
  "admin" | "accounting" | "hr" | "admin_staff",
  { label: string; nav: NavItem[] }
> = {
  admin: {
    label: "Management",
    nav: [
      { href: "/admin", label: "Bookings Kanban", icon: LayoutDashboard },
      { href: "/admin/clients", label: "Client Master List", icon: Contact },
      { href: "/admin/deployment", label: "Deployment", icon: Truck },
      { href: "/admin/utilization", label: "Utilization", icon: CalendarClock },
      { href: "/admin/live", label: "Live Status", icon: Activity },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/hr", label: "HR", icon: Users },
      { href: "/hr/201-files", label: "201 Files", icon: FolderOpen },
      // Accounting module (admins have full access)
      { href: "/accounting/cashflow", label: "Accounting Overview", icon: ArrowLeftRight },
      { href: "/accounting", label: "Payments", icon: Wallet },
      { href: "/accounting/expenses", label: "Expenses", icon: Receipt },
      { href: "/accounting/profitability", label: "Profitability", icon: TrendingUp },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  accounting: {
    label: "Accounting",
    nav: [
      { href: "/accounting/cashflow", label: "Overview", icon: ArrowLeftRight },
      { href: "/accounting", label: "Payments", icon: Wallet },
      { href: "/accounting/expenses", label: "Expenses", icon: Receipt },
      { href: "/accounting/profitability", label: "Profitability", icon: TrendingUp },
    ],
  },
  hr: {
    label: "Human Resources",
    nav: [
      { href: "/hr", label: "Attendance", icon: Users },
      { href: "/hr/201-files", label: "201 Files", icon: FolderOpen },
    ],
  },
  // Limited Admin role — restricted module set.
  admin_staff: {
    label: "Admin",
    nav: [
      { href: "/admin", label: "Bookings Kanban", icon: LayoutDashboard },
      { href: "/admin/clients", label: "Client Master List", icon: Contact },
      { href: "/admin/deployment", label: "Deployment", icon: Truck },
      { href: "/admin/utilization", label: "Utilization", icon: CalendarClock },
      { href: "/admin/live", label: "Live Status", icon: Activity },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/accounting", label: "Payments", icon: Wallet },
      { href: "/accounting/expenses", label: "Expenses", icon: Receipt },
    ],
  },
};

export function AppShell({
  profile,
  area,
  children,
}: {
  profile: Pick<Profile, "full_name" | "role">;
  area: AppArea;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The field area's nav differs by role: installers don't track time and
  // get a "My Customers" record instead.
  let areaLabel: string;
  let nav: NavItem[];
  if (area === "field") {
    areaLabel = "Field Operations";
    nav =
      profile.role === "installer"
        ? [
            { href: "/field", label: "My Jobs", icon: ClipboardList },
            { href: "/field/customers", label: "My Customers", icon: Users },
          ]
        : [
            { href: "/field", label: "My Jobs", icon: ClipboardList },
            { href: "/field/clients", label: "Client Master List", icon: Contact },
            { href: "/field/attendance", label: "Time In / Out", icon: Clock },
          ];
  } else {
    ({ label: areaLabel, nav } = AREAS[area]);
    // The Owner gets an extra audit "Logs" module.
    if (profile.role === "owner") {
      nav = [...nav, { href: "/admin/logs", label: "Logs", icon: History }];
    }
  }

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" &&
            pathname.startsWith(item.href) &&
            item.href.split("/").length > 2);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarBody = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Logo />
      </div>
      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {areaLabel}
        </p>
      </div>
      <NavLinks />
      <div className="border-t p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[profile.role]}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background md:block">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Logo showText={false} />
        <span className="text-sm font-semibold">{areaLabel}</span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-background shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarBody />
          </div>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
