// FUTEX EV Charger Installation / Commissioning Checklist.
// This config drives both the on-site form and the generated PDF.

export interface CommField {
  key: string;
  label: string;
  type: "text" | "check";
}

export interface CommSubsection {
  title?: string;
  fields: CommField[];
}

export interface CommSection {
  num: number;
  title: string;
  subsections: CommSubsection[];
}

export const COMMISSIONING_SECTIONS: CommSection[] = [
  {
    num: 1,
    title: "Pre-Site Survey & Client Assessment",
    subsections: [
      {
        title: "A. Client & Project Information",
        fields: [
          { key: "client_name", label: "Client Name", type: "text" },
          { key: "installation_date", label: "Installation Date", type: "text" },
          { key: "site_address", label: "Site Address", type: "text" },
          { key: "contact_person", label: "Contact Person & Number", type: "text" },
          { key: "charger_model", label: "Charger Brand / Model", type: "text" },
          { key: "charge_type", label: "Charge Type (AC / DC Fast Charger)", type: "text" },
          { key: "rated_power", label: "Rated Power (kW)", type: "text" },
          { key: "phase_supply", label: "Single Phase / Three Phase", type: "text" },
        ],
      },
      {
        title: "B. Electrical Capacity Assessment",
        fields: [
          { key: "service_voltage", label: "Service voltage (230V / 400V etc.)", type: "text" },
          { key: "main_breaker", label: "Main breaker rating (Amps)", type: "text" },
          { key: "wire_used", label: "Wire used / per meter", type: "text" },
          { key: "total_load", label: "Total connected load (kW)", type: "text" },
          { key: "ev_demand", label: "EV charger demand (kW)", type: "text" },
          { key: "rcbo_amps", label: "RCBO amps", type: "text" },
        ],
      },
    ],
  },
  {
    num: 2,
    title: "Location & Mounting Inspection",
    subsections: [
      {
        title: "A. Mounting Area",
        fields: [
          { key: "wall_suitable", label: "Wall structure suitable (Concrete / Steel / Masonry)", type: "check" },
          { key: "mounting_height", label: "Mounting height compliant (1.2–1.5m to connector)", type: "check" },
          { key: "working_clearance", label: "Adequate working clearance", type: "check" },
          { key: "flood_protected", label: "Protected from flooding", type: "check" },
          { key: "water_spray", label: "Not exposed to direct heavy water spray", type: "check" },
          { key: "metal_enclosure", label: "Metal Protection Enclosure Installed (Optional)", type: "check" },
        ],
      },
      {
        title: "B. Environmental Check",
        fields: [
          { key: "ip_rating", label: "Indoor / Outdoor rated enclosure (IP rating verified)", type: "check" },
          { key: "ventilation", label: "Ventilation adequate", type: "check" },
        ],
      },
    ],
  },
  {
    num: 3,
    title: "Electrical Installation Checklist",
    subsections: [
      {
        title: "A. Cabling",
        fields: [
          { key: "phase_cabling", label: "Single Phase / Three Phase", type: "check" },
          { key: "cable_size", label: "Correct cable size (ampacity & voltage drop)", type: "check" },
          { key: "cable_type", label: "Cable type (THHN / XLPE / armored if underground)", type: "check" },
          { key: "conduit_secured", label: "Conduit properly secured", type: "check" },
          { key: "no_exposed", label: "No exposed wiring", type: "check" },
          { key: "gland_sealed", label: "Cable gland properly sealed", type: "check" },
          { key: "phase_rotation", label: "Phase rotation correct (for 3-phase)", type: "check" },
        ],
      },
      {
        title: "B. Circuit Protection",
        fields: [
          { key: "two_way", label: "Two Ways Electrical Security System", type: "check" },
          { key: "three_way", label: "Three Ways Electrical Security System", type: "check" },
          { key: "rcbo_protection", label: "RCBO with Overcurrent Protection (Amps)", type: "text" },
        ],
      },
      {
        title: "C. Grounding",
        fields: [
          { key: "grounding_conductor", label: "Equipment grounding conductor installed", type: "check" },
          { key: "bonding", label: "Bonding verified", type: "check" },
          { key: "ground_rod", label: "Ground rod condition checked", type: "check" },
        ],
      },
    ],
  },
  {
    num: 4,
    title: "Network & Smart Function (If Applicable)",
    subsections: [
      {
        fields: [
          { key: "wifi", label: "WiFi signal tested", type: "check" },
          { key: "rfid", label: "RFID (If applicable)", type: "check" },
          { key: "ocpp", label: "OCPP configured (if commercial)", type: "check" },
          { key: "load_mgmt", label: "Load management configured", type: "check" },
          { key: "app_setup", label: "App setup completed", type: "check" },
        ],
      },
    ],
  },
  {
    num: 5,
    title: "Testing & Commissioning",
    subsections: [
      {
        title: "A. Electrical Testing",
        fields: [
          { key: "insulation", label: "Insulation resistance test", type: "check" },
          { key: "voltage_meas", label: "Voltage measurement (L-N / L-L)", type: "check" },
          { key: "continuity", label: "Continuity test", type: "check" },
          { key: "load_test", label: "Load test performed", type: "check" },
        ],
      },
      {
        title: "B. Charger Functional Test",
        fields: [
          { key: "charge_start", label: "Charging starts normally", type: "check" },
          { key: "no_overheat", label: "No overheating / breaker trips after 5–10 min load test", type: "check" },
          { key: "charge_stop", label: "Charging stops correctly", type: "check" },
          { key: "error_codes", label: "Error codes checked", type: "check" },
          { key: "led", label: "LED indicators functioning", type: "check" },
        ],
      },
    ],
  },
  {
    num: 6,
    title: "Optional (High-End / Commercial Projects)",
    subsections: [
      {
        fields: [
          { key: "smart_app", label: "FUTEX Smart Application", type: "check" },
          { key: "switch_control", label: "Switch Controlled System", type: "check" },
          { key: "energy_meter", label: "Energy meter installed", type: "check" },
          { key: "billing", label: "Billing system integrated", type: "check" },
        ],
      },
    ],
  },
];

