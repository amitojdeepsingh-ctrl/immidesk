import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=${encodeURIComponent("Supabase not configured")}`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Get the newly authenticated Supabase user
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  const db = getSupabaseAdmin();

  // Check if a User row already exists for this Supabase UID
  const { data: existingByUid } = await db
    .from("User")
    .select("id")
    .eq("supabaseUserId", supabaseUser.id)
    .maybeSingle();

  if (!existingByUid) {
    // Try to find an existing user by email (email/password account)
    const { data: existingByEmail } = await db
      .from("User")
      .select("id")
      .eq("email", supabaseUser.email)
      .maybeSingle();

    if (existingByEmail) {
      // Link the Google auth UID to the existing account
      await db
        .from("User")
        .update({ supabaseUserId: supabaseUser.id, updatedAt: new Date().toISOString() })
        .eq("id", existingByEmail.id);
    } else {
      // First-time Google sign-up: auto-provision user + organization
      const name =
        supabaseUser.user_metadata?.full_name ??
        supabaseUser.user_metadata?.name ??
        supabaseUser.email.split("@")[0];

      const orgName = `${name}'s Workspace`;
      let slug = slugify(orgName);

      const { data: existingOrg } = await db
        .from("Organization")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingOrg) slug = `${slug}-${Date.now().toString(36)}`;

      const orgId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.from("Organization").insert({ id: orgId, name: orgName, slug, updatedAt: now });

      await db.from("User").insert({
        id: crypto.randomUUID(),
        email: supabaseUser.email,
        name,
        role: "OWNER",
        supabaseUserId: supabaseUser.id,
        organizationId: orgId,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return NextResponse.redirect(`${origin}/clients`);
}
