import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a PHP currency amount. */
export function php(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n as number) ? (n as number) : 0);
}

// Philippine Standard Time (UTC+8, same offset as Beijing). All user-facing
// dates/times render in this zone regardless of the server's timezone.
export const PH_TIME_ZONE = "Asia/Manila";

/** Format an ISO date/time string for display in Philippine time (UTC+8). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PH_TIME_ZONE,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-PH", {
    dateStyle: "medium",
    timeZone: PH_TIME_ZONE,
  });
}

/** Minute-of-day for an instant, evaluated in Philippine time (UTC+8). */
export function phMinutes(value: string): number {
  const parts = new Date(value).toLocaleString("en-US", {
    timeZone: PH_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [h, m] = parts.split(":").map((x) => parseInt(x, 10));
  return (h % 24) * 60 + (m || 0);
}

/** Calendar day (YYYY-MM-DD) for an instant, in Philippine time (UTC+8). */
export function phDay(value: string): string {
  // en-CA yields ISO-like YYYY-MM-DD.
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: PH_TIME_ZONE,
  });
}
