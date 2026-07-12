"use client";

import { useState } from "react";
import { Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { buildContractPdf, pesosInWords } from "@/lib/contract-pdf";
import {
  buildQuotationPdf,
  buildSolarQuotationPdf,
} from "@/lib/quotation-pdf";
import { COMPANY, ACCREDITATION } from "@/lib/company";
import type { SolarQuoteData } from "@/lib/solar-quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ContractInitial {
  quoteNo: string | null;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  total: number;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  // Full quotation payload — rendered as page 1 of the contract.
  quote: {
    type: "ev" | "solar";
    clientEmail: string;
    items: { description: string; qty: number; unit_price: number }[];
    subtotal: number;
    vatEnabled: boolean;
    vat: number;
    validityDays: number;
    notes: string;
    details: SolarQuoteData | null;
    preparedByName: string;
    createdAt: string;
  };
}

const DEFAULT_WARRANTY = [
  "15 years warranty for Solar Panel with 30 years Life Span",
  "10 years warranty for Solar Inverter",
  "10 years warranty for Solar Battery",
  "1 year warranty for Workmanship",
].join("\n");

const DEFAULT_SCOPE = [
  "General Requirements",
  "* Mobilization and Demobilization",
  "* Supervision and Management",
  "* Safety Requirement",
  "1. Preparatory Works",
  "2. Panel Layout and conduit routing and panel location subject to approval by Owner.",
  "3. Solar Panel Installation, Wires, and Cabling Installations, Panel Installations",
  "4. Restoration of affected Civil and Electrical Installations",
  "5. Monitoring System using iSolarcloud, deye cloud or solarman app for real time monitoring.",
  "* Daily, monthly and yearly data gathering for the solar plant performance (e.g, Consumption, Battery performance, Alerts, Faults etc...)",
  "Documentation and Handover with Warranty certificates, Operation Manual and Maintenance guide.",
  "* Basic training and troubleshooting orientation for the end user upon endorsement.",
  "* Final commissioning and testing",
].join("\n");

/** Compose the "Equipment and Services" line from the quotation details. */
function defaultEquipmentLine(initial: ContractInitial): string {
  const base = "Supply and installation, testing, and commissioning of ";
  const d = initial.quote.details;
  if (d && Array.isArray(d.products)) {
    const inc = (k: string) =>
      (d.products.find((p) => p.key === k)?.inclusion ?? "").trim();
    const inv = inc("inverter");
    const panel = inc("panel");
    const batt = inc("battery");
    const head = [inv, panel].filter(Boolean).join(", ");
    if (head || batt) {
      let s = base + head;
      if (batt) s += `${head ? " " : ""}with ${batt}`;
      return s.trim();
    }
  }
  const items = initial.quote.items
    .map((i) => i.description.trim())
    .filter(Boolean);
  if (items.length) return base + items.join(", ");
  return base + "the equipment and services per the attached quotation.";
}

/** Build the quotation PDF (page 1) from the stored quote payload. */
function buildQuotePdf(initial: ContractInitial, logo: string | null): Blob {
  const q = initial.quote;
  const date = new Date(q.createdAt)
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    })
    .toUpperCase();
  const quoteNo = initial.quoteNo ?? "";
  if (q.type === "solar" && q.details) {
    return buildSolarQuotationPdf({
      quoteNo,
      date,
      client: {
        name: initial.clientName,
        address: initial.clientAddress,
        contact: initial.clientContact,
      },
      data: q.details,
      logo,
    });
  }
  return buildQuotationPdf({
    quoteNo,
    date,
    type: q.type,
    validityDays: q.validityDays,
    client: {
      name: initial.clientName,
      address: initial.clientAddress,
      contact: initial.clientContact,
      email: q.clientEmail,
    },
    items: q.items,
    subtotal: q.subtotal,
    vatEnabled: q.vatEnabled,
    vat: q.vat,
    total: initial.total,
    notes: q.notes,
    preparedByName: q.preparedByName,
    company: {
      legalName: COMPANY.legalName,
      address: COMPANY.address,
      phones: COMPANY.phones,
      doeNumber: ACCREDITATION.number,
    },
    logo,
  });
}

