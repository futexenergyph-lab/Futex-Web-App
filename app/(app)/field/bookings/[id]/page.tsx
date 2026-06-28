import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Navigation } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { BOOKING_SELECT } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { JobOrderForm } from "@/components/field/job-order-form";
import { CommissioningForm } from "@/components/field/commissioning-form";
import { DoneInstallationButton } from "@/components/field/done-installation-button";
import { AcknowledgementForm } from "@/components/field/acknowledgement-form";
import { BackJobOrderNote } from "@/components/field/back-job-order-note";
import { DoneBackJobOrderButton } from "@/components/field/done-back-job-order-button";
import {
  ArrivalButton,
  DocumentationForm,
  PaymentForm,
  UpdateForm,
} from "@/components/field/onsite-forms";
import { InstallerBookingView } from "@/components/field/installer-booking-view";
import { FREE_WIRE_METERS } from "@/lib/pricing";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type BookingWithRelations,
  type Enclosure,
  type JobOrder,
  type JobUpdate,
  type Package,
  type Payment,
} from "@/lib/types";
import type { AckParticular } from "@/lib/acknowledgement-pdf";

export const dynamic = "force-dynamic";

export default async function FieldBookingDetail({
  params,
}: {
  params: { id: string };
}) {
  const profile = await requireRole(["field_officer", "installer"]);
  const supabase = createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", params.id)
    .single();

  if (!booking) notFound();
  const b = booking as unknown as BookingWithRelations;

  // Installers get a simplified flow: confirm deployment, arrival, on-site
  // updates, and "Installation Done" — no job order / payment / docs.
  if (profile.role === "installer") {
    const { data: updates } = await supabase
      .from("job_updates")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false });
    return (
      <InstallerBookingView
        booking={b}
        updates={(updates as JobUpdate[]) ?? []}
        userId={profile.id}
      />
    );
  }

  const [
    { data: packages },
    { data: enclosures },
    { data: wireSetting },
    { data: jobOrder },
    { data: payment },
    { data: updates },
    { data: commissioning },
    { data: documentation },
  ] = await Promise.all([
    supabase.from("packages").select("*").eq("active", true).order("sort_order"),
    supabase.from("enclosures").select("*").eq("active", true).order("sort_order"),
    supabase.from("settings").select("value").eq("key", "wire_rate_per_meter").single(),
    supabase
      .from("job_orders")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_updates")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("booking_documents")
      .select("storage_path, title")
      .eq("booking_id", params.id)
      .eq("kind", "commissioning")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("documentation")
      .select("file_urls")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const wireRate = Number(wireSetting?.value ?? 200);
  const jo = (jobOrder as JobOrder | null) ?? null;
  const pay = (payment as Payment | null) ?? null;
  const commDoc =
    (commissioning as { storage_path: string; title: string } | null) ?? null;
  const docRows = (documentation as { file_urls: string[] }[] | null) ?? [];

  // "Done installation" gating: every module must be complete.
  const docsOk = docRows.some((d) => (d.file_urls ?? []).length > 0);
  const doneModules = [
    { label: "Job Order submitted", ok: !!jo },
    { label: "Commissioning checklist filed", ok: !!commDoc },
    { label: "Payment confirmed by management", ok: pay?.status === "confirmed" },
    { label: "Documentation uploaded", ok: docsOk },
  ];
  const alreadyCompleted = b.status === "completed" || b.status === "closed";
  let commDownloadUrl: string | null = null;
  if (commDoc) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(commDoc.storage_path, 3600);
    commDownloadUrl = signed?.signedUrl ?? null;
  }

  // ---- Acknowledgement Receipt (Payment tab, after confirmed payment) ----
  // Build receipt particulars from the locked job order.
  const ackParticulars: AckParticular[] = [];
  if (jo) {
    const pkg = ((packages as Package[]) ?? []).find(
      (p) => p.id === jo.package_id,
    );
    const enc = ((enclosures as Enclosure[]) ?? []).find(
      (e) => e.id === jo.enclosure_id,
    );
    if (pkg)
      ackParticulars.push({ label: pkg.name, unitPrice: pkg.base_price });
    if (jo.add_separate_enclosure && enc)
      ackParticulars.push({ label: enc.name, unitPrice: enc.price });
    const chargeableMeters = Math.max(
      0,
      (jo.additional_wire_meters ?? 0) - FREE_WIRE_METERS,
    );
    if (chargeableMeters > 0)
      ackParticulars.push({
        label: `Additional wire (${jo.additional_wire_meters}m total, ${chargeableMeters}m charged)`,
        unitPrice: chargeableMeters * (jo.wire_rate_per_meter ?? wireRate),
      });
    for (const w of jo.additional_job_works ?? [])
      ackParticulars.push({
        label: w.description || "Additional job work",
        unitPrice: w.amount,
      });
  }
  const ackMop = pay ? PAYMENT_METHOD_LABELS[pay.method].toUpperCase() : "";
  const ackDate = new Date(pay?.paid_at ?? Date.now())
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    })
    .toUpperCase();
  const ackDone = !!commDoc?.title?.includes("Acknowledgement");
  // One documentation photo (full quality) to embed in the receipt.
  let ackPhotoUrl: string | null = null;
  const firstPhotoPath = docRows
    .flatMap((d) => d.file_urls ?? [])
    .find(Boolean);
  if (firstPhotoPath) {
    const { data: signed } = await supabase.storage
      .from("documentation")
      .createSignedUrl(firstPhotoPath, 3600);
    ackPhotoUrl = signed?.signedUrl ?? null;
  }

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`;
  const updatesList = (updates as JobUpdate[] | null) ?? [];

  // ===== Back Job Order (after-sales support ticket) — simplified flow =====
  if (b.is_back_job_order) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href="/field"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my jobs
        </Link>

        <PageHeader title={b.client_name}>
          <div className="flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              BACK JOB
            </span>
            <StatusBadge status={b.status} />
          </div>
        </PageHeader>

        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 hover:text-primary"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{b.address}</span>
              <Navigation className="h-4 w-4 text-primary" />
            </a>
            <a
              href={`tel:${b.contact_number}`}
              className="flex items-center gap-2 hover:text-primary"
            >
              <Phone className="h-4 w-4" /> {b.contact_number}
            </a>
            {b.preferred_date && (
              <p className="text-muted-foreground">
                Scheduled: {formatDate(b.preferred_date)}
                {b.preferred_time ? ` · ${b.preferred_time}` : ""}
              </p>
            )}
            {b.notes && (
              <div className="rounded-md border bg-secondary/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Support requested
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{b.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="updates">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="joborder">Job Order</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="updates">
            <Card>
              <CardHeader>
                <CardTitle>On-site updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UpdateForm bookingId={b.id} userId={profile.id} />
                <div className="space-y-2">
                  {updatesList.map((u) => (
                    <div key={u.id} className="rounded-md border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(u.created_at)}
                      </p>
                      {u.message && <p className="mt-1">{u.message}</p>}
                      {u.photo_urls.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {u.photo_urls.length} photo(s) attached
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="joborder">
            <Card>
              <CardHeader>
                <CardTitle>Job Order</CardTitle>
              </CardHeader>
              <CardContent>
                <BackJobOrderNote
                  bookingId={b.id}
                  initial={b.back_job_field_note ?? ""}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment (optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Only if the client pays for this support. Enter the amount and
                  details — management confirms it before it reflects in
                  accounting.
                </p>
                <PaymentForm
                  bookingId={b.id}
                  jobOrder={null}
                  userId={profile.id}
                  existingStatus={pay?.status ?? null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <DocumentationForm bookingId={b.id} userId={profile.id} />
                <div className="border-t pt-5">
                  <DoneBackJobOrderButton
                    bookingId={b.id}
                    docsReady={docsOk}
                    completed={alreadyCompleted}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/field"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my jobs
      </Link>

      <PageHeader title={b.client_name}>
        <StatusBadge status={b.status} />
      </PageHeader>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 hover:text-primary"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{b.address}</span>
            <Navigation className="h-4 w-4 text-primary" />
          </a>
          <a
            href={`tel:${b.contact_number}`}
            className="flex items-center gap-2 hover:text-primary"
          >
            <Phone className="h-4 w-4" /> {b.contact_number}
          </a>
          {b.preferred_date && (
            <p className="text-muted-foreground">
              Scheduled: {formatDate(b.preferred_date)}
              {b.preferred_time ? ` · ${b.preferred_time}` : ""}
            </p>
          )}
          {b.preferred_package && (
            <p className="text-muted-foreground">
              Preferred package: {b.preferred_package.name}
            </p>
          )}
          {b.status === "deployed" && (
            <div className="pt-2">
              <ArrivalButton bookingId={b.id} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="updates">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="joborder">Job Order</TabsTrigger>
          <TabsTrigger value="commissioning">Commissioning</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>On-site updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UpdateForm bookingId={b.id} userId={profile.id} />
              <div className="space-y-2">
                {(updates as JobUpdate[] | null)?.map((u) => (
                  <div key={u.id} className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(u.created_at)}
                    </p>
                    {u.message && <p className="mt-1">{u.message}</p>}
                    {u.photo_urls.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {u.photo_urls.length} photo(s) attached
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="joborder">
          <Card>
            <CardHeader>
              <CardTitle>Job Order</CardTitle>
            </CardHeader>
            <CardContent>
              <JobOrderForm
                bookingId={b.id}
                packages={(packages as Package[]) ?? []}
                enclosures={(enclosures as Enclosure[]) ?? []}
                wireRate={wireRate}
                existing={jo}
                defaults={{
                  packageId: b.preferred_package_id,
                  enclosureId: b.preferred_enclosure_id,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissioning">
          <Card>
            <CardHeader>
              <CardTitle>Commissioning checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <CommissioningForm
                bookingId={b.id}
                prefill={{
                  client_name: b.client_name,
                  site_address: b.address,
                  contact_person: b.contact_number,
                }}
                completed={!!commDoc}
                downloadUrl={commDownloadUrl}
                receivedByDefault={profile.full_name}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!jo ? (
                <p className="text-sm text-muted-foreground">
                  Submit the job order first to confirm payment.
                </p>
              ) : (
                <PaymentForm
                  bookingId={b.id}
                  jobOrder={jo}
                  userId={profile.id}
                  existingStatus={pay?.status ?? null}
                />
              )}
              {jo && pay?.status === "confirmed" && (
                <div className="border-t pt-5">
                  <AcknowledgementForm
                    bookingId={b.id}
                    customer={{
                      name: b.client_name,
                      address: b.address,
                      contact: b.contact_number,
                    }}
                    particulars={ackParticulars}
                    totalAmount={jo.final_total}
                    mop={ackMop}
                    date={ackDate}
                    fieldOfficerName={profile.full_name}
                    commissioningUrl={commDownloadUrl}
                    documentationPhotoUrl={ackPhotoUrl}
                    alreadyDone={ackDone}
                    downloadUrl={commDownloadUrl}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Post-installation documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <DocumentationForm bookingId={b.id} userId={profile.id} />
              <div className="border-t pt-5">
                <DoneInstallationButton
                  bookingId={b.id}
                  modules={doneModules}
                  completed={alreadyCompleted}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
