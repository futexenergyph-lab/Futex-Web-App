import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocPhoto } from "@/components/admin/documentation-viewer";

interface PhotoItem {
  bucket: string;
  bookingId: string;
  path: string;
}

/** Batch-sign all paths per bucket (one request per ~100 paths) → path→url map. */
async function signAll(
  supabase: SupabaseClient,
  items: PhotoItem[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>(); // key: `${bucket}\n${path}`
  const byBucket = new Map<string, Set<string>>();
  for (const it of items) {
    const set = byBucket.get(it.bucket) ?? new Set<string>();
    set.add(it.path);
    byBucket.set(it.bucket, set);
  }

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, pathSet]) => {
      const paths = [...pathSet];
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrls(chunk, 3600);
        for (const d of data ?? []) {
          if (d.signedUrl && d.path)
            signed.set(`${bucket}\n${d.path}`, d.signedUrl);
        }
      }
    }),
  );
  return signed;
}

/**
 * Collect every documentation photo for a set of bookings — on-site update
 * photos (job_updates), post-installation documentation photos, and payment
 * proofs — and return signed URLs (inline + force-download) per booking.
 *
 * Signing is batched per bucket (Supabase createSignedUrls) instead of one
 * request per file, so this stays fast even with hundreds of photos.
 */
export async function fetchBookingDocumentationPhotos(
  supabase: SupabaseClient,
  bookingIds: string[],
): Promise<Map<string, DocPhoto[]>> {
  const byBooking = new Map<string, DocPhoto[]>();
  if (bookingIds.length === 0) return byBooking;

  // Fetch the three photo sources in parallel.
  const [updatesRes, docRes, payRes] = await Promise.all([
    supabase
      .from("job_updates")
      .select("booking_id, photo_urls, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("documentation")
      .select("booking_id, file_urls, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("booking_id, proof_url, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true }),
  ]);

  // Build an ordered list of every photo (on-site first, then docs, then proofs).
  const items: PhotoItem[] = [];
  for (const u of (updatesRes.data as
    | { booking_id: string; photo_urls: string[] }[]
    | null) ?? [])
    for (const path of u.photo_urls ?? [])
      items.push({ bucket: "job-updates", bookingId: u.booking_id, path });
  for (const row of (docRes.data as
    | { booking_id: string; file_urls: string[] }[]
    | null) ?? [])
    for (const path of row.file_urls ?? [])
      items.push({ bucket: "documentation", bookingId: row.booking_id, path });
  for (const p of (payRes.data as
    | { booking_id: string; proof_url: string | null }[]
    | null) ?? [])
    if (p.proof_url)
      items.push({
        bucket: "payment-proofs",
        bookingId: p.booking_id,
        path: p.proof_url,
      });

  const signed = await signAll(supabase, items);

  for (const it of items) {
    const url = signed.get(`${it.bucket}\n${it.path}`);
    if (!url) continue;
    const name = it.path.split("/").pop() ?? "photo";
    // A signed URL's token covers the path+expiry, not query params, so the
    // download variant is just the inline URL with a `download` param.
    const downloadUrl = `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
    const list = byBooking.get(it.bookingId) ?? [];
    list.push({ url, downloadUrl, name });
    byBooking.set(it.bookingId, list);
  }

  return byBooking;
}
