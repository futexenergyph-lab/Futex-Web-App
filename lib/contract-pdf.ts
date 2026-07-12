import { jsPDF } from "jspdf";

export interface ContractPdfOpts {
  client: { name: string; address: string; contact: string };
  supplier: { name: string; address: string; contact: string };
  equipmentLine: string;
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
  company: { legalName: string; phones: string[] };
  logo: string | null; // PNG data URL

  // Optional appended pages.
  receipt?: {
    dateOfReceipt: string;
    invoiceNo: string;
    amountReceived: number;
    amountInWords: string;
    modeOfPayment: string;
  } | null;
  completion?: {
    date: string;
    invoiceNo: string;
    settlementAmount: number;
    settlementInWords: string;
  } | null;
}

const MARGIN = 48;
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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

function threeDigitsToWords(n: number): string {
  let s = "";
  if (n >= 100) {
    s += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) s += " ";
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)];
    if (n % 10) s += `-${ONES[n % 10]}`;
  } else if (n > 0) {
    s += ONES[n];
  }
  return s;
}

/** Amount in Philippine-peso words, e.g. 290000 -> "Two Hundred Ninety Thousand Pesos Only". */
export function pesosInWords(amount: number): string {
  const whole = Math.floor(Math.abs(amount));
  const centavos = Math.round((Math.abs(amount) - whole) * 100);
  if (whole === 0) {
    return centavos
      ? `${threeDigitsToWords(centavos)} Centavos Only`
      : "Zero Pesos Only";
  }
  const scales = ["", "Thousand", "Million", "Billion", "Trillion"];
  const groups: number[] = [];
  let n = whole;
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    parts.push(`${threeDigitsToWords(groups[i])}${scales[i] ? " " + scales[i] : ""}`);
  }
  let words = parts.join(" ").trim() + " Pesos";
  if (centavos) words += ` and ${centavos}/100`;
  return words + " Only";
}

