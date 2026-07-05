import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client — for Server Components, Route Handlers,
 * Server Actions, and middleware. Reads cookies from the incoming request
 * to maintain the authenticated session.
 *
 * Usage (Server Component):
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * Usage (Route Handler / Server Action):
 *   const supabase = await createClient();
 *   const { data } = await supabase.from("cases").select();
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll may be called from a Server Component — that's fine,
            // middleware handles the actual cookie write for those paths.
          }
        },
      },
    },
  );
}

/**
 * Admin-level Supabase client — uses the service_role key.
 * Only call this from server-side code that needs elevated privileges
 * (e.g. bypassing RLS, managing users). Never expose to the browser.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Silently ignore in read-only contexts.
          }
        },
      },
    },
  );
}
