import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ponytail: lazy singleton avoids build-time evaluation crash (Turbopack
// evaluates module-level code during page data collection, but env vars
// aren't available yet). Supabase's createClient() throws at import time
// if process.env is missing — wrap in getter instead.
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _admin;
}
