import { AttendanceReport } from "@/components/hr/attendance-report";

export const metadata = { title: "HR" };
export const dynamic = "force-dynamic";

export default async function HRDashboardPage({
  searchParams,
}: {
  searchParams: { person?: string; from?: string; to?: string };
}) {
  return <AttendanceReport searchParams={searchParams} />;
}
