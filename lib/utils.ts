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

// -----------------------------------------------------------------------------
// Date-range filtering (shared by Kanban / Live Status / Analytics)
// -----------------------------------------------------------------------------

export type DateRangeKey = "day" | "week" | "month" | "year" | "all" | "custom";

export interface ResolvedRange {
  key: DateRangeKey;
  /** Inclusive lower bound (UTC ISO) or null for "all time". */
  fromISO: string | null;
  /** Exclusive upper bound (UTC ISO) or null for "all time". */
  toISO: string | null;
}

export const DATE_RANGE_PRESETS: { value: DateRangeKey; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

/** Today's calendar parts evaluated in Philippine time (UTC+8). */
function phTodayParts(): { y: number; m: number; d: number } {
  const [y, m, d] = new Date()
    .toLocaleDateString("en-CA", { timeZone: PH_TIME_ZONE })
    .split("-")
    .map(Number);
  return { y, m, d };
}

/** The UTC instant of Philippine-time midnight for a calendar date. */
function phMidnightISO(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return new Date(`${y}-${mm}-${dd}T00:00:00+08:00`).toISOString();
}

/** Add whole days to a UTC ISO instant (safe: PHT has no DST shifts). */
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * Resolve a date-range filter from URL search params into UTC bounds. An
 * explicit custom `from`+`to` (YYYY-MM-DD) wins; otherwise a `range` preset is
 * used, defaulting to the current day.
 */
export function resolveDateRange(sp: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  // Explicit custom window (inclusive of the whole `to` day).
  if (sp.from && sp.to) {
    const [fy, fm, fd] = sp.from.split("-").map(Number);
    const [ty, tm, td] = sp.to.split("-").map(Number);
    if (fy && fm && fd && ty && tm && td) {
      return {
        key: "custom",
        fromISO: phMidnightISO(fy, fm, fd),
        toISO: addDaysISO(phMidnightISO(ty, tm, td), 1),
      };
    }
  }

  const key = (sp.range as DateRangeKey) || "day";
  if (key === "all") return { key: "all", fromISO: null, toISO: null };

  const { y, m, d } = phTodayParts();
  const startToday = phMidnightISO(y, m, d);

  switch (key) {
    case "week": {
      const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
      const fromMonday = (wd + 6) % 7;
      const fromISO = addDaysISO(startToday, -fromMonday);
      return { key, fromISO, toISO: addDaysISO(fromISO, 7) };
    }
    case "month": {
      const fromISO = phMidnightISO(y, m, 1);
      const toISO = m === 12 ? phMidnightISO(y + 1, 1, 1) : phMidnightISO(y, m + 1, 1);
      return { key, fromISO, toISO };
    }
    case "year":
      return { key, fromISO: phMidnightISO(y, 1, 1), toISO: phMidnightISO(y + 1, 1, 1) };
    case "day":
    default:
      return { key: "day", fromISO: startToday, toISO: addDaysISO(startToday, 1) };
  }
}
