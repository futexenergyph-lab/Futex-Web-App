import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoThumbs } from "@/components/hr/photo-thumbs";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { formatDateTime, resolveDateRange } from "@/lib/utils";
import { Clock, Camera } from "lucide-react";

export const metadata = { title: "Live Status" };
export const dynamic = "force-dynamic";

export default async function LiveStatusPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const range = resolveDateRange(searchParams);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let updatesQuery = supabase
    .from("job_updates")
    .select(
      "id, message, photo_urls, created_at, profiles(full_name), bookings(client_name)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (range.fromISO) updatesQuery = updatesQuery.gte("created_at", range.fromISO);
  if (range.toISO) updatesQuery = updatesQuery.lt("created_at", range.toISO);

  const [{ data: attendance }, { data: updates }] = await Promise.all([
    supabase
      .from("attendance")
      .select("id, type, timestamp, user_id, profiles(full_name)")
      .gte("timestamp", todayStart.toISOString())
      .order("timestamp", { ascending: false }),
    updatesQuery,
  ]);

  // Sign the first photo of each update for preview.
  const signedUpdates = await Promise.all(
    (updates ?? []).map(async (u) => {
      const paths = (u.photo_urls as string[]) ?? [];
      const signed: string[] = [];
      for (const p of paths.slice(0, 3)) {
        const { data } = await supabase.storage
          .from("job-updates")
          .createSignedUrl(p, 3600);
        if (data?.signedUrl) signed.push(data.signedUrl);
      }
      return { ...u, signed };
    }),
  );

  // Derive "currently timed in" = users whose latest punch today is time_in.
  const latestByUser = new Map<string, { type: string; name: string; ts: string }>();
  for (const a of attendance ?? []) {
    if (!latestByUser.has(a.user_id)) {
      latestByUser.set(a.user_id, {
        type: a.type,
        name: (a.profiles as { full_name?: string } | null)?.full_name ?? "—",
        ts: a.timestamp,
      });
    }
  }
  const timedIn = [...latestByUser.values()].filter((v) => v.type === "time_in");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Status"
        description="Who has timed in today and the latest on-site updates."
      >
        <DateRangeFilter />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Currently timed in ({timedIn.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timedIn.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is timed in yet today.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {timedIn.map((v, i) => (
                <Badge key={i} variant="accent" className="gap-1">
                  {v.name} · {formatDateTime(v.ts)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Latest on-site updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {signedUpdates.length === 0 && (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          )}
          {signedUpdates.map((u) => (
            <div key={u.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {(u.bookings as { client_name?: string } | null)?.client_name ?? "Job"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(u.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                by {(u.profiles as { full_name?: string } | null)?.full_name ?? "—"}
              </p>
              {u.message && <p className="mt-2 text-sm">{u.message}</p>}
              {u.signed.length > 0 && (
                <div className="mt-3">
                  <PhotoThumbs
                    photos={u.signed.map((src) => ({ src, alt: "Site update" }))}
                    className="h-24 w-24"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
