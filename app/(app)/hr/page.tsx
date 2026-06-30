import { requireProfile } from "@/lib/auth";
import { AttendanceReport } from "@/components/hr/attendance-report";

export const metadata = { title: "HR" };
export const dynamic = "force-dynamic";

export default async function HRDashboardPage({
  searchParams,
}: {
  searchParams: { person?: string; from?: string; to?: string };
}) {
  // Only Management & Owner may edit/delete attendance (logged); plain HR
  // users keep a read-only view.
  const profile = await requireProfile();
  const canManage = profile.role === "admin" || profile.role === "owner";
  return <AttendanceReport searchParams={searchParams} canManage={canManage} />;
}
