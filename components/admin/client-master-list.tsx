"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import {
  DocumentationViewer,
  type DocPhoto,
} from "@/components/admin/documentation-viewer";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { formatDate } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/types";

export interface ClientRow {
  id: string;
  client_number: string | null;
  client_name: string;
  email: string | null;
  contact_number: string;
  address: string;
  package: string | null;
  field_officer: string | null;
  installer: string | null;
  status: BookingStatus;
  source: string;
  created_at: string;
  preferred_date: string | null;
  documents: { title: string; url: string }[];
  documentation: DocPhoto[];
}

type SortKey =
  | "client_number"
  | "client_name"
  | "status"
  | "created_at"
  | "preferred_date";

export function ClientMasterList({
  clients,
  canManage = false,
}: {
  clients: ClientRow[];
  canManage?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!needle) return true;
      return [
        c.client_number,
        c.client_name,
        c.email,
        c.contact_number,
        c.address,
        c.package,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      const cmp = av.localeCompare(bv);
      return asc ? cmp : -cmp;
    });
    return rows;
  }, [clients, q, status, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const csvRows = filtered.map((c) => ({
    client_number: c.client_number ?? "",
    name: c.client_name,
    email: c.email ?? "",
    contact: c.contact_number,
    address: c.address,
    package: c.package ?? "",
    field_officer: c.field_officer ?? "",
    installer: c.installer ?? "",
    status: BOOKING_STATUS_LABELS[c.status],
    source: c.source,
    submitted: c.created_at.slice(0, 10),
  }));

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === k ? "text-foreground" : "text-muted-foreground/50"}`}
        />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, client #, email, contact, address…"
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
        <CsvExport rows={csvRows} filename="futex-client-master-list.csv" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead k="client_number" label="Client #" />
              <SortHead k="client_name" label="Name" />
              <TableHead>Email</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Field Officer</TableHead>
              <TableHead>Installer</TableHead>
              <SortHead k="status" label="Status" />
              <SortHead k="created_at" label="Submitted" />
              <TableHead>Commissioning &amp; Warranty</TableHead>
              <TableHead>Documentation</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">
                  {c.client_number ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{c.client_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{c.contact_number}</TableCell>
                <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                  <span className="line-clamp-2">{c.address}</span>
                </TableCell>
                <TableCell className="text-sm">{c.package ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {c.field_officer ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{c.installer ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(c.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {c.documents.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {c.documents.map((d, i) => (
                        <a
                          key={i}
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          {d.title}
                        </a>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <DocumentationViewer photos={c.documentation} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <DeleteRecordButton
                      table="bookings"
                      id={c.id}
                      label={`Client — ${c.client_name}`}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 13 : 12}
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
        {filtered.length} of {clients.length} client
        {clients.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
