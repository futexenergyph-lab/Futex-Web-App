import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentationViewer } from "@/components/admin/documentation-viewer";
import { fetchBookingDocumentationPhotos } from "@/lib/booking-photos";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Client Master List" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  client_name: string;
  address: string;
  created_at: string;
}

export default async function InstallerMasterListPage() {
  const profile = await requireRole(["installer"]);
  const supabase = createClient();

  // Jobs this installer has marked done.
  const { data } = await supabase
    .from("bookings")
    .select("id, client_name, address, created_at")
    .eq("assigned_installer_id", profile.id)
    .not("installer_done_at", "is", null)
    .order("created_at", { ascending: false });

  const rows = (data as Row[] | null) ?? [];
  const photosByBooking = await fetchBookingDocumentationPhotos(
    supabase,
    rows.map((r) => r.id),
  );

  return (
    <div>
      <PageHeader
        title="Client Master List"
        description="Clients you have completed installations for."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Date submitted</TableHead>
                <TableHead>Documentation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                    <span className="line-clamp-2">{r.address}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <DocumentationViewer
                      photos={photosByBooking.get(r.id) ?? []}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No completed installations yet.
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
