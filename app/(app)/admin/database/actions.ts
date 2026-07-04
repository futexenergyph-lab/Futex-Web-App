"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { php, formatDateTime } from "@/lib/utils";
import type { DayReportSection } from "@/lib/day-report-pdf";
import {
  PAYMENT_METHOD_LABELS,
  RETAIL_PURCHASE_TYPE_LABELS,
  EXPENSE_TYPE_LABELS,
  type PaymentMethod,
  type PaymentSplit,
  type RetailPurchaseType,
  type ExpenseType,
} from "@/lib/types";

/** UTC bounds for a Philippine-time calendar day (YYYY-MM-DD). */
function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00+08:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { fromISO: start.toISOString(), toISO: end.toISOString() };
}

/** Gather every module's records for a day, formatted into report sections. */
export async function getDayData(day: string): Promise<DayReportSection[]> {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { fromISO, toISO } = dayBounds(day);

  const [
    bookings,
    payments,
    expenses,
    retail,
    quotations,
    attendance,
    jobOrders,
    announcements,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("client_number, client_name, contact_number, address, status, source, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .order("created_at"),
    supabase
      .from("payments")
      .select("amount, method, splits, reference_no, status, created_at, bookings(client_name)")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .order("created_at"),
    supabase
      .from("expenses")
      .select("expense_date, type, description, amount, status")
      .eq("expense_date", day),
    supabase
      .from("retail_purchases")
      .select("type, description, amount, status")
      .eq("purchase_date", day),
    supabase
      .from("quotations")
      .select("quote_no, type, client_name, total, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabase
      .from("attendance")
      .select("type, timestamp, lat, lng, profiles(full_name)")
      .gte("timestamp", fromISO)
      .lt("timestamp", toISO)
      .order("timestamp"),
    supabase
      .from("job_orders")
      .select("final_total, status, created_at, bookings(client_name)")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabase
      .from("announcements")
      .select("message, created_by_name, audience, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
  ]);

  const payMethod = (m: string, splits: PaymentSplit[] | null) =>
    splits && splits.length > 0
      ? "Split: " +
        splits
          .map((s) => `${PAYMENT_METHOD_LABELS[s.method]} ${s.amount}`)
          .join(" + ")
      : PAYMENT_METHOD_LABELS[m as PaymentMethod] ?? m;

  const sections: DayReportSection[] = [
    {
      title: "Bookings",
      columns: ["Client #", "Name", "Contact", "Address", "Status", "Source"],
      rows: (bookings.data ?? []).map((b) => [
        b.client_number ?? "—",
        b.client_name ?? "—",
        b.contact_number ?? "—",
        b.address ?? "—",
        b.status ?? "—",
        b.source ?? "—",
      ]),
    },
    {
      title: "Payments",
      columns: ["Client", "Amount", "Method", "Reference", "Status"],
      rows: (payments.data ?? []).map((p) => [
        (p.bookings as { client_name?: string } | null)?.client_name ?? "—",
        php(Number(p.amount)),
        payMethod(p.method, (p.splits as PaymentSplit[] | null) ?? null),
        p.reference_no ?? "—",
        p.status ?? "—",
      ]),
    },
    {
      title: "Expenses",
      columns: ["Type", "Description", "Amount", "Status"],
      rows: (expenses.data ?? []).map((e) => [
        EXPENSE_TYPE_LABELS[e.type as ExpenseType] ?? e.type,
        e.description ?? "—",
        php(Number(e.amount)),
        e.status ?? "—",
      ]),
    },
    {
      title: "Retail Purchases",
      columns: ["Type", "Description", "Amount", "Status"],
      rows: (retail.data ?? []).map((r) => [
        RETAIL_PURCHASE_TYPE_LABELS[r.type as RetailPurchaseType] ?? r.type,
        r.description ?? "—",
        php(Number(r.amount)),
        r.status ?? "—",
      ]),
    },
    {
      title: "Quotations",
      columns: ["Quote No.", "Type", "Client", "Total"],
      rows: (quotations.data ?? []).map((q) => [
        q.quote_no ?? "—",
        q.type === "solar" ? "Solar" : "EV Charger",
        q.client_name ?? "—",
        php(Number(q.total)),
      ]),
    },
    {
      title: "Job Orders",
      columns: ["Client", "Final Total", "Status"],
      rows: (jobOrders.data ?? []).map((j) => [
        (j.bookings as { client_name?: string } | null)?.client_name ?? "—",
        php(Number(j.final_total)),
        j.status ?? "—",
      ]),
    },
    {
      title: "Attendance",
      columns: ["Name", "Type", "Time (PHT)", "Location"],
      rows: (attendance.data ?? []).map((a) => [
        (a.profiles as { full_name?: string } | null)?.full_name ?? "—",
        a.type === "time_in" ? "Time In" : "Time Out",
        formatDateTime(a.timestamp as string),
        a.lat != null && a.lng != null
          ? `${Number(a.lat).toFixed(5)}, ${Number(a.lng).toFixed(5)}`
          : "—",
      ]),
    },
    {
      title: "Announcements",
      columns: ["Message", "By", "Audience"],
      rows: (announcements.data ?? []).map((a) => [
        a.message ?? "—",
        a.created_by_name ?? "—",
        a.audience === "all" ? "All users" : "Specific",
      ]),
    },
  ];

  return sections;
}

export interface DayPhoto {
  folder: string;
  name: string;
  url: string;
}

/** Signed URLs for every photo captured on a day, grouped into ZIP folders. */
export async function getDayPhotos(day: string): Promise<DayPhoto[]> {
  await requireRole(["admin", "admin_staff"]);
  const supabase = createClient();
  const { fromISO, toISO } = dayBounds(day);

  interface Item {
    bucket: string;
    folder: string;
    path: string;
  }
  const items: Item[] = [];

  const [updates, docs, pays, att] = await Promise.all([
    supabase
      .from("job_updates")
      .select("photo_urls, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabase
      .from("documentation")
      .select("file_urls, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabase
      .from("payments")
      .select("proof_url, created_at")
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabase
      .from("attendance")
      .select("photo_url, timestamp")
      .gte("timestamp", fromISO)
      .lt("timestamp", toISO),
  ]);

  for (const u of updates.data ?? [])
    for (const p of (u.photo_urls as string[]) ?? [])
      items.push({ bucket: "job-updates", folder: "on-site-updates", path: p });
  for (const d of docs.data ?? [])
    for (const p of (d.file_urls as string[]) ?? [])
      items.push({ bucket: "documentation", folder: "documentation", path: p });
  for (const p of pays.data ?? [])
    if (p.proof_url)
      items.push({
        bucket: "payment-proofs",
        folder: "payment-proofs",
        path: p.proof_url as string,
      });
  for (const a of att.data ?? [])
    if (a.photo_url)
      items.push({
        bucket: "attendance",
        folder: "attendance",
        path: a.photo_url as string,
      });

  // Batch-sign per bucket.
  const byBucket = new Map<string, Item[]>();
  for (const it of items) {
    const list = byBucket.get(it.bucket) ?? [];
    list.push(it);
    byBucket.set(it.bucket, list);
  }
  const out: DayPhoto[] = [];
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, its]) => {
      const paths = its.map((i) => i.path);
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrls(chunk, 3600);
        for (let j = 0; j < (data?.length ?? 0); j++) {
          const d = data![j];
          const it = its[i + j];
          if (d.signedUrl && it)
            out.push({
              folder: it.folder,
              name: it.path.split("/").pop() ?? "photo",
              url: d.signedUrl,
            });
        }
      }
    }),
  );
  return out;
}
