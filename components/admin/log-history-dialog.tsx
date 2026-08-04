"use client";

import { useState } from "react";
import { Loader2, History, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fetchAuditDetail } from "@/app/(app)/admin/audit-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { php, formatDateTime } from "@/lib/utils";

// Internal/noisy columns never worth showing to the reader.
const HIDDEN_FIELDS = new Set(["id", "updated_at", "created_at", "search_tsv"]);

const FIELD_LABELS: Record<string, string> = {
  client_name: "Client name",
  client_number: "Client number",
  contact_number: "Contact number",
  preferred_date: "Preferred date",
  preferred_time: "Preferred time",
  preferred_package_id: "Package",
  preferred_enclosure_id: "Enclosure",
  assigned_field_officer_id: "Field officer",
  assigned_installer_id: "Installer",
  enclosure_protection_notes: "Enclosure / protection notes",
  is_back_job_order: "Back job order",
  back_job_field_note: "Back job note",
  final_total: "Final total",
  computed_subtotal: "Subtotal",
  reference_no: "Reference no.",
  proof_url: "Proof",
  paid_at: "Paid at",
  storage_path: "File",
  job_order_id: "Job order",
  booking_id: "Booking",
};

const MONEY_HINTS = [
  "amount",
  "price",
  "total",
  "subtotal",
  "cost",
  "fee",
  "rate",
];

function labelFor(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    const money = MONEY_HINTS.some((h) => field.toLowerCase().includes(h));
    return money ? php(v) : String(v);
  }
  if (typeof v === "string") {
    if (ISO_DATE.test(v)) {
      // Date-only values stay as-is; timestamps get the friendly format.
      return v.length > 10 ? formatDateTime(v) : v;
    }
    return v;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

interface Change {
  field: string;
  before: unknown;
  after: unknown;
}

function diff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Change[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const out: Change[] = [];
  for (const k of keys) {
    if (HIDDEN_FIELDS.has(k)) continue;
    const b = before?.[k] ?? null;
    const a = after?.[k] ?? null;
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    out.push({ field: k, before: b, after: a });
  }
  return out.sort((x, y) => labelFor(x.field).localeCompare(labelFor(y.field)));
}

/** Snapshot rows for a delete (or a create) where there's only one side. */
function snapshotRows(
  data: Record<string, unknown> | null,
): { field: string; value: unknown }[] {
  if (!data) return [];
  return Object.keys(data)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .filter((k) => {
      const v = data[k];
      return v !== null && v !== undefined && v !== "";
    })
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b)))
    .map((k) => ({ field: k, value: data[k] }));
}

interface Detail {
  action: string;
  label: string | null;
  actorName: string | null;
  createdAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** Shows exactly what changed in one logged edit/deletion. */
export function LogHistoryDialog({ logId }: { logId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  async function onOpen() {
    setOpen(true);
    if (detail) return; // cached from a previous open
    setLoading(true);
    const res = await fetchAuditDetail(logId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      setOpen(false);
      return;
    }
    setDetail({
      action: res.action,
      label: res.label,
      actorName: res.actorName,
      createdAt: res.createdAt,
      before: res.before,
      after: res.after,
    });
  }

  const isDelete = detail?.action === "delete";
  const changes = detail && !isDelete ? diff(detail.before, detail.after) : [];
  const removed = detail && isDelete ? snapshotRows(detail.before) : [];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpen}
        className="gap-1 whitespace-nowrap"
        title="See what changed"
      >
        <History className="h-3.5 w-3.5" /> See history
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isDelete ? "Deleted record" : "What changed"}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
            </div>
          )}

          {!loading && detail && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border bg-secondary/30 p-3">
                <p className="font-medium">{detail.label ?? "—"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isDelete ? "Deleted" : "Edited"} by{" "}
                  {detail.actorName ?? "—"} · {formatDateTime(detail.createdAt)}
                </p>
              </div>

              {/* Edit: field-by-field before -> after */}
              {!isDelete && (
                <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                  {changes.length === 0 ? (
                    <p className="p-4 text-muted-foreground">
                      No field-level differences were recorded for this edit.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-secondary/60">
                        <tr>
                          <th className="p-2 text-left font-medium">Field</th>
                          <th className="p-2 text-left font-medium">Before</th>
                          <th className="p-2 text-left font-medium">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((c) => (
                          <tr key={c.field} className="border-t align-top">
                            <td className="p-2 font-medium">
                              {labelFor(c.field)}
                            </td>
                            <td className="p-2 text-muted-foreground line-through decoration-destructive/50">
                              {formatValue(c.field, c.before)}
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-start gap-1">
                                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatValue(c.field, c.after)}
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Delete: the full record that was removed */}
              {isDelete && (
                <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                  {removed.length === 0 ? (
                    <p className="p-4 text-muted-foreground">
                      No snapshot was stored for this deletion.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-secondary/60">
                        <tr>
                          <th className="p-2 text-left font-medium">Field</th>
                          <th className="p-2 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {removed.map((r) => (
                          <tr key={r.field} className="border-t align-top">
                            <td className="p-2 font-medium">
                              {labelFor(r.field)}
                            </td>
                            <td className="p-2">
                              {formatValue(r.field, r.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
