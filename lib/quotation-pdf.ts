import { jsPDF } from "jspdf";

export interface QuoteItem {
  description: string;
  qty: number;
  unit_price: number;
}

export interface QuotationPdfOpts {
  quoteNo: string;
  date: string; // e.g. "JULY 2, 2026"
  type: "ev" | "solar";
  validityDays: number;
  client: {
    name: string;
    address: string;
    contact: string;
    email: string;
  };
  items: QuoteItem[];
  subtotal: number;
  vatEnabled: boolean;
  vat: number;
  total: number;
  notes: string;
  preparedByName: string;
  company: {
    legalName: string;
    address: string;
    phones: string[];
    doeNumber: string;
  };
  logo: string | null; // PNG data URL
}

const MARGIN = 40;
const BORDER = 170;
const BRAND: [number, number, number] = [10, 77, 162]; // #0a4da2

function peso(n: number): string {
  return "PHP " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TITLES: Record<"ev" | "solar", string> = {
  ev: "EV CHARGER INSTALLATION QUOTATION",
  solar: "SOLAR SOLUTION QUOTATION",
};

/** Build the branded FUTEX quotation PDF. Returns a Blob. */
export function buildQuotationPdf(o: QuotationPdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  // ---- Header: logo + company block ----
  if (o.logo) {
    try {
      doc.addImage(o.logo, "PNG", MARGIN, y, 120, 40);
    } catch {
      /* ignore */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(o.company.legalName, W - MARGIN, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  const addrLines = doc.splitTextToSize(o.company.address, 240) as string[];
  doc.text(addrLines, W - MARGIN, y + 22, { align: "right" });
  let hy = y + 22 + addrLines.length * 11;
  doc.text(o.company.phones.join("  •  "), W - MARGIN, hy, { align: "right" });
  hy += 11;
  doc.text(`DOE Accreditation: ${o.company.doeNumber}`, W - MARGIN, hy, {
    align: "right",
  });
  y = Math.max(y + 44, hy) + 16;

  // ---- Title bar ----
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(MARGIN, y, contentW, 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255);
  doc.text(TITLES[o.type], MARGIN + 12, y + 20);
  y += 30;

  // ---- Quote meta (no / date / validity) ----
  doc.setTextColor(0);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(BORDER);
  const metaH = 20;
  doc.rect(MARGIN, y, contentW, metaH);
  doc.setFont("helvetica", "bold");
  doc.text(`Quotation No: ${o.quoteNo}`, MARGIN + 8, y + 14);
  doc.text(`Date: ${o.date}`, MARGIN + contentW / 2, y + 14);
  doc.text(`Valid for: ${o.validityDays} days`, W - MARGIN - 8, y + 14, {
    align: "right",
  });
  y += metaH + 14;

  // ---- Bill to ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text("PREPARED FOR", MARGIN, y);
  y += 14;
  doc.setTextColor(0);
  doc.setFontSize(10.5);
  doc.text(o.client.name || "—", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  let by = y + 13;
  if (o.client.address) {
    const cl = doc.splitTextToSize(o.client.address, contentW) as string[];
    doc.text(cl, MARGIN, by);
    by += cl.length * 11;
  }
  const contactBits = [o.client.contact, o.client.email].filter(Boolean);
  if (contactBits.length) {
    doc.text(contactBits.join("  •  "), MARGIN, by);
    by += 11;
  }
  y = by + 8;

  // ---- Items table ----
  const colAmt = 100;
  const colUnit = 100;
  const colQty = 44;
  const colDesc = contentW - colAmt - colUnit - colQty;
  const xDesc = MARGIN;
  const xQty = xDesc + colDesc;
  const xUnit = xQty + colQty;
  const xAmt = xUnit + colUnit;

  const headH = 22;
  doc.setFillColor(235, 240, 248);
  doc.rect(MARGIN, y, contentW, headH, "F");
  doc.setDrawColor(BORDER);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("DESCRIPTION", xDesc + 8, y + 15);
  doc.text("QTY", xQty + colQty / 2, y + 15, { align: "center" });
  doc.text("UNIT PRICE", xUnit + colUnit - 8, y + 15, { align: "right" });
  doc.text("AMOUNT", xAmt + colAmt - 8, y + 15, { align: "right" });
  y += headH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const it of o.items) {
    const descLines = doc.splitTextToSize(
      it.description || "—",
      colDesc - 16,
    ) as string[];
    const rowH = Math.max(20, descLines.length * 12 + 8);
    doc.rect(xDesc, y, colDesc, rowH);
    doc.rect(xQty, y, colQty, rowH);
    doc.rect(xUnit, y, colUnit, rowH);
    doc.rect(xAmt, y, colAmt, rowH);
    doc.text(descLines, xDesc + 8, y + 14);
    doc.text(String(it.qty), xQty + colQty / 2, y + 14, { align: "center" });
    doc.text(peso(it.unit_price), xUnit + colUnit - 8, y + 14, {
      align: "right",
    });
    doc.text(peso(it.qty * it.unit_price), xAmt + colAmt - 8, y + 14, {
      align: "right",
    });
    y += rowH;
  }

  // ---- Totals ----
  const labelX = xUnit;
  const drawTotal = (label: string, value: string, bold = false) => {
    const h = 20;
    doc.rect(labelX, y, colUnit, h);
    doc.rect(xAmt, y, colAmt, h);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.text(label, labelX + colUnit - 8, y + 14, { align: "right" });
    doc.text(value, xAmt + colAmt - 8, y + 14, { align: "right" });
    y += h;
  };
  drawTotal("Subtotal", peso(o.subtotal));
  if (o.vatEnabled) drawTotal("VAT (12%)", peso(o.vat));
  doc.setFillColor(235, 240, 248);
  doc.rect(labelX, y, colUnit + colAmt, 22, "F");
  drawTotal("TOTAL", peso(o.total), true);
  y += 16;

  // ---- Notes ----
  if (o.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0);
    doc.text("Notes / Terms", MARGIN, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    const nl = doc.splitTextToSize(o.notes, contentW) as string[];
    doc.text(nl, MARGIN, y);
    y += nl.length * 11 + 10;
  }

  // ---- Prepared by ----
  y += 20;
  doc.setDrawColor(120);
  doc.line(MARGIN, y, MARGIN + 200, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(o.preparedByName || "—", MARGIN, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text("Prepared by (FUTEX authorized representative)", MARGIN, y + 26);

  // ---- Footer ----
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "This quotation is an estimate and is subject to a final site assessment. Prices are valid within the stated period.",
    W / 2,
    H - MARGIN + 6,
    { align: "center", maxWidth: contentW },
  );

  return doc.output("blob");
}
