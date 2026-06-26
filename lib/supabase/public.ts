import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free Supabase client for public marketing pages.
 * Reads only public (RLS-allowed) data — packages, enclosures, add-ons.
 * Because it doesn't touch cookies, pages using it can be statically
 * cached / ISR-revalidated.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
