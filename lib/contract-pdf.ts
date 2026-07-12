import { jsPDF } from "jspdf";

export interface ContractPdfOpts {
  client: { name: string; address: string; contact: string };
  supplier: { name: string; address: string; contact: string };
  finalAgreedPrice: number;
  duration: string;
  site: string;
  paymentTerm: string;
  supplierRep: string;
  customerRep: string;
  startOfContract: string; // display string, e.g. "June 10, 2026"
  dateOfDelivery: string;
  warranty: string[];
  bank: { name: string; accountName: string; accountNumber: string };
  scope: string[];
  logo: string | null; // PNG data URL
}

const MARGIN = 44;
const BRAND: [number, number, number] = [10, 77, 162]; // #0a4da2

function peso(n: number): string {
  return (
    "PHP " +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Build the branded FUTEX "INSTALLATION CONTRACT" PDF. Returns a Blob. */
export function buildContractPdf(o: ContractPdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  const need = (h: number) => {
    if (y + h > H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const banner = (title: string) => {
    need(34);
    y += 6;
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.rect(MARGIN, y, contentW, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255);
    doc.text(title, MARGIN + 8, y + 14);
    doc.setTextColor(0);
    y += 28;
  };

  const paragraph = (text: string, size = 9.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    need(lines.length * (size + 3));
    doc.text(lines, MARGIN, y + size);
    y += lines.length * (size + 3) + 4;
    doc.setTextColor(0);
  };

  // A "Label : value" bullet row.
  const bulletField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    need(16);
    doc.text("•", MARGIN + 6, y + 9);
    doc.text(label, MARGIN + 18, y + 9);
    const lx = MARGIN + 170;
    doc.text(":", lx, y + 9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentW - (lx + 8 - MARGIN)) as string[];
    doc.text(lines, lx + 8, y + 9);
    y += Math.max(16, lines.length * 12) + 2;
  };

  const bullets = (lines: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    for (const raw of lines) {
      const t = raw.trim();
      if (!t) continue;
      const wrapped = doc.splitTextToSize(t, contentW - 20) as string[];
      need(wrapped.length * 12 + 2);
      doc.text("•", MARGIN + 6, y + 9);
      doc.text(wrapped, MARGIN + 18, y + 9);
      y += wrapped.length * 12 + 3;
    }
    doc.setTextColor(0);
  };

  // A bordered info box with "Label: value" rows.
  const infoBox = (rows: [string, string][]) => {
    const rowH = 18;
    const h = rows.length * rowH + 8;
    need(h);
    doc.setDrawColor(150);
    doc.rect(MARGIN, y, contentW, h);
    let ry = y + 6;
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`${label}:`, MARGIN + 8, ry + 9);
      doc.setFont("helvetica", "normal");
      const val = doc.splitTextToSize(value || "—", contentW - 130) as string[];
      doc.text(val[0] ?? "", MARGIN + 120, ry + 9);
      ry += rowH;
    }
    y += h + 8;
  };

  // ---- Header ----
  if (o.logo) {
    try {
      doc.addImage(o.logo, "PNG", MARGIN, y, 110, 36);
    } catch {
      /* ignore */
    }
  }
  y += 44;
  banner("INSTALLATION CONTRACT");

  // ---- Parties ----
  infoBox([
    ["Client Name", o.client.name],
    ["Address", o.client.address],
    ["Contact Number", o.client.contact],
  ]);
  infoBox([
    ["Supplier", o.supplier.name],
    ["Address", o.supplier.address],
    ["Contact Number", o.supplier.contact],
  ]);

  // ---- Purchase Price and Service Fees ----
  banner("Purchase Price and Service Fees:");
  paragraph(
    "Customer agrees to pay Supplier for the equipment, and/or related services, the amounts set forth and in accordance with the payment terms outlined in the contract.",
  );
  bulletField("Final Agreed Price", peso(o.finalAgreedPrice));
  bulletField("Duration", o.duration);
  bulletField("Site", o.site);
  bulletField("Payment Term", o.paymentTerm);

  // ---- Authorized Representatives ----
  banner("Authorized Representatives:");
  paragraph(
    "The below authorized representative of Supplier and Customer can approve change/variant orders",
  );
  bulletField("Supplier's Representative", o.supplierRep);
  bulletField("Customer's Representative", o.customerRep);

  // ---- Key Dates ----
  banner("Key Dates:");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  need(34);
  doc.text(`Start of Contract: ${o.startOfContract}`, MARGIN, y + 10);
  y += 16;
  doc.text(`Date of Delivery: ${o.dateOfDelivery}`, MARGIN, y + 10);
  y += 20;

  // ---- Page 2 ----
  doc.addPage();
  y = MARGIN;
  if (o.logo) {
    try {
      doc.addImage(o.logo, "PNG", MARGIN, y, 110, 36);
    } catch {
      /* ignore */
    }
  }
  y += 44;

  banner("Warranty");
  bullets(o.warranty);

  banner("Bank Details");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  need(48);
  doc.text(o.bank.name, MARGIN, y + 10);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Name: ${o.bank.accountName}`, MARGIN, y + 10);
  y += 14;
  doc.text(`Account number: ${o.bank.accountNumber}`, MARGIN, y + 10);
  y += 20;

  banner("Scope of Works and BOQ:");
  bullets(o.scope);

  // ---- Witness / signatures ----
  need(120);
  y += 8;
  paragraph(
    "IN WITNESS WHEREOF, the undersigned have cause this order to be duly executed by their duly authorized representatives.",
    9.5,
  );
  y += 30;
  const colW = contentW / 2;
  const signY = y + 24;
  doc.setDrawColor(120);
  doc.line(MARGIN, signY, MARGIN + colW - 30, signY);
  doc.line(MARGIN + colW, signY, MARGIN + contentW, signY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(o.customerRep, MARGIN, signY + 14);
  doc.text(o.supplierRep, MARGIN + colW, signY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text("Customer/Owner", MARGIN, signY + 26);
  doc.text("Service Provider", MARGIN + colW, signY + 26);
  doc.setTextColor(0);

  return doc.output("blob");
}
