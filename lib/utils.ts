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

/**
 * Format an instant as a `datetime-local` input value ("YYYY-MM-DDTHH:mm")
 * expressed in Philippine time (UTC+8).
 */
export function phDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const date = d.toLocaleDateString("en-CA", { timeZone: PH_TIME_ZONE });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: PH_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}T${time}`;
}

/**
 * Convert a `datetime-local` value entered in Philippine time (UTC+8) back to
 * a UTC ISO string. PHT has no DST, so the fixed +08:00 offset is exact.
 */
export function phLocalToUtc(local: string): string {
  return new Date(`${local}:00+08:00`).toISOString();
}
