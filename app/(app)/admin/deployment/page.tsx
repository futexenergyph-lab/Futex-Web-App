import { fetchBookings, fetchStaff } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { DeployDialog } from "@/components/admin/deploy-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Deployment" };
export const dynamic = "force-dynamic";

export default async function DeploymentPage() {
  const [bookings, staff] = await Promise.all([fetchBookings(), fetchStaff()]);

  // Anything not yet completed/paid/closed is deployable.
  const active = bookings.filter(
    (b) => !["completed", "paid", "closed"].includes(b.status),
  );

  return (
    <div>
      <PageHeader
        title="Deployment"
        description="Assign a field officer + installer and set the schedule. The officer sees it instantly on their dashboard."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Field Officer</TableHead>
                <TableHead>Installer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.client_name}</p>
                    <p className="text-xs text-muted-foreground">{b.address}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(b.preferred_date)}
                    {b.preferred_time ? ` · ${b.preferred_time}` : ""}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.preferred_package?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.assigned_field_officer?.full_name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.assigned_installer?.full_name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DeployDialog booking={b} staff={staff} />
                  </TableCell>
                </TableRow>
              ))}
              {active.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No active bookings to deploy.
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
