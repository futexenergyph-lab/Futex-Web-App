// =============================================================================
// Installation cost templates (capital per install) — mirrors the owner's
// "cost of installation" sheets. Loading a package into a client's Financial
// Report pre-fills these lines with their default amounts; every line stays
// editable and additional expenses can be added below.
// =============================================================================

export interface PackageCostLine {
  expense_type: string;
  description: string;
  amount: number;
}

const LABOR: PackageCostLine[] = [
  { expense_type: "Labor", description: "Installation Team", amount: 5000 },
  { expense_type: "Food", description: "lunch", amount: 0 },
];

// Standard material list, in sheet order.
const BASE_MATERIALS: PackageCostLine[] = [
  { expense_type: "Materials", description: "10 meters no. 8 wire", amount: 1000 },
  { expense_type: "Materials", description: "5 meter no. 10 wire", amount: 250 },
  { expense_type: "Materials", description: "Clamp 10pcs", amount: 50 },
  { expense_type: "Materials", description: "RCBO Box 8 way", amount: 450 },
  { expense_type: "Materials", description: "PVC Fitting 3/4 & 1/2 6pcs", amount: 198 },
  { expense_type: "Materials", description: "Nail Gun", amount: 80 },
  { expense_type: "Materials", description: "15 meters Liquid Tight", amount: 600 },
  { expense_type: "Materials", description: "Nema 3R Outdoor Case", amount: 350 },
  { expense_type: "Materials", description: "60A Breaker", amount: 750 },
  { expense_type: "Materials", description: "RCBO 40A", amount: 460 },
  { expense_type: "Materials", description: "Ground Rod", amount: 700 },
];

// Smart list = standard with the Smart Breaker inserted after the RCBO Box.
const SMART_MATERIALS: PackageCostLine[] = [
  ...BASE_MATERIALS.slice(0, 4),
  { expense_type: "Materials", description: "Smart Breaker 40A", amount: 460 },
  ...BASE_MATERIALS.slice(4),
];

const GLASS_ENCLOSURE: PackageCostLine = {
  expense_type: "Materials",
  description: "Glass Enclosure",
  amount: 4000,
};
const METAL_STAND: PackageCostLine = {
  expense_type: "Materials",
  description: "Metal Stand",
  amount: 2420,
};
const FUTEX_CHARGER: PackageCostLine = {
  expense_type: "Materials",
  description: "Futex Smart Charger",
  amount: 6470,
};

export interface InstallationPackage {
  id: string;
  label: string;
  lines: PackageCostLine[];
}

export const INSTALLATION_PACKAGES: InstallationPackage[] = [
  {
    id: "standard",
    label: "Standard Installation",
    lines: [...LABOR, ...BASE_MATERIALS],
  },
  {
    id: "smart",
    label: "Smart Installation",
    lines: [...LABOR, ...SMART_MATERIALS],
  },
  {
    id: "smart-enclosure",
    label: "Smart Installation with Enclosure",
    lines: [...LABOR, ...SMART_MATERIALS, GLASS_ENCLOSURE],
  },
  {
    id: "smart-enclosure-stand",
    label: "Smart Installation with Enclosure & Stand",
    lines: [...LABOR, ...SMART_MATERIALS, GLASS_ENCLOSURE, METAL_STAND],
  },
  {
    id: "futex-installation",
    label: "Futex Charger with Installation",
    lines: [...LABOR, ...BASE_MATERIALS, FUTEX_CHARGER],
  },
  {
    id: "futex-enclosure",
    label: "Futex Charger with Enclosure",
    lines: [...LABOR, ...BASE_MATERIALS, GLASS_ENCLOSURE, FUTEX_CHARGER],
  },
  {
    id: "futex-enclosure-stand",
    label: "Futex Charger with Enclosure & Stand",
    lines: [...LABOR, ...BASE_MATERIALS, GLASS_ENCLOSURE, FUTEX_CHARGER, METAL_STAND],
  },
];

export function packageTotal(p: InstallationPackage): number {
  return p.lines.reduce((t, l) => t + l.amount, 0);
}
