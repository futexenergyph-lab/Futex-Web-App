"use client";

import { useState } from "react";
import { Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { buildContractPdf } from "@/lib/contract-pdf";
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
}

const DEFAULT_WARRANTY = [
  "12 years warranty for Solar Panel with 25 years Life Span",
  "10 years warranty for Solar Inverter",
  "10 years warranty for Solar Battery",
  "1 year warranty for Workmanship",
].join("\n");

const DEFAULT_SCOPE = [
  "1) General Requirements",
  "Mobilization and Demobilization",
  "Supervision and Management",
  "Safety Requirements",
  "2) Preparatory Works",
  "Panel Layout and conduit routing and panel location subject to approval by Owner.",
  "3) Solar Panel Installation, Wires, and Cabling Installations, Panel Installations",
  "4) 7KW EV Charger Installation (Wall Mounted)",
  "5) Restoration of affected Civil and Electrical Installations",
].join("\n");

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

  // Price & service fees
  const [finalPrice, setFinalPrice] = useState<number>(initial.total);
  const [duration, setDuration] = useState("Installation: 1 day");
  const [site, setSite] = useState(initial.clientAddress);
  const [paymentTerm, setPaymentTerm] = useState("50% Downpayment");

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

  function onGenerate() {
    setBusy(true);
    (async () => {
      try {
        const logo = await fetchDataUrl("/images/logo-stacked.png");
        const blob = buildContractPdf({
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
          logo,
        });
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
        <Field label="Payment term">
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
