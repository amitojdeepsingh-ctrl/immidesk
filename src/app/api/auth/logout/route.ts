import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout — signs out the current user and redirects to /login.
 *
 * Called from client components that need a programmatic logout
 * (e.g. user menu dropdown, session expiry handling).
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"));
}