export type CommValues = Record<string, string | boolean>;

// ---------------------------------------------------------------------------
// Warranty Terms & Conditions (second form)
// ---------------------------------------------------------------------------
export interface WarrantyBlock {
  text: string;
  bullet?: boolean;
  bold?: boolean;
}
export interface WarrantySection {
  title: string;
  blocks: WarrantyBlock[];
}

export const WARRANTY_SECTIONS: WarrantySection[] = [
  {
    title: "A. Warranty Coverage (1 Year – Workmanship)",
    blocks: [
      {
        text: "We provide a one (1) year warranty on workmanship from the date of installation. This warranty covers any issues arising from installation errors or faults directly caused by our installation team, including wiring connections and related installation works.",
      },
      {
        text: "If any component directly related to the installation (such as breakers, connectors, or wiring installed by us) requires replacement due to installer fault, it will be repaired or replaced at no additional cost within the warranty period.",
      },
    ],
  },
  {
    title: "B. Scope Limitation",
    blocks: [
      {
        text: "This warranty strictly covers the installation line and workmanship only. Any issues occurring outside the installed electrical line, including but not limited to:",
      },
      { text: "Main supply problems", bullet: true },
      { text: "Utility provider issues", bullet: true },
      { text: "Power fluctuations or surges", bullet: true },
      { text: "Existing panelboard defects", bullet: true },
      { text: "Customer-modified circuits", bullet: true },
      { text: "Equipment not supplied or installed by us", bullet: true },
      { text: "are not covered under this warranty.", bold: true },
    ],
  },
  {
    title: "C. Exclusions & Void of Warranty",
    blocks: [
      { text: "The warranty shall be considered void under the following conditions:" },
      {
        text: "Any alteration, modification, or tampering of the installed wiring or components by third parties",
        bullet: true,
      },
      { text: "Unauthorized repair or adjustment", bullet: true },
      {
        text: "Physical damage due to misuse, negligence, flooding, fire, or natural disasters",
        bullet: true,
      },
      {
        text: "Installation of additional loads on the dedicated EV charging line without our approval",
        bullet: true,
      },
      {
        text: "If the installed line is modified or handled by another electrician or contractor, the warranty coverage will automatically be void.",
      },
    ],
  },
  {
    title: "4. Technical Support",
    blocks: [
      {
        text: "Our official Facebook Page and Viber account are available 24/7 for technical support and assistance. Clients may contact us anytime for concerns, troubleshooting guidance, or warranty claims.",
      },
    ],
  },
];
