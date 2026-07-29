import { jsPDF } from "jspdf";
import {
  productBullets,
  solarTotal,
  type SolarQuoteData,
} from "@/lib/solar-quote";

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

// =============================================================================
// Solar "DIGITAL QUOTATION" — reproduces the branded sample layout
// (blue section bars, green table headers, product-detail grid, red warranty).
// =============================================================================

export interface SolarQuotationPdfOpts {
  quoteNo: string;
  date: string; // e.g. "JUNE 25, 2026"
  client: { name: string; address: string; contact: string };
  data: SolarQuoteData;
  logo: string | null;
}

const BLUE: [number, number, number] = [46, 96, 176]; // section bars
const GREEN: [number, number, number] = [141, 198, 63]; // table headers
const RED: [number, number, number] = [200, 30, 30];

function pesoAmt(n: number): string {
  return "P" + n.toLocaleString("en-PH");
}

export function buildSolarQuotationPdf(o: SolarQuotationPdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  // Compact, single-page layout. Bullet metrics adapt to the accessory count so
  // the whole quotation — including the red warranty note — stays on one page.
  const products = o.data.products;
  let maxBullets = 0;
  for (const p of products) maxBullets = Math.max(maxBullets, productBullets(p).length);
  // Tighten line height when a product has many bullets (e.g. accessories).
  const bulletLH = maxBullets > 18 ? 8.5 : maxBullets > 12 ? 9.5 : 11;
  const bulletFS = maxBullets > 18 ? 7.5 : 8.5;

  // ---- Logo (centered) ----
  if (o.logo) {
    try {
      doc.addImage(o.logo, "PNG", W / 2 - 50, y, 100, 36);
    } catch {
      /* ignore */
    }
  }
  y += 42;

  // ---- Title bar ----
  const barH = 22;
  doc.setDrawColor(BORDER);
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(MARGIN, y, contentW, barH, "FD");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DIGITAL QUOTATION", W / 2, y + 16, { align: "center" });
  y += barH;

  // ---- Client / date / address / contact grid ----
  doc.setTextColor(0);
  const lab1 = 88;
  const lab2 = 100;
  const val2 = 95;
  const val1 = contentW - lab1 - lab2 - val2;
  const xL1 = MARGIN;
  const xV1 = xL1 + lab1;
  const xL2 = xV1 + val1;
  const xV2 = xL2 + lab2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const nameLines = doc.splitTextToSize(o.client.name || "—", val1 - 12) as string[];
  const r1H = Math.max(22, nameLines.length * 12 + 8);
  doc.rect(xL1, y, lab1, r1H);
  doc.rect(xV1, y, val1, r1H);
  doc.rect(xL2, y, lab2, r1H);
  doc.rect(xV2, y, val2, r1H);
  doc.text("Client Name:", xV1 - 6, y + r1H / 2 + 3.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(nameLines, xV1 + val1 / 2, y + r1H / 2 + 3.5 - (nameLines.length - 1) * 6, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.text("Date:", xV2 - 6, y + r1H / 2 + 3.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(o.date, xV2 + val2 / 2, y + r1H / 2 + 3.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  y += r1H;

  const addrLines = doc.splitTextToSize(o.client.address || "—", val1 - 12) as string[];
  const r2H = Math.max(24, addrLines.length * 12 + 8);
  doc.rect(xL1, y, lab1, r2H);
  doc.rect(xV1, y, val1, r2H);
  doc.rect(xL2, y, lab2, r2H);
  doc.rect(xV2, y, val2, r2H);
  doc.text("Address:", xV1 - 6, y + r2H / 2 + 3.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(addrLines, xV1 + val1 / 2, y + r2H / 2 + 3.5 - (addrLines.length - 1) * 6, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.text("Contact Number:", xV2 - 6, y + r2H / 2 + 3.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(o.client.contact || "—", xV2 + val2 / 2, y + r2H / 2 + 3.5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  y += r2H + 10;

  // ---- Section bar helper ----
  const sectionBar = (label: string) => {
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(MARGIN, y, contentW, barH, "FD");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(label, W / 2, y + 15, { align: "center" });
    doc.setTextColor(0);
    y += barH;
  };

  // ================= A. PROPOSED COST =================
  sectionBar("A. PROPOSED COST");
  const cPkg = 100, cNo = 80, cNet = 120, cDisc = 110;
  const cTot = contentW - cPkg - cNo - cNet - cDisc;
  const xPkg = MARGIN, xNo = xPkg + cPkg, xNet = xNo + cNo, xDisc = xNet + cNet, xTot = xDisc + cDisc;
  const gH = 20;
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.rect(xPkg, y, contentW, gH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Package", xPkg + cPkg / 2, y + 14, { align: "center" });
  doc.text("No. of Package", xNo + cNo / 2, y + 14, { align: "center" });
  doc.text("Nert Price/ Package", xNet + cNet / 2, y + 14, { align: "center" });
  doc.text("Discounted Price", xDisc + cDisc / 2, y + 14, { align: "center" });
  doc.text("TOTAL", xTot + cTot / 2, y + 14, { align: "center" });
  y += gH;

  doc.setFontSize(10);
  for (const r of o.data.proposedCost) {
    const rowH = 26;
    doc.rect(xPkg, y, cPkg, rowH);
    doc.rect(xNo, y, cNo, rowH);
    doc.rect(xNet, y, cNet, rowH);
    doc.rect(xDisc, y, cDisc, rowH);
    doc.rect(xTot, y, cTot, rowH);
    const ty = y + rowH / 2 + 3.5;
    doc.setFont("helvetica", "bold");
    doc.text(r.packageName || "—", xPkg + cPkg / 2, ty, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(String(r.noOfPackage), xNo + cNo / 2, ty, { align: "center" });
    doc.text(`${pesoAmt(r.netPrice)}/Package`, xNet + cNet / 2, ty, { align: "center" });
    doc.text(pesoAmt(r.discountedPrice), xDisc + cDisc / 2, ty, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(pesoAmt(r.noOfPackage * r.discountedPrice), xTot + cTot / 2, ty, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    y += rowH;
  }
  const grand = solarTotal(o.data);
  if (o.data.proposedCost.length > 1) {
    const rowH = 22;
    doc.rect(xPkg, y, cPkg + cNo + cNet, rowH);
    doc.rect(xDisc, y, cDisc, rowH);
    doc.rect(xTot, y, cTot, rowH);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", xDisc + cDisc - 8, y + 14, { align: "right" });
    doc.text(pesoAmt(grand), xTot + cTot / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    y += rowH;
  }
  y += 10;

  // ================= B. PRODUCT DETAIL =================
  sectionBar("B. PRODUCT DETAIL");
  const cProd = 150, cIncl = 150;
  const cDet = contentW - cProd - cIncl;
  const xProd = MARGIN, xIncl = xProd + cProd, xDet = xIncl + cIncl;
  const ph = 20;
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.rect(xProd, y, contentW, ph, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Product", xProd + cProd / 2, y + 14, { align: "center" });
  doc.text("Inclusion", xIncl + cIncl / 2, y + 14, { align: "center" });
  doc.text("Total Product Detail", xDet + cDet / 2, y + 14, { align: "center" });
  y += ph;

  for (const p of o.data.products) {
    const bullets = productBullets(p);
    const inclLines = doc.splitTextToSize(p.inclusion || "", cIncl - 16) as string[];
    doc.setFontSize(bulletFS);
    let bulletLineCount = 0;
    const wrapped: string[][] = bullets.map((b) => {
      const w = doc.splitTextToSize(b, cDet - 26) as string[];
      bulletLineCount += w.length;
      return w;
    });
    const rowH = Math.max(
      34,
      bulletLineCount * bulletLH + 12,
      inclLines.length * 11 + 12,
    );
    doc.setDrawColor(BORDER);
    doc.rect(xProd, y, cProd, rowH);
    doc.rect(xIncl, y, cIncl, rowH);
    doc.rect(xDet, y, cDet, rowH);

    // Product title + brand (centered vertically).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(p.title, cProd - 12) as string[];
    const brandLine = p.brand ? `(${p.brand})` : "";
    const brandWrapped = brandLine
      ? (doc.splitTextToSize(brandLine, cProd - 12) as string[])
      : [];
    const titleBlockH = titleLines.length * 12 + (brandWrapped.length ? brandWrapped.length * 9 + 2 : 0);
    let tY = y + rowH / 2 - titleBlockH / 2 + 9;
    doc.text(titleLines, xProd + cProd / 2, tY, { align: "center" });
    tY += titleLines.length * 12;
    if (brandWrapped.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(brandWrapped, xProd + cProd / 2, tY, { align: "center" });
    }

    // Inclusion (centered).
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(inclLines, xIncl + cIncl / 2, y + rowH / 2 - (inclLines.length - 1) * 5.5 + 3.5, {
      align: "center",
    });

    // Bullets (left aligned).
    doc.setFontSize(bulletFS);
    let by = y + 12;
    for (const w of wrapped) {
      doc.text("•", xDet + 8, by);
      doc.text(w, xDet + 18, by);
      by += w.length * bulletLH;
    }
    y += rowH;
  }
  y += 12;

  // ---- Quotation Terms (left-aligned, bulleted, within margins) ----
  if (o.data.disclaimer) {
    const bodySize = 8.5;
    const lineH = 12;
    const indent = 16;
    doc.setFontSize(bodySize);
    const rendered = o.data.disclaimer
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t) => {
        const bullet = t.startsWith("-") || t.startsWith("*");
        const clean = bullet ? t.replace(/^[-*]\s*/, "") : t;
        const w = bullet ? contentW - indent - 6 : contentW;
        return { lines: doc.splitTextToSize(clean, w) as string[], bullet };
      });
    const totalH =
      22 + rendered.reduce((a, r) => a + r.lines.length * lineH + 3, 0);
    if (y + totalH > H - MARGIN - 16) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text("Quotation Terms", MARGIN, y + 12);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodySize);
    for (const r of rendered) {
      if (r.bullet) {
        doc.text("•", MARGIN + 6, y + 9);
        doc.text(r.lines, MARGIN + indent, y + 9);
      } else {
        doc.text(r.lines, MARGIN, y + 9);
      }
      y += r.lines.length * lineH + 3;
    }
    doc.setTextColor(0);
  }

  // Quote no (small, footer).
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Quotation No: ${o.quoteNo}`, MARGIN, H - MARGIN + 10);

  return doc.output("blob");
}
