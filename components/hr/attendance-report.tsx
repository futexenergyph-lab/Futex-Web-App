import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CsvExport } from "@/components/csv-export";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

interface AttRow {
  id: string;
  user_id: string;
  type: "time_in" | "time_out";
  timestamp: string;
  photo_url: string | null;
  profiles: { full_name: string; role: UserRole } | null;
}

interface DaySummary {
  user: string;
  role: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  hours: number;
  late: boolean;
  photos: string[];
}

/**
 * Attendance/HR report shared by the management dashboard (/admin/hr) and the
 * dedicated HR dashboard (/hr).
 */
export async function AttendanceReport({
  searchParams,
}: {
  searchParams: { person?: string; from?: string; to?: string };
}) {
  const supabase = createClient();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["field_officer", "installer"])
    .order("full_name");

  let query = supabase
    .from("attendance")
    .select("id, user_id, type, timestamp, photo_url, profiles(full_name, role)")
    .order("timestamp", { ascending: true });

  if (searchParams.person) query = query.eq("user_id", searchParams.person);
  if (searchParams.from)
    query = query.gte("timestamp", `${searchParams.from}T00:00:00`);
  if (searchParams.to)
    query = query.lte("timestamp", `${searchParams.to}T23:59:59`);

  const { data } = await query;
  const rows = (data as unknown as AttRow[]) ?? [];

  // Sign photos.
  const signedFor = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.photo_url)
      .map(async (r) => {
        const { data: s } = await supabase.storage
          .from("attendance")
          .createSignedUrl(r.photo_url!, 3600);
        if (s?.signedUrl) signedFor.set(r.id, s.signedUrl);
      }),
  );

  // Group by user+day.
  const groups = new Map<string, AttRow[]>();
  for (const r of rows) {
    const day = r.timestamp.slice(0, 10);
    const key = `${r.user_id}|${day}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }

  const summaries: DaySummary[] = [];
  for (const [key, recs] of groups) {
    const [, date] = key.split("|");
    const ins = recs.filter((r) => r.type === "time_in");
    const outs = recs.filter((r) => r.type === "time_out");
    const firstIn = ins[0]?.timestamp ?? null;
    const lastOut = outs[outs.length - 1]?.timestamp ?? null;
    let hours = 0;
    if (firstIn && lastOut) {
      hours =
        (new Date(lastOut).getTime() - new Date(firstIn).getTime()) /
        3_600_000;
    }
    // Late if first time-in after 9:15 AM (morning baseline).
    let late = false;
    if (firstIn) {
      const d = new Date(firstIn);
      const mins = d.getHours() * 60 + d.getMinutes();
      late = mins > 9 * 60 + 15 && mins < 12 * 60;
    }
    summaries.push({
      user: recs[0].profiles?.full_name ?? "—",
      role: recs[0].profiles ? ROLE_LABELS[recs[0].profiles.role] : "—",
      date,
      firstIn,
      lastOut,
      hours: Math.max(0, Math.round(hours * 10) / 10),
      late,
      photos: recs.map((r) => signedFor.get(r.id)).filter(Boolean) as string[],
    });
  }
  summaries.sort((a, b) => b.date.localeCompare(a.date));

  const csvRows = summaries.map((s) => ({
    name: s.user,
    role: s.role,
    date: s.date,
    time_in: s.firstIn ?? "",
    time_out: s.lastOut ?? "",
    hours: s.hours,
    late: s.late ? "yes" : "no",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR — Attendance"
        description="Time in/out records, hours worked, and late flags vs the 9 AM / 2 PM schedule."
      >
        <CsvExport rows={csvRows} filename="futex-attendance.csv" />
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="person">Person</Label>
              <select
                id="person"
                name="person"
                defaultValue={searchParams.person ?? ""}
                className="flex h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All staff</option>
                {(staff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={searchParams.from ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={searchParams.to ?? ""}
              />
            </div>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Photos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <p className="font-medium">{s.user}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </TableCell>
                  <TableCell className="text-sm">{s.date}</TableCell>
                  <TableCell className="text-sm">
                    {s.firstIn ? formatDateTime(s.firstIn) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.lastOut ? formatDateTime(s.lastOut) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{s.hours}h</TableCell>
                  <TableCell>
                    {s.late ? (
                      <Badge variant="destructive">Late</Badge>
                    ) : (
                      <Badge variant="accent">On time</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.photos.slice(0, 3).map((src, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={j}
                          src={src}
                          alt="Attendance"
                          className="h-10 w-10 rounded object-cover"
                        />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {summaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No attendance records for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
