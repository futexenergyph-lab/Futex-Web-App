// One-off importer: FINANCIAL_REPORT_MAY_2026.xlsx -> Internal Inputs.
// - Operating expenses -> internal_inputs (owner ledger)
// - Per-client sheets  -> bookings (source: import-fr-2026) + confirmed payment
//                         + client_financials cost lines
// Idempotent: clients are keyed by their sheet tab (stored in booking notes);
// ledger rows carry an FR-IMPORT tag and are deduped by description+amount.
// Env: SUPABASE_URL, SERVICE_KEY, DATA_FILE.

import { readFileSync } from "node:fs";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SERVICE_KEY;
const TAG = "FR-IMPORT-2026";
const SOURCE = "import-fr-2026";

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function api(method, path, body, prefer) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...HEADERS, Prefer: prefer } : HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const data = JSON.parse(readFileSync(process.env.DATA_FILE, "utf8"));

// ---------- Clients ----------
const existing = await api(
  "GET",
  `bookings?source=eq.${SOURCE}&select=notes`,
);
const done = new Set(
  (existing ?? [])
    .map((b) => /\[tab: (.+?)\]$/.exec(b.notes ?? "")?.[1])
    .filter(Boolean),
);
console.log(`already imported: ${done.size} of ${data.clients.length} clients`);

let created = 0;
let paySum = 0;
let lineCount = 0;
for (const c of data.clients) {
  if (done.has(c.tab)) continue;
  const stamp = `${c.date}T08:00:00+08:00`;
  const [booking] = await api(
    "POST",
    "bookings",
    {
      client_name: c.name,
      address: c.address || "—",
      contact_number: "",
      status: "completed",
      source: SOURCE,
      preferred_date: c.date,
      notes: `Imported from FINANCIAL_REPORT_MAY_2026.xlsx [tab: ${c.tab}]`,
      created_at: stamp,
    },
    "return=representation",
  );

  if (c.payment > 0) {
    await api("POST", "payments", {
      booking_id: booking.id,
      amount: c.payment,
      method: c.method,
      status: "confirmed",
      paid_at: stamp,
      reference_no: c.method_raw ? String(c.method_raw).slice(0, 80) : null,
      created_at: stamp,
    });
    paySum += c.payment;
  }

  if (c.lines.length) {
    const base = Date.parse(stamp);
    await api(
      "POST",
      "client_financials",
      c.lines.map((l, i) => ({
        booking_id: booking.id,
        entry_date: l.entry_date,
        project_name: l.project_name,
        expense_type: l.expense_type,
        description: l.description,
        amount: l.amount,
        charge_to: l.charge_to,
        remarks: l.remarks,
        created_at: new Date(base + i * 10).toISOString(),
      })),
    );
    lineCount += c.lines.length;
  }

  created += 1;
  if (created % 25 === 0) console.log(`  ...${created} clients imported`);
}
console.log(
  `clients imported: ${created} (payments PHP ${paySum.toLocaleString()}, ${lineCount} cost lines)`,
);

// ---------- Ledger ----------
const led = await api(
  "GET",
  `internal_inputs?notes=ilike.*${TAG}*&select=description,amount`,
);
const ledDone = new Set((led ?? []).map((r) => `${r.description}|${Number(r.amount)}`));
let ledCreated = 0;
for (const l of data.ledger) {
  if (ledDone.has(`${l.description}|${Number(l.amount)}`)) continue;
  await api("POST", "internal_inputs", {
    entry_date: l.entry_date,
    direction: "out",
    category: l.category,
    description: l.description,
    amount: l.amount,
    payee: l.payee,
    notes: [l.notes, TAG].filter(Boolean).join(" · "),
  });
  ledCreated += 1;
}
console.log(`ledger entries imported: ${ledCreated} of ${data.ledger.length}`);

// ---------- Verify ----------
const cnt = async (p) => {
  const res = await fetch(`${URL}/rest/v1/${p}&select=id`, {
    headers: { ...HEADERS, Prefer: "count=exact", Range: "0-0" },
  });
  return res.headers.get("content-range")?.split("/")[1];
};
console.log("VERIFY bookings:", await cnt(`bookings?source=eq.${SOURCE}`));
console.log("VERIFY ledger:", await cnt(`internal_inputs?notes=ilike.*${TAG}*`));
console.log("DONE");
