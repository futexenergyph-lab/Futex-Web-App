"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  PackagePlus,
  Lock,
  Unlock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createClientFinancial,
  updateClientFinancial,
  deleteClientFinancial,
  deleteClientFinancials,
  applyInstallationPackage,
  finalizeClientFinancials,
  reopenClientFinancials,
  type ClientFinancialValues,
} from "@/app/(app)/admin/internal-inputs/financial-report/actions";
import {
  INSTALLATION_PACKAGES,
  packageTotal,
} from "@/lib/installation-packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CsvExport } from "@/components/csv-export";
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
import { php, formatDate, formatDateTime } from "@/lib/utils";

export const EXPENSE_TYPES = [
  "Labor",
  "Food",
  "Materials",
  "Transportation",
  "Equipment",
  "Permit / Fees",
  "Others",
];

export interface FinancialLine {
  id: string;
  entry_date: string | null;
  project_name: string | null;
  expense_type: string;
  description: string;
  amount: number;
  charge_to: string | null;
  remarks: string | null;
}

const EMPTY: ClientFinancialValues = {
  entry_date: "",
  project_name: "",
  expense_type: "Materials",
  description: "",
  amount: 0,
  charge_to: "",
  remarks: "",
};

// Shared cell inputs for the add / edit rows. Defined at module level so the
// inputs keep focus while typing (re-declaring this inside the tracker made
// React remount the fields on every keystroke).
function RowInputs({
  value,
  onChange,
  action,
}: {
  value: ClientFinancialValues;
  onChange: (v: ClientFinancialValues) => void;
  action?: React.ReactNode;
}) {
  return (
    <>
      <TableCell>
        <Input
          type="date"
          value={value.entry_date}
          onChange={(e) => onChange({ ...value, entry_date: e.target.value })}
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Input
          value={value.project_name}
          onChange={(e) => onChange({ ...value, project_name: e.target.value })}
          placeholder="Project"
          className="h-9 min-w-[110px]"
        />
      </TableCell>
      <TableCell>
        <select
          value={value.expense_type}
          onChange={(e) => onChange({ ...value, expense_type: e.target.value })}
          className="h-9 w-full min-w-[110px] rounded-md border border-input bg-background px-2 text-sm"
        >
          {EXPENSE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <Input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="e.g. 10 meters no. 8 wire"
          className="h-9 min-w-[180px]"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={value.amount || ""}
          onChange={(e) =>
            onChange({ ...value, amount: Number(e.target.value) || 0 })
          }
          placeholder="0.00"
          className="h-9 w-28 text-right"
        />
      </TableCell>
      <TableCell>
        <Input
          value={value.charge_to}
          onChange={(e) => onChange({ ...value, charge_to: e.target.value })}
          placeholder="CASH"
          className="h-9 w-24"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Input
            value={value.remarks}
            onChange={(e) => onChange({ ...value, remarks: e.target.value })}
            placeholder="Remarks"
            className="h-9 min-w-[120px]"
          />
          {action}
        </div>
      </TableCell>
    </>
  );
}

export function ClientFinancialsTracker({
  bookingId,
  lines,
  payment,
  installDate = null,
  finalizedAt = null,
  finalizedByName = null,
}: {
  bookingId: string;
  lines: FinancialLine[];
  payment: number;
  installDate?: string | null;
  finalizedAt?: string | null;
  finalizedByName?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ClientFinancialValues>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClientFinancialValues>(EMPTY);

  // Package popup: which package is being previewed + per-line ticks.
  const [packageId, setPackageId] = useState(INSTALLATION_PACKAGES[0].id);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgChecks, setPkgChecks] = useState<boolean[]>([]);

  // Checkbox selection for deleting lines.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const locked = !!finalizedAt;

  const expenses = useMemo(
    () => lines.reduce((t, l) => t + Number(l.amount || 0), 0),
    [lines],
  );
  const profit = payment - expenses;

  const pkg = INSTALLATION_PACKAGES.find((p) => p.id === packageId);
  const pkgSelectedTotal = pkg
    ? pkg.lines.reduce((t, l, i) => t + (pkgChecks[i] ? l.amount : 0), 0)
    : 0;
  const pkgSelectedCount = pkgChecks.filter(Boolean).length;

  function openPackage(id: string) {
    const target = INSTALLATION_PACKAGES.find((p) => p.id === id);
    if (!target) return;
    setPackageId(id);
    setPkgChecks(target.lines.map(() => true));
    setPkgOpen(true);
  }

  function addPackageLines() {
    if (!pkg) return;
    const indexes = pkg.lines
      .map((_, i) => i)
      .filter((i) => pkgChecks[i]);
    if (indexes.length === 0) {
      toast.error("Tick at least one item to add.");
      return;
    }
    start(async () => {
      const res = await applyInstallationPackage(bookingId, pkg.id, indexes);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${indexes.length} item${indexes.length === 1 ? "" : "s"} from ${pkg.label} added`,
      );
      setPkgOpen(false);
      router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === lines.length
        ? new Set()
        : new Set(lines.map((l) => l.id)),
    );
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} selected line${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    start(async () => {
      const res = await deleteClientFinancials(ids, bookingId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${ids.length} line${ids.length === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function submitFinal() {
    if (
      !confirm(
        `Submit this financial report as FINAL?\n\nExpenses: ${php(expenses)} · Profit: ${php(profit)}\n\nInputs will be locked (you can reopen it later).`,
      )
    )
      return;
    start(async () => {
      const res = await finalizeClientFinancials(bookingId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Report submitted as final");
        router.refresh();
      }
    });
  }

  function reopen() {
    if (!confirm("Reopen this report for editing?")) return;
    start(async () => {
      const res = await reopenClientFinancials(bookingId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Report reopened");
        router.refresh();
      }
    });
  }

  function submitNew() {
    start(async () => {
      const res = await createClientFinancial(bookingId, draft);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Expense line added");
      setDraft({ ...EMPTY, entry_date: draft.entry_date });
      setAdding(false);
      router.refresh();
    });
  }

  function startEdit(l: FinancialLine) {
    setEditingId(l.id);
    setEditDraft({
      entry_date: l.entry_date ?? "",
      project_name: l.project_name ?? "",
      expense_type: l.expense_type,
      description: l.description,
      amount: Number(l.amount || 0),
      charge_to: l.charge_to ?? "",
      remarks: l.remarks ?? "",
    });
  }

  function submitEdit() {
    if (!editingId) return;
    start(async () => {
      const res = await updateClientFinancial(editingId, bookingId, editDraft);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Line updated");
      setEditingId(null);
      router.refresh();
    });
  }

  function onDelete(l: FinancialLine) {
    if (!confirm(`Delete "${l.description || l.expense_type}"?`)) return;
    start(async () => {
      const res = await deleteClientFinancial(l.id, bookingId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Line deleted");
        router.refresh();
      }
    });
  }

  const csvRows = lines.map((l) => ({
    date: l.entry_date ?? "",
    project_name: l.project_name ?? "",
    expense_type: l.expense_type,
    description: l.description,
    amount: l.amount,
    charge_to: l.charge_to ?? "",
    remarks: l.remarks ?? "",
  }));

  const allSelected = lines.length > 0 && selected.size === lines.length;
  const colCount = locked ? 8 : 9;

  return (
    <div className="space-y-4">
      {/* Final-submission banner */}
      {locked && (
        <Card className="border-emerald-500/60 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-700">
                  Submitted as final
                </p>
                <p className="text-xs text-muted-foreground">
                  {finalizedAt ? formatDateTime(finalizedAt) : ""}
                  {finalizedByName ? ` · by ${finalizedByName}` : ""} — inputs
                  are locked.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reopen}
              disabled={pending}
              className="gap-1"
            >
              <Unlock className="h-4 w-4" /> Reopen for editing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment / Expenses / Profit */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Payment</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {php(payment)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
              {php(expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Profit</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                profit < 0 ? "text-destructive" : "text-emerald-600"
              }`}
            >
              {php(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Package availed — opens the contents popup */}
      {!locked && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label
                htmlFor="pkg-avail"
                className="text-sm font-medium leading-none"
              >
                Package availed by the client
              </label>
              <select
                id="pkg-avail"
                value={packageId}
                onChange={(e) => openPackage(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {INSTALLATION_PACKAGES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {php(packageTotal(p))}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Picking a package opens its contents so you can review the
                default amounts and choose what to add to the list.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => openPackage(packageId)}
              disabled={pending}
              className="gap-1"
            >
              <PackagePlus className="h-4 w-4" /> View package contents
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Project-based expense tracking
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <CsvExport rows={csvRows} filename="client-expenses.csv" />
          {!locked && selected.size > 0 && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={deleteSelected}
              disabled={pending}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" /> Delete selected ({selected.size})
            </Button>
          )}
          {!locked && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAdding(true);
                setDraft({
                  ...EMPTY,
                  // Default to the client's installation record date; fall
                  // back to today when no install date is on file.
                  entry_date:
                    installDate ??
                    new Date().toLocaleDateString("en-CA", {
                      timeZone: "Asia/Manila",
                    }),
                });
              }}
              className="gap-1"
            >
              <Plus className="h-4 w-4" /> Add line
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {!locked && (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 align-middle"
                    aria-label="Select all lines"
                  />
                </TableHead>
              )}
              <TableHead>Date</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Expense Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Charge To</TableHead>
              <TableHead>Remarks</TableHead>
              {!locked && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) =>
              !locked && editingId === l.id ? (
                <TableRow key={l.id} className="bg-secondary/30">
                  <TableCell />
                  <RowInputs
                    value={editDraft}
                    onChange={setEditDraft}
                    action={
                      <>
                        <Button
                          type="button"
                          size="icon"
                          onClick={submitEdit}
                          disabled={pending}
                          title="Save changes"
                          className="shrink-0"
                        >
                          {pending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          title="Cancel"
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    }
                  />
                  <TableCell />
                </TableRow>
              ) : (
                <TableRow
                  key={l.id}
                  className={selected.has(l.id) ? "bg-secondary/40" : ""}
                >
                  {!locked && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelected(l.id)}
                        className="h-4 w-4 align-middle"
                        aria-label={`Select ${l.description || l.expense_type}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {l.entry_date ? formatDate(l.entry_date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.project_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.expense_type}
                  </TableCell>
                  <TableCell className="text-sm">{l.description}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {php(l.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.charge_to ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.remarks ?? "—"}
                  </TableCell>
                  {!locked && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(l)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(l)}
                          className="text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ),
            )}

            {!locked && adding && (
              <TableRow className="bg-secondary/30">
                <TableCell />
                <RowInputs
                  value={draft}
                  onChange={setDraft}
                  action={
                    <>
                      <Button
                        type="button"
                        size="icon"
                        onClick={submitNew}
                        disabled={pending}
                        title="Add to the record"
                        className="shrink-0"
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setAdding(false)}
                        title="Cancel"
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  }
                />
                <TableCell />
              </TableRow>
            )}

            {lines.length === 0 && !adding && (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  No expenses logged for this client yet. Pick a package or
                  press “Add line”.
                </TableCell>
              </TableRow>
            )}

            {lines.length > 0 && (
              <TableRow className="bg-secondary/50 font-semibold">
                <TableCell colSpan={locked ? 4 : 5} className="text-right">
                  TOTAL EXPENSES
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {php(expenses)}
                </TableCell>
                <TableCell colSpan={locked ? 2 : 3} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Final submission */}
      {!locked && (
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            onClick={submitFinal}
            disabled={pending || lines.length === 0}
            className="gap-1"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Submit as final
          </Button>
          <p className="text-xs text-muted-foreground">
            Locks these inputs once the figures are final. You can reopen later
            if something changes.
          </p>
        </div>
      )}

      {/* Package contents popup */}
      <Dialog open={pkgOpen} onOpenChange={setPkgOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pkg?.label}</DialogTitle>
          </DialogHeader>
          {pkg && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Default cost lines for this package. Untick anything you
                don&apos;t need, then add the rest to the list — amounts stay
                editable afterwards.
              </p>
              <div className="max-h-[50vh] overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary/60">
                    <tr>
                      <th className="w-8 p-2 text-left">
                        <input
                          type="checkbox"
                          checked={pkgSelectedCount === pkg.lines.length}
                          onChange={() =>
                            setPkgChecks(
                              pkg.lines.map(
                                () => pkgSelectedCount !== pkg.lines.length,
                              ),
                            )
                          }
                          className="h-4 w-4 align-middle"
                          aria-label="Select all contents"
                        />
                      </th>
                      <th className="p-2 text-left font-medium">
                        Expense Type
                      </th>
                      <th className="p-2 text-left font-medium">Description</th>
                      <th className="p-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.lines.map((l, i) => (
                      <tr
                        key={i}
                        className={`border-t ${pkgChecks[i] ? "" : "opacity-50"}`}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={!!pkgChecks[i]}
                            onChange={() =>
                              setPkgChecks((prev) =>
                                prev.map((c, j) => (j === i ? !c : c)),
                              )
                            }
                            className="h-4 w-4 align-middle"
                            aria-label={`Include ${l.description}`}
                          />
                        </td>
                        <td className="p-2 font-medium">{l.expense_type}</td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-right tabular-nums">
                          {php(l.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-secondary/50 font-semibold">
                      <td colSpan={3} className="p-2 text-right">
                        Selected total
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {php(pkgSelectedTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={addPackageLines}
                  disabled={pending || pkgSelectedCount === 0}
                  className="gap-1"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add {pkgSelectedCount} item
                  {pkgSelectedCount === 1 ? "" : "s"} —{" "}
                  {php(pkgSelectedTotal)}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
