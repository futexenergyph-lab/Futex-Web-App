import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

interface Announcement {
  id: string;
  message: string;
  created_by_name: string | null;
  created_at: string;
}

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  // RLS limits these to announcements addressed to this user.
  const { data: anns } = await supabase
    .from("announcements")
    .select("id, message, created_by_name, created_at")
    .order("created_at", { ascending: false });

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", profile.id);
  const readSet = new Set((reads ?? []).map((r) => r.announcement_id));

  const announcements = (anns ?? []) as Announcement[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Announcements released to you. New ones also prompt on screen until confirmed."
      />
      <Card>
        <CardContent className="divide-y p-0">
          {announcements.map((a) => {
            const unread = !readSet.has(a.id);
            return (
              <div
                key={a.id}
                className={`flex gap-3 p-4 ${unread ? "bg-primary/5" : ""}`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {a.created_by_name ?? "Management"}
                    </span>
                    {unread && <Badge variant="accent">New</Badge>}
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {a.message}
                  </p>
                </div>
              </div>
            );
          })}
          {announcements.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              No announcements yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
