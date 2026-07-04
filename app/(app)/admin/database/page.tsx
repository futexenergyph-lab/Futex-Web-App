import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayExport } from "@/components/admin/day-export";
import { CustomDayExport } from "@/components/admin/custom-day-export";
import { phDay, formatDate } from "@/lib/utils";

export const metadata = { title: "Database" };
export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  await requireRole(["admin", "admin_staff"]);

  // Generate the last 90 calendar days (Philippine time).
  const todayStr = phDay(new Date().toISOString());
  const base = new Date(`${todayStr}T00:00:00+08:00`);
  const days: string[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(phDay(d.toISOString()));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database"
        description="Download every module's records for a given day as a PDF, plus all that day's photos as a ZIP."
      />

      <Card>
        <CardHeader>
          <CardTitle>Any date</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomDayExport today={todayStr} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily exports</CardTitle>
          <p className="text-sm text-muted-foreground">
            The PDF includes bookings, payments, expenses, retail purchases,
            quotations, job orders, attendance and announcements for that day.
            The ZIP contains on-site, documentation, payment-proof and
            attendance photos.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {days.map((day) => (
              <li
                key={day}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm font-medium">{formatDate(day)}</span>
                <DayExport day={day} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
