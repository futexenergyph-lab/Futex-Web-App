"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface ClientFinancialValues {
  entry_date: string;
  project_name: string;
  expense_type: string;
  description: string;
  amount: number;
  charge_to: string;
  remarks: string;
}

function validate(v: ClientFinancialValues): string | null {
  if (!v.description.trim() && v.amount <= 0)
    return "Add a description or an amount.";
  if (!Number.isFinite(v.amount) || v.amount < 0)
    return "Amount must be zero or more.";
  return null;
}

function payload(v: ClientFinancialValues) {
  return {
    entry_date: v.entry_date || null,
    project_name: v.project_name.trim() || null,
    expense_type: v.expense_type || "Materials",
    description: v.description.trim(),
    amount: v.amount,
    charge_to: v.charge_to.trim() || null,
    remarks: v.remarks.trim() || null,
  };
}

function refresh(bookingId: string) {
  revalidatePath("/admin/internal-inputs");
  revalidatePath("/admin/internal-inputs/financial-report");
  revalidatePath(`/admin/internal-inputs/financial-report/${bookingId}`);
}

/** Returns an error message when the report is locked by a final submission. */
async function finalizedError(bookingId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_financial_status")
    .select("finalized_at")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data?.finalized_at
    ? "This report has been submitted as final. Reopen it to make changes."
    : null;
}

/** Add an expense line to a client's project financials. */
export async function createClientFinancial(
  bookingId: string,
  v: ClientFinancialValues,
) {
  const profile = await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };

  const supabase = createClient();
  const { error } = await supabase.from("client_financials").insert({
    booking_id: bookingId,
    ...payload(v),
    created_by: profile.id,
    created_by_name: profile.full_name,
  });
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/** Update one expense line. */
export async function updateClientFinancial(
  id: string,
  bookingId: string,
  v: ClientFinancialValues,
) {
  await requireRole(["owner"]);
  const err = validate(v);
  if (err) return { error: err };
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };

  const supabase = createClient();
  const { error } = await supabase
    .from("client_financials")
    .update(payload(v))
    .eq("id", id);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/** Delete one expense line. */
export async function deleteClientFinancial(id: string, bookingId: string) {
  await requireRole(["owner"]);
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };
  const supabase = createClient();
  const { error } = await supabase
    .from("client_financials")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/**
 * Load an installation package's default cost lines into a client's
 * financials. Lines are inserted in sheet order (staggered created_at keeps
 * the display order stable) and remain individually editable afterwards.
 */
export async function applyInstallationPackage(
  bookingId: string,
  packageId: string,
  lineIndexes?: number[],
) {
  const profile = await requireRole(["owner"]);
  const { INSTALLATION_PACKAGES } = await import("@/lib/installation-packages");
  const pkg = INSTALLATION_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return { error: "Unknown package." };
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };

  // Only the contents the owner ticked in the package popup (default: all).
  const chosen =
    lineIndexes && lineIndexes.length
      ? pkg.lines.filter((_, i) => lineIndexes.includes(i))
      : pkg.lines;
  if (chosen.length === 0) return { error: "Select at least one item to add." };

  const base = Date.now();
  const rows = chosen.map((l, i) => ({
    booking_id: bookingId,
    entry_date: null,
    project_name: pkg.label,
    expense_type: l.expense_type,
    description: l.description,
    amount: l.amount,
    charge_to: null,
    remarks: null,
    created_by: profile.id,
    created_by_name: profile.full_name,
    created_at: new Date(base + i * 10).toISOString(),
  }));

  const supabase = createClient();
  const { error } = await supabase.from("client_financials").insert(rows);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true, count: rows.length };
}

/**
 * Pre-fill a client's expenses from the package they actually availed —
 * no manual template picking. Reads the job order (falling back to the
 * booking's preferred package), matches it to a cost template, loads the
 * template lines, and adds the additional-wire cost:
 * X extra meters on the job order → (X − 10) × ₱100 (first 10 m are already
 * in the base template's wire line).
 */
