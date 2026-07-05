import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SITE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
const IS_SECURE = SITE_URL.startsWith("https");
const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!;

// Extract project ref from Supabase URL: https://{ref}.supabase.co
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1] ?? "unknown";

export async function GET(request: NextRequest) {
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  let codeVerifier: string | null = null;

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            pendingCookies.push(cookie);
            if (cookie.name === `sb-${PROJECT_REF}-auth-token-code-verifier`) {
              codeVerifier = cookie.value;
            }
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SITE_URL}/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  const redirectUrl = error
    ? `${SITE_URL}/login?error=${encodeURIComponent(error.message)}`
    : data.url;

  const response = NextResponse.redirect(redirectUrl);
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  // Mirror the code verifier under a known key so the callback can find it
  if (codeVerifier) {
    response.cookies.set("sb-code-verifier", codeVerifier, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: IS_SECURE,
      maxAge: 60 * 5,
    });
  }
  return response;
}