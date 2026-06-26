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
import { MapPin, User, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus } from "@/app/(app)/admin/actions";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDate } from "@/lib/utils";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingWithRelations,
} from "@/lib/types";

function BookingCard({ booking }: { booking: BookingWithRelations }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{booking.client_name}</p>
        {booking.source === "web" && (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            WEB
          </span>
        )}
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
    </div>
  );
}

function Column({
  status,
  bookings,
}: {
  status: BookingStatus;
  bookings: BookingWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">
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
          isOver && "bg-primary/10 ring-2 ring-primary/40",
        )}
      >
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  initial,
}: {
  initial: BookingWithRelations[];
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
