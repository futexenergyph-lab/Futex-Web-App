// =============================================================================
// FUTEX pricing engine — single source of truth for job-order totals.
// NEVER hardcode prices in components. Everything flows from the DB-backed
// package / enclosure / settings values passed in here.
// =============================================================================

import type { Enclosure, JobWork, Package } from "@/lib/types";

export interface PricingInput {
  pkg: Pick<Package, "base_price" | "enclosure_included"> | null;
  /** The enclosure the client selected (price source). */
  enclosure: Pick<Enclosure, "price"> | null;
  /**
   * Whether the enclosure should be charged as its own line. True for
   * Package 1 (no bundled enclosure) or an enclosure upgrade; false when the
   * chosen package already bundles an enclosure.
   */
  addSeparateEnclosure: boolean;
  additionalWireMeters: number;
  wireRatePerMeter: number;
  additionalJobWorks: JobWork[];
}

export interface PricingLine {
  label: string;
  amount: number;
}

export interface PricingResult {
  lines: PricingLine[];
  subtotal: number; // package + enclosure (the "base" portion)
  finalTotal: number; // subtotal + wire + job works
  enclosureCharged: boolean;
}

/**
 * Compute a job-order total with a transparent line-item breakdown.
 *
 *   final_total =
 *       package.base_price
 *     + enclosure.price            (only if NOT bundled in the package)
 *     + additional_wire_meters × wire_rate_per_meter
 *     + Σ(additional_job_works[].amount)
 */
export function computePricing(input: PricingInput): PricingResult {
  const lines: PricingLine[] = [];

  const base = num(input.pkg?.base_price);
  if (input.pkg) {
    lines.push({ label: "Package base price", amount: base });
  }

  // Only add a separate enclosure line if the package does NOT bundle one and
  // the field officer flagged it (Package 1 / upgrade).
  const bundled = input.pkg?.enclosure_included ?? false;
  const enclosureCharged =
    !bundled && input.addSeparateEnclosure && !!input.enclosure;
  const enclosurePrice = enclosureCharged ? num(input.enclosure?.price) : 0;
  if (enclosureCharged) {
    lines.push({ label: "Enclosure", amount: enclosurePrice });
  }

  const subtotal = base + enclosurePrice;

  const meters = Math.max(0, num(input.additionalWireMeters));
  const rate = Math.max(0, num(input.wireRatePerMeter));
  const wireTotal = meters * rate;
  if (meters > 0) {
    lines.push({
      label: `Additional wire (${meters} m × ${formatRate(rate)})`,
      amount: wireTotal,
    });
  }

  let jobWorksTotal = 0;
  for (const w of input.additionalJobWorks ?? []) {
    const amt = num(w.amount);
    jobWorksTotal += amt;
    lines.push({
      label: w.description?.trim() || "Additional job work",
      amount: amt,
    });
  }

  const finalTotal = subtotal + wireTotal + jobWorksTotal;

  return { lines, subtotal, finalTotal, enclosureCharged };
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function formatRate(rate: number): string {
  return `₱${rate.toLocaleString("en-PH")}/m`;
}
