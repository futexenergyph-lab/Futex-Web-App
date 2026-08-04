"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createInternalInput,
  updateInternalInput,
  deleteInternalInput,
  attachInternalInputFile,
  type InternalInputValues,
} from "@/app/(app)/admin/internal-inputs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvExport } from "@/components/csv-export";
import { php, formatDate } from "@/lib/utils";

export const INTERNAL_CATEGORIES = [
  "Capital Injection",
  "Owner's Draw",
  "Operating Cost",
  "Supplier Payment",
  "Salaries / Wages",
  "Rent & Utilities",
  "Equipment / Tools",
  "Transportation",
  "Taxes & Permits",
  "Loan / Financing",
  "Other",
];

export interface InternalInputRow {
  id: string;
  entry_date: string;
  direction: "in" | "out";
  category: string;
  description: string;
  amount: number;
  payee: string | null;
  reference_no: string | null;
  notes: string | null;
  attachment_path: string | null;
  attachment_url: string | null;
  created_by_name: string | null;
}

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const EMPTY: InternalInputValues = {
  entry_date: "",
  direction: "out",
  category: "Operating Cost",
  description: "",
  amount: 0,
  payee: "",
  reference_no: "",
  notes: "",
};

export function InternalInputsManager({ rows }: { rows: InternalInputRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Filters
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [cat, setCat] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InternalInputRow | null>(null);
  const [form, setForm] = useState<InternalInputValues>(EMPTY);
  const [file, setFile] = useState<File | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (dir !== "all" && r.direction !== dir) return false;
      if (cat !== "all" && r.category !== cat) return false;
      if (from && r.entry_date < from) return false;
      if (to && r.entry_date > to) return false;
      if (!needle) return true;
      return [r.description, r.payee, r.reference_no, r.notes, r.category]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [rows, q, dir, cat, from, to]);

  const totals = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const r of filtered) {
      if (r.direction === "in") moneyIn += Number(r.amount || 0);
      else moneyOut += Number(r.amount || 0);
    }
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, entry_date: todayISO() });
    setFile(null);
    setOpen(true);
  }

  function openEdit(r: InternalInputRow) {
    setEditing(r);
    setForm({
      entry_date: r.entry_date,
      direction: r.direction,
      category: r.category,
      description: r.description,
      amount: Number(r.amount || 0),
      payee: r.payee ?? "",
      reference_no: r.reference_no ?? "",
      notes: r.notes ?? "",
    });
    setFile(null);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = editing
        ? await updateInternalInput(editing.id, form)
        : await createInternalInput(form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      const id = editing?.id ?? (res as { id?: string }).id;

      // Optional receipt upload.
      if (file && id) {
        try {
          const supabase = createClient();
          const ext = file.name.split(".").pop() || "bin";
          const path = `${id}/${Date.now()}.${ext}`;
          const { error } = await supabase.storage
            .from("internal-inputs")
            .upload(path, file, { upsert: true });
          if (error) throw new Error(error.message);
          await attachInternalInputFile(id, path);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Saved, but the file failed: ${err.message}`
              : "Saved, but the file failed to upload",
          );
        }
      }

      toast.success(editing ? "Entry updated" : "Entry recorded");
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(r: InternalInputRow) {
    if (!confirm(`Delete this entry? "${r.description}" — ${php(r.amount)}`))
      return;
    start(async () => {
      const res = await deleteInternalInput(r.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Entry deleted");
        router.refresh();
      }
    });
  }

  const csvRows = filtered.map((r) => ({
    date: r.entry_date,
    direction: r.direction === "in" ? "Money in" : "Money out",
    category: r.category,
    description: r.description,
    payee: r.payee ?? "",
    reference_no: r.reference_no ?? "",
    amount: r.amount,
    notes: r.notes ?? "",
    recorded_by: r.created_by_name ?? "",
  }));

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Money in</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
              {php(totals.moneyIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Money out</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
              {php(totals.moneyOut)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                totals.net < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {php(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description, payee, reference…"
            className="pl-9"
          />
        </div>
        <select
          value={dir}
          onChange={(e) => setDir(e.target.value as "all" | "in" | "out")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">In &amp; out</option>
          <option value="in">Money in</option>
          <option value="out">Money out</option>
        </select>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All categories</option>
          {INTERNAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-auto"
          aria-label="From date"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-auto"
          aria-label="To date"
        />
        <CsvExport rows={csvRows} filename="futex-internal-inputs.csv" />
        <Button type="button" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> New entry
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payee / Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(r.entry_date)}
                </TableCell>
                <TableCell>
                  {r.direction === "in" ? (
                    <Badge variant="accent" className="gap-1">
                      <ArrowDownLeft className="h-3 w-3" /> In
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Out
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{r.category}</TableCell>
                <TableCell className="max-w-[240px] text-sm">
                  <span className="line-clamp-2">{r.description}</span>
                  {r.notes && (
                    <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                      {r.notes}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.payee ?? "—"}
                  {r.reference_no && (
                    <span className="block text-xs">Ref: {r.reference_no}</span>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold tabular-nums ${
                    r.direction === "in" ? "text-emerald-600" : ""
                  }`}
                >
                  {r.direction === "in" ? "+" : "−"}
                  {php(r.amount)}
                </TableCell>
                <TableCell>
                  {r.attachment_url ? (
                    <a
                      href={r.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" /> View
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(r)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No internal entries match your filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} entr
        {rows.length === 1 ? "y" : "ies"}
      </p>

      {/* New / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit internal entry" : "New internal entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ii-date">Date</Label>
                <Input
                  id="ii-date"
                  type="date"
                  value={form.entry_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, entry_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ii-dir">Type</Label>
                <select
                  id="ii-dir"
                  value={form.direction}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      direction: e.target.value as "in" | "out",
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="out">Money out (cost / payment)</option>
                  <option value="in">Money in (capital / other income)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ii-cat">Category</Label>
                <select
                  id="ii-cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {INTERNAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ii-amount">Amount (PHP)</Label>
                <Input
                  id="ii-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ii-desc">Description</Label>
                <Input
                  id="ii-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="What is this for?"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ii-payee">Payee / Source</Label>
                <Input
                  id="ii-payee"
                  value={form.payee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payee: e.target.value }))
                  }
                  placeholder="Supplier, person, bank…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ii-ref">Reference no.</Label>
                <Input
                  id="ii-ref"
                  value={form.reference_no}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reference_no: e.target.value }))
                  }
                  placeholder="OR / invoice / transfer ref"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ii-notes">Notes</Label>
                <Textarea
                  id="ii-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ii-file" className="flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" /> Attachment (optional)
                </Label>
                <Input
                  id="ii-file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {editing?.attachment_url && !file && (
                  <p className="text-xs text-muted-foreground">
                    A file is already attached. Choosing a new one replaces it.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Record entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
