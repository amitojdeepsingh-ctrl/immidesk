import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — safe for Client Components.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * from the browser environment (must be prefixed with NEXT_PUBLIC_).
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.auth.getUser();
 */
export function createClient() {
  return createBrowserClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
  );
}
