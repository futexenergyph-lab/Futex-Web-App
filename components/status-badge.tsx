import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<BookingStatus, string> = {
  new: "bg-slate-200 text-slate-800",
  scheduled: "bg-blue-100 text-blue-800",
  deployed: "bg-indigo-100 text-indigo-800",
  on_site: "bg-amber-100 text-amber-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-600 text-white",
  paid: "bg-green-600 text-white",
  closed: "bg-slate-700 text-white",
  declined: "bg-red-100 text-red-800",
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_STYLES[status], className)}
    >
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
