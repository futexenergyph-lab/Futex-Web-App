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
import {
  ArrivalButton,
  DocumentationForm,
  PaymentForm,
  UpdateForm,
} from "@/components/field/onsite-forms";
import { InstallerBookingView } from "@/components/field/installer-booking-view";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  BookingWithRelations,
  Enclosure,
  JobOrder,
  JobUpdate,
  Package,
  Payment,
} from "@/lib/types";

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
      .select("storage_path")
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
  const commDoc = (commissioning as { storage_path: string } | null) ?? null;

  // "Done installation" gating: every module must be complete.
  const docsOk = ((documentation as { file_urls: string[] }[] | null) ?? []).some(
    (d) => (d.file_urls ?? []).length > 0,
  );
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
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`;

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
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment confirmation</CardTitle>
            </CardHeader>
            <CardContent>
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