export async function prefillClientExpenses(bookingId: string) {
  const profile = await requireRole(["owner"]);
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };
  const supabase = createClient();

  const [{ data: jo }, { data: booking }] = await Promise.all([
    supabase
      .from("job_orders")
      .select(
        "package_id, enclosure_id, add_separate_enclosure, additional_wire_meters, additional_job_works",
      )
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("preferred_package_id, preferred_enclosure_id, preferred_date")
      .eq("id", bookingId)
      .maybeSingle(),
  ]);
  const joRow = jo as {
    package_id: string | null;
    enclosure_id: string | null;
    add_separate_enclosure: boolean;
    additional_wire_meters: number | string;
    additional_job_works: { description?: string }[] | null;
  } | null;
  const bk = booking as {
    preferred_package_id: string | null;
    preferred_enclosure_id: string | null;
    preferred_date: string | null;
  } | null;

  const packageId = joRow?.package_id ?? bk?.preferred_package_id ?? null;
  if (!packageId)
    return { error: "No booked package found for this client." };
  // The job order is the final on-site record: when one exists, only ITS
  // enclosure choice counts — the booking's earlier preference must not
  // add an enclosure the client didn't actually avail.
  const enclosureId = joRow
    ? joRow.enclosure_id
    : (bk?.preferred_enclosure_id ?? null);

  const [{ data: pkg }, encRes] = await Promise.all([
    supabase
      .from("packages")
      .select("name, description, inclusions, enclosure_included")
      .eq("id", packageId)
      .maybeSingle(),
    enclosureId
      ? supabase
          .from("enclosures")
          .select("name")
          .eq("id", enclosureId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const pkgRow = pkg as {
    name: string;
    description: string | null;
    inclusions: unknown;
    enclosure_included: boolean;
  } | null;
  if (!pkgRow) return { error: "The booked package no longer exists." };
  const encName =
    (encRes.data as { name: string } | null)?.name ?? null;

  const jobWorksText = (joRow?.additional_job_works ?? [])
    .map((w) => w?.description ?? "")
    .join(" ");
  const { resolveInstallationPackage, INSTALLATION_PACKAGES } = await import(
    "@/lib/installation-packages"
  );
  const template = resolveInstallationPackage({
    packageName: pkgRow.name,
    packageText: `${pkgRow.description ?? ""} ${JSON.stringify(pkgRow.inclusions ?? "")}`,
    enclosureName: encName,
    hasEnclosure:
      !!enclosureId ||
      !!joRow?.add_separate_enclosure ||
      // The package-level flag only counts when no job order pinned down
      // the actual equipment.
      (!joRow && !!pkgRow.enclosure_included),
    standHint: jobWorksText,
  });
  if (!template)
    return {
      error: `Couldn't match "${pkgRow.name}" to a cost template. Pick one manually instead.`,
    };

  // Existing template-loaded lines for this client (their project_name is a
  // template label). Same template already loaded → nothing to do; a
  // DIFFERENT template (e.g. an earlier wrong auto-fill) → replace it with
  // the corrected one.
  const { data: existing } = await supabase
    .from("client_financials")
    .select("id, project_name")
    .eq("booking_id", bookingId)
    .in(
      "project_name",
      INSTALLATION_PACKAGES.map((p) => p.label),
    );
  const existingRows =
    (existing as { id: string; project_name: string }[] | null) ?? [];
  if (existingRows.some((r) => r.project_name === template.label))
    return {
      error: `${template.label} costs are already loaded for this client.`,
    };
  const replaced = existingRows.length;
  if (replaced > 0) {
    const { error: delError } = await supabase
      .from("client_financials")
      .delete()
      .in(
        "id",
        existingRows.map((r) => r.id),
      );
    if (delError) return { error: delError.message };
  }

  const entryDate = bk?.preferred_date ?? null;
  const base = Date.now();
  const rows = template.lines.map((l, i) => ({
    booking_id: bookingId,
    entry_date: entryDate,
    project_name: template.label,
    expense_type: l.expense_type,
    description: l.description,
    amount: l.amount,
    charge_to: null as string | null,
    remarks: null as string | null,
    created_by: profile.id,
    created_by_name: profile.full_name,
    created_at: new Date(base + i * 10).toISOString(),
  }));

  // Additional wire beyond the 10 m already in the base wire line.
  const wireMeters = Number(joRow?.additional_wire_meters ?? 0);
  const extraMeters = wireMeters - 10;
  if (extraMeters > 0) {
    rows.push({
      booking_id: bookingId,
      entry_date: entryDate,
      project_name: template.label,
      expense_type: "Materials",
      description: `Additional no. 8 wire (${extraMeters}m @ ₱100)`,
      amount: extraMeters * 100,
      charge_to: null,
      remarks: `Job order wire: ${wireMeters}m`,
      created_by: profile.id,
      created_by_name: profile.full_name,
      created_at: new Date(base + rows.length * 10).toISOString(),
    });
  }

  const { error } = await supabase.from("client_financials").insert(rows);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true, label: template.label, count: rows.length, replaced };
}

/** Delete several expense lines at once (checkbox selection). */
export async function deleteClientFinancials(ids: string[], bookingId: string) {
  await requireRole(["owner"]);
  if (ids.length === 0) return { error: "No lines selected." };
  const locked = await finalizedError(bookingId);
  if (locked) return { error: locked };

  const supabase = createClient();
  const { error } = await supabase
    .from("client_financials")
    .delete()
    .in("id", ids)
    .eq("booking_id", bookingId);
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true, count: ids.length };
}

/** Submit the client's financial report as final — locks all inputs. */
export async function finalizeClientFinancials(bookingId: string) {
  const profile = await requireRole(["owner"]);
  const supabase = createClient();
  const { error } = await supabase.from("client_financial_status").upsert(
    {
      booking_id: bookingId,
      finalized_at: new Date().toISOString(),
      finalized_by: profile.id,
      finalized_by_name: profile.full_name,
    },
    { onConflict: "booking_id" },
  );
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}

/** Reopen a finalized report so it can be edited again. */
export async function reopenClientFinancials(bookingId: string) {
  await requireRole(["owner"]);
  const supabase = createClient();
  const { error } = await supabase.from("client_financial_status").upsert(
    { booking_id: bookingId, finalized_at: null },
    { onConflict: "booking_id" },
  );
  if (error) return { error: error.message };

  refresh(bookingId);
  return { ok: true };
}
