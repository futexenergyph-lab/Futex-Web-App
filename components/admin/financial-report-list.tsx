"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
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
}

export function FinancialReportList({ rows }: { rows: ClientFinancialRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [tracked, setTracked] = useState<"all" | "yes" | "no">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (tracked === "yes" && r.expenses <= 0) return false;
      if (tracked === "no" && r.expenses > 0) return false;
      if (!needle) return true;
      return [r.client_name, r.client_number, r.address]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [rows, q, status, tracked]);

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
              <TableHead>Client #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Install date</TableHead>
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
      </p>
    </div>
  );
}