/** Merge quotation PDF + contract PDF into one document (quotation first). */
async function mergePdfs(first: Blob, second: Blob): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const b of [first, second]) {
    const src = await PDFDocument.load(await b.arrayBuffer());
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function displayDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00+08:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

export function ContractForm({ initial }: { initial: ContractInitial }) {
  const [busy, setBusy] = useState(false);

  // Parties
  const [clientName, setClientName] = useState(initial.clientName);
  const [clientAddress, setClientAddress] = useState(initial.clientAddress);
  const [clientContact, setClientContact] = useState(initial.clientContact);
  const [supplierName, setSupplierName] = useState(initial.supplierName);
  const [supplierAddress, setSupplierAddress] = useState(initial.supplierAddress);
  const [supplierContact, setSupplierContact] = useState(initial.supplierContact);

  // Equipment & Services line (from the quotation, editable)
  const [equipment, setEquipment] = useState(defaultEquipmentLine(initial));

  // Price & service fees
  const [finalPrice, setFinalPrice] = useState<number>(initial.total);
  const [duration, setDuration] = useState("Installation: 1 day");
  const [site, setSite] = useState(initial.clientAddress);
  const [paymentTerm, setPaymentTerm] = useState(
    "50% Downpayment + 50% Full Payment upon successful installation",
  );

  // Representatives
  const [supplierRep, setSupplierRep] = useState(initial.supplierName);
  const [customerRep, setCustomerRep] = useState(initial.clientName);

  // Key dates
  const [startDate, setStartDate] = useState(todayPlus(0));
  const [deliveryDate, setDeliveryDate] = useState(todayPlus(14));

  // Warranty / bank / scope
  const [warranty, setWarranty] = useState(DEFAULT_WARRANTY);
  const [bankName, setBankName] = useState("EASTWEST");
  const [bankAccountName, setBankAccountName] = useState("Jeffrey Lois G. Talla");
  const [bankAccountNumber, setBankAccountNumber] = useState("200067762688");
  const [scope, setScope] = useState(DEFAULT_SCOPE);

  // Default amounts = 50% of the package cost (down / balance payment).
  const halfTotal = Math.round(initial.total * 0.5);

  // Acknowledgement Receipt page (optional)
  const [includeReceipt, setIncludeReceipt] = useState(true);
  const [receiptDate, setReceiptDate] = useState(todayPlus(0));
  const [receiptInvoice, setReceiptInvoice] = useState(initial.quoteNo ?? "");
  const [receiptAmount, setReceiptAmount] = useState<number>(halfTotal);
  const [receiptWords, setReceiptWords] = useState(pesosInWords(halfTotal));
  const [receiptMode, setReceiptMode] = useState("");

  // Acknowledgement of Completion & Settlement page (optional)
  const [includeCompletion, setIncludeCompletion] = useState(true);
  const [completionDate, setCompletionDate] = useState(todayPlus(14));
  const [completionInvoice, setCompletionInvoice] = useState(initial.quoteNo ?? "");
  const [settlementAmount, setSettlementAmount] = useState<number>(halfTotal);
  const [settlementWords, setSettlementWords] = useState(pesosInWords(halfTotal));

  function onGenerate() {
    setBusy(true);
    (async () => {
      try {
        const logo = await fetchDataUrl("/images/logo-stacked.png");
        const contractBlob = buildContractPdf({
          client: {
            name: clientName,
            address: clientAddress,
            contact: clientContact,
          },
          supplier: {
            name: supplierName,
            address: supplierAddress,
            contact: supplierContact,
          },
          equipmentLine: equipment,
          finalAgreedPrice: Number(finalPrice) || 0,
          duration,
          site,
          paymentTerm,
          supplierRep,
          customerRep,
          startOfContract: displayDate(startDate),
          dateOfDelivery: displayDate(deliveryDate),
          warranty: warranty.split("\n"),
          bank: {
            name: bankName,
            accountName: bankAccountName,
            accountNumber: bankAccountNumber,
          },
          scope: scope.split("\n"),
          company: { legalName: COMPANY.legalName, phones: COMPANY.phones },
          receipt: includeReceipt
            ? {
                dateOfReceipt: displayDate(receiptDate),
                invoiceNo: receiptInvoice,
                amountReceived: Number(receiptAmount) || 0,
                amountInWords: receiptWords,
                modeOfPayment: receiptMode,
              }
            : null,
          completion: includeCompletion
            ? {
                date: displayDate(completionDate),
                invoiceNo: completionInvoice,
                settlementAmount: Number(settlementAmount) || 0,
                settlementInWords: settlementWords,
              }
            : null,
          logo,
        });

        // Page 1 = the project quotation, then the contract pages. If the
        // quotation can't be rendered, fall back to contract-only.
        let blob = contractBlob;
        try {
          const quoteBlob = buildQuotePdf(initial, logo);
          blob = await mergePdfs(quoteBlob, contractBlob);
        } catch {
          toast.warning("Quotation page couldn't be added — contract only.");
        }

        const safeName = (clientName || "client").replace(/[^\w-]+/g, "_");
        const fname = `Contract-${initial.quoteNo ?? "FUTEX"}-${safeName}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast.success("Contract PDF generated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to build contract",
        );
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="space-y-6">
      {/* Client */}
      <Section title="Client">
        <Field label="Client name">
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </Field>
        <Field label="Contact number">
          <Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
        </Field>
        <Field label="Address" full>
          <Textarea rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
        </Field>
      </Section>

      {/* Supplier */}
      <Section title="Supplier">
        <Field label="Supplier name">
          <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </Field>
        <Field label="Contact number">
          <Input value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} />
        </Field>
        <Field label="Address" full>
          <Textarea rows={2} value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
        </Field>
      </Section>

      {/* Equipment & services (from the quotation) */}
      <Section title="Equipment and Services" single>
        <Field label="Equipment & services line (auto-filled from the quotation)" full>
          <Textarea
            rows={2}
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          />
        </Field>
      </Section>

      {/* Price & service fees */}
      <Section title="Purchase Price and Service Fees">
        <Field label="Final agreed price (PHP)">
          <Input
            type="number"
            min={0}
            value={finalPrice || ""}
            onChange={(e) => setFinalPrice(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Duration">
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Site">
          <Input value={site} onChange={(e) => setSite(e.target.value)} />
        </Field>
        <Field label="Payment terms" full>
          <Input value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} />
        </Field>
      </Section>

      {/* Representatives */}
      <Section title="Authorized Representatives">
        <Field label="Supplier's representative">
          <Input value={supplierRep} onChange={(e) => setSupplierRep(e.target.value)} />
        </Field>
        <Field label="Customer's representative">
          <Input value={customerRep} onChange={(e) => setCustomerRep(e.target.value)} />
        </Field>
      </Section>

      {/* Key dates */}
      <Section title="Key Dates">
        <Field label="Start of contract">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Date of delivery">
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </Field>
      </Section>

      {/* Warranty */}
      <Section title="Warranty" single>
        <Field label="One line per warranty item" full>
          <Textarea rows={4} value={warranty} onChange={(e) => setWarranty(e.target.value)} />
        </Field>
      </Section>

      {/* Bank */}
      <Section title="Bank Details">
        <Field label="Bank">
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </Field>
        <Field label="Account name">
          <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
        </Field>
        <Field label="Account number" full>
          <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
        </Field>
      </Section>

      {/* Scope */}
      <Section title="Scope of Works and BOQ" single>
        <Field label="One line per scope item" full>
          <Textarea rows={8} value={scope} onChange={(e) => setScope(e.target.value)} />
        </Field>
      </Section>

      {/* Acknowledgement Receipt page */}
      <div className="space-y-3 rounded-md border p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={includeReceipt}
            onChange={(e) => setIncludeReceipt(e.target.checked)}
            className="h-4 w-4"
          />
          Include Acknowledgement Receipt page
        </label>
        {includeReceipt && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of receipt">
              <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </Field>
            <Field label="Project reference / Invoice no.">
              <Input value={receiptInvoice} onChange={(e) => setReceiptInvoice(e.target.value)} />
            </Field>
            <Field label="Amount received (PHP)">
              <Input
                type="number"
                min={0}
                value={receiptAmount || ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  setReceiptAmount(n);
                  setReceiptWords(pesosInWords(n));
                }}
              />
            </Field>
            <Field label="Mode of payment">
              <Input
                value={receiptMode}
                placeholder="e.g. Cash / Bank Transfer / Check"
                onChange={(e) => setReceiptMode(e.target.value)}
              />
            </Field>
            <Field label="Amount in words" full>
              <Input value={receiptWords} onChange={(e) => setReceiptWords(e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {/* Completion & Settlement page */}
      <div className="space-y-3 rounded-md border p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={includeCompletion}
            onChange={(e) => setIncludeCompletion(e.target.checked)}
            className="h-4 w-4"
          />
          Include Acknowledgement of Completion &amp; Settlement page
        </label>
        {includeCompletion && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
            </Field>
            <Field label="Project reference / Invoice no.">
              <Input value={completionInvoice} onChange={(e) => setCompletionInvoice(e.target.value)} />
            </Field>
            <Field label="Settlement amount (PHP)">
              <Input
                type="number"
                min={0}
                value={settlementAmount || ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  setSettlementAmount(n);
                  setSettlementWords(pesosInWords(n));
                }}
              />
            </Field>
            <Field label="Amount in words" full>
              <Input value={settlementWords} onChange={(e) => setSettlementWords(e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      <Button onClick={onGenerate} disabled={busy} className="w-full sm:w-auto">
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSignature className="mr-2 h-4 w-4" />
        )}
        Generate contract PDF
      </Button>
    </div>
  );
}

function Section({
  title,
  single = false,
  children,
}: {
  title: string;
  single?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className={single ? "" : "grid gap-3 sm:grid-cols-2"}>{children}</div>
    </div>
  );
}

function Field({
  label,
  full = false,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
