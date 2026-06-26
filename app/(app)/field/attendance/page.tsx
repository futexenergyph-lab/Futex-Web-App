import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { AttendanceForm } from "@/components/field/attendance-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Attendance } from "@/lib/types";

export const metadata = { title: "Time In / Out" };
export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const profile = await requireRole(["field_officer", "installer"]);
  const supabase = createClient();
  const { data: records } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", profile.id)
    .order("timestamp", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader title="Time In / Out" description="Capture photo proof to clock in or out." />
      <Card>
        <CardContent className="pt-6">
          <AttendanceForm userId={profile.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(records as Attendance[] | null)?.length ? (
            (records as Attendance[]).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <Badge variant={r.type === "time_in" ? "accent" : "secondary"}>
                  {r.type === "time_in" ? "Time In" : "Time Out"}
                </Badge>
                <span className="text-muted-foreground">
                  {formatDateTime(r.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
