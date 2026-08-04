"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, X, Check, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  createClientFinancial,
  updateClientFinancial,
  deleteClientFinancial,
  applyInstallationPackage,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { php, formatDate } from "@/lib/utils";

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

export function ClientFinancialsTracker({
  bookingId,
  lines,
  payment,
}: {
  bookingId: string;
  lines: FinancialLine[];
  payment: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ClientFinancialValues>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClientFinancialValues>(EMPTY);
  const [packageId, setPackageId] = useState(INSTALLATION_PACKAGES[0].id);

  function loadPackage() {
    const pkg = INSTALLATION_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;
    if (
      lines.length > 0 &&
      !confirm(
        `This client already has ${lines.length} expense line(s). Load "${pkg.label}" and add its ${pkg.lines.length} lines below them?`,
      )
    )
      return;
    start(async () => {
      const res = await applyInstallationPackage(bookingId, packageId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${pkg.label} loaded — amounts are editable`);
      router.refresh();
    });
  }

  const expenses = useMemo(
    () => lines.reduce((t, l) => t + Number(l.amount || 0), 0),
    [lines],
  );
  const profit = payment - expenses;

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

  // Shared cell inputs for the add / edit rows.
  const RowInputs = ({
    value,
    onChange,
  }: {
    value: ClientFinancialValues;
    onChange: (v: ClientFinancialValues) => void;
  }) => (
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
        <Input
          value={value.remarks}
          onChange={(e) => onChange({ ...value, remarks: e.target.value })}
          placeholder="Remarks"
          className="h-9 min-w-[120px]"
        />
      </TableCell>
    </>
  );

  return (
    <div className="space-y-4">
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

      {/* Package availed — loads the default capital cost lines */}
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
              onChange={(e) => setPackageId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {INSTALLATION_PACKAGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {php(packageTotal(p))}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Loads that package&apos;s cost lines below with their default
              amounts. Every line stays editable, and you can add extra
              expenses after it — the total recomputes automatically.
            </p>
          </div>
          <Button
            type="button"
            onClick={loadPackage}
            disabled={pending}
            className="gap-1"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            Load package costs
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Project-based expense tracking
        </h3>
        <div className="flex items-center gap-2">
          <CsvExport rows={csvRows} filename="client-expenses.csv" />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setAdding(true);
              setDraft({
                ...EMPTY,
                entry_date: new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Manila",
                }),
              });
            }}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Expense Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Charge To</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) =>
              editingId === l.id ? (
                <TableRow key={l.id} className="bg-secondary/30">
                  <RowInputs value={editDraft} onChange={setEditDraft} />
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={submitEdit}
                        disabled={pending}
                        title="Save"
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={l.id}>
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
                </TableRow>
              ),
            )}

            {adding && (
              <TableRow className="bg-secondary/30">
                <RowInputs value={draft} onChange={setDraft} />
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={submitNew}
                      disabled={pending}
                      title="Save"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAdding(false)}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {lines.length === 0 && !adding && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No expenses logged for this client yet. Press “Add line”.
                </TableCell>
              </TableRow>
            )}

            {lines.length > 0 && (
              <TableRow className="bg-secondary/50 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  TOTAL EXPENSES
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {php(expenses)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
