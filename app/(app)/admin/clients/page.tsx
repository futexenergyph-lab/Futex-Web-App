import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClientMasterList,
  type ClientRow,
} from "@/components/admin/client-master-list";
import { fetchBookingDocumentationPhotos } from "@/lib/booking-photos";
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

export default async function ClientMasterListPage() {
  const me = await requireRole(["admin", "admin_staff"]);
  const canManage = me.role === "admin" || me.role === "owner";
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, client_number, client_name, email, contact_number, address, status,
       source, created_at, preferred_date,
       packages:packages!bookings_preferred_package_id_fkey(name),
       assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(full_name),
       assigned_installer:profiles!bookings_assigned_installer_id_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  // Documents per booking (commissioning PDFs) + documentation gallery photos,
  // fetched in parallel. Signed URLs are batched (createSignedUrls) so this
  // stays fast regardless of how many files exist.
  const [docsByBooking, docPhotosByBooking] = await Promise.all([
    (async () => {
      const map = new Map<string, { title: string; url: string }[]>();
      const { data: docs } = await supabase
        .from("booking_documents")
        .select("booking_id, title, storage_path, created_at")
        .order("created_at", { ascending: false });
      const list =
        (docs as
          | { booking_id: string; title: string; storage_path: string }[]
          | null) ?? [];
      const paths = [...new Set(list.map((d) => d.storage_path))];
      const signed = new Map<string, string>();
      for (let i = 0; i < paths.length; i += 100) {
        const { data: s } = await supabase.storage
          .from("documents")
          .createSignedUrls(paths.slice(i, i + 100), 3600);
        for (const x of s ?? [])
          if (x.signedUrl && x.path) signed.set(x.path, x.signedUrl);
      }
      for (const d of list) {
        const url = signed.get(d.storage_path);
        if (!url) continue;
        const l = map.get(d.booking_id) ?? [];
        l.push({ title: d.title, url });
        map.set(d.booking_id, l);
      }
      return map;
    })(),
    fetchBookingDocumentationPhotos(
      supabase,
      rows.map((r) => r.id),
    ),
  ]);

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
        description="All client records from submissions and manual bookings. Search, filter, sort, and export."
      />
      <Card>
        <CardContent className="pt-6">
          <ClientMasterList clients={clients} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
