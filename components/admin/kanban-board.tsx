"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  MapPin,
  User,
  Calendar,
  Loader2,
  Unlock,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  updateBookingStatus,
  approveJobOrderChange,
} from "@/app/(app)/admin/actions";
import { EditBookingDialog } from "@/components/admin/edit-booking-dialog";
import { DeployDialog } from "@/components/admin/deploy-dialog";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDate, php } from "@/lib/utils";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingWithRelations,
} from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

function BookingCard({
  booking,
  packages,
  enclosures,
  staff,
}: {
  booking: BookingWithRelations;
  packages: Option[];
  enclosures: Option[];
  staff: Staff[];
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [busy, setBusy] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
  });

  async function setStatus(status: BookingStatus, msg: string) {
    setBusy(true);
    const res = await updateBookingStatus(booking.id, status);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(msg);
      router.refresh();
    }
  }

  // A pending change request = a job order the officer asked to unlock that
  // management hasn't approved yet.
  const pending = (booking.job_orders ?? []).find(
    (jo) => jo.change_requested_at && !jo.change_approved_at,
  );

  async function approve() {
    if (!pending) return;
    setApproving(true);
    const res = await approveJobOrderChange({
      bookingId: booking.id,
      jobOrderId: pending.id,
    });
    setApproving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Change request approved");
      router.refresh();
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
        pending && "border-amber-400 ring-1 ring-amber-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{booking.client_name}</p>
        <div className="flex shrink-0 items-center gap-1">
          {booking.is_back_job_order && (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
              BACK JOB
            </span>
          )}
          {booking.source === "web" && (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              WEB
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="line-clamp-2">{booking.address}</span>
      </p>
      {booking.preferred_date && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(booking.preferred_date)}
          {booking.preferred_time ? ` · ${booking.preferred_time}` : ""}
        </p>
      )}
      {booking.preferred_package && (
        <p className="mt-1 text-xs font-medium text-futex-blue">
          {booking.preferred_package.name}
        </p>
      )}
      {booking.assigned_field_officer && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {booking.assigned_field_officer.full_name}
        </p>
      )}

      {pending && (
        // Keep clicks/drags here from starting a card drag.
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2"
        >
          <p className="text-[11px] font-semibold text-amber-800">
            Change requested · {php(pending.final_total)}
          </p>
          {pending.change_request_reason && (
            <p className="mt-0.5 text-[11px] text-amber-700">
              &ldquo;{pending.change_request_reason}&rdquo;
            </p>
          )}
          <button
            type="button"
            onClick={approve}
            disabled={approving}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {approving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
            Allow request
          </button>
        </div>
      )}

      {/* Management actions — stop pointer events from starting a card drag. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2"
      >
        <EditBookingDialog
          booking={booking}
          packages={packages}
          enclosures={enclosures}
        />
        {booking.status === "new" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("scheduled", "Booking accepted")}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="h-3 w-3" /> Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("declined", "Booking declined")}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <X className="h-3 w-3" /> Decline
            </button>
          </>
        )}
        {booking.status === "declined" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("new", "Booking restored")}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-60"
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
        )}
        {booking.status === "scheduled" && (
          <div className="ml-auto">
            <DeployDialog booking={booking} staff={staff} />
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  status,
  bookings,
  packages,
  enclosures,
  staff,
}: {
  status: BookingStatus;
  bookings: BookingWithRelations[];
  packages: Option[];
  enclosures: Option[];
  staff: Staff[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const declined = status === "declined";
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span
          className={cn(
            "text-sm font-semibold",
            declined && "text-red-700",
          )}
        >
          {BOOKING_STATUS_LABELS[status]}
        </span>
        <span className="rounded-full bg-secondary px-2 text-xs text-muted-foreground">
          {bookings.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[60vh] flex-1 flex-col gap-2 rounded-lg bg-secondary/50 p-2 transition-colors",
          declined && "bg-red-50/70",
          isOver && "bg-primary/10 ring-2 ring-primary/40",
        )}
      >
        {bookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            packages={packages}
            enclosures={enclosures}
            staff={staff}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  initial,
  packages,
  enclosures,
  staff,
}: {
  initial: BookingWithRelations[];
  packages: Option[];
  enclosures: Option[];
  staff: Staff[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Keep local state in sync with server refreshes.
  useEffect(() => setItems(initial), [initial]);

  // Realtime: refresh on any booking change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_orders" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over?.id as BookingStatus | undefined;
    if (!target) return;
    const booking = items.find((b) => b.id === id);
    if (!booking || booking.status === target) return;

    // Optimistic update.
    setItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: target } : b)),
    );

    const res = await updateBookingStatus(id, target);
    if (res?.error) {
      toast.error("Failed to update status");
      setItems(initial);
    } else {
      toast.success(`Moved to ${BOOKING_STATUS_LABELS[target]}`);
    }
  }

  const active = items.find((b) => b.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOOKING_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            bookings={items.filter((b) => b.status === status)}
            packages={packages}
            enclosures={enclosures}
            staff={staff}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="w-72 rotate-3">
            <div className="rounded-lg border bg-background p-3 shadow-lg">
              <p className="text-sm font-semibold">{active.client_name}</p>
              <StatusBadge status={active.status} className="mt-1" />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
