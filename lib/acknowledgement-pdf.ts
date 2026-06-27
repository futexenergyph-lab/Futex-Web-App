import { jsPDF } from "jspdf";

export interface AckParticular {
  qty?: string;
  label: string;
  unitPrice: number | null;
}

export interface AckPdfOpts {
  date: string; // e.g. "JUNE 27, 2026"
  customerName: string;
  address: string;
  contact: string;
  particulars: AckParticular[];
  totalAmount: number;
  mop: string; // mode of payment label, e.g. "CASH"
  paymentByName: string;
  paymentBySignature: string | null;
  receivedByName: string;
  receivedBySignature: string | null;
  documentationPhoto: string | null; // data URL
  logo: string | null; // PNG data URL
}

const MARGIN = 40;
const GRAY = 200;
const BORDER = 170;

function peso(n: number): string {
  return n.toLocaleString("en-PH");
}

/** Build the branded FUTEX Acknowledgement Receipt PDF. Returns a Blob. */
export function buildAcknowledgementPdf(o: AckPdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  // ---- Logo ----
  if (o.logo) {
    try {
      doc.addImage(o.logo, "PNG", W / 2 - 70, y, 140, 44);
    } catch {
      /* ignore */
    }
  }
  y += 56;

  // ---- Title + date ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0);
  doc.text("ACKNOWLEDGEMENT RECEIPT", MARGIN, y + 6);
  doc.setFontSize(11);
  doc.text(`DATE: ${o.date}`, W - MARGIN, y, { align: "right" });
  y += 22;

  // ---- Customer name (gray bar) ----
  doc.setFillColor(GRAY, GRAY, GRAY);
  doc.setDrawColor(BORDER);
  doc.rect(MARGIN, y, contentW, 26, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`CUSTOMER NAME: ${o.customerName}`, MARGIN + 8, y + 17);
  y += 26;

  // ---- Address | Contact row ----
  const addrLines = doc.splitTextToSize(
    `ADDRESS: ${o.address}`,
    contentW / 2 - 16,
  ) as string[];
  const rowH = Math.max(40, addrLines.length * 13 + 18);
  const half = contentW / 2;
  doc.setDrawColor(BORDER);
  doc.rect(MARGIN, y, half, rowH);
  doc.rect(MARGIN + half, y, half, rowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(addrLines, MARGIN + 8, y + 16);
  doc.text(`CONTACT #: ${o.contact}`, MARGIN + half + 8, y + 16);
  y += rowH + 14;

  // ---- Particulars table ----
  const colQty = 70;
  const colUnit = 110;
  const colAmt = 110;
  const colPart = contentW - colQty - colUnit - colAmt;
  const xQty = MARGIN;
  const xPart = xQty + colQty;
  const xUnit = xPart + colPart;
  const xAmt = xUnit + colUnit;

  const headH = 28;
  doc.setDrawColor(BORDER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.rect(xQty, y, colQty, headH);
  doc.rect(xPart, y, colPart, headH);
  doc.rect(xUnit, y, colUnit, headH);
  doc.rect(xAmt, y, colAmt, headH);
  doc.text("QTY", xQty + colQty / 2, y + 18, { align: "center" });
  doc.text("PARTICULARS", xPart + colPart / 2, y + 18, { align: "center" });
  doc.text("UNIT PRICE", xUnit + colUnit / 2, y + 18, { align: "center" });
  doc.text("AMOUNT", xAmt + colAmt / 2, y + 18, { align: "center" });
  y += headH;

  // Body — a single tall row with stacked particular lines, the total shown
  // once in the AMOUNT column (mirrors the sample receipt).
  const lineH = 22;
  const bodyPad = 16;
  const bodyH = Math.max(150, o.particulars.length * lineH + bodyPad * 2);
  doc.rect(xQty, y, colQty, bodyH);
  doc.rect(xPart, y, colPart, bodyH);
  doc.rect(xUnit, y, colUnit, bodyH);
  doc.rect(xAmt, y, colAmt, bodyH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  let ty = y + bodyPad + 8;
  for (const p of o.particulars) {
    const partLines = doc.splitTextToSize(p.label, colPart - 16) as string[];
    doc.text(partLines, xPart + colPart / 2, ty, { align: "center" });
    if (p.qty) doc.text(p.qty, xQty + colQty / 2, ty, { align: "center" });
    if (p.unitPrice != null)
      doc.text(peso(p.unitPrice), xUnit + colUnit / 2, ty, { align: "center" });
    ty += Math.max(lineH, partLines.length * 13);
  }
  // Total amount, vertically centered in the AMOUNT column.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(peso(o.totalAmount), xAmt + colAmt / 2, y + bodyH / 2 + 4, {
    align: "center",
  });
  y += bodyH;

  // MOP row
  const mopH = 26;
  doc.rect(xQty, y, colQty + colPart + colUnit, mopH);
  doc.rect(xAmt, y, colAmt, mopH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`MOP:  ${o.mop}`, xUnit + colUnit - 8, y + 17, { align: "right" });
  doc.text(peso(o.totalAmount), xAmt + colAmt / 2, y + 17, { align: "center" });
  y += mopH + 12;

  // ---- Acknowledgement text ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const ack =
    "Acknowledged receipt of the above amount as payment for Electric Vehicle Installation and related charges at FUTEX Philippines Development Corporation.";
  const ackLines = doc.splitTextToSize(ack, contentW) as string[];
  doc.text(ackLines, MARGIN, y + 10);
  y += ackLines.length * 14 + 14;

  // ---- Signatures: PAYMENT BY (left) / RECEIVED BY (right) ----
  const sigTop = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("PAYMENT BY:", MARGIN + 20, sigTop);
  doc.text("RECEIVED BY:", MARGIN + half + 20, sigTop);

  const sigImgY = sigTop + 6;
  if (o.paymentBySignature) {
    try {
      doc.addImage(o.paymentBySignature, "PNG", MARGIN + 20, sigImgY, 150, 46);
    } catch {
      /* ignore */
    }
  }
  if (o.receivedBySignature) {
    try {
      doc.addImage(
        o.receivedBySignature,
        "PNG",
        MARGIN + half + 20,
        sigImgY,
        150,
        46,
      );
    } catch {
      /* ignore */
    }
  }
  let sy = sigImgY + 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  if (o.paymentByName) doc.text(o.paymentByName, MARGIN + 20, sy);
  if (o.receivedByName) doc.text(o.receivedByName, MARGIN + half + 20, sy);
  sy += 13;
  doc.setDrawColor(120);
  doc.line(MARGIN + 20, sy - 24, MARGIN + 20 + 180, sy - 24);
  doc.line(MARGIN + half + 20, sy - 24, MARGIN + half + 20 + 180, sy - 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Signature over printed name", MARGIN + 20, sy);
  doc.text("Signature over printed name", MARGIN + half + 20, sy);
  y = sy + 20;

  // ---- DOCUMENTATION ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DOCUMENTATION", MARGIN, y + 6);
  y += 18;
  if (o.documentationPhoto) {
    try {
      const props = doc.getImageProperties(o.documentationPhoto);
      const maxW = 260;
      const maxH = 320;
      let w = props.width;
      let h = props.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = w * scale;
      h = h * scale;
      doc.addImage(o.documentationPhoto, W / 2 - w / 2, y + 6, w, h);
    } catch {
      /* ignore bad image */
    }
  }

  return doc.output("blob");
}
