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
}

export default async function ClientMasterListPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, client_number, client_name, email, contact_number, address, status,
       source, created_at, preferred_date,
       packages:packages!bookings_preferred_package_id_fkey(name)`,
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];
  const clients: ClientRow[] = rows.map((r) => ({
    id: r.id,
    client_number: r.client_number,
    client_name: r.client_name,
    email: r.email,
    contact_number: r.contact_number,
    address: r.address,
    package: r.packages?.name ?? null,
    status: r.status,
    source: r.source,
    created_at: r.created_at,
    preferred_date: r.preferred_date,
  }));

  return (
    <div>
      <PageHeader
        title="Client Master List"
        description="All client records from submissions and manual bookings. Search, filter, sort, and export."
      />
      <Card>
        <CardContent className="pt-6">
          <ClientMasterList clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
