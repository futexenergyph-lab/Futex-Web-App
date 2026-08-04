"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { CsvExport } from "@/components/csv-export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { php, formatDate } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/types";

export interface ClientFinancialRow {
  id: string;
  client_number: string | null;
  client_name: string;
  address: string;
  status: BookingStatus;
  preferred_date: string | null;
  created_at: string;
  payment: number;
  expenses: number;
  profit: number;
  finalized: boolean;
}

type Period = "today" | "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  year: "Year",
  all: "All the time",
};

/** Today's calendar date in Manila, as YYYY-MM-DD. */
function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** A row's reference date (install date, else the date it was booked). */
function refDate(r: ClientFinancialRow): string {
  if (r.preferred_date) return r.preferred_date;
  return new Date(r.created_at).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
}

/** Inclusive start date for a period, or null for "all the time". */
function periodStart(period: Period, today: string): string | null {
  if (period === "all") return null;
  if (period === "today") return today;
  if (period === "month") return `${today.slice(0, 7)}-01`;
  if (period === "year") return `${today.slice(0, 4)}-01-01`;
  // Week: Monday of the current week (pure calendar arithmetic).
  const d = new Date(`${today}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - daysSinceMonday * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function FinancialReportList({ rows }: { rows: ClientFinancialRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [tracked, setTracked] = useState<"all" | "yes" | "no">("all");
  const [period, setPeriod] = useState<Period>("all");
  // At most one active sort; null = default order (newest first).
  const [numSort, setNumSort] = useState<"asc" | "desc" | null>(null);
  const [dateSort, setDateSort] = useState<"asc" | "desc" | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const today = manilaToday();
    const start = periodStart(period, today);

    const out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (tracked === "yes" && r.expenses <= 0) return false;
      if (tracked === "no" && r.expenses > 0) return false;
      if (start) {
        const d = refDate(r);
        if (d < start || d > today) return false;
      }
      if (!needle) return true;
      return [r.client_name, r.client_number, r.address]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });

    if (numSort) {
      // Numeric-aware compare so FX-2026-0009 sorts before FX-2026-0010.
      // Rows without a client number always sit at the bottom.
      out.sort((a, b) => {
        const an = a.client_number?.trim();
        const bn = b.client_number?.trim();
        if (!an && !bn) return 0;
        if (!an) return 1;
        if (!bn) return -1;
        const cmp = an.localeCompare(bn, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return numSort === "asc" ? cmp : -cmp;
      });
    } else if (dateSort) {
      // Calendar-date sort (install date, else booking date).
      out.sort((a, b) => {
        const cmp = refDate(a).localeCompare(refDate(b));
        return dateSort === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, q, status, tracked, period, numSort, dateSort]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (t, r) => ({
          payment: t.payment + r.payment,
          expenses: t.expenses + r.expenses,
          profit: t.profit + r.profit,
        }),
        { payment: 0, expenses: 0, profit: 0 },
      ),
    [filtered],
  );

  const csvRows = filtered.map((r) => ({
    client_number: r.client_number ?? "",
    client: r.client_name,
    address: r.address,
    status: BOOKING_STATUS_LABELS[r.status],
    payment: r.payment,
    expenses: r.expenses,
    profit: r.profit,
    final: r.finalized ? "Yes" : "",
  }));

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Payment</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {php(totals.payment)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
              {php(totals.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Profit</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                totals.profit < 0 ? "text-destructive" : "text-emerald-600"
              }`}
            >
              {php(totals.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search client, client #, address…"
            className="pl-9"
          />
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Period"
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BookingStatus | "all")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={tracked}
          onChange={(e) => setTracked(e.target.value as "all" | "yes" | "no")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tracked &amp; untracked</option>
          <option value="yes">Has expenses logged</option>
          <option value="no">No expenses yet</option>
        </select>
        <CsvExport rows={csvRows} filename="futex-financial-report.csv" />
      </div>

      {/* Client list */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => {
                    setDateSort(null);
                    setNumSort((s) =>
                      s === "asc" ? "desc" : s === "desc" ? null : "asc",
                    );
                  }}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  title="Sort by client number"
                >
                  Client #
                  <ArrowUpDown
                    className={`h-3 w-3 ${numSort ? "text-foreground" : "text-muted-foreground/50"}`}
                  />
                  {numSort === "asc" && <span className="text-[10px]">A–Z</span>}
                  {numSort === "desc" && (
                    <span className="text-[10px]">Z–A</span>
                  )}
                </button>
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => {
                    setNumSort(null);
                    setDateSort((s) =>
                      s === "asc" ? "desc" : s === "desc" ? null : "asc",
                    );
                  }}
                  className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                  title="Sort by date"
                >
                  Install date
                  <ArrowUpDown
                    className={`h-3 w-3 ${dateSort ? "text-foreground" : "text-muted-foreground/50"}`}
                  />
                  {dateSort === "asc" && (
                    <span className="text-[10px]">Oldest</span>
                  )}
                  {dateSort === "desc" && (
                    <span className="text-[10px]">Newest</span>
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">Payment</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  {r.client_number ?? "—"}
                </TableCell>
                <TableCell>
                  {/* The client name is the way in to their financials. */}
                  <Link
                    href={`/admin/internal-inputs/financial-report/${r.id}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm font-medium hover:border-primary hover:text-primary"
                  >
                    {r.client_name}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  {r.finalized && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      FINAL
                    </span>
                  )}
                  <span className="mt-0.5 block max-w-[240px] truncate text-xs text-muted-foreground">
                    {r.address}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {r.preferred_date ? formatDate(r.preferred_date) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {php(r.payment)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {r.expenses > 0 ? php(r.expenses) : "—"}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold tabular-nums ${
                    r.profit < 0 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {php(r.profit)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No clients match your filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} client
        {rows.length === 1 ? "" : "s"}
        {period !== "all" && ` · ${PERIOD_LABELS[period]}`}
      </p>
    </div>
  );
}
