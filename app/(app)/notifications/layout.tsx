import { requireProfile } from "@/lib/auth";
import { AppShell, type AppArea } from "@/components/app/app-shell";

/** Notification Log is available to every authenticated user. */
export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const area: AppArea =
    profile.role === "accounting"
      ? "accounting"
      : profile.role === "hr"
        ? "hr"
        : profile.role === "field_officer" || profile.role === "installer"
          ? "field"
          : profile.role === "admin_staff"
            ? "admin_staff"
            : "admin";
  return (
    <AppShell profile={profile} area={area}>
      {children}
    </AppShell>
  );
}
