import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { signupAction } from "@/lib/auth-actions";

export async function POST(req: NextRequest) {
  const { name, email, password, organizationName } = await req.json();

  const result = await signupAction({
    name,
    email,
    password,
    confirmPassword: password,
    organizationName,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  let pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet.map((c) => ({
            name: c.name,
            value: c.value,
            options: c.options ?? {},
          }));
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
