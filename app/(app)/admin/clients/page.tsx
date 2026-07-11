import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClientMasterList,
  type ClientRow,
} from "@/components/admin/client-master-list";
import { fetchBookingDocumentationPhotos } from "@/lib/booking-photos";
import type { ClientPayment } from "@/components/admin/payment-joborder-dialog";
import {
  PAYMENT_METHOD_LABELS,
  type BookingStatus,
  type JobWork,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/types";

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
  preferred_time: string | null;
  preferred_package_id: string | null;
  preferred_enclosure_id: string | null;
  enclosure_protection_notes: string | null;
  notes: string | null;
  packages: { name: string } | null;
  assigned_field_officer: { full_name: string } | null;
  assigned_installer: { full_name: string } | null;
}

interface PayRow {
  booking_id: string;
  amount: number | string;
  method: PaymentMethod;
  status: PaymentStatus;
  splits: { method: PaymentMethod; amount: number }[] | null;
  paid_at: string | null;
}

interface JoRow {
  booking_id: string;
  package_id: string | null;
  enclosure_id: string | null;
  add_separate_enclosure: boolean;
  additional_wire_meters: number;
  additional_job_works: JobWork[] | null;
  final_total: number | string;
}

export default async function ClientMasterListPage() {
  const me = await requireRole(["admin", "admin_staff"]);
  const canManage = me.role === "admin" || me.role === "owner";
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, client_number, client_name, email, contact_number, address, status,
       source, created_at, preferred_date, preferred_time,
       preferred_package_id, preferred_enclosure_id, enclosure_protection_notes, notes,
       packages:packages!bookings_preferred_package_id_fkey(name),
       assigned_field_officer:profiles!bookings_assigned_field_officer_id_fkey(full_name),
       assigned_installer:profiles!bookings_assigned_installer_id_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  // Payment total (+ linked job order) per client, and the package/enclosure
  // option lists used by the admin edit dialog.
  const [{ data: pkgs }, { data: encs }, { data: pays }, { data: jos }] =
    await Promise.all([
      supabase.from("packages").select("id, name").order("sort_order"),
      supabase.from("enclosures").select("id, name").order("sort_order"),
      supabase
        .from("payments")
        .select("booking_id, amount, method, status, splits, paid_at, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("job_orders")
        .select(
          "booking_id, package_id, enclosure_id, add_separate_enclosure, additional_wire_meters, additional_job_works, final_total, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

  const pkgName = new Map(
    ((pkgs as { id: string; name: string }[] | null) ?? []).map((p) => [
      p.id,
      p.name,
    ]),
  );
  const encName = new Map(
    ((encs as { id: string; name: string }[] | null) ?? []).map((e) => [
      e.id,
      e.name,
    ]),
  );

  const paysByBooking = new Map<string, PayRow[]>();
  for (const p of (pays as unknown as PayRow[] | null) ?? [])
    (paysByBooking.get(p.booking_id) ??
      paysByBooking.set(p.booking_id, []).get(p.booking_id)!).push(p);

  // Latest job order per booking (list is ordered newest-first).
  const joByBooking = new Map<string, JoRow>();
  for (const j of (jos as unknown as JoRow[] | null) ?? [])
    if (!joByBooking.has(j.booking_id)) joByBooking.set(j.booking_id, j);

  function buildPayment(bookingId: string): ClientPayment | null {
    const list = paysByBooking.get(bookingId) ?? [];
    const jo = joByBooking.get(bookingId);
    if (list.length === 0 && !jo) return null;

    const confirmed = list.filter((p) => p.status === "confirmed");
    const relevant = confirmed.length ? confirmed : list;
    const total = relevant.reduce((t, p) => t + Number(p.amount || 0), 0);
    const status: PaymentStatus | null = list.length
      ? confirmed.length
        ? "confirmed"
        : list[0].status
      : null;
    const methods: string[] = [];
    for (const p of relevant) {
      const splits = Array.isArray(p.splits) ? p.splits : null;
      if (splits && splits.length)
        methods.push(...splits.map((s) => PAYMENT_METHOD_LABELS[s.method]));
      else methods.push(PAYMENT_METHOD_LABELS[p.method]);
    }
    const paidAt = relevant.find((p) => p.paid_at)?.paid_at ?? null;

    return {
      total,
      status,
      methods: [...new Set(methods)],
      paidAt,
      jobOrder: jo
        ? {
            finalTotal: Number(jo.final_total || 0),
            packageName: jo.package_id
              ? (pkgName.get(jo.package_id) ?? null)
              : null,
            enclosureName:
              jo.add_separate_enclosure && jo.enclosure_id
                ? (encName.get(jo.enclosure_id) ?? null)
                : null,
            wireMeters: Number(jo.additional_wire_meters || 0),
            works: jo.additional_job_works ?? [],
          }
        : null,
    };
  }

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
    preferred_time: r.preferred_time,
    preferred_package_id: r.preferred_package_id,
    preferred_enclosure_id: r.preferred_enclosure_id,
    enclosure_protection_notes: r.enclosure_protection_notes,
    notes: r.notes,
    payment: buildPayment(r.id),
    documents: docsByBooking.get(r.id) ?? [],
    documentation: docPhotosByBooking.get(r.id) ?? [],
  }));

  const pkgOptions = (pkgs as { id: string; name: string }[] | null) ?? [];
  const encOptions = (encs as { id: string; name: string }[] | null) ?? [];

  return (
    <div>
      <PageHeader
        title="Client Master List"
        description="All client records from submissions and manual bookings. Search, filter, sort, and export."
      />
      <Card>
        <CardContent className="pt-6">
          <ClientMasterList
            clients={clients}
            canManage={canManage}
            showPayment
            packages={pkgOptions}
            enclosures={encOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
