"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { DATE_RANGE_PRESETS } from "@/lib/utils";

/**
 * URL-driven date-range filter: a preset selector (Today / This week / This
 * month / This year / All time) plus an optional custom From–To window.
 * Defaults to "Today" when no params are present.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const current = from && to ? "custom" : (params.get("range") ?? "day");

  function go(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onPreset(value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    next.set("range", value);
    go(next);
  }

  function onCustom(field: "from" | "to", value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("range");
    if (value) next.set(field, value);
    else next.delete(field);
    go(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />
      <select
        value={current === "custom" ? "custom" : current}
        onChange={(e) => onPreset(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {DATE_RANGE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
        {current === "custom" && <option value="custom">Custom range</option>}
      </select>
      <input
        type="date"
        value={from}
        onChange={(e) => onCustom("from", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="From date"
      />
      <span className="text-sm text-muted-foreground">–</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onCustom("to", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="To date"
      />
    </div>
  );
}
