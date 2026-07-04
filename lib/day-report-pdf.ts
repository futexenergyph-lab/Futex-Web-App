import { jsPDF } from "jspdf";

export interface DayReportSection {
  title: string;
  columns: string[];
  rows: string[][];
}

const MARGIN = 36;
const BORDER = 180;
const BRAND: [number, number, number] = [10, 77, 162];

/** Build a multi-section "daily data export" PDF from tabular sections. */
export function buildDayReportPdf(
  day: string,
  sections: DayReportSection[],
  logo: string | null,
): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  const newPageIf = (need: number) => {
    if (y + need > H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ---- Header ----
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, y, 96, 32);
    } catch {
      /* ignore */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text("Daily Data Export", W - MARGIN, y + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(day, W - MARGIN, y + 30, { align: "right" });
  y += 44;

  const drawTableHeader = (columns: string[], colW: number[], xs: number[]) => {
    const h = 20;
    newPageIf(h + 16);
    doc.setFillColor(235, 240, 248);
    doc.rect(MARGIN, y, contentW, h, "F");
    doc.setDrawColor(BORDER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0);
    columns.forEach((c, i) => {
      doc.rect(xs[i], y, colW[i], h);
      doc.text(
        doc.splitTextToSize(c, colW[i] - 8) as string[],
        xs[i] + 4,
        y + 13,
      );
    });
    y += h;
  };

  for (const section of sections) {
    // Section title bar.
    newPageIf(40);
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.rect(MARGIN, y, contentW, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255);
    doc.text(
      `${section.title}  (${section.rows.length})`,
      MARGIN + 8,
      y + 14,
    );
    doc.setTextColor(0);
    y += 20;

    if (section.rows.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("No records for this day.", MARGIN + 4, y + 14);
      doc.setTextColor(0);
      y += 24;
      continue;
    }

    const n = section.columns.length;
    const colW = section.columns.map(() => contentW / n);
    const xs: number[] = [];
    let cx = MARGIN;
    for (let i = 0; i < n; i++) {
      xs.push(cx);
      cx += colW[i];
    }

    drawTableHeader(section.columns, colW, xs);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const row of section.rows) {
      const wrapped = row.map((cell, i) =>
        doc.splitTextToSize(cell ?? "", colW[i] - 8) as string[],
      );
      const lines = Math.max(1, ...wrapped.map((w) => w.length));
      const rowH = lines * 10 + 6;
      if (y + rowH > H - MARGIN) {
        doc.addPage();
        y = MARGIN;
        drawTableHeader(section.columns, colW, xs);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      wrapped.forEach((w, i) => {
        doc.rect(xs[i], y, colW[i], rowH);
        doc.text(w, xs[i] + 4, y + 11);
      });
      y += rowH;
    }
    y += 14;
  }

  return doc.output("blob");
}
