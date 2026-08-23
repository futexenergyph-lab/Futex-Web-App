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

/** Standard solar-panel guarantee/warranty line used by every package. */
export const DEFAULT_PANEL_WARRANTY =
  "30 years product guarantee, 15 years warranty";

const PANEL_BRANDS = ["Jinko", "Trina", "Ronma", "Seraphim", "TCL"];
const INVERTER_BRANDS = ["Huawei", "TCL", "Deye", "Solis", "Solax"];
const BATTERY_BRANDS = ["TCL", "SUNGROW", "CST", "PUSTUN", "LVTOPSUN"];

interface PackageSpec {
  packageName: string;
  netPrice: number;
  discountedPrice: number;
  /** Number of 620W bi-facial panels. */
  panelQty: number;
  /** Inverter size in kW. */
  inverterKw: number;
  /** Battery inclusion text, e.g. "314AH 16kWh battery". */
  battery: string;
  /** Battery total capacity line, e.g. "316ah". */
  batteryCapacity: string;
  /** Number of battery units (default 1). */
  batteryQty?: number;
  /** Battery material line name; defaults to the inclusion text. */
  batteryMaterial?: string;
  /** Panel warranty line. Defaults to DEFAULT_PANEL_WARRANTY. */
  panelWarranty?: string;
  accessories: {
    railings: number;
    lfoot: number;
    midclamp: number;
    endclamp: number;
    dcMcb: number;
    dcSpd: number;
    acMcb: number;
    acSpd: number;
    mc4: number;
    /** Rolls of PV wire (default 1). */
    pvWireRolls?: number;
    /** PV wire spec (default "4mm PV Wire"). */
    pvWireName?: string;
    /** HDPE conduit spec (default "25mm HDPE"). */
    hdpeName?: string;
    /** Cable Tray 4x2 quantity (default 1). */
    cableTray?: number;
    /** DC MCB spec (default "20A DC MCB"). */
    dcMcbName?: string;
  };
}

