import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware — refreshes the Supabase auth session on every request.
 *
 * This ensures the auth cookie is always fresh. Without this middleware,
 * sessions expire after the JWT expiry (default 1 hour) and the user is
 * unexpectedly logged out.
 *
 * The middleware calls supabase.auth.getUser() which triggers a token
 * refresh if the current session is within the refresh window. The refreshed
 * session is written back to cookies via the setAll callback.
 *
 * Protected routes: add matcher config below to restrict which paths
 * this middleware runs on. By default it runs on every route except
 * static assets and Next.js internals.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session — do NOT block the request on auth failure.
  // Individual routes handle their own authorization checks.
  await supabase.auth.getUser();

  return supabaseResponse;
}

/**
 * Matcher config: exclude static assets, Next.js internals, and favicon.
 * The middleware runs on all other routes.
 *
 * To protect specific routes, add them here. Example:
 *   matcher: ["/dashboard/:path*", "/api/:path*"]
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, site.webmanifest, robots.txt
     * - public/ files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
