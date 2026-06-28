import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocPhoto } from "@/components/admin/documentation-viewer";

/**
 * Collect every documentation photo for a set of bookings — both the
 * on-site update photos (job_updates, "job-updates" bucket) and the
 * post-installation documentation photos ("documentation" bucket) — and return
 * signed URLs (inline + force-download) per booking. Originals are linked as-is
 * (full quality, no resizing).
 */
export async function fetchBookingDocumentationPhotos(
  supabase: SupabaseClient,
  bookingIds: string[],
): Promise<Map<string, DocPhoto[]>> {
  const byBooking = new Map<string, DocPhoto[]>();
  if (bookingIds.length === 0) return byBooking;

  const push = async (
    bucket: string,
    bookingId: string,
    path: string,
  ) => {
    const name = path.split("/").pop() ?? "photo";
    const [{ data: inline }, { data: dl }] = await Promise.all([
      supabase.storage.from(bucket).createSignedUrl(path, 3600),
      supabase.storage.from(bucket).createSignedUrl(path, 3600, {
        download: name,
      }),
    ]);
    if (!inline?.signedUrl) return;
    const list = byBooking.get(bookingId) ?? [];
    list.push({
      url: inline.signedUrl,
      downloadUrl: dl?.signedUrl ?? inline.signedUrl,
      name,
    });
    byBooking.set(bookingId, list);
  };

  // On-site update photos first (chronological), then post-installation docs.
  const { data: updates } = await supabase
    .from("job_updates")
    .select("booking_id, photo_urls, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: true });
  for (const u of (updates as
    | { booking_id: string; photo_urls: string[] }[]
    | null) ?? []) {
    for (const path of u.photo_urls ?? [])
      await push("job-updates", u.booking_id, path);
  }

  const { data: docRows } = await supabase
    .from("documentation")
    .select("booking_id, file_urls, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });
  for (const row of (docRows as
    | { booking_id: string; file_urls: string[] }[]
    | null) ?? []) {
    for (const path of row.file_urls ?? [])
      await push("documentation", row.booking_id, path);
  }

  // Payment proof photos also surface in the documentation gallery.
  const { data: pays } = await supabase
    .from("payments")
    .select("booking_id, proof_url, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: true });
  for (const p of (pays as
    | { booking_id: string; proof_url: string | null }[]
    | null) ?? []) {
    if (p.proof_url) await push("payment-proofs", p.booking_id, p.proof_url);
  }

  return byBooking;
}
