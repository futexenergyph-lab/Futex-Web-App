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
import { PhotoThumbs } from "@/components/hr/photo-thumbs";
import { AttendanceRowActions } from "@/components/hr/attendance-row-actions";
import { formatDateTime, phDay, phMinutes } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

interface AttRow {
  id: string;
  user_id: string;
  type: "time_in" | "time_out";
  timestamp: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  profiles: { full_name: string; role: UserRole } | null;
}

interface DaySummary {
  user: string;
  role: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  firstInId: string | null;
  lastOutId: string | null;
  allIds: string[];
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
  canManage = false,
}: {
  searchParams: { person?: string; from?: string; to?: string };
  /** Management & Owner may edit/delete records (logged to the audit trail). */
  canManage?: boolean;
}) {
  const supabase = createClient();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["field_officer", "installer"])
    .order("full_name");

  let query = supabase
    .from("attendance")
    .select(
      "id, user_id, type, timestamp, photo_url, lat, lng, profiles(full_name, role)",
    )
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

  // Group by user+day (day evaluated in Philippine time, UTC+8).
  const groups = new Map<string, AttRow[]>();
  for (const r of rows) {
    const day = phDay(r.timestamp);
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
    const firstInId = ins[0]?.id ?? null;
    const lastOutId = outs[outs.length - 1]?.id ?? null;
    let hours = 0;
    if (firstIn && lastOut) {
      hours =
        (new Date(lastOut).getTime() - new Date(firstIn).getTime()) /
        3_600_000;
    }
    // Late if first time-in after 9:15 AM PHT (morning baseline).
    let late = false;
    if (firstIn) {
      const mins = phMinutes(firstIn);
      late = mins > 9 * 60 + 15 && mins < 12 * 60;
    }
    summaries.push({
      user: recs[0].profiles?.full_name ?? "—",
      role: recs[0].profiles ? ROLE_LABELS[recs[0].profiles.role] : "—",
      date,
      firstIn,
      lastOut,
      firstInId,
      lastOutId,
      allIds: recs.map((r) => r.id),
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

  // Per-punch location + time log (most recent first).
  const punches = [...rows]
    .reverse()
    .map((r) => ({
      id: r.id,
      user: r.profiles?.full_name ?? "—",
      type: r.type,
      timestamp: r.timestamp,
      lat: r.lat,
      lng: r.lng,
      photo: signedFor.get(r.id) ?? null,
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
                {canManage && <TableHead className="text-right">Actions</TableHead>}
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
                    <PhotoThumbs
                      photos={s.photos.slice(0, 3).map((src) => ({ src }))}
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <AttendanceRowActions
                        name={s.user}
                        date={s.date}
                        firstInId={s.firstInId}
                        firstIn={s.firstIn}
                        lastOutId={s.lastOutId}
                        lastOut={s.lastOut}
                        allIds={s.allIds}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {summaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    No attendance records for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location &amp; time log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each punch with its captured GPS location and Philippine time
            (UTC+8). Tap a photo to enlarge.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time (PHT)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Photo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punches.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.user}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.type === "time_in" ? "accent" : "secondary"}
                    >
                      {p.type === "time_in" ? "Time In" : "Time Out"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(p.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.lat != null && p.lng != null ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No GPS</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PhotoThumbs photos={p.photo ? [{ src: p.photo }] : []} />
                  </TableCell>
                </TableRow>
              ))}
              {punches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No punches for this filter.
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