/** Build a full solar quote template from a package spec. */
function buildPackage(s: PackageSpec): SolarQuoteData {
  const a = s.accessories;
  return {
    proposedCost: [
      {
        packageName: s.packageName,
        noOfPackage: 1,
        netPrice: s.netPrice,
        discountedPrice: s.discountedPrice,
      },
    ],
    products: [
      {
        key: "panel",
        title: "SOLAR PANEL",
        brandOptions: PANEL_BRANDS,
        brand: PANEL_BRANDS.join(", "),
        inclusion: `${s.panelQty} pcs 620 watt`,
        materials: [
          {
            name: "620 Watt Bi-Facial Solar Panel",
            unit: "pcs",
            qty: s.panelQty,
            checked: true,
          },
        ],
        details: `Bi-Facial Solar Panels\nTotal wattage: ${(
          s.panelQty * 620
        ).toLocaleString("en-US")} watts\nDimensions: 2383 mm × 1302 mm × 30-35 mm\n${
          s.panelWarranty ?? DEFAULT_PANEL_WARRANTY
        }`,
      },
      {
        key: "inverter",
        title: "SMART INVERTER",
        brandOptions: INVERTER_BRANDS,
        brand: INVERTER_BRANDS.join(", "),
        inclusion: `1 pc ${s.inverterKw} kW Hybrid Smart Inverter`,
        materials: [
          {
            name: `${s.inverterKw}kW Hybrid Smart Inverter`,
            unit: "pc",
            qty: 1,
            checked: true,
          },
        ],
        details: "Warranty: 5/10/15 Years (Depends on Brand)",
      },
      {
        key: "battery",
        title: "BATTERY",
        brandOptions: BATTERY_BRANDS,
        brand: BATTERY_BRANDS.join(", "),
        inclusion: s.battery,
        materials: [
          {
            name:
              s.batteryMaterial ?? s.battery.replace(/\bbattery\b/i, "Battery"),
            unit: "pc",
            qty: s.batteryQty ?? 1,
            checked: true,
          },
        ],
        details: `Total Capacity: ${s.batteryCapacity}\nDimensions: 753 mm × 600 mm × 300 mm\nWarranty: 5/7/10 years (Depends on Brand)`,
      },
      {
        key: "accessories",
        title: "SYSTEM ACCESSORIES",
        brandOptions: [],
        brand: "",
        inclusion: "",
        materials: [
          { name: "railings", unit: "pcs", qty: a.railings, checked: true },
          { name: "LFoot", unit: "pcs", qty: a.lfoot, checked: true },
          { name: "Midclamp", unit: "pcs", qty: a.midclamp, checked: true },
          { name: "End clamp", unit: "pcs", qty: a.endclamp, checked: true },
          { name: a.dcMcbName ?? "20A DC MCB", unit: "pcs", qty: a.dcMcb, checked: true },
          { name: "DC SPD", unit: "pcs", qty: a.dcSpd, checked: true },
          { name: "AC 100A MCB", unit: "pcs", qty: a.acMcb, checked: true },
          { name: "AC SPD", unit: "pcs", qty: a.acSpd, checked: true },
          { name: "Combiner Box", unit: "", qty: 1, checked: true },
          { name: a.pvWireName ?? "4mm PV Wire", unit: "roll", qty: a.pvWireRolls ?? 1, checked: true },
          { name: a.hdpeName ?? "25mm HDPE", unit: "roll", qty: 1, checked: true },
          { name: "ATS", unit: "A", qty: 125, checked: true },
          { name: "DC MCCB", unit: "A", qty: 200, checked: true },
          { name: "Cable Tray 4x2", unit: "", qty: a.cableTray ?? 1, checked: true },
          { name: "MC4", unit: "pcs", qty: a.mc4, checked: true },
          { name: "Battery Cable", unit: "", qty: 1, checked: true },
        ],
        details: "",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

export interface SolarPackagePreset {
  id: string;
  label: string;
  build: () => SolarQuoteData;
}

/**
 * Selectable packages for the Solar Solution quotation. The first entry is the
 * default. Everything a preset fills in stays editable in the form.
 */
export const SOLAR_PACKAGE_PRESETS: SolarPackagePreset[] = [
  {
    id: "6kw-214ah",
    label: "6kw + 214ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "6kw + 214ah Battery Hybrid",
        netPrice: 400000,
        discountedPrice: 340000,
        panelQty: 10,
        inverterKw: 6,
        battery: "214AH 10kWh battery",
        batteryCapacity: "214ah",
        accessories: {
          railings: 10,
          lfoot: 30,
          midclamp: 20,
          endclamp: 10,
          dcMcb: 1,
          dcSpd: 1,
          acMcb: 2,
          acSpd: 2,
          mc4: 10,
        },
      }),
  },
  {
    id: "6kw-314ah",
    label: "6kw + 314ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "6kw + 314ah Battery Hybrid",
        netPrice: 430000,
        discountedPrice: 380000,
        panelQty: 10,
        inverterKw: 6,
        battery: "314AH 16kWh battery",
        batteryCapacity: "316ah",
        accessories: {
          railings: 10,
          lfoot: 30,
          midclamp: 20,
          endclamp: 10,
          dcMcb: 1,
          dcSpd: 1,
          acMcb: 2,
          acSpd: 2,
          mc4: 10,
        },
      }),
  },
  {
    id: "8kw-214ah",
    label: "8kw + 214ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "8kw + 214ah Battery Hybrid",
        netPrice: 465000,
        discountedPrice: 420000,
        panelQty: 16,
        inverterKw: 8,
        battery: "214AH 10kWh battery",
        batteryCapacity: "214ah",
        accessories: {
          railings: 16,
          lfoot: 48,
          midclamp: 32,
          endclamp: 16,
          dcMcb: 2,
          dcSpd: 2,
          acMcb: 3,
          acSpd: 1,
          mc4: 30,
        },
      }),
  },
  {
    id: "8kwh-hybrid",
    label: "8kw + 314ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "8kw + 314ah Battery Hybrid",
        netPrice: 480000,
        discountedPrice: 450000,
        panelQty: 16,
        inverterKw: 8,
        battery: "314AH 16kWh battery",
        batteryCapacity: "316ah",
        accessories: {
          railings: 16,
          lfoot: 48,
          midclamp: 32,
          endclamp: 16,
          dcMcb: 2,
          dcSpd: 2,
          acMcb: 3,
          acSpd: 1,
          mc4: 30,
        },
      }),
  },
  {
    id: "10kw-314ah",
    label: "10kw + 314ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "10kw + 314ah Battery Hybrid",
        netPrice: 560000,
        discountedPrice: 490000,
        panelQty: 20,
        inverterKw: 10,
        battery: "314AH 16kWh battery",
        batteryCapacity: "316ah",
        accessories: {
          railings: 20,
          lfoot: 60,
          midclamp: 40,
          endclamp: 20,
          dcMcb: 2,
          dcSpd: 2,
          acMcb: 3,
          acSpd: 1,
          mc4: 30,
          pvWireRolls: 2,
          hdpeName: "30mm HDPE",
        },
      }),
  },
  {
    id: "12kw-314ah",
    label: "12kwh + 314ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "12kwh + 314ah Battery Hybrid",
        netPrice: 585000,
        discountedPrice: 545000,
        panelQty: 20,
        inverterKw: 12,
        battery: "314AH 16kWh battery",
        batteryCapacity: "316ah",
        accessories: {
          railings: 24,
          lfoot: 72,
          midclamp: 48,
          endclamp: 24,
          dcMcb: 3,
          dcSpd: 2,
          acMcb: 3,
          acSpd: 1,
          mc4: 30,
          pvWireRolls: 2,
          hdpeName: "32mm HDPE",
          cableTray: 0,
        },
      }),
  },
  {
    id: "12kw-628ah",
    label: "12kwh + 628ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "12kwh + 628ah Battery Hybrid",
        netPrice: 745000,
        discountedPrice: 685000,
        panelQty: 20,
        inverterKw: 12,
        battery: "2 pcs 314AH 16kWh battery",
        batteryQty: 2,
        batteryMaterial: "314AH 16kWh Battery",
        batteryCapacity: "628ah",
        accessories: {
          railings: 20,
          lfoot: 60,
          midclamp: 40,
          endclamp: 20,
          dcMcb: 2,
          dcSpd: 2,
          acMcb: 3,
          acSpd: 2,
          mc4: 30,
          pvWireRolls: 2,
          hdpeName: "30mm HDPE",
        },
      }),
  },
  {
    id: "16kw-628ah",
    label: "16kw + 628ah Battery Hybrid",
    build: () =>
      buildPackage({
        packageName: "16kw + 628ah Battery Hybrid",
        netPrice: 840000,
        discountedPrice: 735000,
        panelQty: 28,
        inverterKw: 16,
        battery: "2 pcs 314AH 16kWh battery",
        batteryQty: 2,
        batteryMaterial: "314AH 16kWh Battery",
        batteryCapacity: "628ah",
        accessories: {
          railings: 28,
          lfoot: 84,
          midclamp: 56,
          endclamp: 28,
          dcMcb: 2,
          dcMcbName: "40A DC MCB",
          dcSpd: 2,
          acMcb: 3,
          acSpd: 2,
          mc4: 30,
          hdpeName: "32mm HDPE",
        },
      }),
  },
  {
    id: "blank",
    label: "Blank / custom package",
    build: () => {
      const d = buildPackage({
        packageName: "",
        netPrice: 0,
        discountedPrice: 0,
        panelQty: 0,
        inverterKw: 0,
        battery: "",
        batteryCapacity: "",
        accessories: {
          railings: 0,
          lfoot: 0,
          midclamp: 0,
          endclamp: 0,
          dcMcb: 0,
          dcSpd: 0,
          acMcb: 0,
          acSpd: 0,
          mc4: 0,
        },
      });
      // Start with empty inclusions/details so nothing misleading is pre-filled.
      d.products = d.products.map((p) => ({
        ...p,
        inclusion: "",
        details: "",
        materials: p.materials.map((m) => ({ ...m, checked: false })),
      }));
      return d;
    },
  },
];

/** Package pre-selected when creating a new solar quotation. */
export const DEFAULT_SOLAR_PACKAGE_ID = "6kw-314ah";

/** Fresh template pre-filled with the default package. */
export function defaultSolarQuote(): SolarQuoteData {
  const preset =
    SOLAR_PACKAGE_PRESETS.find((p) => p.id === DEFAULT_SOLAR_PACKAGE_ID) ??
    SOLAR_PACKAGE_PRESETS[0];
  return preset.build();
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
