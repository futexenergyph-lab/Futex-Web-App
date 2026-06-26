"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function ymd(d: Date): string {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}

export function DateRangeFilter({
  basePath,
  from,
  to,
}: {
  basePath: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  function go(f?: string, t?: string) {
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const now = new Date();
  const today = ymd(now);
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = ymd(new Date(now.getFullYear(), 0, 1));

  const presets: { label: string; f?: string; t?: string }[] = [
    { label: "Today", f: today, t: today },
    { label: "This Month", f: monthStart, t: today },
    { label: "This Year", f: yearStart, t: today },
    { label: "All time" },
  ];

  const activePreset = (p: { f?: string; t?: string }) =>
    (p.f ?? "") === (from ?? "") && (p.t ?? "") === (to ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => go(p.f, p.t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              activePreset(p)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          go(
            (fd.get("from") as string) || undefined,
            (fd.get("to") as string) || undefined,
          );
        }}
      >
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input name="from" type="date" defaultValue={from} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input name="to" type="date" defaultValue={to} className="h-9" />
        </div>
        <Button type="submit" size="sm" className="h-9">
          Apply
        </Button>
      </form>
    </div>
  );
}
