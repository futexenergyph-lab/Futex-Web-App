import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free Supabase client for public marketing pages.
 * Reads only public (RLS-allowed) data — packages, enclosures, add-ons.
 * Because it doesn't touch cookies, pages using it can be statically
 * cached / ISR-revalidated.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Allow the marketing site to build/render before Supabase is configured.
  // Callers treat a null client as "no data yet".
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
