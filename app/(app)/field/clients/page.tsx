import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClientMasterList,
  type ClientRow,
} from "@/components/admin/client-master-list";
import type { BookingStatus } from "@/lib/types";

export const metadata = { title: "Client Master List" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  client_number: string | null;
  client_name: string;
  email: string | null;
  contact_number: string;
  address: string;
  status: BookingStatus;
  source: string;
  created_at: string;
  preferred_date: string | null;
  packages: { name: string } | null;
  assigned_field_officer: { full_name: string } | null;
  assigned_installer: { full_name: string } | null;
}

export default async function FieldClientMasterListPage() {
  const profile = await requireRole(["field_officer"]);
  const supabase = createClient();

  // Only this field officer's completed installations.
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, client_number, client_name, email, contact_number, address, status,
       source, created_at, preferred_date,
       packages:packages!bookings_preferred_package_id_fkey(name),
       assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(full_name),
       assigned_installer:profiles!bookings_assigned_installer_id_fkey(full_name)`,
    )
    .eq("assigned_field_officer_id", profile.id)
    .in("status", ["completed", "closed"])
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];
  const bookingIds = rows.map((r) => r.id);

  // Commissioning / warranty documents per booking with signed URLs.
  const docsByBooking = new Map<string, { title: string; url: string }[]>();
  // Post-installation documentation photos per booking.
  const docPhotosByBooking = new Map<
    string,
    { url: string; downloadUrl: string; name: string }[]
  >();

  if (bookingIds.length > 0) {
    const { data: docs } = await supabase
      .from("booking_documents")
      .select("booking_id, title, storage_path, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });
    for (const d of (docs as
      | { booking_id: string; title: string; storage_path: string }[]
      | null) ?? []) {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 3600);
      if (!signed?.signedUrl) continue;
      const list = docsByBooking.get(d.booking_id) ?? [];
      list.push({ title: d.title, url: signed.signedUrl });
      docsByBooking.set(d.booking_id, list);
    }

    const { data: docRows } = await supabase
      .from("documentation")
      .select("booking_id, file_urls, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });
    for (const row of (docRows as
      | { booking_id: string; file_urls: string[] }[]
      | null) ?? []) {
      const list = docPhotosByBooking.get(row.booking_id) ?? [];
      for (const path of row.file_urls ?? []) {
        const name = path.split("/").pop() ?? "photo";
        const [{ data: inline }, { data: dl }] = await Promise.all([
          supabase.storage.from("documentation").createSignedUrl(path, 3600),
          supabase.storage
            .from("documentation")
            .createSignedUrl(path, 3600, { download: name }),
        ]);
        if (!inline?.signedUrl) continue;
        list.push({
          url: inline.signedUrl,
          downloadUrl: dl?.signedUrl ?? inline.signedUrl,
          name,
        });
      }
      docPhotosByBooking.set(row.booking_id, list);
    }
  }

  const clients: ClientRow[] = rows.map((r) => ({
    id: r.id,
    client_number: r.client_number,
    client_name: r.client_name,
    email: r.email,
    contact_number: r.contact_number,
    address: r.address,
    package: r.packages?.name ?? null,
    field_officer: r.assigned_field_officer?.full_name ?? null,
    installer: r.assigned_installer?.full_name ?? null,
    status: r.status,
    source: r.source,
    created_at: r.created_at,
    preferred_date: r.preferred_date,
    documents: docsByBooking.get(r.id) ?? [],
    documentation: docPhotosByBooking.get(r.id) ?? [],
  }));

  return (
    <div>
      <PageHeader
        title="Client Master List"
        description="Your completed installations. Search, filter, and sort your clients."
      />
      <Card>
        <CardContent className="pt-6">
          <ClientMasterList clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