/** Build the branded FUTEX Installation Contract (+ optional receipt / completion pages). */
export function buildContractPdf(o: ContractPdfOpts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - MARGIN * 2;
  let y = MARGIN;

  const need = (h: number) => {
    if (y + h > H - MARGIN - 24) {
      doc.addPage();
      pageHeader(false);
    }
  };

  // Brand header: logo + thin rule. `titled` draws the doc title on page 1.
  const pageHeader = (withTitle: boolean) => {
    y = MARGIN;
    if (o.logo) {
      try {
        doc.addImage(o.logo, "PNG", MARGIN, y, 104, 34);
      } catch {
        /* ignore */
      }
    }
    if (withTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("INSTALLATION CONTRACT", W - MARGIN, y + 14, { align: "right" });
      doc.setTextColor(0);
    }
    y += 40;
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.setLineWidth(1.2);
    doc.line(MARGIN, y, W - MARGIN, y);
    doc.setLineWidth(1);
    y += 14;
  };

  const banner = (title: string) => {
    need(36);
    y += 4;
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.rect(MARGIN, y, contentW, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255);
    doc.text(title, MARGIN + 8, y + 14);
    doc.setTextColor(0);
    y += 28;
  };

  const paragraph = (text: string, size = 9.5, gap = 6) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    need(lines.length * (size + 3));
    doc.text(lines, MARGIN, y + size);
    y += lines.length * (size + 3) + gap;
    doc.setTextColor(0);
  };

  const bulletField = (label: string, value: string) => {
    need(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("•", MARGIN + 6, y + 9);
    doc.text(label, MARGIN + 18, y + 9);
    const lx = MARGIN + 172;
    doc.text(":", lx, y + 9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentW - (lx + 8 - MARGIN)) as string[];
    doc.text(lines, lx + 8, y + 9);
    y += Math.max(16, lines.length * 12) + 2;
  };

  // Renders a mixed list:
  //  - "* " / "- " lines  -> indented bullet
  //  - "1." / "1)" lines  -> numbered item (kept as typed)
  //  - plain lines        -> bold heading when plainHeading, else a bullet
  const bullets = (lines: string[], plainHeading = false) => {
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    for (const raw of lines) {
      let t = raw.trim();
      if (!t) continue;
      const numbered = /^\d+[).]/.test(t);
      const isBullet = /^[*-]\s*/.test(t);
      if (isBullet) {
        t = t.replace(/^[*-]\s*/, "");
        const tx = MARGIN + 30;
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(t, contentW - (tx - MARGIN) - 6) as string[];
        need(wrapped.length * 12 + 2);
        doc.text("•", MARGIN + 20, y + 9);
        doc.text(wrapped, tx, y + 9);
        y += wrapped.length * 12 + 3;
      } else if (numbered) {
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(t, contentW - 14) as string[];
        need(wrapped.length * 12 + 2);
        doc.text(wrapped, MARGIN + 8, y + 9);
        y += wrapped.length * 12 + 3;
      } else {
        doc.setFont("helvetica", plainHeading ? "bold" : "normal");
        const wrapped = doc.splitTextToSize(t, contentW - (plainHeading ? 8 : 30)) as string[];
        need(wrapped.length * 12 + 3);
        if (plainHeading) {
          doc.text(wrapped, MARGIN + 2, y + 9);
        } else {
          doc.text("•", MARGIN + 12, y + 9);
          doc.text(wrapped, MARGIN + 24, y + 9);
        }
        doc.setFont("helvetica", "normal");
        y += wrapped.length * 12 + (plainHeading ? 4 : 3);
      }
    }
    doc.setTextColor(0);
  };

  // A single centered signature line (name + role), placed at the given y.
  const oneSignature = (name: string, role: string, atY: number) => {
    const colW = 250;
    const x = MARGIN + (contentW - colW) / 2;
    doc.setDrawColor(120);
    doc.line(x, atY, x + colW, atY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(name, x + colW / 2, atY + 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(role, x + colW / 2, atY + 28, { align: "center" });
    doc.setTextColor(0);
  };

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

  const twoSignatures = (
    leftName: string,
    leftRole: string,
    rightName: string,
    rightRole: string,
  ) => {
    need(70);
    y += 34;
    const colW = contentW / 2;
    const lineY = y;
    doc.setDrawColor(120);
    doc.line(MARGIN, lineY, MARGIN + colW - 30, lineY);
    doc.line(MARGIN + colW, lineY, MARGIN + contentW, lineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(leftName, MARGIN, lineY + 14);
    doc.text(rightName, MARGIN + colW, lineY + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(leftRole, MARGIN, lineY + 26);
    doc.text(rightRole, MARGIN + colW, lineY + 26);
    doc.setTextColor(0);
    y = lineY + 34;
  };

  // ============================ PAGE 1+ (contract, flowing) ============================
  pageHeader(true);
  banner("INSTALLATION CONTRACT");

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

  if (o.equipmentLine.trim()) {
    banner("Equipment and Services:");
    paragraph(
      "Supplier will provide the following equipment, and/or related services, to Customer as set forth below",
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const eq = doc.splitTextToSize(
      `“${o.equipmentLine.trim()}”`,
      contentW - 40,
    ) as string[];
    need(eq.length * 14 + 8);
    doc.text(eq, W / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    y += eq.length * 14 + 10;
  }

  banner("Purchase Price and Service Fees");
  paragraph(
    "Customer agrees to pay Supplier for the equipment, and/or related services, the amounts set forth and in accordance with the payment terms outlined in the contract.",
  );
  bulletField("Final Agreed Price", peso(o.finalAgreedPrice));
  bulletField("Duration", o.duration);
  bulletField("Site", o.site);
  bulletField("Payment Terms", o.paymentTerm);

  banner("Authorized Representatives");
  paragraph(
    "The below authorized representative of Supplier and Customer can approve change/variant orders.",
  );
  bulletField("Supplier's Representative", o.supplierRep);
  bulletField("Customer's Representative", o.customerRep);

  banner("Key Dates");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  need(34);
  doc.text(`Start of Contract:  ${o.startOfContract}`, MARGIN, y + 10);
  y += 16;
  doc.text(`Date of Delivery:  ${o.dateOfDelivery}`, MARGIN, y + 10);
  y += 22;

  banner("Warranty");
  bullets(o.warranty);

  banner("Bank Details");
  need(52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(o.bank.name, MARGIN, y + 10);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Name: ${o.bank.accountName}`, MARGIN, y + 10);
  y += 14;
  doc.text(`Account number: ${o.bank.accountNumber}`, MARGIN, y + 10);
  y += 20;

  banner("Scope of Works and BOQ");
  bullets(o.scope, true);

  paragraph(
    "IN WITNESS WHEREOF, the undersigned have caused this order to be duly executed by their duly authorized representatives.",
    9.5,
    2,
  );
  twoSignatures(
    o.customerRep,
    "Customer / Owner",
    o.supplierRep,
    "Service Provider",
  );

  // ============================ Acknowledgement Receipt ============================
  if (o.receipt) {
    doc.addPage();
    pageHeader(false);
    banner("Acknowledgement Receipt");
    y += 10;
    paragraph(`Dear ${o.client.name},`, 11, 20);
    paragraph(
      "We hereby acknowledge receipt of payment and/or confirmation of delivery related to the solar installation at the following location:",
      10.5,
      22,
    );
    const kv = (label: string, value: string, bold = false) => {
      need(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`${label}:`, MARGIN, y + 10);
      const lw = doc.getTextWidth(`${label}:  `);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(value || "—", MARGIN + lw + 4, y + 10);
      y += 24;
    };
    kv("Installation Address", o.site || o.client.address, true);
    kv("Project Reference / Invoice No.", o.receipt.invoiceNo);
    kv("Date of Receipt", o.receipt.dateOfReceipt);
    kv("Amount Received", peso(o.receipt.amountReceived));
    kv("Mode of Payment", o.receipt.modeOfPayment);
    y += 16;
    paragraph(
      "This acknowledgement confirms that the above-mentioned receipt has been recorded and the solar installation process has proceeded / will proceed as per the agreed terms and schedule.",
      10.5,
      22,
    );
    paragraph(
      "Should you require any further clarification or documentation, please feel free to contact us.",
      10.5,
      22,
    );
    paragraph("Thank you for choosing us.", 10.5, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Sincerely,", MARGIN, y + 10);
    // Signatory sits directly below "Sincerely," (room left for the signature).
    y += 56;
    oneSignature(o.supplierRep, "Authorized Representative, FUTEX", y);
    y += 32;
  }

  // ============================ Completion & Settlement ============================
  if (o.completion) {
    doc.addPage();
    pageHeader(false);
    banner("ACKNOWLEDGEMENT OF COMPLETION AND SETTLEMENT");
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    need(20);
    doc.text(`Date:  ${o.completion.date}`, MARGIN, y + 10);
    y += 26;
    paragraph(`Dear ${o.client.name},`, 11, 20);
    paragraph(
      "We hereby acknowledge the successful completion of the solar installation project at the following location:",
      10.5,
      22,
    );
    const kv2 = (label: string, value: string) => {
      need(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`${label}:`, MARGIN, y + 10);
      const lw = doc.getTextWidth(`${label}:  `);
      doc.text(value || "—", MARGIN + lw + 4, y + 10);
      y += 24;
    };
    kv2("Installation Address", o.site || o.client.address);
    kv2("Project Reference / Invoice No.", o.completion.invoiceNo);
    y += 14;
    paragraph(
      "We also acknowledge with thanks the full and final settlement of the outstanding balance in the amount of:",
      10.5,
      18,
    );
    // Boxed amount + words, centered.
    need(66);
    const boxH = 56;
    const boxW = contentW * 0.72;
    const boxX = MARGIN + (contentW - boxW) / 2;
    doc.setDrawColor(40);
    doc.setLineWidth(1.2);
    doc.rect(boxX, y, boxW, boxH);
    doc.setLineWidth(1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(peso(o.completion.settlementAmount), boxX + boxW / 2, y + 26, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(70);
    doc.text(`(${o.completion.settlementInWords})`, boxX + boxW / 2, y + 44, {
      align: "center",
    });
    doc.setTextColor(0);
    y += boxH + 26;
    paragraph(
      "This payment completes the financial obligations under the terms of the contract. With this, the project is now considered fully closed.",
      10.5,
      22,
    );
    paragraph(
      "We sincerely appreciate your trust and partnership and look forward to serving you for future projects.",
      10.5,
      22,
    );
    paragraph("Thank you very much.", 10.5, 18);
    // Signatures follow the letter so the whole page stays as one page.
    y += 16;
    twoSignatures(
      o.customerRep,
      "Customer / Owner",
      o.supplierRep,
      "Authorized Representative, FUTEX",
    );
  }

  // ============================ Footers (page x of n) ============================
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(210);
    doc.line(MARGIN, H - MARGIN + 6, W - MARGIN, H - MARGIN + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    doc.text(o.company.legalName, MARGIN, H - MARGIN + 18);
    doc.text(`Page ${i} of ${total}`, W - MARGIN, H - MARGIN + 18, {
      align: "right",
    });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}
