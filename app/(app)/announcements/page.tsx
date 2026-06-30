import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnnouncementComposer } from "@/components/admin/announcement-composer";
import { DeleteAnnouncementButton } from "@/components/admin/delete-announcement-button";
import { formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

interface Announcement {
  id: string;
  message: string;
  audience: "all" | "specific";
  created_by_name: string | null;
  created_at: string;
}

export default async function AnnouncementsPage() {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();

  const [{ data: users }, { data: anns }, { data: targets }, { data: reads }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("active", true)
        .order("full_name"),
      supabase
        .from("announcements")
        .select("id, message, audience, created_by_name, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("announcement_targets").select("announcement_id"),
      supabase.from("announcement_reads").select("announcement_id"),
    ]);

  const userOptions = (users ?? []) as {
    id: string;
    full_name: string;
    role: UserRole;
  }[];
  const totalUsers = userOptions.length;

  const targetCount = new Map<string, number>();
  for (const t of targets ?? [])
    targetCount.set(
      t.announcement_id,
      (targetCount.get(t.announcement_id) ?? 0) + 1,
    );
  const readCount = new Map<string, number>();
  for (const r of reads ?? [])
    readCount.set(
      r.announcement_id,
      (readCount.get(r.announcement_id) ?? 0) + 1,
    );

  const announcements = (anns ?? []) as Announcement[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast a message to all users or selected individuals. Each recipient is prompted to confirm they have read it."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <AnnouncementComposer users={userOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Released announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((a) => {
              const recipients =
                a.audience === "all"
                  ? totalUsers
                  : (targetCount.get(a.id) ?? 0);
              const seen = readCount.get(a.id) ?? 0;
              return (
                <div
                  key={a.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Badge variant={a.audience === "all" ? "accent" : "secondary"}>
                      {a.audience === "all"
                        ? "All users"
                        : `${recipients} user${recipients === 1 ? "" : "s"}`}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Read {seen}/{recipients}
                      </span>
                      <DeleteAnnouncementButton id={a.id} />
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{a.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.created_by_name ?? "Management"} ·{" "}
                    {formatDateTime(a.created_at)}
                  </p>
                </div>
              );
            })}
            {announcements.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No announcements released yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
