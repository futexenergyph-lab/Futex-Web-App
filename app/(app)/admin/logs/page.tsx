import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RedoLogButton } from "@/components/admin/redo-log-button";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Logs" };
export const dynamic = "force-dynamic";

interface LogRow {
  id: string;
  table_name: string;
  action: string;
  label: string | null;
  actor_name: string | null;
  undone_at: string | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  payments: "Payment",
  expenses: "Expense",
  bookings: "Booking / Client",
};

export default async function LogsPage() {
  // Owner-only audit log.
  await requireRole(["owner"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, table_name, action, label, actor_name, undone_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const logs = (data as LogRow[] | null) ?? [];

  return (
    <div>
      <PageHeader
        title="Logs"
        description="Every edit and deletion by management and owner. Press Redo to restore a record or revert a change."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Redo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className={l.undone_at ? "opacity-60" : ""}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(l.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={l.action === "delete" ? "destructive" : "secondary"}
                    >
                      {l.action === "delete" ? "Deleted" : "Edited"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">
                      {TABLE_LABELS[l.table_name] ?? l.table_name}:
                    </span>{" "}
                    {l.label ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{l.actor_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <RedoLogButton logId={l.id} done={!!l.undone_at} />
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No edits or deletions logged yet.
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
