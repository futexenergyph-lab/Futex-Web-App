import { requireRole } from "@/lib/auth";
import { AttendanceReport } from "@/components/hr/attendance-report";

export const metadata = { title: "HR" };
export const dynamic = "force-dynamic";

export default async function HRPage({
  searchParams,
}: {
  searchParams: { person?: string; from?: string; to?: string };
}) {
  // Management/Owner only — the limited Admin role cannot view HR.
  await requireRole(["admin"]);
  return <AttendanceReport searchParams={searchParams} canManage />;
}
