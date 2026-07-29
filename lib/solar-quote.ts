// Structured data for a FUTEX solar "DIGITAL QUOTATION" (matches the sample):
// A. Proposed Cost rows + B. Product Detail blocks (brand, inclusion, standard
// material checklist with quantities, plus free-form spec lines).

export interface ProposedCostRow {
  packageName: string;
  noOfPackage: number;
  netPrice: number; // per package
  discountedPrice: number; // per package
}

export interface SolarMaterial {
  name: string;
  unit: string; // e.g. "pcs", "pc", "roll", "A", ""
  qty: number;
  checked: boolean;
}

export interface SolarProduct {
  key: string;
  title: string; // e.g. "SOLAR PANEL"
  brandOptions: string[]; // preset brands; empty = no brand row
  brand: string; // selected or manually entered
  inclusion: string; // free text (Inclusion column)
  materials: SolarMaterial[]; // checkbox + qty (standard materials)
  details: string; // extra spec lines, one per line (bullets)
}

export interface SolarQuoteData {
  proposedCost: ProposedCostRow[];
  products: SolarProduct[];
  disclaimer: string;
}

export const DEFAULT_DISCLAIMER = [
  "Upon confirmation of this quotation, we will proceed with the formal site inspection and ocular visit.",
  "This quotation is based on your declared electricity consumption and serves as an initial estimate. The final quotation is subject to change after the site assessment.",
  "Price adjustments may result from factors including, but not limited to:",
  "- Roof size, condition, and capacity for solar panel installation",
  "- Additional materials or accessories required",
  "- Final brand and equipment specifications selected",
  "- Additional labor or installation requests",
  "- Any site conditions identified during the inspection",
  "The final quotation will be provided after the completion of the site inspection and ocular visit.",
  "We provide (1) one year warranty on workmanship.",
].join("\n");

/** Fresh template pre-filled to mirror the sample quotation. */
export function defaultSolarQuote(): SolarQuoteData {
  return {
    proposedCost: [
      {
        packageName: "6kwh Smart Hybrid",
        noOfPackage: 1,
        netPrice: 430000,
        discountedPrice: 380000,
      },
    ],
    products: [
      {
        key: "panel",
        title: "SOLAR PANEL",
        brandOptions: ["Jinko", "Trina", "Ronma", "Seraphim", "TCL"],
        brand: "Jinko, Trina, Ronma, Seraphim, TCL",
        inclusion: "10 pcs 620 watt",
        materials: [
          { name: "620 Watt Bi-Facial Solar Panel", unit: "pcs", qty: 10, checked: true },
        ],
        details:
          "Bi-Facial Solar Panels\nTotal wattage: 6,200 watts\nDimensions: 2383 mm × 1302 mm × 30-35 mm\nWarranty: 25 years",
      },
      {
        key: "inverter",
        title: "SMART INVERTER",
        brandOptions: ["Huawei", "TCL", "Deye", "Solis", "Solax"],
        brand: "Huawei, TCL, Deye, Solis, Solax",
        inclusion: "1 pc 6 kW Hybrid Smart Inverter",
        materials: [
          { name: "6kW Hybrid Smart Inverter", unit: "pc", qty: 1, checked: true },
        ],
        details: "Warranty: 5/10/15 Years (Depends on Brand)",
      },
      {
        key: "battery",
        title: "BATTERY",
        brandOptions: ["TCL", "SUNGROW", "CST", "PUSTUN", "LVTOPSUN"],
        brand: "TCL, SUNGROW, CST, PUSTUN, LVTOPSUN",
        inclusion: "314AH 16kWh battery",
        materials: [
          { name: "314AH 16kWh Battery", unit: "pc", qty: 1, checked: true },
        ],
        details:
          "Total Capacity: 316ah\nDimensions: 753 mm × 600 mm × 300 mm\nWarranty: 5/7/10 years (Depends on Brand)",
      },
      {
        key: "accessories",
        title: "SYSTEM ACCESSORIES",
        brandOptions: [],
        brand: "",
        inclusion: "",
        materials: [
          { name: "railings", unit: "pcs", qty: 10, checked: true },
          { name: "LFoot", unit: "pcs", qty: 30, checked: true },
          { name: "Midclamp", unit: "pcs", qty: 20, checked: true },
          { name: "End clamp", unit: "pcs", qty: 10, checked: true },
          { name: "20A DC MCB", unit: "pc", qty: 1, checked: true },
          { name: "DC SPD", unit: "pc", qty: 1, checked: true },
          { name: "AC 100A MCB", unit: "pcs", qty: 2, checked: true },
          { name: "AC SPD", unit: "pc", qty: 2, checked: true },
          { name: "Combiner Box", unit: "", qty: 1, checked: true },
          { name: "4mm PV Wire", unit: "roll", qty: 1, checked: true },
          { name: "25mm HDPE", unit: "roll", qty: 1, checked: true },
          { name: "ATS", unit: "A", qty: 125, checked: true },
          { name: "DC MCCB", unit: "A", qty: 200, checked: true },
          { name: "Cable Tray 4x2", unit: "", qty: 1, checked: true },
          { name: "MC4", unit: "pcs", qty: 10, checked: true },
          { name: "Battery Cable", unit: "", qty: 1, checked: true },
        ],
        details: "",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

/** Format one material as a bullet, e.g. "16pcs railings" / "125A ATS". */
export function materialBullet(m: SolarMaterial): string {
  const q = m.unit ? `${m.qty}${m.unit}` : `${m.qty}`;
  return `${q} ${m.name}`.trim();
}

/** All "Total Product Detail" bullet lines for a product block. */
export function productBullets(p: SolarProduct): string[] {
  const fromMaterials = p.materials
    .filter((m) => m.checked)
    .map(materialBullet);
  const fromDetails = p.details
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...fromMaterials, ...fromDetails];
}

/** Grand total = sum of (no. of package × discounted price). */
export function solarTotal(data: SolarQuoteData): number {
  return data.proposedCost.reduce(
    (t, r) => t + r.noOfPackage * r.discountedPrice,
    0,
  );
}
