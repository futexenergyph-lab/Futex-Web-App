import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ArrivalButton, UpdateForm } from "@/components/field/onsite-forms";
import {
  DeploymentConfirm,
  InstallationDoneButton,
} from "@/components/field/installer-actions";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { BookingWithRelations, JobUpdate } from "@/lib/types";

export function InstallerBookingView({
  booking: b,
  updates,
  userId,
  userName,
}: {
  booking: BookingWithRelations;
  updates: JobUpdate[];
  userId: string;
  userName?: string;
}) {
  const confirmed = !!b.installer_confirmed_at;
  const declined = !!b.installer_declined_at;
  const done = !!b.installer_done_at;
  const arrived = !!b.installer_arrived_at || done;
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

      {/* Deployment details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
          {b.preferred_date && (
            <p className="text-muted-foreground">
              Scheduled: {formatDate(b.preferred_date)}
              {b.preferred_time ? ` · ${b.preferred_time}` : ""}
            </p>
          )}
          {b.preferred_package && (
            <p className="text-muted-foreground">
              Package: {b.preferred_package.name}
            </p>
          )}
          {b.notes && (
            <div className="rounded-md border bg-secondary/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Booking notes
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{b.notes}</p>
            </div>
          )}
          {confirmed && !done && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Deployment accepted
              </Badge>
              {arrived && (
                <Badge variant="accent" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You arrived on site
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1: confirm deployment */}
      {!confirmed && !done && (
        <>
          {declined && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              You declined this deployment. You can still accept it below.
            </p>
          )}
          <DeploymentConfirm bookingId={b.id} />
        </>
      )}

      {/* Step 2: arrival (after accepting) */}
      {confirmed && !arrived && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm text-muted-foreground">
              When you reach the client, mark your arrival.
            </p>
            <ArrivalButton bookingId={b.id} />
          </CardContent>
        </Card>
      )}

      {/* Completed banner */}
      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-futex-green/40 bg-accent/10 p-4 text-sm font-medium text-accent-foreground">
          <CheckCircle2 className="h-5 w-5 text-futex-green" />
          You marked your installation done on{" "}
          {formatDateTime(b.installer_done_at)}. The field officer finalizes the
          job.
        </div>
      )}

      {/* On-site updates (once accepted) */}
      {confirmed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-site updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!done && (
              <UpdateForm
                bookingId={b.id}
                userId={userId}
                stampName={userName}
              />
            )}
            <div className="space-y-2">
              {updates.map((u) => (
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
              {updates.length === 0 && (
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: installation done */}
      {confirmed && !done && arrived && (
        <InstallationDoneButton bookingId={b.id} />
      )}
    </div>
  );
}
