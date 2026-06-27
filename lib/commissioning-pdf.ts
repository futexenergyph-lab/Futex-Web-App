import { jsPDF } from "jspdf";
import {
  COMMISSIONING_SECTIONS,
  WARRANTY_SECTIONS,
  type CommValues,
} from "@/lib/commissioning";

export interface PdfOpts {
  values: CommValues;
  clientName: string;
  clientSignature: string | null;
  receivedByName: string;
  receivedBySignature: string | null;
  logo: string | null; // PNG data URL
}

const MARGIN = 40;
const GRAY = 222;
const BORDER = 150;
const FONT = 10;
const LH = 13; // line height

/** Build the branded commissioning checklist + warranty PDF. Returns a Blob. */
export function buildCommissioningPdf(o: PdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  const newPage = () => {
    doc.addPage();
    y = MARGIN;
  };
  const ensure = (h: number) => {
    if (y + h > H - MARGIN) newPage();
  };

  function pageHeader(title: string) {
    if (o.logo) {
      try {
        doc.addImage(o.logo, "PNG", MARGIN, y, 58, 58);
      } catch {
        /* ignore */
      }
    }
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const lines = doc.splitTextToSize(title, contentW - 80) as string[];
    doc.text(lines, W / 2, y + 26, { align: "center" });
    y += Math.max(62, 26 + lines.length * 20) + 8;
  }

  function sectionHeading(text: string) {
    ensure(LH + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(text, MARGIN, y + 10);
    y += LH + 6;
  }

  function bar(title: string) {
    ensure(22);
    doc.setFillColor(GRAY, GRAY, GRAY);
    doc.setDrawColor(BORDER);
    doc.rect(MARGIN, y, contentW, 22, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0);
    doc.text(title, W / 2, y + 14.5, { align: "center" });
    y += 22;
  }

  interface Cell {
    kind: "text" | "check";
    label: string;
    value?: string | boolean;
  }

  function cellLines(c: Cell, avail: number): string[] {
    const text =
      c.kind === "check" ? c.label : `${c.label}: ${(c.value as string) || "—"}`;
    return doc.splitTextToSize(text, avail) as string[];
  }

  function row(cells: Cell[]) {
    const pad = 6;
    const single = cells.length === 1;
    const colW = single ? contentW : contentW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT);
    const heights = cells.map((c) => {
      const avail = colW - pad * 2 - (c.kind === "check" ? 14 : 0);
      return cellLines(c, avail).length * LH + pad * 2;
    });
    const rowH = Math.max(22, ...heights);
    ensure(rowH);
    cells.forEach((c, i) => {
      const x = MARGIN + (single ? 0 : i * colW);
      doc.setDrawColor(BORDER);
      doc.rect(x, y, colW, rowH);
      let tx = x + pad;
      const ty = y + pad + 8;
      if (c.kind === "check") {
        const bx = x + pad;
        const by = y + pad + 1;
        const bs = 9;
        doc.setDrawColor(60);
        doc.rect(bx, by, bs, bs);
        if (c.value) {
          doc.line(bx, by, bx + bs, by + bs);
          doc.line(bx + bs, by, bx, by + bs);
        }
        tx = bx + bs + 6;
      }
      const avail = colW - pad * 2 - (c.kind === "check" ? 14 : 0);
      doc.setTextColor(0);
      doc.text(cellLines(c, avail), tx, ty);
    });
    y += rowH;
  }

  function signatureBlock(
    label: string,
    name: string,
    sig: string | null,
    x: number,
    width: number,
  ) {
    let yy = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(label, x + width / 2, yy, { align: "center" });
    yy += 8;
    if (sig) {
      try {
        doc.addImage(sig, "PNG", x + width / 2 - 70, yy, 140, 56);
      } catch {
        /* ignore */
      }
    }
    yy += 60;
    doc.setDrawColor(80);
    doc.line(x + 20, yy, x + width - 20, yy);
    yy += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(name || "", x + width / 2, yy, { align: "center" });
    yy += 12;
    doc.setFontSize(9);
    doc.text("Signature over printed name", x + width / 2, yy, {
      align: "center",
    });
  }

  // ===== Page 1+: Commissioning checklist =====
  pageHeader("Electric Vehicle Charger Installation Checklist");

  for (const section of COMMISSIONING_SECTIONS) {
    sectionHeading(`${section.num}.  ${section.title.toUpperCase()}`);
    for (const sub of section.subsections) {
      if (sub.title) bar(sub.title);
      const fields = sub.fields.map<Cell>((f) => ({
        kind: f.type,
        label: f.label,
        value: o.values[f.key],
      }));
      for (let i = 0; i < fields.length; i += 2) {
        row(fields.slice(i, i + 2));
      }
      y += 6;
    }
    y += 4;
  }

  // Client signature for the checklist.
  ensure(120);
  y += 14;
  signatureBlock("CLIENT:", o.clientName, o.clientSignature, MARGIN, contentW / 2);
  y += 120;

  // ===== Warranty Terms & Conditions page =====
  newPage();
  pageHeader("WARRANTY TERMS & CONDITIONS");

  for (const section of WARRANTY_SECTIONS) {
    bar(section.title);
    // Build wrapped lines for the bordered content box.
    const pad = 8;
    doc.setFontSize(FONT);
    interface L {
      text: string;
      bold?: boolean;
      indent: number;
    }
    const lines: L[] = [];
    for (const blk of section.blocks) {
      doc.setFont("helvetica", blk.bold ? "bold" : "normal");
      const prefix = blk.bullet ? "•  " : "";
      const indent = blk.bullet ? 16 : 0;
      const avail = contentW - pad * 2 - indent;
      const wrapped = doc.splitTextToSize(prefix + blk.text, avail) as string[];
      wrapped.forEach((t) => lines.push({ text: t, bold: blk.bold, indent }));
    }
    const boxH = lines.length * LH + pad * 2;
    ensure(boxH);
    doc.setDrawColor(BORDER);
    doc.rect(MARGIN, y, contentW, boxH);
    let ty = y + pad + 8;
    for (const l of lines) {
      doc.setFont("helvetica", l.bold ? "bold" : "normal");
      doc.setTextColor(0);
      doc.text(l.text, MARGIN + pad + l.indent, ty);
      ty += LH;
    }
    y += boxH + 12;
  }

  // Client + Received-by signatures, side by side.
  ensure(130);
  y += 16;
  const half = contentW / 2;
  signatureBlock("CLIENT:", o.clientName, o.clientSignature, MARGIN, half);
  signatureBlock(
    "RECEIVED BY:",
    o.receivedByName,
    o.receivedBySignature,
    MARGIN + half,
    half,
  );

  return doc.output("blob");
}
